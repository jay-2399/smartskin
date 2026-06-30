/* ──────────────────────────────────────────────────────────────────────────
   Routine v2 — « storytelling » : deck de swipe (Tinder) jour→soir, puis écran
   Protocole (ordonnance + timeline). Logique portée fidèlement depuis la
   maquette reference/User_flow_screens/12-routine.html (impératif, Pointer
   Events, animations CSS). `initRoutine(root)` injecte le squelette dans `root`
   puis câble tout ; renvoie une fonction de cleanup (timers + listeners).

   NB : données produits FIXES pour l'instant (catalogue codé en dur, comme la
   maquette). La personnalisation depuis le bilan d'analyse (result/answers) est
   un suivi — voir docs/nouvelle_routine.md.
   ────────────────────────────────────────────────────────────────────────── */

import { DEFAULT_ROUTINE, type IconKey, type TabKey, type Product, type Step, type RoutineData } from "./products";
import { paintFaceMesh } from "@/features/analysis/paintFaceMesh";

interface Snap {
  step: number;
  ptrs: number[];
  kept: (number | null)[];
}
interface RState extends Snap {
  history: Snap[];
}

interface RoutinePayload {
  routine: RoutineData;
  totaux?: { prix: number; irritation: number };
  warnings?: string[];
}
export interface InitOptions {
  onExit?: () => void;
  onSave?: (validated: RoutineData) => void; // « Enregistrer » → reçoit la routine VALIDÉE (produits gardés)
  routine?: RoutineData; // routine SYNCHRONE (catalogue démo par défaut)
  totaux?: { prix: number; irritation: number }; // Σ coût (informatif) + charge d'irritation
  warnings?: string[]; // avertissements (off-ramp dermato), affichés en bandeau
  faceUrl?: string; // photo de l'analyse (en mémoire) pour le médaillon de l'intro V2
  // Charge la routine de façon ASYNCHRONE : l'intro joue PENDANT le chargement (~40 s),
  // puis le deck se révèle dès que la donnée arrive → plus d'écran de chargement séparé.
  load?: () => Promise<RoutinePayload>;
}

