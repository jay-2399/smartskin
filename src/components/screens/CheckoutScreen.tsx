"use client";
import { useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import posthog from "posthog-js";
import { useResult } from "@/features/analysis/resultStore";
import { useFunnel } from "@/features/funnel/store";
import { stashPendingScan } from "@/features/analysis/pendingScan";
import { isNativeApp, startNativePurchase } from "@/features/checkout/native-purchase";
import { useNativePrice } from "@/features/checkout/useNativePrice";
import "./checkout.css";

/* Checkout / paywall — port de checkout-package/checkout.html (anglais, tokens
   SmartSkin). Paiement RÉEL via Stripe : le CTA crée une session Checkout (/api/checkout)
   et redirige vers la page de paiement Stripe ($7.95). Le webhook accorde l'accès. */

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
  const [plan, setPlan] = useState<"lifetime" | "weekly">("lifetime");
  const price = useNativePrice("$29.95"); // vrai prix localisé Apple dans l'app iOS

  // Un seul handler clic/clavier par carte (Enter/Espace = sélection, façon radio).
  const pick = (p: "lifetime" | "weekly") => (e: { key?: string; preventDefault: () => void }) => {
    if (e.key !== undefined && e.key !== "Enter" && e.key !== " ") return;
    if (e.key !== undefined) e.preventDefault();
    setPlan(p);
  };

  const unlock = async () => {
    posthog.capture("paywall_cta_clicked", { variant: "A", plan });
    // Démo → on saute le paiement. Sinon → session Stripe Checkout puis redirection
    // vers la page de paiement hébergée par Stripe.
    if (demo) { router.push("/routine?demo=1"); return; }
    // Dans l'app iOS : paiement Apple natif (StoreKit) au lieu de Stripe. Cette page
    // (design inchangé) demande l'achat au natif ; au succès → routine débloquée.
    if (isNativeApp()) {
      setLoading(true);
      startNativePurchase(plan, (ok) => { if (ok) router.push(to("/routine")); else setLoading(false); });
      return;
    }
    // On met le bilan + la photo + la routine déjà construite (/preparation) de côté
    // AVANT de partir sur Stripe : au retour (création de compte), la mémoire est vide
    // → on réhydrate depuis là → deck direct, médaillon avec la vraie photo.
    const result = useResult.getState().result;
    if (result) await stashPendingScan(result, useFunnel.getState().answers, useResult.getState().photo, useResult.getState().preparedReco);
    setLoading(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (data.url) window.location.href = data.url;
      else setLoading(false);
    } catch {
      setLoading(false);
    }
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
          </div>
          <video className="hero-video" autoPlay loop muted playsInline poster="/hero-products.png" aria-label="Your routine — real products">
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
              <div className="proof-sub">Already <b>100 users</b></div>
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
              <span className="plan-badge">−62% launch</span>
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
            <span className="cta-tx">{loading ? "Redirecting to checkout…" : "Start my glow-up"}</span>
            <span className="cta-arrow"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12h15M12 5l7 7-7 7" /></svg></span>
          </button>

          <div className="terms"><a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a></div>
        </div>
      </div>
    </div>
  );
}
