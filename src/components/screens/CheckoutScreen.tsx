"use client";
import { useMemo, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
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

  const unlock = async () => {
    // Démo → on saute le paiement. Sinon → session Stripe Checkout puis redirection
    // vers la page de paiement hébergée par Stripe.
    if (demo) { router.push("/routine?demo=1"); return; }
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
              <div className="proof-sub">Already <b>1,000+ users</b></div>
            </div>
          </div>

          <h1>Unlock your <span className="soft">protocol.</span></h1>
          <p className="co-sub">Your morning &amp; evening routine, built for your top 3 priorities.</p>

          <div className="feats">
            <div className="feat"><span className="fcheck"><Check /></span>Your morning &amp; evening routine</div>
            <div className="feat"><span className="fcheck"><Check /></span>Exact doses &amp; order, like a prescription</div>
            <div className="feat"><span className="fcheck"><Check /></span>Your full skin report</div>
            <div className="feat"><span className="fcheck"><Check /></span>Progress tracking &amp; re-scans</div>
          </div>

          <div className="plan">
            <span className="plan-badge">−84% launch</span>
            <span className="plan-check"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7" /></svg></span>
            <div className="plan-info">
              <div className="plan-name">Lifetime access</div>
              <div className="plan-meta">One-time payment · no subscription</div>
            </div>
            <div className="plan-price">
              <div className="pp-now">$7.95</div>
              <div className="pp-old">$49.95</div>
            </div>
          </div>

          <button type="button" className="cta" onClick={unlock} disabled={loading}>
            <span className="cta-tx">{loading ? "Redirecting to checkout…" : <>Unlock my protocol<small>Pay once · keep forever</small></>}</span>
            <span className="cta-arrow"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12h15M12 5l7 7-7 7" /></svg></span>
          </button>

          <div className="co-reassure">
            <span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l7 3v5c0 4.4-3 7.6-7 9-4-1.4-7-4.6-7-9V6l7-3Z" /></svg>Secured by Stripe</span>
          </div>

          <div className="terms"><a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a></div>
        </div>
      </div>
    </div>
  );
}
