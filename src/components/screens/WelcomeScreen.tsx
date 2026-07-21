"use client";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import "./welcome.css";

// Renvoi du jeton Apple par le natif (window.__SMARTSKIN_NATIVE__ / webkit sont
// déjà déclarés côté CaptureScreen).
declare global {
  interface Window {
    __smartskinAppleAuth?: (idToken: string) => void;
  }
}

/* Écran d'entrée de l'app — porté de welcome-liquid-glass/preview.html (maquette validée).
   Portrait full-bleed + 3 cartes liquid glass (vrais composants app : jauge de score,
   type de peau, étape 1 routine) + bottom sheet (Continue with Apple / guest).
   Flow visé : Continue with Apple → (a un scan ? dashboard : scan) ; guest → scan.
   ⚠️ TODO(auth) : l'auth Apple native n'est pas encore construite → les 2 boutons
   mènent au scan pour l'instant. Brancher le pont natif Sign in with Apple ensuite. */

export function WelcomeScreen() {
  const router = useRouter();
  const gaugeRef = useRef<HTMLDivElement>(null);
  const isNative = typeof window !== "undefined" && window.__SMARTSKIN_NATIVE__ === true;

  // Jauge de score animée (port du builder SVG de l'écran Résultats).
  useEffect(() => {
    const el = gaugeRef.current;
    if (el && !el.querySelector("svg")) buildGauge(el);
  }, []);

  // Pont Apple : le natif ouvre la feuille Sign in with Apple (Face ID) et renvoie
  // le jeton ici → on ouvre la session NextAuth (provider "apple") puis on route.
  useEffect(() => {
    if (!isNative) return;
    window.__smartskinAppleAuth = async (idToken: string) => {
      const res = await signIn("apple", { idToken, redirect: false });
      if (res?.ok) router.push("/dashboard");
    };
    return () => { delete window.__smartskinAppleAuth; };
  }, [isNative, router]);

  const startScan = () => router.push("/questions/age");
  const continueWithApple = () => {
    if (isNative) window.webkit?.messageHandlers?.native?.postMessage({ action: "signInWithApple" });
    else startScan(); // hors app : Apple natif indisponible → on démarre le scan
  };

  return (
    <div className="welcome">
      <div className="media">
        {/* eslint-disable-next-line @next/next/no-img-element -- portrait détouré positionné en absolu (next/image gêne le layout) */}
        <img className="portrait" src="/welcome-portrait.png" alt="AI face analysis" />

        <div className="mcard m-gauge">
          <div className="g-eyebrow">Diagnostic result</div>
          <div ref={gaugeRef} className="scoregauge" data-value="84" data-state="Good overall" data-sub="You're on track." />
        </div>

        <div className="mcard m-type">
          <div className="t-label">Skin type</div>
          <div className="t-val">Combination</div>
          <div className="t-swatches">
            <span className="sw" style={{ background: "#F0D9C0" }} />
            <span className="sw" style={{ background: "#E3C29F" }} />
            <span className="sw on" style={{ background: "#CD9F72" }} />
            <span className="sw" style={{ background: "#B07E4F" }} />
            <span className="sw" style={{ background: "#7E5230" }} />
          </div>
        </div>

        <div className="mcard m-step">
          <div className="st-head">
            <span className="st-num">1</span>
            <span className="st-tag">Cleanser</span>
            <span className="st-brand">La Roche-Posay</span>
          </div>
          <div className="st-body">
            {/* eslint-disable-next-line @next/next/no-img-element -- visuel produit simple */}
            <div className="st-img"><img src="/prod-effaclar.png" alt="" /></div>
            <div>
              <div className="st-name">Effaclar Gel Cleanser</div>
              <div className="st-price">$18.99</div>
            </div>
          </div>
        </div>
      </div>

      <div className="sheet">
        {/* eslint-disable-next-line @next/next/no-img-element -- logo */}
        <h1 className="w-brand"><img src="/logo-smartskin.png" alt="SmartSkin AI" /></h1>
        <p className="tagline">Sign in to start your skin analysis.</p>

        {/* TODO(auth) : brancher sur le pont natif Sign in with Apple. */}
        <button type="button" className="apple-btn" onClick={continueWithApple}>
          <svg viewBox="0 0 814 1000" width="16" height="19" fill="#fff" aria-hidden="true"><path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76.5 0-103.7 40.8-165.9 40.8s-105.6-57-155.5-127C46.7 790.7 0 663 0 541.8c0-194.4 126.4-297.5 250.8-297.5 66.1 0 121.2 43.4 162.7 43.4 39.5 0 101.1-46 176.3-46 28.5 0 130.9 2.6 198.3 99.2zm-234-181.5c31.1-36.9 53.1-88.1 53.1-139.3 0-7.1-.6-14.3-1.9-20.1-50.6 1.9-110.8 33.7-147.1 75.8-28.5 32.4-55.1 83.6-55.1 135.5 0 7.8 1.3 15.6 1.9 18.1 3.2.6 8.4 1.3 13.6 1.3 45.4 0 102.5-30.4 135.5-71.3z" /></svg>
          <span>Continue with Apple</span>
        </button>

        <button type="button" className="ghost" onClick={startScan}>Continue without an account</button>

        <div className="privacy">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M7 1.4 11.4 3.1V6.8c0 2.9-1.9 4.9-4.4 5.8-2.5-.9-4.4-2.9-4.4-5.8V3.1z" /><path d="m5 6.9 1.4 1.4L9.2 5.5" /></svg>
          Secure sign in. Your photo is never stored.
        </div>
      </div>
    </div>
  );
}

