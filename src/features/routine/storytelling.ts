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

interface Snap {
  step: number;
  ptrs: number[];
  kept: (number | null)[];
}
interface RState extends Snap {
  history: Snap[];
}

export interface InitOptions {
  onExit?: () => void;
  routine?: RoutineData; // routine personnalisée (sinon catalogue par défaut)
  totaux?: { prix: number; budget: number | "no_limit"; dansLeBudget: boolean }; // Σ coût + tenue du budget
  warnings?: string[]; // avertissements (off-ramp dermato), affichés en bandeau
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

  /* ── données : routine personnalisée injectée (RoutineScreen) ou catalogue
     par défaut (démo `?demo=1`). Le diagnostic et le nombre de produits du
     protocole en découlent. ── */
  const data: RoutineData = opts.routine ?? DEFAULT_ROUTINE;
  const ROUTINE: Record<TabKey, Step[]> = { day: data.day, night: data.night };

  /* ── squelette injecté dans root ── */
  root.innerHTML = `
  <nav class="nav">
    <div class="rv-back" id="rvBack"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13L5 8l5-5"/></svg></div>
    <div class="rv-nav-logo"><img src="/logo-smartskin.png" alt="SmartSkin AI"></div>
    <span class="nav-step">Routine</span>
  </nav>
  <div class="rv-head">
    <h1 id="headTitle">Ta routine du jour.</h1>
    <p>Glisse à droite pour garder le produit, à gauche pour en voir un autre dans la même catégorie.</p>
  </div>
  <div class="stage">
    <div class="progress">
      <div class="dots" id="dots"></div>
      <div class="step-label" id="stepLabel">Étape 1 / 4</div>
    </div>
    <div class="deck" id="deck"></div>
    <div class="actions" id="actions">
      <button class="act replay" id="btnReplay" aria-label="Revenir au produit précédent">
        <svg viewBox="0 0 24 24" fill="none" stroke="url(#gGold)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><defs><linearGradient id="gGold" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFD64D"/><stop offset="1" stop-color="#F5A623"/></linearGradient></defs><path d="M4 12a8 8 0 1 0 2.5-5.8L3.5 9"/><path d="M3.2 4.4V9h4.6"/></svg>
      </button>
      <button class="act swap" id="btnSwap" aria-label="Refuser ce produit">
        <svg viewBox="0 0 24 24" fill="none" stroke="url(#gRed)" stroke-width="3" stroke-linecap="round"><defs><linearGradient id="gRed" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FF6B6B"/><stop offset="1" stop-color="#E33636"/></linearGradient></defs><path d="M7 7l10 10M17 7L7 17"/></svg>
      </button>
      <button class="act keep" id="btnKeep" aria-label="Garder ce produit">
        <svg viewBox="0 0 24 24" fill="url(#gRose)"><defs><linearGradient id="gRose" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FF7AAE"/><stop offset="1" stop-color="#F22A6E"/></linearGradient></defs><path d="M12 20.7c-.4 0-.8-.14-1.1-.4C6.3 16.45 3 13.6 3 9.9 3 7.2 5.1 5.2 7.6 5.2c1.5 0 2.95.74 3.9 1.9l.5.6.5-.6c.95-1.16 2.4-1.9 3.9-1.9 2.5 0 4.6 2 4.6 4.7 0 3.7-3.3 6.55-7.9 10.4-.3.26-.7.4-1.1.4Z"/></svg>
      </button>
    </div>
    <div class="hint" id="hint">‹ glisse la carte · ou utilise les boutons ›</div>
  </div>
  <div class="tray" id="tray">
    <div class="tray-card">
      <div class="tray-head">
        <span class="tray-label">Ta sélection</span>
        <span class="tray-meta"><b id="trayCount">0/4</b><span id="trayTotal"></span></span>
      </div>
      <div class="tray-slots" id="traySlots"></div>
    </div>
    <div class="tray-note"><svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 7l4-4M9 3H6.6M9 3v2.4"/><path d="M9 7.2V9a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h1.8"/></svg>Liens affiliés vers les marques</div>
  </div>
  <div class="intro" id="intro">
    <div class="intro-bg"></div>
    <div class="intro-stack">
      <img class="intro-logo" src="/logo-smartskin.png" alt="SmartSkin AI">
      <div class="intro-eyebrow" id="introEyebrow">Analyse terminée</div>
      <div class="intro-titles">
        <p class="intro-line">Composons maintenant ton protocole sur-mesure.</p>
        <p class="intro-line">Commençons par ta routine de jour.</p>
      </div>
      <div class="intro-load" id="introLoad">
        <div class="intro-prog"><i id="introFill"></i></div>
        <div class="intro-status"><span class="intro-spin" id="introSpin"></span><span id="introStatus">…</span></div>
        <div class="intro-count" id="introCount"><span class="num" id="introNum">0</span><small id="introLabel"></small></div>
      </div>
    </div>
  </div>
  <div class="phase" id="phaseShift">
    <div class="intro-bg"></div>
    <div class="phase-stack">
      <span class="phase-badge"><svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 7.5l3 3 6-6.5"/></svg>Routine du jour validée</span>
      <p class="phase-title">Passons à ta routine du soir.</p>
      <div class="phase-moon"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.7a6.6 6.6 0 0 0 8.8 8.8A8.6 8.6 0 1 1 12 2.7Z"/><circle cx="18.1" cy="5.3" r="1.05"/><circle cx="20.3" cy="8.7" r="0.7"/></svg></div>
    </div>
  </div>
  <div class="gen" id="protoGen">
    <div class="intro-bg"></div>
    <div class="gen-stack">
      <div class="gen-ring" id="genRing"></div>
      <p class="gen-title" id="genTitle">On assemble ton protocole…</p>
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

  const freshState = (n: number): RState => ({ step: 0, ptrs: Array(n).fill(0), kept: Array(n).fill(null), history: [] });
  const STATE: Record<TabKey, RState> = { day: freshState(ROUTINE.day.length), night: freshState(ROUTINE.night.length) };
  let tab: TabKey = "day";
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
      : `<span class="reco-badge">${STAR}Recommandé</span>`;
    const right = prod.freq ? `<div class="card-tag">${CLOCK}${prod.freq}</div>` : "";
    const whyTitle = ptr > 0 ? "Pourquoi cette alternative ?" : "Pourquoi on vous le recommande";
    card.innerHTML =
      `<div class="card-img"><span class="card-step">${stepIdx + 1}</span>${topBadge}${visual(prod, step.icon)}</div>` +
      `<div class="card-info">` +
        `<div class="card-head"><span class="card-cat">${step.cat}</span><span class="card-brand">${prod.brand}</span></div>` +
        `<div class="card-name">${prod.name}</div>` +
        `<div class="card-scrollwrap"><div class="card-scroll"><div class="why-title">${SPARK}${whyTitle}</div><div class="card-why">${prod.why}</div></div><span class="scroll-cue hidden"><span class="scroll-thumb"></span></span></div>` +
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
    headTitle.textContent = tab === "night" ? "Ta routine du soir." : "Ta routine du jour.";
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
    setT(() => { ring.classList.add("done"); title.textContent = "Ton protocole est prêt."; }, 1550);
    setT(() => { renderProtocol(); gen.classList.remove("show"); }, 2250);
  }

  function render() {
    const st = STATE[tab];
    const steps = ROUTINE[tab];
    renderDots(); renderFooter(); updateReplay();
    if (st.step >= steps.length) { if (tab === "day") goToNight(); else goToProtocol(); return; }
    actions.style.display = ""; hint.style.display = "";
    stepLabel.textContent = `Étape ${st.step + 1} / ${steps.length}`;
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
      const when = t === "day" ? "Matin" : "Soir";
      return `<div class="tl-step"><div class="tl-node">${i + 1}</div>` +
        `<div class="rx">` +
          `<div class="rx-top"><div class="rx-thumb">${vis(p, s.icon)}</div>` +
            `<div class="rx-id"><div class="rx-cat">${s.cat}</div><div class="rx-name">${p.name}</div><div class="rx-brand">${p.brand}</div></div>` +
            `<span class="rx-price">${p.price}</span></div>` +
          `<div class="rx-poso"><div class="rx-poso-tags"><span class="rx-tag when ${dn}">${ico}${when}</span><span class="rx-tag freq">${REPEAT}${s.freq}</span></div><div class="rx-how">${s.use}</div></div>` +
          `<div class="rx-why"><span class="lbl">Pourquoi&nbsp;:</span> ${firstSentence(p.why)}</div>` +
          `<a class="rx-buy" href="${p.url}" target="_blank" rel="noopener">${CART}Acheter le produit</a>` +
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
        `<div class="proto-h1">Ton protocole sur-mesure.</div>` +
        `<div class="proto-sub">Établi d'après ton analyse · <b>${data.productCount} produits</b></div>` +
        `<div class="proto-diag">${data.diagnostic.map((d) => `<span class="proto-chip">${d}</span>`).join("")}</div>` +
        (opts.totaux && opts.totaux.budget !== "no_limit"
          ? `<div class="proto-budget ${opts.totaux.dansLeBudget ? "ok" : "over"}">Coût estimé <b>$${Math.round(opts.totaux.prix)}</b> · budget $${opts.totaux.budget}${opts.totaux.dansLeBudget ? " · dans ton budget" : " · légèrement au-dessus"}</div>`
          : "") +
        (opts.warnings && opts.warnings.length
          ? `<div class="proto-warn">${opts.warnings.map((w) => `<span>${w}</span>`).join("")}</div>`
          : "") +
        sec("day", SUN, "Routine du matin", "Réveille &amp; protège") +
        sec("night", MOON, "Routine du soir", "Répare &amp; régénère") +
        `<div class="proto-cta"><div class="proto-total"><span class="lbl">Total estimé</span><span class="val">${total}</span></div>` +
          `<button class="proto-save" id="protoSave">Enregistrer mon protocole</button>` +
          `<button class="proto-restart" id="protoRestart"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 10a8 8 0 0 1 13.4-4.5L20.5 8"/><path d="M20.5 3.5V8H16"/></svg> Tout recommencer</button>` +
          `<div class="proto-note"><svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 7l4-4M9 3H6.6M9 3v2.4"/><path d="M9 7.2V9a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h1.8"/></svg>Liens affiliés vers les marques</div>` +
        `</div>` +
      `</div>`;

