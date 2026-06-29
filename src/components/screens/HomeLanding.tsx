"use client";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useFunnel } from "@/features/funnel/store";
import { useResult } from "@/features/analysis/resultStore";
import "./home.css";

/* Home marketing (1ʳᵉ page du scan). Isolée de funnel.css via la route (home).
   Les CTA lancent le scan ; nav / footer sont décoratifs. */

const AV = [1, 2, 3, 4].map((n) => `https://smart-skin.ai/avatar-${n}.jpg`);

const QROWS: [string, string][] = [
  ["Skin type", "Combination"], ["Sensitivity", "Moderate"], ["Goal", "Acne"], ["Age", "25–34"],
  ["Sun", "Type III"], ["Routine", "5 min"], ["Budget", "~$50"], ["Allergies", "None"],
];
const PCARDS = [
  { step: 1, img: "/prod-effaclar.png", brand: "La Roche-Posay", name: "Effaclar Gel Cleanser", price: "$18.99" },
  { step: 2, img: "/prod-niacinamide.png", brand: "The Ordinary", name: "Niacinamide 10%", price: "$6.50" },
  { step: 3, img: "/prod-typology.png", brand: "Typology", name: "A31 Hydrating Serum", price: "~$30" },
  { step: 4, img: "/prod-dralthea.png", brand: "Dr. Althea", name: "345 Relief Cream", price: "$24–27" },
  { step: 5, img: "/prod-paula.png", brand: "Paula's Choice", name: "2% BHA Exfoliant", price: "$37" },
];

const Pcard = ({ p }: { p: (typeof PCARDS)[number] }) => (
  <div className="pcard2">
    <div className="pcard2-img"><span className="pcard2-step">{p.step}</span><img src={p.img} alt="" /></div>
    <div className="pcard2-brand">{p.brand}</div>
    <div className="pcard2-name">{p.name}</div>
    <div className="pcard2-price">{p.price}</div>
  </div>
);