/* Builder de la jauge de score (SVG), porté 1:1 de l'écran Résultats
   (reference 11-prop_1-resultats.html) : arc dégradé + ticks + aiguille + compteur. */
function buildGauge(el: HTMLDivElement) {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const cx = 120, cy = 118, R = 90, bw = 20, sA = -90, eA = 90, span = eA - sA;
  const pol = (a: number, r: number): [number, number] => {
    const t = (a * Math.PI) / 180;
    return [cx + r * Math.sin(t), cy - r * Math.cos(t)];
  };
  const arc = (a1: number, a2: number, r: number) => {
    const p1 = pol(a1, r), p2 = pol(a2, r), lg = a2 - a1 > 180 ? 1 : 0;
    return `M${p1[0].toFixed(2)} ${p1[1].toFixed(2)} A${r} ${r} 0 ${lg} 1 ${p2[0].toFixed(2)} ${p2[1].toFixed(2)}`;
  };
  let tickStr = "";
  const n = 28;
  for (let i = 0; i <= n; i++) {
    const a = sA + (span * i) / n, p1 = pol(a, R + 5), p2 = pol(a, R - 1);
    tickStr += `<line class="sg-tick" x1="${p1[0].toFixed(1)}" y1="${p1[1].toFixed(1)}" x2="${p2[0].toFixed(1)}" y2="${p2[1].toFixed(1)}"/>`;
  }
  const value = Math.max(0, Math.min(100, Number(el.dataset.value) || 0));
  const vA = sA + (span * value) / 100;

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 240 168");
  svg.setAttribute("class", "sg-svg");
  svg.innerHTML =
    '<defs><linearGradient id="sgbgrad" x1="0" y1="1" x2="1" y2="0"><stop offset="0%" stop-color="#DCEFFA"/><stop offset="48%" stop-color="#83C8EE"/><stop offset="100%" stop-color="#1F97DC"/></linearGradient>' +
    '<filter id="sgbglow" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="3.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>' +
    `<path class="sg-track" d="${arc(sA, eA, R)}" fill="none" stroke-width="${bw}" stroke-linecap="round"/>` +
    `<path class="sg-fill" d="${arc(sA, vA, R)}" fill="none" stroke="url(#sgbgrad)" stroke-width="${bw}" stroke-linecap="round" filter="url(#sgbglow)"/>` +
    tickStr +
    `<g class="sg-needle"><line class="sg-needle-l" x1="120" y1="${cy - (R + 6)}" x2="120" y2="${cy - (R - bw - 2)}"/></g>` +
    '<text class="sg-num" x="120" y="150" text-anchor="middle">0</text>';
  el.insertBefore(svg, el.firstChild);

  if (el.dataset.state) { const st = document.createElement("div"); st.className = "sg-state"; st.textContent = el.dataset.state; el.appendChild(st); }
  if (el.dataset.sub) { const su = document.createElement("div"); su.className = "sg-sub"; su.textContent = el.dataset.sub; el.appendChild(su); }

  const fill = svg.querySelector<SVGPathElement>(".sg-fill")!;
  const needle = svg.querySelector<SVGGElement>(".sg-needle")!;
  const num = svg.querySelector<SVGTextElement>(".sg-num")!;
  if (reduced) { needle.style.transform = `rotate(${vA}deg)`; num.textContent = String(value); return; }

  const L = fill.getTotalLength();
  fill.style.strokeDasharray = String(L);
  fill.style.strokeDashoffset = String(L);
  needle.style.transform = `rotate(${sA}deg)`;
  setTimeout(() => {
    fill.style.strokeDashoffset = "0";
    needle.style.transform = `rotate(${vA}deg)`;
    const dur = 1550;
    let t0: number | null = null;
    const step = (ts: number) => {
      if (t0 === null) t0 = ts;
      const p = Math.min((ts - t0) / dur, 1), e = 1 - Math.pow(1 - p, 3);
      num.textContent = String(Math.round(value * e));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, 700);
}
