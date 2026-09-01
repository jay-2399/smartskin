// Achat via le paiement Apple natif (StoreKit) pour l'app iOS hybride.
// La page paywall (design inchangé) demande l'achat au natif ; le natif ouvre la
// feuille de paiement Apple et renvoie le résultat via window.__smartskinPurchaseDone.
// (__SMARTSKIN_NATIVE__ et webkit sont déjà déclarés côté CaptureScreen.)
declare global {
  interface Window {
    __smartskinPurchaseDone?: (ok: boolean) => void;
    __smartskinPrice?: (price: string) => void;
    __smartskinRestoreDone?: (ok: boolean) => void;
    __smartskinEntitlement?: (productId: string | null, expiresAt: number | null) => void;
  }
}

/** Vrai uniquement dans l'app iOS (drapeau injecté par la WebView native). */
export function isNativeApp(): boolean {
  return typeof window !== "undefined" && window.__SMARTSKIN_NATIVE__ === true;
}

/** Lance l'achat Apple natif du plan choisi ; `onDone(true)` si le paiement a réussi.
 *  NB : l'accès n'est PAS posé ici. Après l'achat, le paywall envoie vers /checkout/save
 *  (Sign in with Apple) qui crée/retrouve le compte PUIS pose l'accès — car le grant a
 *  besoin d'une session (sinon 401).
 *
 *  ⚠️ Retry automatique sur échec ÉCLAIR : un refus humain (feuille annulée) prend
 *  plusieurs secondes ; un échec en <600 ms est toujours StoreKit sandbox/App Store qui
 *  flanche transitoirement. Vu en review (PostHog) : 29/07 = 12 échecs à ~45 ms puis
 *  succès 2 min après ; 03/08 = 4 échecs à ~70 ms → rejet 2.1(b) « no purchase prompt ».
 *  On relance donc jusqu'à 2 fois, à 1,2 s d'intervalle, avant d'abandonner. */
export function startNativePurchase(plan: "lifetime" | "weekly", onDone: (ok: boolean) => void): void {
  let tentative = 0;
  const lancer = () => {
    tentative += 1;
    const t0 = Date.now();
    window.__smartskinPurchaseDone = (ok) => {
      if (!ok && Date.now() - t0 < 600 && tentative < 3) {
        setTimeout(lancer, 1200);
        return;
      }
      onDone(!!ok);
    };
    // Le natif mappe le plan vers le bon product id App Store (1234 / 5678).
    window.webkit?.messageHandlers?.native?.postMessage({ action: "purchase", plan });
  };
  lancer();
}

/** Restaure un achat déjà effectué (obligatoire App Store) ; `onDone(true)` si un achat est retrouvé.
 *
 *  On passe par l'ENTITLEMENT StoreKit, pas par un grant à l'aveugle. Avant, la restauration
 *  postait `/api/iap/grant` sans corps — et le serveur en déduisait « lifetime ». Restaurer un
 *  abonnement hebdomadaire posait donc un accès à vie, irréversible. `syncNativeAccess` demande
 *  au natif QUEL produit est réellement possédé et laisse /api/iap/sync poser le bon accès. */
export function startNativeRestore(onDone: (ok: boolean) => void): void {
  window.__smartskinRestoreDone = async (ok) => {
    if (ok) await syncNativeAccess();
    onDone(!!ok);
  };
  window.webkit?.messageHandlers?.native?.postMessage({ action: "restore" });
}

/** Demande au natif le prix localisé (StoreKit) ; le renvoie via `onPrice`. */
export function fetchNativePrice(onPrice: (price: string) => void): void {
  window.__smartskinPrice = (p) => { if (p) onPrice(p); };
  window.webkit?.messageHandlers?.native?.postMessage({ action: "getPrice" });
}

/** Demande au natif l'entitlement StoreKit courant (product id + date d'expiration ms) et
 *  synchronise l'accès en base via /api/iap/sync. À appeler après l'achat ET à chaque ouverture
 *  de l'app (prolonge l'abonnement au renouvellement, laisse l'expiration se faire par la date).
 *  Résout toujours (filet de 4 s si le natif ne répond pas). Hors app : no-op immédiat. */
export function syncNativeAccess(): Promise<void> {
  return new Promise((resolve) => {
    if (!isNativeApp()) { resolve(); return; }
    let settled = false;
    const done = () => { if (!settled) { settled = true; resolve(); } };
    window.__smartskinEntitlement = async (productId, expiresAt) => {
      await fetch("/api/iap/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, expiresAt }),
      }).catch(() => {});
      done();
    };
    window.webkit?.messageHandlers?.native?.postMessage({ action: "getEntitlement" });
    setTimeout(done, 4000);
  });
}
