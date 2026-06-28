"use client";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useFunnel } from "@/features/funnel/store";
import { useResult } from "@/features/analysis/resultStore";
import "./home.css";

/* Home marketing (1ʳᵉ page du scan) — reproduction fidèle de home-v2.html.
   Isolée de funnel.css via la route (home). Les CTA lancent le scan ;
   nav / cartes ingrédients / footer sont décoratifs. */

const AV = [1, 2, 3, 4].map((n) => `https://smart-skin.ai/avatar-${n}.jpg`);
const ING = "https://yitigxyfibpqvhkrwuiz.supabase.co/storage/v1/object/public/content-images/ingredients";

type Ingr = { fam: string; key: string; img: string; family: string; name: string; ben: string };
const ROW_A: Ingr[] = [
  { fam: "f-imperf", key: "niacinamide", img: `${ING}/niacinamide/cover-35a901a1.jpg`, family: "Sébum & pores", name: "Niacinamide", ben: "Resserre, matifie, apaise" },
  { fam: "f-hydra", key: "acide-hyaluronique", img: `${ING}/acide-hyaluronique/cover-ec09473f.jpg`, family: "Hydratation", name: "Acide Hyaluronique", ben: "Repulpe & retient l'eau" },
  { fam: "f-age", key: "retinol", img: `${ING}/retinol/cover-e23ce5ec.jpg`, family: "Anti-âge", name: "Rétinol", ben: "Rides & renouvellement" },
  { fam: "f-eclat", key: "vitamine-c", img: `${ING}/vitamine-c/cover-5f1baeb3.jpg`, family: "Éclat", name: "Vitamine C", ben: "Anti-taches, coup d'éclat" },
  { fam: "f-imperf", key: "acide-salicylique", img: `${ING}/acide-salicylique/cover-9ef058e3.jpg`, family: "Anti-imperfections", name: "Acide Salicylique", ben: "Désincruste les pores (BHA)" },
  { fam: "f-age", key: "peptides", img: `${ING}/peptides/cover-fdf058a1.jpg`, family: "Fermeté", name: "Peptides", ben: "Soutien & rebond" },
];
const ROW_B: Ingr[] = [
  { fam: "f-age", key: "bakuchiol", img: `${ING}/bakuchiol/cover-4a71181b.jpg`, family: "Anti-âge doux", name: "Bakuchiol", ben: "L'alternative au rétinol" },
  { fam: "f-soothe", key: "acide-azelaique", img: `${ING}/acide-azelaique/hero.png`, family: "Anti-rougeurs", name: "Acide Azélaïque", ben: "Rosacée & taches" },
  { fam: "f-hydra", key: "ceramides", img: `${ING}/ceramides/cover-fbbe95ca.jpg`, family: "Barrière", name: "Céramides", ben: "Répare & protège" },
  { fam: "f-eclat", key: "acide-glycolique", img: `${ING}/acide-glycolique/cover-abc52acb.jpg`, family: "Exfoliant", name: "Acide Glycolique", ben: "Lisse le grain (AHA)" },
  { fam: "f-soothe", key: "panthenol", img: `${ING}/panthenol/cover-b54e51cd.jpg`, family: "Réparateur", name: "Panthénol (B5)", ben: "Apaise & hydrate" },
  { fam: "f-eclat", key: "acide-mandelique", img: `${ING}/acide-mandelique/cover-ec8a0479.jpg`, family: "Exfoliant doux", name: "Acide Mandélique", ben: "Pour peaux sensibles" },
];
const QROWS: [string, string][] = [
  ["Type de peau", "Mixte"], ["Sensibilité", "Modérée"], ["Objectif", "Acné"], ["Âge", "25–34"],
  ["Soleil", "Type III"], ["Routine", "5 min"], ["Budget", "~$50"], ["Allergies", "Aucune"],
];
const PCARDS = [
  { step: 1, img: "/prod-effaclar.png", brand: "La Roche-Posay", name: "Effaclar Gel Cleanser", price: "$18.99" },
  { step: 2, img: "/prod-niacinamide.png", brand: "The Ordinary", name: "Niacinamide 10%", price: "$6.50" },
  { step: 3, img: "/prod-typology.png", brand: "Typology", name: "A31 Sérum Hydratant", price: "~$30" },
  { step: 4, img: "/prod-dralthea.png", brand: "Dr. Althea", name: "345 Relief Cream", price: "$24–27" },
  { step: 5, img: "/prod-paula.png", brand: "Paula's Choice", name: "2% BHA Exfoliant", price: "$37" },
];

