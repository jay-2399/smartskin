"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import posthog from "posthog-js";
import { useResult } from "@/features/analysis/resultStore";
import { useFunnel } from "@/features/funnel/store";
import { stashPendingScan } from "@/features/analysis/pendingScan";
import { isNativeApp, startNativePurchase, startNativeRestore } from "@/features/checkout/native-purchase";
import { useNativePrice } from "@/features/checkout/useNativePrice";
import "./paywall-b.css";

/* Paywall — Variant B (dark immersif) pour l'A/B test. Port de paywall/B/paywall.html.
   Même logique de paiement que le Variant A (CheckoutScreen) : CTA → /api/checkout →
   page Stripe ($7.95) ; le webhook accorde l'accès. En démo (?demo=1) : on saute le
   paiement et on enchaîne sur /routine?demo=1. Classes préfixées .pw- (isolation). */

export function PaywallB() {
  const router = useRouter();
  const demo = useMemo(
    () => typeof window !== "undefined" && new URLSearchParams(window.location.search).has("demo"),
    []
  );
  const to = (path: string) => (demo ? `${path}?demo=1` : path);
  const [loading, setLoading] = useState(false);
  const price = useNativePrice("$7.95"); // vrai prix localisé Apple dans l'app iOS
  const videoRef = useRef<HTMLVideoElement>(null);

  // prefers-reduced-motion : on fige la vidéo sur son poster. Sinon, dans l'app iOS
  // (WKWebView), l'attribut autoPlay ne suffit pas toujours → on FORCE play() au montage.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      v.pause();
      return;
    }
    // iOS/WKWebView : l'autoplay muet exige que la vidéo soit VRAIMENT muette. React
    // n'applique pas toujours l'attribut `muted` au DOM → le navigateur la croit sonore
    // et BLOQUE l'autoplay (le bouton play reste affiché). On force muted + playsInline
    // en JS, puis on (re)tente play() maintenant ET dès que la vidéo est prête.
    v.muted = true;
    v.setAttribute("muted", "");
    v.playsInline = true;
    v.setAttribute("playsinline", "");
    const tryPlay = () => { v.play().catch(() => {}); };
    tryPlay();
    v.addEventListener("canplay", tryPlay, { once: true });
    v.addEventListener("loadeddata", tryPlay, { once: true });
    return () => {
      v.removeEventListener("canplay", tryPlay);
      v.removeEventListener("loadeddata", tryPlay);
    };
  }, []);

  // Écran immersif sombre : on passe le fond <body> en sombre (retiré au démontage)
  // pour que les zones safe-area (bas de la barre Safari, notch) prolongent le noir
  // au lieu d'afficher le gris clair global → plus de bande claire autour de l'écran.
  useEffect(() => {
    document.documentElement.classList.add("pwb-dark");
    return () => document.documentElement.classList.remove("pwb-dark");
  }, []);

  const unlock = async () => {
    posthog.capture("paywall_cta_clicked", { variant: "B" });
    if (demo) { router.push("/routine?demo=1"); return; }
    // Dans l'app iOS : paiement Apple natif (StoreKit) au lieu de Stripe. Design inchangé ;
    // au succès → routine débloquée.
    if (isNativeApp()) {
      setLoading(true);
      startNativePurchase((ok) => { if (ok) router.push(to("/routine")); else setLoading(false); });
      return;
    }
    // Bilan + photo + routine déjà construite mis de côté avant Stripe (réhydratés au
    // retour, après création de compte → deck direct).
    const result = useResult.getState().result;
    if (result) await stashPendingScan(result, useFunnel.getState().answers, useResult.getState().photo, useResult.getState().preparedReco);
    setLoading(true);
    try {
      const res = await fetch("/api/checkout", { method: "POST" });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else setLoading(false);
    } catch {
      setLoading(false);
    }
  };

  // Restauration des achats (obligatoire App Store) : le natif resync StoreKit ; si un
  // achat est retrouvé → accès redonné → routine. Hors app (web) : rien à restaurer.
  const onRestore = () => {
    if (!isNativeApp()) return;
    startNativeRestore((ok) => {
      if (ok) router.push(to("/routine"));
      else alert("No previous purchase found on this Apple ID.");
    });
  };

  return (
    <div className="pwb">
      <video ref={videoRef} className="pw-bg" src="/paywall-b/hero-portrait.mp4" poster="/paywall-b/hero-portrait.png" autoPlay muted loop playsInline />
      <div className="pw-scrim" />
      <div className="pw-grain" />

      <div className="pw-ui">
        <div className="pw-uitop">
          <button type="button" className="pw-icbtn" aria-label="Back to diagnosis" onClick={() => router.push(to("/resultats"))}>
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13L5 8l5-5" /></svg>
          </button>
          <div className="pw-brand"><img src="/paywall-b/logo-smartskin-white.png" alt="SmartSkin AI" height={28} /></div>
          <button type="button" className="pw-restore" onClick={onRestore}>Restore</button>
        </div>

        <div className="pw-spacer" />

        <div className="pw-content">
          <div className="pw-proof">
            <div className="pw-avatars">
              <span className="pw-av a1"><img src="/paywall-b/avatar-1.jpg" alt="" style={{ objectPosition: "center 32%" }} /></span>
              <span className="pw-av a2"><img src="/paywall-b/avatar-2.jpg" alt="" style={{ objectPosition: "center 26%" }} /></span>
              <span className="pw-av a3"><img src="/paywall-b/avatar-3.jpg" alt="" style={{ objectPosition: "center 52%" }} /></span>
              <span className="pw-av a4"><img src="/paywall-b/avatar-4.jpg" alt="" style={{ objectPosition: "68% 28%" }} /></span>
            </div>
            <div className="pw-prooftx">
              <div className="pw-stars">★★★★★</div>
              <div className="pw-proofl">Loved by <b>100 users</b></div>
            </div>
          </div>

          <h1 className="pw-h1">You&apos;re one step away<br />from your glow-up.</h1>

          <div className="pw-feats">
            <div className="pw-feat"><span className="pw-featic"><img src="/paywall-b/ic-routine.png" alt="" /></span><span><b>Morning &amp; evening routine</b> · 8 real products</span></div>
            <div className="pw-feat"><span className="pw-featic"><img src="/paywall-b/ic-dosage.png" alt="" /></span><span>Full dosage, like a prescription</span></div>
            <div className="pw-feat"><span className="pw-featic"><img src="/paywall-b/ic-report.png" alt="" /></span><span>Full report · 16 metrics &amp; actives</span></div>
            <div className="pw-feat"><span className="pw-featic"><img src="/paywall-b/ic-track.png" alt="" /></span><span>Track &amp; re-scan your skin over time</span></div>
          </div>

          <div className="pw-offer">
            <div className="pw-offer-in">
              <div className="pw-offer-top">
                <span className="pw-offer-name">Lifetime access</span>
                <span className="pw-offer-check"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7" /></svg></span>
              </div>
              <div className="pw-offer-price">
                <span className="pw-offer-now">{price}</span>
                <span className="pw-offer-old">$49.95</span>
                <span className="pw-offer-badge">−84%</span>
              </div>
              <div className="pw-offer-meta"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M7 11V8a5 5 0 0 1 10 0v3" /><rect x="5" y="11" width="14" height="9" rx="2.5" /></svg><span>One-time payment · <b>no subscription</b>, yours forever.</span></div>
            </div>
          </div>

          <button type="button" className="pw-cta" onClick={unlock} disabled={loading}>
            <span className="pw-cta-tx">{loading ? "Redirecting to checkout…" : <>Unlock my protocol<small><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l7 3v5c0 4.4-3 7.6-7 9-4-1.4-7-4.6-7-9V6l7-3Z" /><path d="M9 12l2 2 4-4" /></svg>No commitment · one-time payment</small></>}</span>
          </button>

          <div className="pw-fine">
            <span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7" /></svg>Secure payment</span>
          </div>
        </div>
      </div>
    </div>
  );
}