export function initRoutine(root: HTMLElement, opts: InitOptions = {}): () => void {
  /* ── icônes / flacons SVG inline ── */
  const FLACONS: Record<IconKey, string> = {
    pump: '<svg class="flacon" viewBox="0 0 60 92" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"><rect x="15" y="28" width="30" height="56" rx="9"/><path d="M24 28v-6h12v6"/><rect x="26" y="9" width="9" height="13" rx="2.5"/><path d="M35 13h7v6"/><path d="M21 48h18" stroke-width="1.4" opacity=".5"/></svg>',
    dropper: '<svg class="flacon" viewBox="0 0 60 92" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"><rect x="16" y="36" width="28" height="48" rx="8"/><path d="M23 36v-4h14v4"/><rect x="25" y="10" width="10" height="22" rx="3"/><path d="M30 14v14" stroke-width="1.6"/><path d="M21 50h18" stroke-width="1.4" opacity=".5"/></svg>',
    jar: '<svg class="flacon" viewBox="0 0 60 92" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"><rect x="12" y="38" width="36" height="40" rx="11"/><rect x="10" y="26" width="40" height="14" rx="5"/><path d="M18 33h24" stroke-width="1.4" opacity=".5"/></svg>',
    bottle: '<svg class="flacon" viewBox="0 0 60 92" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"><path d="M19 84V40c0-3 1-4 3-6l1-3v-6h14v6l1 3c2 2 3 3 3 6v44a4 4 0 0 1-4 4H23a4 4 0 0 1-4-4Z"/><rect x="24" y="9" width="12" height="10" rx="2"/><path d="M22 52h16" stroke-width="1.4" opacity=".5"/></svg>',
  };
  const HEART = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 20.7c-.4 0-.8-.14-1.1-.4C6.3 16.45 3 13.6 3 9.9 3 7.2 5.1 5.2 7.6 5.2c1.5 0 2.95.74 3.9 1.9l.5.6.5-.6c.95-1.16 2.4-1.9 3.9-1.9 2.5 0 4.6 2 4.6 4.7 0 3.7-3.3 6.55-7.9 10.4-.3.26-.7.4-1.1.4Z"/></svg>';
  const CROSS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M7 7l10 10M17 7L7 17"/></svg>';
  const STAR = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.4l2.9 5.9 6.5.95-4.7 4.6 1.1 6.45L12 17.8l-5.8 3.05 1.1-6.45-4.7-4.6 6.5-.95z"/></svg>';
  const CLOCK = '<svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="7" cy="7" r="5.4"/><path d="M7 4v3l2 1.4"/></svg>';
  const SPARK = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l1.7 5.6L19.3 9l-5.6 1.4L12 16l-1.7-5.6L4.7 9l5.6-1.4z"/></svg>';
  const SUN = '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="4.6"/><g stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M12 2.9v1.7"/><path d="M12 19.4v1.7"/><path d="M21.1 12h-1.7"/><path d="M4.6 12H2.9"/><path d="M18.45 5.55l-1.2 1.2"/><path d="M6.75 17.25l-1.2 1.2"/><path d="M18.45 18.45l-1.2-1.2"/><path d="M6.75 6.75L5.55 5.55"/></g></svg>';
  const MOON = '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.7a6.6 6.6 0 0 0 8.8 8.8A8.6 8.6 0 1 1 12 2.7Z"/><circle cx="18.1" cy="5.3" r="1.05"/><circle cx="20.3" cy="8.7" r="0.7"/></svg>';
  const REPEAT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12a8 8 0 0 1 13-6.2L20.5 8"/><path d="M20.5 3.5V8H16"/><path d="M20 12a8 8 0 0 1-13 6.2L3.5 16"/><path d="M3.5 20.5V16H8"/></svg>';
  const CART = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M6 7.5h13l-1.2 9.2a2.2 2.2 0 0 1-2.2 1.9H9.4a2.2 2.2 0 0 1-2.2-1.9L6 7.5Z"/><path d="M9 7.5a3 3 0 0 1 6 0"/></svg>';
  const STAR_PATH = '<path d="M12 2.4l2.9 5.9 6.5.95-4.7 4.6 1.1 6.45L12 17.8l-5.8 3.05 1.1-6.45-4.7-4.6 6.5-.95z"/>';
  const VBADGE = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7"/></svg>';

  /* ── Avis clients : helpers de formatage + blocs (alimentés par couche3). ── */
  const ESC: Record<string, string> = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" };
  const esc = (s: string) => String(s).replace(/[&<>"]/g, (c) => ESC[c]);
  const fmtN = (n: number) => (n >= 1000 ? (n >= 10000 ? Math.round(n / 1000) + "k" : (n / 1000).toFixed(1).replace(".0", "") + "k") : String(n));
  const stars5 = (r: number) => {
    const k = Math.round(r);
    let s = "";
    for (let i = 1; i <= 5; i++) s += `<svg class="st${i <= k ? " on" : ""}" viewBox="0 0 24 24" fill="currentColor">${STAR_PATH}</svg>`;
    return s;
  };
  const fmtDate = (d: string) => { try { return new Date(d).toLocaleDateString("fr-FR", { month: "short", year: "numeric" }); } catch { return d; } };
  const ratingRow = (p: Product) => (p.rating == null ? "" :
    `<div class="card-rating"><b>${p.rating.toFixed(1)}</b><svg class="star1" viewBox="0 0 24 24" fill="currentColor">${STAR_PATH}</svg><span>· ${fmtN(p.reviewCount ?? 0)} reviews</span></div>`);
  const csBlock = (p: Product) => {
    if (!p.customersSay) return "";
    const chips = (p.aspects ?? []).map(([name, val]) => `<span class="cs-chip">${esc(name)} <b>${esc(val)}</b></span>`).join("");
    return `<div class="cs"><div class="cs-h">What customers say</div><p class="cs-say">${esc(p.customersSay)}</p>` +
      (chips ? `<div class="cs-chips">${chips}</div>` : "") +
      `<div class="cs-ai">${SPARK}AI summary from reviews</div></div>`;
  };
  const revBlock = (p: Product) => {
    if (!p.reviews || !p.reviews.length) return "";
    return `<div class="rev-h">Verified reviews</div>` + p.reviews.map((v) =>
      `<div class="rev"><div class="rev-top"><span class="rev-av">${esc(v.author.charAt(0))}</span>` +
        `<div class="rev-meta"><div class="rev-author">${esc(v.author)}${v.verified ? `<span class="rev-badge">${VBADGE}Verified</span>` : ""}</div>` +
        `<div class="rev-sub"><span class="rev-stars">${stars5(v.rating)}</span><b class="rev-note">${v.rating.toFixed(1)}</b><span class="rev-date">${fmtDate(v.date)}</span></div></div></div>` +
        `<p class="rev-text">${esc(v.text)}</p></div>`,
    ).join("");
  };

  /* ── données : routine injectée (RoutineScreen) ou catalogue par défaut (démo).
     MUTABLES : si `opts.load` est fourni, la vraie routine arrive APRÈS (l'intro
     joue pendant) → on réaffecte data/ROUTINE/STATE/totaux/warnings à ce moment. ── */
  let data: RoutineData = opts.routine ?? DEFAULT_ROUTINE;
  let ROUTINE: Record<TabKey, Step[]> = { day: data.day, night: data.night };
  let totaux = opts.totaux;
  let warnings = opts.warnings;
  // Médaillon de l'intro : photo de l'analyse (en mémoire) ou repli générique.
  const faceUrl = opts.faceUrl ?? "/capture-face.jpg";

  /* ── squelette injecté dans root ── */
  root.innerHTML = `
  <nav class="nav">
    <div class="rv-back" id="rvBack"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13L5 8l5-5"/></svg></div>
    <div class="rv-nav-logo"><img src="/logo-smartskin.png" alt="SmartSkin AI"></div>
    <span class="nav-step">Routine</span>
  </nav>
  <div class="rv-head">
    <h1 id="headTitle">Your day routine.</h1>
    <p>Swipe right to keep, left to change product.</p>
  </div>
  <div class="stage">
    <div class="progress">
      <div class="dots" id="dots"></div>
      <div class="step-label" id="stepLabel">Step 1 / 4</div>
    </div>
    <div class="deck" id="deck"></div>
    <div class="actions" id="actions">
      <button class="act replay" id="btnReplay" aria-label="Go back to previous product">
        <svg viewBox="0 0 24 24" fill="none" stroke="url(#gGold)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><defs><linearGradient id="gGold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFD64D"/><stop offset="1" stop-color="#F5A623"/></linearGradient></defs><path d="M4 12a8 8 0 1 0 2.5-5.8L3.5 9"/><path d="M3.2 4.4V9h4.6"/></svg>
      </button>
      <button class="act swap" id="btnSwap" aria-label="Reject this product">
        <svg viewBox="0 0 24 24" fill="none" stroke="url(#gRed)" stroke-width="3" stroke-linecap="round"><defs><linearGradient id="gRed" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FF6B6B"/><stop offset="1" stop-color="#E33636"/></linearGradient></defs><path d="M7 7l10 10M17 7L7 17"/></svg>
      </button>
      <button class="act keep" id="btnKeep" aria-label="Keep this product">
        <svg viewBox="0 0 24 24" fill="url(#gRose)"><defs><linearGradient id="gRose" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FF7AAE"/><stop offset="1" stop-color="#F22A6E"/></linearGradient></defs><path d="M12 20.7c-.4 0-.8-.14-1.1-.4C6.3 16.45 3 13.6 3 9.9 3 7.2 5.1 5.2 7.6 5.2c1.5 0 2.95.74 3.9 1.9l.5.6.5-.6c.95-1.16 2.4-1.9 3.9-1.9 2.5 0 4.6 2 4.6 4.7 0 3.7-3.3 6.55-7.9 10.4-.3.26-.7.4-1.1.4Z"/></svg>
      </button>
    </div>
    <div class="hint" id="hint">‹ swipe the card · or use the buttons ›</div>
  </div>
  <div class="tray" id="tray">
    <div class="tray-card">
      <div class="tray-head">
        <span class="tray-label">Your selection</span>
        <span class="tray-meta"><b id="trayCount">0/4</b><span id="trayTotal"></span></span>
      </div>
      <div class="tray-slots" id="traySlots"></div>
    </div>
    <div class="tray-note"><svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 7l4-4M9 3H6.6M9 3v2.4"/><path d="M9 7.2V9a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h1.8"/></svg>Affiliate links to brands</div>
  </div>
  <div class="intro" id="intro">
    <div class="intro-bg"></div>
    <div class="intro-grain"></div>
    <div class="intro-stack">
      <img class="intro-logo" src="/logo-smartskin.png" alt="SmartSkin AI">
      <div class="intro-eyebrow" id="introEyebrow">Analysis complete</div>
      <div class="intro-titles">
        <p class="intro-line">Now let's build your custom protocol.</p>
        <p class="intro-line">Let's start with your day routine.</p>
      </div>
      <div class="intro-scene" id="introScene">
        <div class="scene-face-wrap">
          <svg class="scene-ring" viewBox="0 0 100 100"><circle cx="50" cy="50" r="49"/></svg>
          <div class="scene-face">
            <img class="scene-face-img" src="${faceUrl}" alt="">
            <canvas class="scene-mesh" aria-hidden></canvas>
            <div class="scene-scan"></div>
          </div>
        </div>
        <div class="scene-deck">
          <div class="scene-pc"><div class="pc-ic"><svg viewBox="0 0 60 92" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"><rect x="15" y="28" width="30" height="56" rx="9"/><path d="M24 28v-6h12v6"/><rect x="26" y="9" width="9" height="13" rx="2.5"/><path d="M35 13h7v6"/></svg></div><div class="pc-cat">Cleanser</div></div>
          <div class="scene-pc"><div class="pc-ic"><svg viewBox="0 0 60 92" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"><path d="M19 84V40c0-3 1-4 3-6l1-3v-6h14v6l1 3c2 2 3 3 3 6v44a4 4 0 0 1-4 4H23a4 4 0 0 1-4-4Z"/><rect x="24" y="9" width="12" height="10" rx="2"/></svg></div><div class="pc-cat">Serum</div></div>
          <div class="scene-pc"><div class="pc-ic"><svg viewBox="0 0 60 92" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"><rect x="16" y="36" width="28" height="48" rx="8"/><path d="M23 36v-4h14v4"/><rect x="25" y="10" width="10" height="22" rx="3"/></svg></div><div class="pc-cat">Care</div></div>
          <div class="scene-pc"><div class="pc-ic"><svg viewBox="0 0 60 92" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round"><rect x="12" y="38" width="36" height="40" rx="11"/><rect x="10" y="26" width="40" height="14" rx="5"/></svg></div><div class="pc-cat">Cream</div></div>
        </div>
      </div>
      <div class="intro-status"><span class="intro-spin" id="introSpin"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7"/></svg></span><span id="introStatus">…</span></div>
      <div class="intro-count" id="introCount"><span class="num" id="introNum">0</span><small id="introLabel"></small></div>
    </div>
  </div>
  <div class="phase" id="phaseShift">
    <div class="intro-bg"></div>
    <div class="phase-stack">
      <span class="phase-badge"><svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 7.5l3 3 6-6.5"/></svg>Day routine confirmed</span>
      <p class="phase-title">Now to your evening routine.</p>
      <div class="phase-moon"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.7a6.6 6.6 0 0 0 8.8 8.8A8.6 8.6 0 1 1 12 2.7Z"/><circle cx="18.1" cy="5.3" r="1.05"/><circle cx="20.3" cy="8.7" r="0.7"/></svg></div>
    </div>
  </div>
  <div class="gen" id="protoGen">
    <div class="intro-bg"></div>
    <div class="gen-stack">
      <div class="gen-ring" id="genRing"></div>
      <p class="gen-title" id="genTitle">Assembling your protocol…</p>
      <div class="gen-bar"><i id="genFill"></i></div>
    </div>
  </div>
  <div class="protocol" id="protocol"></div>`;

  /* ── helpers DOM + timers (tout passe par setT/setI pour le cleanup) ── */
  const byId = <T extends HTMLElement = HTMLElement>(id: string) => root.querySelector<T>("#" + id);
  const timeouts: ReturnType<typeof setTimeout>[] = [];
  const intervals: ReturnType<typeof setInterval>[] = [];
  const setT = (fn: () => void, ms: number) => { timeouts.push(setTimeout(fn, ms)); };
  const setI = (fn: () => void, ms: number) => { const id = setInterval(fn, ms); intervals.push(id); return id; };
  let docMove: ((e: PointerEvent) => void) | null = null;
  let docUp: (() => void) | null = null;
  let destroyed = false; // démontage : ignore un chargement asynchrone qui reviendrait après

  const freshState = (n: number): RState => ({ step: 0, ptrs: Array(n).fill(0), kept: Array(n).fill(null), history: [] });
  let STATE: Record<TabKey, RState> = { day: freshState(ROUTINE.day.length), night: freshState(ROUTINE.night.length) };
  let tab: TabKey = "day";

  // Applique la vraie routine quand elle arrive (chargement asynchrone, cf. intro).
  function applyData(d: RoutinePayload) {
    data = d.routine;
    ROUTINE = { day: data.day, night: data.night };
    STATE = { day: freshState(ROUTINE.day.length), night: freshState(ROUTINE.night.length) };
    totaux = d.totaux;
    warnings = d.warnings;
  }
  let animating = false;

  const deck = byId("deck")!;
  const actions = byId("actions")!;
  const hint = byId("hint")!;
  const dotsEl = byId("dots")!;
  const stepLabel = byId("stepLabel")!;
  const trayEl = byId("tray")!;
  const traySlots = byId("traySlots")!;
  const trayCount = byId("trayCount")!;
  const trayTotal = byId("trayTotal")!;
  const btnReplay = byId("btnReplay")!;
  const headTitle = byId("headTitle")!;

  function updateReplay() { btnReplay.classList.toggle("disabled", STATE[tab].history.length === 0); }

  function visual(prod: Product, icon: IconKey): string {
    return prod.img ? `<img src="${prod.img}" alt="${prod.brand} ${prod.name}">` : FLACONS[icon] ?? FLACONS.bottle;
  }

  /* entrée animée — on retire 'fresh' dès la fin (sinon animation-fill 'both' bloque le drag) */
  function markFresh(card: HTMLElement) {
    card.classList.add("fresh");
    card.addEventListener("animationend", () => card.classList.remove("fresh"), { once: true });
  }

  function totalNum(t: TabKey): number {
    let sum = 0;
    ROUTINE[t].forEach((s, i) => {
      const idx = STATE[t].kept[i] != null ? (STATE[t].kept[i] as number) : STATE[t].ptrs[i];
      sum += s.options[idx].p;
    });
    return sum;
  }

  function buildCard(step: Step, depth: number, stepIdx: number): HTMLElement {
    const st = STATE[tab];
    const ptr = depth === 0 ? st.ptrs[stepIdx] : 0;
    const prod = step.options[ptr];
    const card = document.createElement("div");
    card.className = "swipe-card depth-" + depth;
    const topBadge = ptr > 0
      ? `<span class="alt-badge">Alternative ${ptr} / ${step.options.length - 1}</span>`
      : `<span class="reco-badge">${STAR}Recommended</span>`;
    const right = prod.freq ? `<div class="card-tag">${CLOCK}${prod.freq}</div>` : "";
    const whyTitle = ptr > 0 ? "Why this alternative?" : "Why we recommend it";
    card.innerHTML =
      `<div class="card-img"><span class="card-step">${stepIdx + 1}</span>${topBadge}${visual(prod, step.icon)}</div>` +
      `<div class="card-info">` +
        `<span class="scroll-cue hidden"><span class="scroll-thumb"></span></span>` +
        `<div class="card-head"><span class="card-cat">${step.cat}</span><span class="card-brand">${prod.brand}</span></div>` +
        `<div class="card-name">${prod.name}</div>` +
        ratingRow(prod) +
        `<div class="scroll-wrap"><div class="card-scroll">` +
          `<div class="why-title">${SPARK}${whyTitle}</div>` +
          `<div class="card-why">${prod.why}</div>` +
          csBlock(prod) + revBlock(prod) +
        `</div><div class="scroll-fade"></div></div>` +
        `<div class="card-foot"><div class="card-priceblock"><span class="card-price">${prod.price}</span></div>${right}</div>` +
      `</div>` +
      `<div class="card-glow like"></div><div class="card-glow nope"></div>` +
      `<div class="stamp keep">${HEART}</div><div class="stamp swap">${CROSS}</div>`;
    return card;
  }

  function renderDots() {
    const st = STATE[tab];
    let html = "";
    for (let i = 0; i < ROUTINE[tab].length; i++) {
      let cls = "dot";
      if (i < st.step) cls += " done"; else if (i === st.step) cls += " active";
      html += `<div class="${cls}"></div>`;
    }
    dotsEl.innerHTML = html;
  }

  function renderFooter() {
    headTitle.textContent = tab === "night" ? "Your evening routine." : "Your day routine.";
    renderTray();
  }

  /* plateau "Ta sélection" : vignettes des produits gardés + slots restants */
  function renderTray() {
    const st = STATE[tab];
    const steps = ROUTINE[tab];
    if (st.step >= steps.length) { trayEl.style.display = "none"; return; }
    trayEl.style.display = "";
    let html = "";
    let sum = 0;
    for (let i = 0; i < steps.length; i++) {
      if (st.kept[i] != null) {
        const prod = steps[i].options[st.kept[i] as number];
        sum += prod.p;
        const thumb = prod.img ? `<img src="${prod.img}" alt="">` : FLACONS[steps[i].icon] ?? FLACONS.bottle;
        html += `<div class="tray-slot filled">${thumb}</div>`;
      } else if (i === st.step) {
        html += `<div class="tray-slot current"></div>`;
      } else {
        html += `<div class="tray-slot"></div>`;
      }
    }
    traySlots.innerHTML = html;
    trayCount.textContent = st.step + "/" + steps.length;
    trayTotal.textContent = st.step > 0 ? "· ~$" + Math.round(sum) : "";
  }

  /* fin du jour → bascule auto sur le soir (interstitiel) */
  function goToNight() {
    actions.style.display = "none"; hint.style.display = "none";
    const ph = byId("phaseShift")!;
    ph.classList.add("show");
    setT(() => { tab = "night"; render(); ph.classList.remove("show"); }, 2000);
  }

  /* fin du soir → court écran de génération, puis le protocole */
  function goToProtocol() {
    actions.style.display = "none"; hint.style.display = "none";
    trayEl.style.display = "none";
    const gen = byId("protoGen")!;
    const ring = byId("genRing")!;
    const title = byId("genTitle")!;
    const fill = byId("genFill")!;
    ring.classList.remove("done"); title.textContent = "On assemble ton protocole…";
    fill.style.transition = "none"; fill.style.width = "0";
    gen.classList.add("show");
    requestAnimationFrame(() => { fill.style.transition = "width 1.5s cubic-bezier(.4,0,.2,1)"; fill.style.width = "100%"; });
    setT(() => { ring.classList.add("done"); title.textContent = "Your protocol is ready."; }, 1550);
    setT(() => { renderProtocol(); gen.classList.remove("show"); }, 2250);
  }

  function render() {
    const st = STATE[tab];
    const steps = ROUTINE[tab];
    renderDots(); renderFooter(); updateReplay();
    if (st.step >= steps.length) { if (tab === "day") goToNight(); else goToProtocol(); return; }
    actions.style.display = ""; hint.style.display = "";
    stepLabel.textContent = `Step ${st.step + 1} / ${steps.length}`;
    deck.innerHTML = "";
    const maxDepth = Math.min(2, steps.length - 1 - st.step);
    for (let depth = maxDepth; depth >= 0; depth--) {
      const c = buildCard(steps[st.step + depth], depth, st.step + depth);
      if (depth === 0) markFresh(c);
      deck.appendChild(c);
    }
    const f0 = deck.querySelector<HTMLElement>(".depth-0");
    attachDrag(f0); initScrollCue(f0);
  }

  /* screen Protocole (ordonnance + timeline) */
  function renderProtocol() {
    const protoEl = byId("protocol")!;
    headTitle.textContent = "Ton protocole.";
    trayEl.style.display = "none";
    actions.style.display = "none"; hint.style.display = "none";

    const chosen = (t: TabKey, i: number): Product => {
      const st = STATE[t];
      return ROUTINE[t][i].options[st.kept[i] != null ? (st.kept[i] as number) : st.ptrs[i]];
    };
    const vis = (p: Product, icon: IconKey) => (p.img ? `<img src="${p.img}" alt="">` : FLACONS[icon] ?? FLACONS.bottle);
    const firstSentence = (why: string) => { const i = why.indexOf(". "); return i > 0 ? why.slice(0, i + 1) : why; };

    function card(t: TabKey, i: number): string {
      const s = ROUTINE[t][i];
      const p = chosen(t, i);
      const dn = t === "day" ? "day" : "night";
      const ico = t === "day" ? SUN : MOON;
      const when = t === "day" ? "Morning" : "Evening";
      return `<div class="tl-step"><div class="tl-node">${i + 1}</div>` +
        `<div class="rx">` +
          `<div class="rx-top"><div class="rx-thumb">${vis(p, s.icon)}</div>` +
            `<div class="rx-id"><div class="rx-cat">${s.cat}</div><div class="rx-name">${p.name}</div><div class="rx-brand">${p.brand}</div></div>` +
            `<span class="rx-price">${p.price}</span></div>` +
          `<div class="rx-poso"><div class="rx-poso-tags"><span class="rx-tag when ${dn}">${ico}${when}</span><span class="rx-tag freq">${REPEAT}${s.freq}</span></div><div class="rx-how">${s.use}</div></div>` +
          `<div class="rx-why"><span class="lbl">Why&nbsp;:</span> ${firstSentence(p.why)}</div>` +
          `<a class="rx-buy" href="${p.url}" target="_blank" rel="noopener">${CART}Buy the product</a>` +
        `</div></div>`;
    }
    function sec(t: TabKey, ico: string, label: string, sub: string): string {
      let rows = "";
      ROUTINE[t].forEach((_, i) => { rows += card(t, i); });
      return `<div class="rv-sec-head"><div class="sec-ic ${t === "day" ? "day" : "night"}">${ico}</div><div class="sec-txt"><b>${label}</b><span>${sub}</span></div></div><div class="tl-track">${rows}</div>`;
    }
    const total = "$" + Math.round(totalNum("day") + totalNum("night"));

    protoEl.innerHTML =
      `<nav class="nav"><div class="rv-back" id="protoBack"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13L5 8l5-5"/></svg></div><div class="rv-nav-logo"><img src="/logo-smartskin.png" alt="SmartSkin AI"></div></nav>` +
      `<div class="proto">` +
        `<div class="proto-h1">Your custom protocol.</div>` +
        `<div class="proto-sub">Built from your analysis · <b>${data.productCount} products</b></div>` +
        `<div class="proto-diag">${data.diagnostic.map((d) => `<span class="proto-chip">${d}</span>`).join("")}</div>` +
        (warnings && warnings.length
          ? `<div class="proto-warn">${warnings.map((w) => `<span>${w}</span>`).join("")}</div>`
          : "") +
        sec("day", SUN, "Morning routine", "Wake &amp; protect") +
        sec("night", MOON, "Evening routine", "Repair &amp; renew") +
        `<div class="proto-cta"><div class="proto-total"><span class="lbl">Estimated total</span><span class="val">${total}</span></div>` +
          `<button class="proto-save" id="protoSave">Save my protocol</button>` +
          `<button class="proto-restart" id="protoRestart"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 10a8 8 0 0 1 13.4-4.5L20.5 8"/><path d="M20.5 3.5V8H16"/></svg> Start over</button>` +
          `<div class="proto-note"><svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 7l4-4M9 3H6.6M9 3v2.4"/><path d="M9 7.2V9a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h1.8"/></svg>Affiliate links to brands</div>` +
        `</div>` +
      `</div>`;

    protoEl.scrollTop = 0;
    protoEl.classList.add("show");

    const restart = () => { protoEl.classList.remove("show"); STATE.day = freshState(ROUTINE.day.length); STATE.night = freshState(ROUTINE.night.length); tab = "day"; render(); };
    protoEl.querySelector("#protoBack")?.addEventListener("click", restart);
    protoEl.querySelector("#protoRestart")?.addEventListener("click", restart);
    protoEl.querySelector<HTMLElement>("#protoSave")?.addEventListener("click", (e) => {
      const b = e.currentTarget as HTMLElement;
      if (b.dataset.saving) return; // anti double-clic
      b.dataset.saving = "1";
      b.style.opacity = ".65"; b.textContent = "Protocol saved ✓";
      // Routine VALIDÉE = les produits réellement gardés (chosen) → option[0] de chaque
      // étape. Transmise au dashboard pour qu'il affiche exactement ça.
      const validated: RoutineData = {
        day: ROUTINE.day.map((s, i) => ({ ...s, options: [chosen("day", i)] })),
        night: ROUTINE.night.map((s, i) => ({ ...s, options: [chosen("night", i)] })),
        diagnostic: data.diagnostic,
        productCount: data.productCount,
      };
      opts.onSave?.(validated); // persiste le scan + redirige vers le dashboard (RoutineScreen)
    });
  }

  /* ── décision : dir>0 garder · dir<0 refuser ── */
  function decide(dir: number) {
    if (animating) return;
    const front = deck.querySelector<HTMLElement>(".depth-0");
    if (!front) return;
    animating = true;
    const st = STATE[tab];
    const steps = ROUTINE[tab];
    st.history.push({ step: st.step, ptrs: st.ptrs.slice(), kept: st.kept.slice() });
    if (st.history.length > 24) st.history.shift();
    const keep = front.querySelector<HTMLElement>(".stamp.keep");
    const swap = front.querySelector<HTMLElement>(".stamp.swap");
    const glow = front.querySelector<HTMLElement>(dir > 0 ? ".card-glow.like" : ".card-glow.nope");
    const stamp = dir > 0 ? keep : swap;
    const other = dir > 0 ? swap : keep;
    if (stamp) { stamp.style.opacity = "1"; stamp.style.transform = "scale(1.1)"; }
    if (other) other.style.opacity = "0";
    if (glow) glow.style.opacity = "1";
    front.classList.remove("depth-0", "fresh"); front.classList.add("flown");
    front.style.transition = "transform .5s cubic-bezier(.2,.6,.25,1), opacity .42s ease";
    front.style.transform = `translate(${dir > 0 ? 780 : -780}px,-55px) rotate(${dir * 20}deg)`;
    front.style.opacity = "0";

    if (dir > 0) { st.kept[st.step] = st.ptrs[st.step]; st.step++; }
    else { const n = steps[st.step].options.length; st.ptrs[st.step] = (st.ptrs[st.step] + 1) % n; }

    renderDots(); renderFooter();
    setT(() => { animating = false; render(); }, 340);
  }

  /* ── drag (Pointer Events) — listeners move/up sur document ── */
  function attachDrag(card: HTMLElement | null) {
    if (!card) return;
    const keep = card.querySelector<HTMLElement>(".stamp.keep");
    const swap = card.querySelector<HTMLElement>(".stamp.swap");
    const glowLike = card.querySelector<HTMLElement>(".card-glow.like");
    const glowNope = card.querySelector<HTMLElement>(".card-glow.nope");
    let startX = 0, dx = 0, dragging = false;

    function paint(dir: number, r: number) {
      const sc = `scale(${0.55 + 0.55 * r})`;
      const g = Math.min(1, r * 1.25);
      if (dir > 0) {
        if (keep) { keep.style.opacity = String(r); keep.style.transform = sc; }
        if (swap) swap.style.opacity = "0";
        if (glowLike) glowLike.style.opacity = String(g);
        if (glowNope) glowNope.style.opacity = "0";
      } else {
        if (swap) { swap.style.opacity = String(r); swap.style.transform = sc; }
        if (keep) keep.style.opacity = "0";
        if (glowNope) glowNope.style.opacity = String(g);
        if (glowLike) glowLike.style.opacity = "0";
      }
    }
    function clearPaint() {
      if (keep) { keep.style.opacity = "0"; keep.style.transform = "scale(.55)"; }
      if (swap) { swap.style.opacity = "0"; swap.style.transform = "scale(.55)"; }
      if (glowLike) glowLike.style.opacity = "0";
      if (glowNope) glowNope.style.opacity = "0";
    }
    const move = (e: PointerEvent) => {
      if (!dragging) return;
      dx = e.clientX - startX;
      card.style.transform = `translate(${dx}px,${Math.abs(dx) * 0.035}px) rotate(${dx * 0.055}deg)`;
      const r = Math.min(1, Math.abs(dx) / 95);
      if (dx > 0) paint(1, r); else if (dx < 0) paint(-1, r); else clearPaint();
    };
    const up = () => {
      if (!dragging) return;
      dragging = false;
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerup", up);
      document.removeEventListener("pointercancel", up);
      docMove = null; docUp = null;
      card.classList.remove("grabbing");
      if (dx > 95) decide(1);
      else if (dx < -95) decide(-1);
      else {
        card.style.transition = "transform .45s cubic-bezier(.34,1.56,.64,1)";
        card.style.transform = "";
        setT(() => { card.style.transition = ""; }, 460);
        clearPaint();
      }
      dx = 0;
    };
    card.addEventListener("pointerdown", (e: PointerEvent) => {
      if (animating) return;
      if (e.pointerType === "mouse") e.preventDefault();
      dragging = true; startX = e.clientX; dx = 0;
      card.classList.remove("fresh");
      card.classList.add("grabbing");
      docMove = move; docUp = up;
      document.addEventListener("pointermove", move);
      document.addEventListener("pointerup", up);
      document.addEventListener("pointercancel", up);
    });
  }

  /* mini-scrollbar (coin bas-droit de l'image) */
  function initScrollCue(card: HTMLElement | null) {
    if (!card) return;
    const sc = card.querySelector<HTMLElement>(".card-scroll");
    const cue = card.querySelector<HTMLElement>(".scroll-cue");
    const thumb = card.querySelector<HTMLElement>(".scroll-thumb");
    if (!sc || !cue || !thumb) return;
    const upd = () => {
      // Header collapse : l'image se réduit au scroll, reprend sa taille en haut
      // (hystérésis 12/4 px → anti-clignotement).
      if (sc.scrollTop > 12) card.classList.add("scrolled");
      else if (sc.scrollTop < 4) card.classList.remove("scrolled");
      const ratio = sc.clientHeight / sc.scrollHeight;
      if (ratio >= 0.999) { cue.classList.add("hidden"); return; }
      cue.classList.remove("hidden");
      const track = cue.clientHeight;
      const th = Math.max(12, track * ratio);
      const maxScroll = sc.scrollHeight - sc.clientHeight;
      const prog = maxScroll > 0 ? sc.scrollTop / maxScroll : 0;
      thumb.style.height = th + "px";
      thumb.style.transform = `translateY(${(track - th) * prog}px)`;
    };
    sc.addEventListener("scroll", upd);
    requestAnimationFrame(upd);
    requestAnimationFrame(() => requestAnimationFrame(upd));
  }

  /* ── boutons ── */
  byId("btnKeep")?.addEventListener("click", () => decide(1));
  byId("btnSwap")?.addEventListener("click", () => decide(-1));
  btnReplay.addEventListener("click", () => {
    if (animating) return;
    const st = STATE[tab];
    if (!st.history.length) return;
    const snap = st.history.pop()!;
    st.step = snap.step; st.ptrs = snap.ptrs; st.kept = snap.kept;
    render();
  });
  byId("rvBack")?.addEventListener("click", () => opts.onExit?.());

  /* ── storytelling d'intro V2 : 2 phrases + médaillon visage (mesh/scan) + cartes
     produits qui s'animent + analyse en direct, puis le deck (non skippable) ── */
  (function intro() {
    const introEl = byId("intro");
    const loading = !!opts.load;
    let dataReady = !loading;   // routine synchrone (démo) → déjà prête
    let phase2Done = false;
    let revealed = false;

    // Pas d'overlay d'intro (cas limite) : on attend la donnée puis on rend le deck.
    if (!introEl) {
      const reveal = () => { if (!revealed && !destroyed) { revealed = true; render(); } };
      if (loading) opts.load!().then((d) => { if (!destroyed) applyData(d); reveal(); }).catch(reveal);
      else reveal();
      return;
    }

    const lines = introEl.querySelectorAll<HTMLElement>(".intro-line");
    const scene = byId("introScene")!;

    // Maillage facial réel (MediaPipe) sur le médaillon — identique au reveal.
    const faceWrap = scene.querySelector<HTMLElement>(".scene-face");
    const faceImg = scene.querySelector<HTMLImageElement>(".scene-face-img");
    const faceMesh = scene.querySelector<HTMLCanvasElement>(".scene-mesh");
    if (faceWrap && faceImg && faceMesh && !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      void paintFaceMesh(faceImg, faceMesh, faceWrap, { objectPositionY: 0.20 }).then((ok) => {
        if (ok && !destroyed) faceMesh.classList.add("on");
      });
    }

    const spin = byId("introSpin")!;
    const statusEl = byId("introStatus")!;
    const countEl = byId("introCount")!;
    const num = byId("introNum")!;
    const label = byId("introLabel")!;
    const eyebrow = byId("introEyebrow")!;
    const cards = introEl.querySelectorAll<HTMLElement>(".scene-pc");
    const cycle = (msgs: string[], interval: number) => {
      let i = 0; statusEl.textContent = msgs[0];
      const id = setI(() => { i++; if (i < msgs.length) statusEl.textContent = msgs[i]; else clearInterval(id); }, interval);
    };
    const tick = (to: number, dur: number) => {
      const t0 = performance.now();
      const id = setI(() => { const t = Math.min(1, (performance.now() - t0) / dur); num.textContent = Math.round((1 - Math.pow(1 - t, 2)) * to).toLocaleString("fr-FR"); if (t >= 1) clearInterval(id); }, 45);
    };

    // Final : « Sélection prête » → on dissout l'intro et on révèle le deck.
    const finale = () => {
      if (revealed || destroyed) return;
      revealed = true;
      spin.classList.add("done"); statusEl.textContent = "Selection ready";
      num.textContent = String(data.productCount); label.textContent = "products picked for you";
      setT(() => { lines[1].classList.remove("in"); lines[1].classList.add("out"); scene.classList.remove("show"); }, 1450);
      setT(() => { render(); introEl.classList.add("gone"); }, 2000);
    };
    // On révèle SEULEMENT quand l'animation a fini sa phase d'analyse ET que la donnée est arrivée.
    const maybeFinale = () => { if (dataReady && phase2Done) finale(); };
    const showError = () => {
      if (revealed || destroyed) return;
      revealed = true;
      introEl.innerHTML = `<div class="intro-bg"></div><div class="rv-err"><p>Couldn't build your routine right now.</p><button type="button" id="rvErrBack">Back</button></div>`;
      introEl.querySelector("#rvErrBack")?.addEventListener("click", () => opts.onExit?.());
    };

    // Charge la routine EN PARALLÈLE de l'intro : l'intro masque l'attente (~40 s).
    if (loading) {
      opts.load!().then((d) => { if (destroyed) return; applyData(d); dataReady = true; maybeFinale(); }).catch(() => showError());
    }

    scene.classList.add("show");
    countEl.classList.add("on");
    label.textContent = "products analyzed · 2,000+ in database";

    // PHASE 1 — lecture du diagnostic (~3.3 s)
    lines[0].classList.add("in");
    cycle(["Reading your diagnosis…", "Targeting: oil · pores · marks", "Setting your priorities…"], 1150);
    tick(2137, 4400);
    setT(() => { lines[0].classList.remove("in"); lines[0].classList.add("out"); }, 3300);

    // PHASE 2 — on relie ta peau à tes produits (cartes qui montent)
    setT(() => {
      lines[1].classList.add("in");
      eyebrow.classList.add("daymode"); eyebrow.innerHTML = SUN + "Day routine";
      cycle(["Matching products to your skin…", "Match oil · marks · barrier…", "Finding the best match…"], 1250);
      cards.forEach((c, i) => setT(() => c.classList.add("in"), 200 + i * 430));
    }, 3850);
    // Fin de la phase d'analyse : si la donnée est déjà là → final ; sinon on TIENT sur
    // « Recherche du meilleur match… » (spinner tournant) jusqu'à son arrivée.
    setT(() => {
      phase2Done = true;
      if (dataReady) maybeFinale();
      else statusEl.textContent = "Finding your best match…";
    }, 7700);
  })();

  /* ── cleanup ── */
  return () => {
    destroyed = true;
    timeouts.forEach(clearTimeout);
    intervals.forEach(clearInterval);
    if (docMove) document.removeEventListener("pointermove", docMove);
    if (docUp) { document.removeEventListener("pointerup", docUp); document.removeEventListener("pointercancel", docUp); }
  };
}
