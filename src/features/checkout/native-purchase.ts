// Achat via le paiement Apple natif (StoreKit) pour l'app iOS hybride.
// La page paywall (design inchangé) demande l'achat au natif ; le natif ouvre la
// feuille de paiement Apple et renvoie le résultat via window.__smartskinPurchaseDone.
// (__SMARTSKIN_NATIVE__ et webkit sont déjà déclarés côté CaptureScreen.)
declare global {
  interface Window {
    __smartskinPurchaseDone?: (ok: boolean) => void;
  }
}

/** Vrai uniquement dans l'app iOS (drapeau injecté par la WebView native). */
export function isNativeApp(): boolean {
  return typeof window !== "undefined" && window.__SMARTSKIN_NATIVE__ === true;
}

/** Lance l'achat Apple natif ; `onDone(true)` si le paiement a réussi. */
export function startNativePurchase(onDone: (ok: boolean) => void): void {
  window.__smartskinPurchaseDone = async (ok) => {
    // Achat vérifié côté natif → on débloque l'accès à vie en base (compte connecté).
    if (ok) await fetch("/api/iap/grant", { method: "POST" }).catch(() => {});
    onDone(!!ok);
  };
  window.webkit?.messageHandlers?.native?.postMessage({ action: "purchase" });
}
