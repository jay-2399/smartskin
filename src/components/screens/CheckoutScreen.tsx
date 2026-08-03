"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import posthog from "posthog-js";
import { useResult } from "@/features/analysis/resultStore";
import { useFunnel } from "@/features/funnel/store";
import { stashPendingScan } from "@/features/analysis/pendingScan";
import { isNativeApp, startNativePurchase, startNativeRestore } from "@/features/checkout/native-purchase";
import { useNativePrice } from "@/features/checkout/useNativePrice";
import "./checkout.css";

/* Checkout / paywall — port de checkout-package/checkout.html (anglais, tokens
   SmartSkin). Paiement RÉEL via StoreKit (achat in-app Apple) : le CTA demande l'achat
   au natif, puis /checkout/save (Sign in with Apple) accorde l'accès. Hors app iOS,
   aucun paiement n'est possible — SmartSkin est iOS-exclusif (Stripe retiré). */

const Star = () => (
  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.4l2.9 5.9 6.5.95-4.7 4.6 1.1 6.45L12 17.8l-5.8 3.05 1.1-6.45-4.7-4.6 6.5-.95z" /></svg>
);
const Check = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7" /></svg>
);

export function CheckoutScreen() {
  const router = useRouter();
  // Préserve ?demo=1 à travers le funnel pour un test de bout en bout.
  const demo = useMemo(
    () => typeof window !== "undefined" && new URLSearchParams(window.location.search).has("demo"),
    []
  );
  const to = (path: string) => (demo ? `${path}?demo=1` : path);
  const [loading, setLoading] = useState(false);
  const [indispo, setIndispo] = useState(false);   // paiement tenté hors app iOS
  const [achatKo, setAchatKo] = useState(false);   // achat natif échoué/annulé → feedback visible
  const [plan, setPlan] = useState<"lifetime" | "weekly">("lifetime");
  const price = useNativePrice("$29.95"); // vrai prix localisé Apple dans l'app iOS
  const videoRef = useRef<HTMLVideoElement>(null);

  // iOS/WKWebView : l'autoplay muet exige que la vidéo soit VRAIMENT muette. React
  // n'applique pas toujours l'attribut `muted` au DOM → le navigateur la croit sonore
  // et BLOQUE l'autoplay (le bouton play reste affiché). On force muted + playsInline
  // en JS puis on (re)tente play() maintenant ET dès que la vidéo est prête.
  // prefers-reduced-motion : on fige alors la vidéo sur son poster.
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      v.pause();
      return;
    }
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

  // Un seul handler clic/clavier par carte (Enter/Espace = sélection, façon radio).
  const pick = (p: "lifetime" | "weekly") => (e: { key?: string; preventDefault: () => void }) => {
    if (e.key !== undefined && e.key !== "Enter" && e.key !== " ") return;
    if (e.key !== undefined) e.preventDefault();
    setPlan(p);
  };

  const unlock = async () => {
    setAchatKo(false);
    posthog.capture("paywall_cta_clicked", { variant: "A", plan });
    if (demo) { router.push("/routine?demo=1"); return; }
    // Paiement Apple natif (StoreKit) — seul moyen de paiement depuis le retrait de Stripe.
    if (isNativeApp()) {
      setLoading(true);
      // Scan mis de côté → sauvegardé sur le compte après la connexion.
      const result = useResult.getState().result;
      if (result) await stashPendingScan(result, useFunnel.getState().answers, useResult.getState().photo, useResult.getState().preparedReco);
      // Achat OK → écran de connexion post-paiement (Sign in with Apple → grant → routine).
      startNativePurchase(plan, (ok) => {
        if (ok) { posthog.capture("purchase_completed", { plan, variant: "A" }); router.push(`/checkout/save?plan=${plan}`); }
        // Échec OU annulation (le natif ne distingue pas) : on l'AFFICHE. Sans ça, un
        // StoreKit qui ne charge pas ses produits (rejet 2.1(b)) échouait en silence
        // total — bouton revenu à la normale, zéro feedback.
        else { posthog.capture("purchase_cancelled", { plan, variant: "A" }); setLoading(false); setAchatKo(true); }
      });
      return;
    }
    // Hors app (navigateur) : plus aucun paiement possible — SmartSkin est iOS-exclusif.
    setIndispo(true);
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
    <div className="checkout">
      <div className="co-scroll">
        {/* HERO */}
        <div className="co-hero">
          <div className="hero-grain" />
          <div className="hero-top">
            <button type="button" className="x" aria-label="Close" onClick={() => router.push(to("/resultats"))}>
              <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M2 2l10 10M12 2L2 12" /></svg>
            </button>
            <div className="hero-logo"><Image src="/logo-smartskin.png" alt="SmartSkin AI" width={118} height={23} priority /></div>
            <button type="button" className="co-restore" onClick={onRestore}>Restore</button>
          </div>
          <video ref={videoRef} className="hero-video" autoPlay loop muted playsInline poster="/hero-products.png" aria-label="Your routine — real products">
            <source src="/hero-products.mp4" type="video/mp4" />
          </video>
        </div>

        {/* SHEET */}
        <div className="sheet">
          <div className="grip" />

          <div className="proof">
            <div className="avatars">
              <span className="av av1" /><span className="av av2" /><span className="av av3" /><span className="av av4" />
            </div>
            <div className="proof-tx">
              <div className="stars"><Star /><Star /><Star /><Star /><Star /></div>
              <div className="proof-sub">Already <b>+100 users</b></div>
            </div>
          </div>

          <h1>You&apos;re one step away<br />from your <span className="soft">glow-up.</span></h1>
          <p className="co-sub">A custom routine of real products, made for your skin and your concerns.</p>

          <div className="feats">
            <div className="feat"><span className="fcheck"><Check /></span>Your morning &amp; evening routine</div>
            <div className="feat"><span className="fcheck"><Check /></span>Exact doses &amp; order, like a prescription</div>
            <div className="feat"><span className="fcheck"><Check /></span>Your full skin report</div>
            <div className="feat"><span className="fcheck"><Check /></span>Progress tracking &amp; re-scans</div>
          </div>

          <div className="plans" role="radiogroup" aria-label="Choose your plan">
            <div className={`plan${plan === "lifetime" ? " sel" : ""}`} role="radio" aria-checked={plan === "lifetime"} tabIndex={0}
                 onClick={pick("lifetime")} onKeyDown={pick("lifetime")}>
              <span className="plan-badge">Save 62%</span>
              <div className="plan-top">
                <span className="plan-name">Lifetime</span>
                <span className="plan-radio"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7" /></svg></span>
              </div>
              <div className="plan-price-row">
                <span className="pp-now">{price}</span>
                <span className="pp-old">$79.95</span>
              </div>
            </div>
            <div className={`plan${plan === "weekly" ? " sel" : ""}`} role="radio" aria-checked={plan === "weekly"} tabIndex={0}
                 onClick={pick("weekly")} onKeyDown={pick("weekly")}>
              <div className="plan-top">
                <span className="plan-name">Weekly</span>
                <span className="plan-radio"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7" /></svg></span>
              </div>
              <div className="plan-price-row">
                <span className="pp-now">$4.95</span>
                <span className="pp-unit">/ week</span>
              </div>
            </div>
          </div>

          <div className="co-note">
            {plan === "lifetime" ? (
              <span className="note"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 11V8a5 5 0 0 1 10 0v3" /><rect x="5" y="11" width="14" height="9" rx="2.5" /></svg>One-time payment</span>
            ) : (
              <span className="note"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l7 3v6.2c0 4.8-3.2 8-7 9.8-3.8-1.8-7-5-7-9.8V5l7-3z" /><path d="M9 12l2.2 2.2L15.5 9.8" /></svg>No commitment, cancel anytime</span>
            )}
          </div>

          <button type="button" className="cta" onClick={unlock} disabled={loading}>
            <span className="cta-tx">{loading ? "One moment…" : "Start my glow-up"}</span>
            <span className="cta-arrow"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12h15M12 5l7 7-7 7" /></svg></span>
          </button>
          {indispo && <p className="co-indispo">SmartSkin is available on iPhone — open the app to unlock your routine.</p>}
          {achatKo && <p className="co-indispo">Purchase didn&apos;t complete — nothing was charged. Please try again.</p>}

          <div className="terms"><a href="/terms">Terms of Service</a> and <a href="/privacy">Privacy Policy</a></div>
        </div>
      </div>
    </div>
  );
}
