// Achat via le paiement Apple natif (StoreKit) pour l'app iOS hybride.
// La page paywall (design inchangé) demande l'achat au natif ; le natif ouvre la
// feuille de paiement Apple et renvoie le résultat via window.__smartskinPurchaseDone.
// (__SMARTSKIN_NATIVE__ et webkit sont déjà déclarés côté CaptureScreen.)
declare global {
  interface Window {
    __smartskinPurchaseDone?: (ok: boolean) => void;
    __smartskinPrice?: (price: string) => void;
    __smartskinRestoreDone?: (ok: boolean) => void;
  }
}

/** Vrai uniquement dans l'app iOS (drapeau injecté par la WebView native). */
export function isNativeApp(): boolean {
  return typeof window !== "undefined" && window.__SMARTSKIN_NATIVE__ === true;
}

/** Lance l'achat Apple natif du plan choisi ; `onDone(true)` si le paiement a réussi.
 *  NB : l'accès n'est PAS posé ici. Après l'achat, le paywall envoie vers /checkout/save
 *  (Sign in with Apple) qui crée/retrouve le compte PUIS pose l'accès — car le grant a
 *  besoin d'une session (sinon 401). */
export function startNativePurchase(plan: "lifetime" | "weekly", onDone: (ok: boolean) => void): void {
  window.__smartskinPurchaseDone = (ok) => onDone(!!ok);
  // Le natif mappe le plan vers le bon product id App Store (1234 / 5678).
  window.webkit?.messageHandlers?.native?.postMessage({ action: "purchase", plan });
}

/** Restaure un achat déjà effectué (obligatoire App Store) ; `onDone(true)` si un achat est retrouvé. */
export function startNativeRestore(onDone: (ok: boolean) => void): void {
  window.__smartskinRestoreDone = async (ok) => {
    // Achat retrouvé côté natif → on redonne l'accès à vie en base (compte connecté).
    if (ok) await fetch("/api/iap/grant", { method: "POST" }).catch(() => {});
    onDone(!!ok);
  };
  window.webkit?.messageHandlers?.native?.postMessage({ action: "restore" });
}

/** Demande au natif le prix localisé (StoreKit) ; le renvoie via `onPrice`. */
export function fetchNativePrice(onPrice: (price: string) => void): void {
  window.__smartskinPrice = (p) => { if (p) onPrice(p); };
  window.webkit?.messageHandlers?.native?.postMessage({ action: "getPrice" });
}