    protoEl.scrollTop = 0;
    protoEl.classList.add("show");

    const restart = () => { protoEl.classList.remove("show"); STATE.day = freshState(ROUTINE.day.length); STATE.night = freshState(ROUTINE.night.length); tab = "day"; render(); };
    protoEl.querySelector("#protoBack")?.addEventListener("click", restart);
    protoEl.querySelector("#protoRestart")?.addEventListener("click", restart);
    protoEl.querySelector<HTMLElement>("#protoSave")?.addEventListener("click", (e) => {
      const b = e.currentTarget as HTMLElement;
      b.style.opacity = ".65"; b.textContent = "Protocole enregistré ✓";
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

  /* ── storytelling d'intro (2 phrases + analyse en direct, puis le deck) ── */
  (function intro() {
    const introEl = byId("intro");
    if (!introEl) { render(); return; }
    const lines = introEl.querySelectorAll<HTMLElement>(".intro-line");
    const load = byId("introLoad")!;
    const fill = byId("introFill")!;
    const spin = byId("introSpin")!;
    const statusEl = byId("introStatus")!;
    const countEl = byId("introCount")!;
    const num = byId("introNum")!;
    const label = byId("introLabel")!;
    const eyebrow = byId("introEyebrow")!;
    const setFill = (pct: number, ms: number) => { fill.style.transition = `width ${ms}ms cubic-bezier(.4,0,.2,1)`; fill.style.width = pct + "%"; };
    const cycle = (msgs: string[], interval: number) => {
      let i = 0; statusEl.textContent = msgs[0];
      const id = setI(() => { i++; if (i < msgs.length) statusEl.textContent = msgs[i]; else clearInterval(id); }, interval);
    };
    const tick = (to: number, dur: number) => {
      const t0 = performance.now();
      const id = setI(() => { const t = Math.min(1, (performance.now() - t0) / dur); num.textContent = Math.round((1 - Math.pow(1 - t, 2)) * to).toLocaleString("fr-FR"); if (t >= 1) clearInterval(id); }, 45);
    };

    load.classList.add("show");
    lines[0].classList.add("in");
    cycle(["Lecture de ton diagnostic…", "Sébum · pores · imperfections ciblés", "Définition de tes priorités…"], 1150);
    setFill(34, 3000);
    setT(() => { lines[0].classList.remove("in"); lines[0].classList.add("out"); }, 3300);

    setT(() => {
      lines[1].classList.add("in");
      eyebrow.classList.add("daymode"); eyebrow.innerHTML = SUN + "Routine du jour";
      countEl.classList.add("on");
      label.textContent = "produits analysés · 2 000+ en base";
      cycle(["Connexion à la base produits…", "Analyse en direct…", "Recherche du meilleur match…"], 1250);
      setFill(100, 3500);
      tick(2137, 3200);
    }, 3850);
    setT(() => { spin.classList.add("done"); statusEl.textContent = "Sélection prête"; num.textContent = String(ROUTINE.day.length); label.textContent = "produits retenus pour toi"; }, 7700);
    setT(() => { lines[1].classList.remove("in"); lines[1].classList.add("out"); load.classList.remove("show"); }, 9300);
    setT(() => { render(); introEl.classList.add("gone"); }, 9850);
  })();

  /* ── cleanup ── */
  return () => {
    timeouts.forEach(clearTimeout);
    intervals.forEach(clearInterval);
    if (docMove) document.removeEventListener("pointermove", docMove);
    if (docUp) { document.removeEventListener("pointerup", docUp); document.removeEventListener("pointercancel", docUp); }
  };
}