const Arrow = ({ s = 14 }: { s?: number }) => (
  <svg width={s} height={s} viewBox="0 0 16 16" fill="none"><path d="M3 8h9M8 4l4 4-4 4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
);
const IngCard = ({ d, hidden }: { d: Ingr; hidden?: boolean }) => (
  <a className={`ing ${d.fam}`} href="#" data-ing={d.key} aria-hidden={hidden} onClick={(e) => e.preventDefault()}>
    <div className="ing-ic ing-ic-img"><img src={d.img} alt="" loading="lazy" /></div>
    <div className="ing-tx">
      <div className="ing-fam">{d.family}</div>
      <div className="ing-name">{d.name}</div>
      <div className="ing-ben">{d.ben}</div>
    </div>
    <div className="ing-go"><Arrow /></div>
  </a>
);
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
          <button className="nav-login" onClick={() => router.push("/login")}>Connexion</button>
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
                <div className="social-tx">
                  <div className="stars">★★★★★</div>
                  <div className="social-l">Déjà <b>+ de 1000 utilisateurs</b> conquis</div>
                </div>
              </div>
              <h1 className="title"><span className="soft">Découvre enfin</span> ce dont ta peau a besoin.</h1>
              <div className="reassure">
                <span className="ra"><span className="ck"><svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M2.6 7.4 7.4 2.6H11.4V6.6L6.6 11.4a1 1 0 0 1-1.4 0L2.6 8.8a1 1 0 0 1 0-1.4z" /><circle cx="9.3" cy="4.7" r="0.7" /></svg></span>Gratuit</span>
                <span className="ra-sep"></span>
                <span className="ra"><span className="ck"><svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><circle cx="7" cy="7.4" r="4.8" /><path d="M7 4.6V7.4l1.9 1.2" /><path d="M5.4 1.8h3.2" /></svg></span>1 minute</span>
                <span className="ra-sep"></span>
                <span className="ra"><span className="ck"><svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"><path d="M7 2 11 3.6V7c0 2.7-1.8 4.6-4 5.4C4.8 11.6 3 9.7 3 7V3.6z" /><circle cx="7" cy="6.4" r="0.85" /><path d="M7 7.1v1.5" /></svg></span>photo non conservée</span>
              </div>
              <p className="subtitle">Notre IA analyse ton visage et te propose une routine sur-mesure, composée de <b>tous les produits dont tu auras besoin</b> pour avoir une peau parfaite !</p>
              <div className="cta-zone">
                <button className="cta-btn" onClick={start}>
                  <span>Ma routine sur-mesure <em style={{ fontStyle: "italic", fontWeight: 500 }}>en 1 min</em></span>
                  <svg width="17" height="17" viewBox="0 0 17 17" fill="none"><path d="M3 8.5h9M8 4l4.5 4.5L8 13" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
                </button>
              </div>
            </div>

            <img className="woman" src="/woman-acne.png" alt="Analyse de peau" width={900} height={1100} fetchPriority="high" decoding="async" />

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
              <div className="gauge" data-value="36" data-state="À améliorer"></div>
              <div className="scan-metrics">
                <div className="sm-row"><span className="sm-label">Imperfections</span><span className="sm-bar"><i style={{ width: "56%" }}></i></span><span className="sm-val">Modéré</span></div>
                <div className="sm-row"><span className="sm-label">Pores</span><span className="sm-bar"><i style={{ width: "62%" }}></i></span><span className="sm-val">Visibles</span></div>
                <div className="sm-row"><span className="sm-label">Éclat</span><span className="sm-bar"><i style={{ width: "73%" }}></i></span><span className="sm-val">Bon</span></div>
              </div>
              <div className="scan-tag">Peau mixte · Zone T grasse</div>
            </div>
          </section>
        </div>
      </div>

      {/* ═══ SECTION 2 — COMMENT ÇA MARCHE ═══ */}
      <section className="s-how" id="how">
        <div className="wrap">
          <header className="shead">
            <span className="eyebrow"><span className="dot"></span>Comment ça marche</span>
            <h2>De ta photo à ta routine,<br /><span className="soft">en 5 étapes.</span></h2>
            <p>Une IA qui comprend vraiment ta peau — <b>scan</b>, diagnostic, routine sur-mesure et <b>suivi</b> dans le temps.</p>
          </header>

          <section className="bento">
            <article className="card b01">
              <div className="c-left2">
                <div className="c-top"><span className="tag green">Scan</span><span className="num">01</span></div>
                <h2 className="c-title">Scannez votre peau en 30 secondes</h2>
                <p className="c-desc">Une photo, notre IA analyse <b>12 zones</b> et <b>40+ marqueurs</b> cutanés.</p>
              </div>
              <div className="vf">
                <img src="/capture-face.jpg" alt="" />
                <div className="vf-badge"><span className="pulse"></span>Visage détecté</div>
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
                  <div className="vf-chip"><b>40+</b>marqueurs</div>
                  <div className="vf-chip"><b>30s</b>analyse</div>
                </div>
              </div>
            </article>

            <article className="card b02">
              <div className="c-left2">
                <div className="c-top"><span className="tag">Profil</span><span className="num">02</span></div>
                <h2 className="c-title">Répondez à 8 questions ciblées</h2>
                <p className="c-desc">Mode de vie, sensibilités, objectifs — pour affiner le diagnostic.</p>
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
              <div className="c-top"><span className="tag">Diagnostic</span><span className="num">03</span></div>
              <h2 className="c-title">Recevez votre score peau</h2>
              <div className="gauge" data-value="47" data-state="État à améliorer"></div>
            </article>

            <article className="card b04">
              <div className="c-top"><span className="tag sand">Routine</span><span className="num">04</span></div>
              <h2 className="c-title">Un protocole sur-mesure, étape par étape</h2>
              <p className="c-desc">Une routine à suivre <b>chaque jour</b> — chaque produit choisi pour votre peau.</p>
              <div className="pscroll">
                <div className="pscroll-track">
                  {[...PCARDS, ...PCARDS].map((p, i) => <Pcard p={p} key={i} />)}
                </div>
              </div>
            </article>

            <article className="card b05">
              <div className="c-top"><span className="tag green">Suivi</span><span className="num">05</span></div>
              <h2 className="c-title">Suivez vos progrès dans le temps</h2>
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

      {/* ═══ SECTION 3 — INGRÉDIENTS ═══ */}
      <section className="s-ingredients" id="ingredients">
        <div className="wrap">
          <div className="shead">
            <div className="eyebrow"><span className="dot"></span> Glossaire des actifs <span className="sep"></span> <span className="count">24 décryptés</span></div>
            <h2>Chaque ingrédient,<br /><span className="soft">décrypté pour ta peau.</span></h2>
            <p>Comprends vraiment ce que tu appliques. Explore les actifs star un par un — leur <b>rôle</b>, leurs <b>bénéfices</b> et pour <b>quels besoins</b>.</p>
          </div>

          <div className="legend">
            <span className="lg f-hydra">Hydratation</span>
            <span className="lg f-eclat">Éclat &amp; taches</span>
            <span className="lg f-imperf">Imperfections</span>
            <span className="lg f-soothe">Apaisant</span>
            <span className="lg f-age">Anti-âge</span>
          </div>

          <div className="marquees">
            <div className="row rowA">
              <div className="track">
                {ROW_A.map((d, i) => <IngCard d={d} key={"a" + i} />)}
                {ROW_A.map((d, i) => <IngCard d={d} hidden key={"a2" + i} />)}
              </div>
            </div>
            <div className="row rowB">
              <div className="track">
                {ROW_B.map((d, i) => <IngCard d={d} key={"b" + i} />)}
                {ROW_B.map((d, i) => <IngCard d={d} hidden key={"b2" + i} />)}
              </div>
            </div>
          </div>

          <div className="foot">
            <a className="explore" href="#" onClick={noNav}>
              Explorer tous les ingrédients
              <Arrow s={16} />
            </a>
          </div>
        </div>
      </section>

      {/* ═══ SECTION 4 — CTA FINAL ═══ */}
      <section className="s-cta">
        <div className="cta-panel">
          <div className="cta-glow1"></div>
          <div className="cta-glow2"></div>
          <div className="cta-dots"></div>
          <span className="cta-tag"><span className="dot"></span>Ta routine t'attend</span>
          <h2 className="cta-h">Ta peau mérite mieux<br />que des <span className="hl">essais au hasard.</span></h2>
          <p className="cta-sub">En <b>1 minute</b>, obtiens un diagnostic précis et la routine faite pour toi.</p>
          <div className="cta-go-wrap">
            <button className="cta-go" onClick={start}>
              Démarrer mon diagnostic
              <svg width="17" height="17" viewBox="0 0 17 17" fill="none"><path d="M3 8.5h9M8 4l4.5 4.5L8 13" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </button>
          </div>
          <div className="cta-social">
            <div className="cta-avatars">
              {AV.map((src, i) => <span className="cav" key={i}><img src={src} alt="" /></span>)}
            </div>
            <div>
              <div className="cta-stars">★★★★★</div>
              <div className="cta-soc-l">Déjà <b>+ de 1000 utilisateurs</b></div>
            </div>
          </div>
        </div>

        <footer className="site-foot">
          <img src="/logo-smartskin.png" alt="SmartSkin AI" />
          <div className="foot-links">
            <a href="#" onClick={noNav}>Articles</a>
            <a href="#" onClick={noNav}>Ingrédients</a>
            <a href="#" onClick={noNav}>Comparatifs</a>
            <a href="#" onClick={noNav}>Types de peau</a>
          </div>
          <div className="foot-copy">© 2026 SmartSkin™</div>
        </footer>
      </section>

    </div>
  );
}
