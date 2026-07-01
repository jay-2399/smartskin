"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import posthog from "posthog-js";
import "./paywall-b.css";

/* Paywall — Variant B (dark immersif) pour l'A/B test. Port de paywall/B/paywall.html.
   Même logique de paiement que le Variant A (CheckoutScreen) : CTA → /api/checkout →
   page Stripe ($7.95) ; le webhook accorde l'accès. En démo (?demo=1) : on saute le
   paiement et on enchaîne sur /routine?demo=1. Classes préfixées .pw- (isolation). */

const Check = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7" /></svg>
);

export function PaywallB() {
  const router = useRouter();
  const demo = useMemo(
    () => typeof window !== "undefined" && new URLSearchParams(window.location.search).has("demo"),
    []
  );
  const to = (path: string) => (demo ? `${path}?demo=1` : path);
  const [loading, setLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // prefers-reduced-motion : on fige la vidéo sur son poster.
  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      videoRef.current?.pause();
    }
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
          <button type="button" className="pw-restore" onClick={() => router.push("/login")}>Restore</button>
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
              <div className="pw-proofl">Loved by <b>1,000+ users</b></div>
            </div>
          </div>

          <h1 className="pw-h1">Your protocol<br /><span className="pw-soft">is</span> ready.</h1>
          <p className="pw-sub">Your morning &amp; evening routine, <b>made specifically for your skin</b>.</p>

          <div className="pw-feats">
            <div className="pw-feat"><span className="pw-ck"><Check /></span><span><b>Morning &amp; evening routine</b> · 8 real products</span></div>
            <div className="pw-feat"><span className="pw-ck"><Check /></span><span>Full dosage, like a prescription</span></div>
            <div className="pw-feat"><span className="pw-ck"><Check /></span><span>Full report · 16 metrics &amp; actives</span></div>
            <div className="pw-feat"><span className="pw-ck"><Check /></span><span>Track &amp; re-scan your skin over time</span></div>
          </div>

          <div className="pw-offer">
            <div className="pw-offer-top">
              <span className="pw-offer-name">Lifetime access</span>
              <span className="pw-offer-badge">−84%</span>
            </div>
            <div className="pw-offer-price">
              <span className="pw-offer-now">$7.95</span>
              <span className="pw-offer-old">$49.95</span>
            </div>
            <div className="pw-offer-meta">One-time payment · <b>no subscription</b>, yours forever.</div>
          </div>

          <button type="button" className="pw-cta" onClick={unlock} disabled={loading}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 11V8a5 5 0 0 1 9.9-1" /><rect x="5" y="11" width="14" height="9" rx="2.5" /><path d="M12 15v2" /></svg>
            <span>{loading ? "Redirecting to checkout…" : "Unlock my protocol · $7.95"}</span>
          </button>

          <div className="pw-fine">
            <span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7" /></svg>Secure payment</span>
            <span className="pw-sep">·</span><span>no subscription</span>
          </div>
        </div>
      </div>
    </div>
  );
}