export function HomeLanding() {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);

  const start = () => {
    useFunnel.getState().reset();
    useResult.getState().clear();
    router.push("/questions/age");
  };

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const rafs: number[] = [];

    /* ── jauges (hero + diagnostic) ── */
    const cx = 120, cy = 118, R = 90, bw = 20, sA = -90, eA = 90, span = eA - sA;
    const pol = (a: number, r: number) => { const t = (a * Math.PI) / 180; return [cx + r * Math.sin(t), cy - r * Math.cos(t)]; };
    const arc = (a1: number, a2: number, r: number) => {
      const p1 = pol(a1, r), p2 = pol(a2, r), lg = a2 - a1 > 180 ? 1 : 0;
      return `M${p1[0].toFixed(2)} ${p1[1].toFixed(2)} A${r} ${r} 0 ${lg} 1 ${p2[0].toFixed(2)} ${p2[1].toFixed(2)}`;
    };
    const ticks = () => {
      let s = ""; const n = 28;
      for (let i = 0; i <= n; i++) { const a = sA + (span * i) / n, p1 = pol(a, R + 5), p2 = pol(a, R - 1); s += `<line class="gtick" x1="${p1[0].toFixed(1)}" y1="${p1[1].toFixed(1)}" x2="${p2[0].toFixed(1)}" y2="${p2[1].toFixed(1)}"/>`; }
      return s;
    };
    let gid = 0;
    const build = (el: HTMLElement) => {
      if (el.querySelector(".gsvg")) return; // évite le double-build (StrictMode)
      const value = Math.max(0, Math.min(100, +(el.dataset.value || 0)));
      const vA = sA + (span * value) / 100, ns = "http://www.w3.org/2000/svg", uid = "g" + gid++;
      const svg = document.createElementNS(ns, "svg");
      svg.setAttribute("viewBox", "0 0 240 168"); svg.setAttribute("class", "gsvg");
      svg.innerHTML =
        `<defs><linearGradient id="${uid}grad" x1="0" y1="1" x2="1" y2="0"><stop offset="0%" stop-color="#DCEFFA"/><stop offset="48%" stop-color="#83C8EE"/><stop offset="100%" stop-color="#1F97DC"/></linearGradient>` +
        `<filter id="${uid}glow" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="3.4" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>` +
        `<path class="gtrack" d="${arc(sA, eA, R)}" fill="none" stroke-width="${bw}" stroke-linecap="round"/>` +
        `<path class="gfill" d="${arc(sA, vA, R)}" fill="none" stroke="url(#${uid}grad)" stroke-width="${bw}" stroke-linecap="round" filter="url(#${uid}glow)"/>` +
        ticks() +
        `<g class="gneedle"><line class="gneedle-l" x1="120" y1="${cy - (R + 6)}" x2="120" y2="${cy - (R - bw - 2)}"/></g>` +
        `<text class="gnum" x="120" y="150" text-anchor="middle">0</text>`;
      el.insertBefore(svg, el.firstChild);
      if (el.dataset.state) { const st = document.createElement("div"); st.className = "gauge-state"; st.textContent = el.dataset.state; el.appendChild(st); }
      if (el.dataset.sub) { const su = document.createElement("div"); su.className = "gauge-sub"; su.textContent = el.dataset.sub; el.appendChild(su); }
      const fill = svg.querySelector(".gfill") as SVGPathElement, L = fill.getTotalLength();
      fill.style.strokeDasharray = String(L); fill.style.strokeDashoffset = String(L);
      const needle = svg.querySelector(".gneedle") as SVGGElement; needle.style.transform = `rotate(${sA}deg)`;
      const num = svg.querySelector(".gnum") as SVGTextElement;
      requestAnimationFrame(() => requestAnimationFrame(() => {
        fill.style.strokeDashoffset = "0";
        needle.style.transform = `rotate(${vA}deg)`;
        const dur = 1450; let t0: number | null = null;
        const step = (ts: number) => { if (!t0) t0 = ts; const p = Math.min((ts - t0) / dur, 1), e = 1 - Math.pow(1 - p, 3); num.textContent = String(Math.round(value * e)); if (p < 1) rafs.push(requestAnimationFrame(step)); };
        rafs.push(requestAnimationFrame(step));
      }));
    };
    root.querySelectorAll<HTMLElement>(".gauge").forEach(build);

    /* ── feed de questions : effet centre ── */
    const feed = root.querySelector<HTMLElement>(".qfeed");
    if (feed) {
      const rows = Array.from(feed.querySelectorAll<HTMLElement>(".qrow"));
      const tick = () => {
        const fr = feed.getBoundingClientRect(), cyc = fr.top + fr.height / 2, half = fr.height / 2;
        let best: HTMLElement | null = null, bestD = Infinity;
        for (const r of rows) {
          const rr = r.getBoundingClientRect(), d = Math.abs(rr.top + rr.height / 2 - cyc), nrm = Math.min(d / half, 1);
          r.style.opacity = (1 - nrm * 0.7).toFixed(3);
          r.style.transform = `scale(${(0.93 + (1 - nrm) * 0.12).toFixed(3)})`;
          if (d < bestD) { bestD = d; best = r; }
        }
        for (const r of rows) r.classList.toggle("on", r === best && best != null && bestD < best.offsetHeight * 0.62);
        rafs.push(requestAnimationFrame(tick));
      };
      rafs.push(requestAnimationFrame(tick));
    }

    /* ── reveal au scroll du panneau CTA ── */
    const panel = root.querySelector(".cta-panel");
    let obs: IntersectionObserver | null = null;
    if (panel) {
      obs = new IntersectionObserver((entries) => {
        for (const en of entries) if (en.isIntersecting) { en.target.classList.add("in"); obs?.unobserve(en.target); }
      }, { threshold: 0.2 });
      obs.observe(panel);
    }

    return () => { rafs.forEach(cancelAnimationFrame); obs?.disconnect(); };
  }, []);

  const noNav = (e: React.MouseEvent) => e.preventDefault();

  return (
    <div className="home-root" ref={rootRef}>

      {/* ═══ SECTION 1 — HERO ═══ */}
      <div className="s-hero">
        <nav className="nav">
          <a href="#" onClick={noNav}><img src="/logo-smartskin.png" alt="SmartSkin AI" /></a>
          <button className="nav-login" onClick={() => router.push("/login")}>Login</button>
        </nav>

        <div className="hero-wrap">
          <section className="hero">
            <div className="copy">
              <div className="social">
                <div className="avatars">
                  <span className="av a1"><img src={AV[0]} alt="" width={40} height={40} style={{ objectPosition: "center 32%" }} /></span>
                  <span className="av a2"><img src={AV[1]} alt="" width={40} height={40} style={{ objectPosition: "center 26%" }} /></span>
                  <span className="av a3"><img src={AV[2]} alt="" width={40} height={40} style={{ objectPosition: "center 52%" }} /></span>
                  <span className="av a4"><img src={AV[3]} alt="" width={40} height={40} style={{ objectPosition: "68% 28%" }} /></span>
                </div>
                <div className="social-divider" />
                <div className="social-tx">
                  <div className="stars">★★★★★</div>
                  <div className="social-l">Loved by <b>1,000+ users</b></div>
                </div>
              </div>
              <h1 className="title"><span className="soft">Better skin</span> starts with the right <span className="soft">routine.</span></h1>
              <div className="reassure">
                <span className="ra"><span className="ck"><svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path strokeWidth="1.6" d="M3.4 7.6 6 10.2 10.6 4.4" /></svg></span>Built for your skin</span>
                <span className="ra-sep"></span>
                <span className="ra"><span className="ck"><svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path strokeWidth="1.6" d="M3.4 7.6 6 10.2 10.6 4.4" /></svg></span>Unbiased picks</span>
                <span className="ra-sep"></span>
                <span className="ra"><span className="ck"><svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path strokeWidth="1.6" d="M3.4 7.6 6 10.2 10.6 4.4" /></svg></span>Stop wasting money</span>
              </div>
              <p className="subtitle">Snap a photo and our AI finds <b>the products that actually work</b> on your acne, pores, wrinkles or dark spots — so you stop wasting money on the ones that don’t.</p>
              <div className="cta-zone">
                <button className="cta-btn" onClick={start}>
                  <span>Fix my skin <em style={{ fontStyle: "italic", fontWeight: 500 }}>in 1 min</em></span>
                  <svg width="17" height="17" viewBox="0 0 17 17" fill="none"><path d="M3 8.5h9M8 4l4.5 4.5L8 13" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
              </div>
            </div>

            <img className="woman" src="/woman-acne.png" alt="Skin analysis" width={900} height={1100} fetchPriority="high" decoding="async" />

            <div className="reco-card rc1">
              <div className="reco-img"><img src="/prod-effaclar.png" alt="La Roche-Posay Effaclar" /></div>
              <div className="reco-brand">La Roche-Posay</div>
              <div className="reco-name">Effaclar Gel Cleanser</div>
              <span className="reco-price">$18.99</span>
            </div>
            <div className="reco-card rc2">
              <div className="reco-img"><img src="/prod-dralthea.png" alt="Dr. Althea 345 Relief Cream" /></div>
              <div className="reco-brand">Dr. Althea</div>
              <div className="reco-name">345 Relief Cream</div>
              <span className="reco-price">$24.00</span>
            </div>
            <div className="reco-card rc3">
              <div className="reco-img"><img src="/prod-paula.png" alt="Paula's Choice 2% BHA" /></div>
              <div className="reco-brand">Paula's Choice</div>
              <div className="reco-name">2% BHA Liquid Exfoliant</div>
              <span className="reco-price">$35.00</span>
            </div>

            <div className="scan-card">
              <div className="gauge" data-value="36" data-state="Needs work"></div>
              <div className="scan-metrics">
                <div className="sm-row"><span className="sm-label">Blemishes</span><span className="sm-bar"><i style={{ width: "56%" }}></i></span><span className="sm-val">Moderate</span></div>
                <div className="sm-row"><span className="sm-label">Pores</span><span className="sm-bar"><i style={{ width: "62%" }}></i></span><span className="sm-val">Visible</span></div>
                <div className="sm-row"><span className="sm-label">Glow</span><span className="sm-bar"><i style={{ width: "73%" }}></i></span><span className="sm-val">Good</span></div>
              </div>
              <div className="scan-tag">Combination skin · Oily T-zone</div>
            </div>
          </section>
        </div>
      </div>

      {/* ═══ SECTION 2 — HOW IT WORKS ═══ */}
      <section className="s-how" id="how">
        <div className="wrap">
          <header className="shead">
            <span className="eyebrow"><span className="dot"></span>How it works</span>
            <h2>From your photo to your routine,<br /><span className="soft">in 5 steps.</span></h2>
            <p>An AI that truly gets your skin — <b>scan</b>, diagnosis, custom routine and <b>tracking</b> over time.</p>
          </header>

          <section className="bento">
            <article className="card b01">
              <div className="c-left2">
                <div className="c-top"><span className="tag green">Scan</span><span className="num">01</span></div>
                <h2 className="c-title">Scan your skin in 30 seconds</h2>
                <p className="c-desc">One photo — our AI reads <b>12 zones</b> and <b>40+ skin markers</b>.</p>
              </div>
              <div className="vf">
                <img src="/capture-face.jpg" alt="" />
                <div className="vf-badge"><span className="pulse"></span>Face detected</div>
                <svg className="vf-svg" viewBox="0 0 300 254" preserveAspectRatio="xMidYMid slice">
                  <ellipse className="vf-oval" cx="150" cy="120" rx="78" ry="98" />
                  <circle className="vf-mk" cx="150" cy="58" r="2" style={{ animationDelay: ".1s" }} />
                  <circle className="vf-mk" cx="116" cy="92" r="2" style={{ animationDelay: ".5s" }} />
                  <circle className="vf-mk" cx="184" cy="92" r="2" style={{ animationDelay: ".9s" }} />
                  <circle className="vf-mk" cx="150" cy="120" r="2" style={{ animationDelay: ".3s" }} />
                  <circle className="vf-mk" cx="124" cy="150" r="2" style={{ animationDelay: "1.2s" }} />
                  <circle className="vf-mk" cx="176" cy="150" r="2" style={{ animationDelay: ".7s" }} />
                  <circle className="vf-mk" cx="150" cy="178" r="2" style={{ animationDelay: "1s" }} />
                  <path className="vf-corner" d="M20 40v-14a6 6 0 0 1 6-6h14" />
                  <path className="vf-corner" d="M280 40v-14a6 6 0 0 0-6-6h-14" />
                  <path className="vf-corner" d="M20 214v14a6 6 0 0 0 6 6h14" />
                  <path className="vf-corner" d="M280 214v14a6 6 0 0 1-6 6h-14" />
                </svg>
                <div className="vf-stats">
                  <div className="vf-chip"><b>12</b>zones</div>
                  <div className="vf-chip"><b>40+</b>markers</div>
                  <div className="vf-chip"><b>30s</b>scan</div>
                </div>
              </div>
            </article>

            <article className="card b02">
              <div className="c-left2">
                <div className="c-top"><span className="tag">Profile</span><span className="num">02</span></div>
                <h2 className="c-title">Answer 8 targeted questions</h2>
                <p className="c-desc">Lifestyle, sensitivities, goals — to sharpen the diagnosis.</p>
              </div>
              <div className="qfeed">
                <div className="qfeed-track">
                  {[...QROWS, ...QROWS].map(([t, a], i) => (
                    <div className="qrow" key={i}><span className="ql"><span className="qi"></span><span className="qt">{t}</span></span><span className="qa">{a}</span></div>
                  ))}
                </div>
              </div>
            </article>

            <article className="card b03">
              <div className="c-top"><span className="tag">Diagnosis</span><span className="num">03</span></div>
              <h2 className="c-title">Get your skin score</h2>
              <div className="gauge" data-value="47" data-state="Room to improve"></div>
            </article>

            <article className="card b04">
              <div className="c-top"><span className="tag sand">Routine</span><span className="num">04</span></div>
              <h2 className="c-title">A custom protocol, step by step</h2>
              <p className="c-desc">A daily routine to follow — <b>every product</b> picked for your skin.</p>
              <div className="pscroll">
                <div className="pscroll-track">
                  {[...PCARDS, ...PCARDS].map((p, i) => <Pcard p={p} key={i} />)}
                </div>
              </div>
            </article>

            <article className="card b05">
              <div className="c-top"><span className="tag green">Tracking</span><span className="num">05</span></div>
              <h2 className="c-title">Track your progress over time</h2>
              <div className="chart">
                <div className="chart-head">
                  <span className="chart-delta"><svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M2 8.5l3-3 2.2 2.2L10.5 3M10.5 3H8M10.5 3v2.5" /></svg>+16 pts</span>
                  <span className="chart-scale">/ 100</span>
                </div>
                <svg viewBox="0 0 320 128">
                  <defs>
                    <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="rgba(166,195,214,0.42)" />
                      <stop offset="100%" stopColor="rgba(166,195,214,0)" />
                    </linearGradient>
                  </defs>
                  <line className="ch-grid" x1="0" y1="32" x2="320" y2="32" />
                  <line className="ch-grid" x1="0" y1="68" x2="320" y2="68" />
                  <line className="ch-grid" x1="0" y1="104" x2="320" y2="104" />
                  <path className="ch-area" d="M20 79 L113 63 L206 49 L300 36 L300 110 L20 110 Z" />
                  <path className="ch-line" d="M20 79 L113 63 L206 49 L300 36" />
                  <circle className="ch-dot ch-d1" cx="20" cy="79" r="4.5" />
                  <circle className="ch-dot ch-d2" cx="113" cy="63" r="4.5" />
                  <circle className="ch-dot ch-d3" cx="206" cy="49" r="4.5" />
                  <circle className="ch-dot ch-d4 last" cx="300" cy="36" r="6" />
                  <text className="ch-flag" x="300" y="22">84</text>
                  <text className="ch-xlab" x="20" y="124">M1</text>
                  <text className="ch-xlab" x="113" y="124">M2</text>
                  <text className="ch-xlab" x="206" y="124">M3</text>
                  <text className="ch-xlab" x="300" y="124">M4</text>
                </svg>
              </div>
            </article>
          </section>
        </div>
      </section>

      {/* ═══ SECTION 3 — FINAL CTA ═══ */}
      <section className="s-cta">
        <div className="cta-panel">
          <div className="cta-glow1"></div>
          <div className="cta-glow2"></div>
          <div className="cta-dots"></div>
          <div className="cta-social">
            <div className="cta-avatars">
              {AV.map((src, i) => <span className="cav" key={i}><img src={src} alt="" /></span>)}
            </div>
            <div>
              <div className="cta-stars">★★★★★</div>
              <div className="cta-soc-l">Loved by <b>1,000+ users</b></div>
            </div>
          </div>
          <h2 className="cta-h">Your skin deserves better<br />than <span className="hl">guesswork.</span></h2>
          <p className="cta-sub">In <b>1 minute</b>, get a precise diagnosis and the routine made for you.</p>
          <div className="cta-go-wrap">
            <button className="cta-go" onClick={start}>
              Fix my skin in 1 min
              <svg width="17" height="17" viewBox="0 0 17 17" fill="none"><path d="M3 8.5h9M8 4l4.5 4.5L8 13" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          </div>
          <img className="cta-phone" src="/home-cta-phone.png" alt="The SmartSkin app on iPhone" />
        </div>

        <footer className="site-foot">
          <img src="/logo-smartskin.png" alt="SmartSkin AI" />
          <div className="foot-links">
            <a href="#" onClick={noNav}>Articles</a>
            <a href="#" onClick={noNav}>Ingredients</a>
            <a href="#" onClick={noNav}>Comparisons</a>
            <a href="#" onClick={noNav}>Skin types</a>
          </div>
          <div className="foot-copy">© 2026 SmartSkin™</div>
        </footer>
      </section>

    </div>
  );
}
