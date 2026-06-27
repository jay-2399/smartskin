"use client";
import { useEffect, useMemo, useState } from "react";
import type { IconKey, RoutineData } from "@/features/routine/products";
import "./dashboard.css";

/* Dashboard — espace de suivi post-achat (port de dashboard_smartskin/dashboard.html,
   responsive + tokens SmartSkin). RÉEL : la routine « Tonight » (vrais produits du
   moteur de reco) + le score (dernier scan). DÉMO : courbe, évolution des 3 priorités,
   restock (formule réelle), check-in/plan — activés quand l'historique existera. */

type Mood = "good" | "sensitive" | "irritated" | "breakout";
type TnStep = { cat: string; name: string; use: string; img?: string; icon: IconKey; pausable: boolean };

// ── Icônes flacon (par catégorie) ──
function Flacon({ icon }: { icon: IconKey }) {
  const paths: Record<IconKey, React.ReactNode> = {
    pump: (<><rect x="15" y="28" width="30" height="56" rx="9" /><path d="M24 28v-6h12v6" /><rect x="26" y="9" width="9" height="13" rx="2.5" /><path d="M35 13h7v6" /></>),
    dropper: (<><rect x="16" y="36" width="28" height="48" rx="8" /><path d="M23 36v-4h14v4" /><rect x="25" y="10" width="10" height="22" rx="3" /></>),
    jar: (<><rect x="12" y="38" width="36" height="40" rx="11" /><rect x="10" y="26" width="40" height="14" rx="5" /></>),
    bottle: (<><path d="M19 84V40c0-3 1-4 3-6l1-3v-6h14v6l1 3c2 2 3 3 3 6v44a4 4 0 0 1-4 4H23a4 4 0 0 1-4-4Z" /><rect x="24" y="9" width="12" height="10" rx="2" /></>),
  };
  return (
    <svg className="flacon" viewBox="0 0 60 92" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round">
      {paths[icon] ?? paths.bottle}
    </svg>
  );
}
const Sun = () => (<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="4.6" /><g stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M12 2.9v1.7" /><path d="M12 19.4v1.7" /><path d="M21.1 12h-1.7" /><path d="M4.6 12H2.9" /><path d="M18.45 5.55l-1.2 1.2" /><path d="M6.75 17.25l-1.2 1.2" /><path d="M18.45 18.45l-1.2-1.2" /><path d="M6.75 6.75L5.55 5.55" /></g></svg>);
const Moon = () => (<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.7a6.6 6.6 0 0 0 8.8 8.8A8.6 8.6 0 1 1 12 2.7Z" /><circle cx="18.1" cy="5.3" r="1.05" /><circle cx="20.3" cy="8.7" r="0.7" /></svg>);
const Check = () => (<svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M2.5 7.5l3 3 6-6.5" /></svg>);
const Cart = () => (<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M6 7.5h13l-1.2 9.2a2.2 2.2 0 0 1-2.2 1.9H9.4a2.2 2.2 0 0 1-2.2-1.9L6 7.5Z" /><path d="M9 7.5a3 3 0 0 1 6 0" /></svg>);

// ── Courbe : trajectoire de démo dont le DERNIER point = le vrai score. ──
const DELTAS = [-14, -13, -15, -12, -10, -11, -8, -6, -3, 0];
function buildChart(score: number) {
  const scores = DELTAS.map((d) => Math.max(0, score + d));
  const n = scores.length;
  const lo = Math.min(...scores) - 4, hi = Math.max(...scores) + 3;
  const x0 = 4, x1 = 68, y0 = 14, y1 = 82;
  const X = (i: number) => x0 + (x1 - x0) * (i / (n - 1));
  const Y = (v: number) => y0 + (y1 - y0) * (1 - (v - lo) / (hi - lo));
  const pts = scores.map((v, i) => [X(i), Y(v)] as const);
  const line = "M" + pts.map((q) => `${q[0].toFixed(2)} ${q[1].toFixed(2)}`).join(" L");
  const last = pts[n - 1];
  const area = `${line} L${last[0].toFixed(2)} 100 L${pts[0][0].toFixed(2)} 100 Z`;
  return { line, area, dotX: last[0], dotY: last[1], trend: score - scores[0] };
}

// ── Restock : formule réelle (quantité ÷ dose × usages/jour), données démo. ──
const DOSE: Record<string, number> = { nettoyant: 2, serum: 0.5, creme: 1.2, hydratant: 1.2, spf: 1.2, exfoliant: 1 };
const FREQ: Record<string, number> = { daily: 1, "3x/sem": 3 / 7, "1-2x/sem": 1.5 / 7 };
type MockProd = { name: string; icon: IconKey; category: string; frequency: string; moment: string; size_ml: number; elapsedDays: number; asin: string };
const RESTOCK_MOCK: MockProd[] = [
  { name: "EltaMD UV Clear SPF 46", icon: "bottle", category: "spf", frequency: "daily", moment: "AM", size_ml: 50, elapsedDays: 38, asin: "B002MSN3QQ" },
  { name: "TruSkin Vitamin C Serum", icon: "dropper", category: "serum", frequency: "daily", moment: "AM", size_ml: 30, elapsedDays: 52, asin: "B01M4MCUAF" },
  { name: "CeraVe Moisturizing Cream", icon: "jar", category: "creme", frequency: "daily", moment: "both", size_ml: 340, elapsedDays: 20, asin: "B00TTD9BRC" },
];
function estimate(p: MockProd) {
  const dose = DOSE[p.category] || 1;
  let perDay = FREQ[p.frequency] || 1;
  if (p.moment === "both" && p.frequency === "daily") perDay = 2;
  const total = p.size_ml / (dose * perDay);
  return { left: Math.max(0, Math.round(total - p.elapsedDays)), pctUsed: Math.min(100, Math.round((p.elapsedDays / total) * 100)) };
}

export function DashboardScreen({ name, score, routine }: { name: string; score: number; routine: RoutineData }) {
  const [moment, setMoment] = useState<"evening" | "morning">("evening");
  const [mood, setMood] = useState<Mood | null>(null);
  const [eveningDone, setEveningDone] = useState<Record<number, boolean>>({});
  const [morningDone, setMorningDone] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [today, setToday] = useState("");

  useEffect(() => {
    try {
      const s = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
      // Date locale du client (évite un mismatch SSR/CSR) → setState en effet justifié.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setToday(s.charAt(0).toUpperCase() + s.slice(1));
    } catch { /* noop */ }
    const t = setTimeout(() => setModalOpen(true), 250);
    return () => clearTimeout(t);
  }, []);

  // Tonight = vrais produits (moteur de reco). day → matin, night → soir.
  const toSteps = (steps: RoutineData["day"]): TnStep[] =>
    steps.map((s) => ({
      cat: s.cat,
      // le `name` du catalogue réel contient déjà la marque → pas de préfixe.
      name: s.options[0]?.name ?? s.cat,
      use: s.use,
      img: s.options[0]?.img,
      icon: s.icon,
      pausable: /exfoliant/i.test(s.cat),
    }));
  const evening = useMemo(() => toSteps(routine.night), [routine]);
  const morning = useMemo(() => toSteps(routine.day), [routine]);

  const chart = useMemo(() => buildChart(score), [score]);
  const goal = Math.min(100, score + 6);
  const isMorning = moment === "morning";
  const skip = !isMorning && (mood === "irritated" || mood === "sensitive");
  const hasExfo = evening.some((s) => s.pausable);
  const kicker = isMorning ? "CE MATIN · ANTIOXYDANT + BOUCLIER"
    : skip ? "CE SOIR · NUIT DOUCE"
    : hasExfo ? "CE SOIR · NUIT EXFOLIANTE" : "CE SOIR";
  const note = isMorning ? "Le matin protège ta peau pour la journée — sérum puis SPF."
    : skip ? "On met l'exfoliant en pause ce soir — ta barrière a besoin d'une trêve. Juste nettoie + hydrate."
    : mood === "breakout" ? "Garde ton exfoliant ce soir — il cible les imperfections. Mets-en un peu plus sur la zone concernée."
    : hasExfo ? "Ce soir, c'est ta nuit exfoliante." : "Ta routine du soir, étape par étape.";

  const steps = isMorning ? morning : evening;
  const eveningTotal = evening.filter((s) => !(skip && s.pausable)).length;
  const eveningCount = evening.reduce((n, s, i) => n + (!(skip && s.pausable) && eveningDone[i] ? 1 : 0), 0);

  const initial = (name.charAt(0) || "S").toUpperCase();

  const pickMood = (m: Mood) => { setMood(m); setTimeout(() => setModalOpen(false), 320); };

  const lowRestock = RESTOCK_MOCK.map((p) => ({ p, e: estimate(p) }))
    .filter((x) => x.e.left <= 10)
    .sort((a, b) => a.e.left - b.e.left);

  return (
    <div className="dash">
      <div className="dash-top">
        <div>
          <div className="hello">Bonjour {name.charAt(0).toUpperCase() + name.slice(1)} 👋</div>
          <div className="date">{today}</div>
        </div>
        <div className="ava">{initial}</div>
      </div>

      <div className="dash-scroll">
        {/* ── Skin score (hero) — score réel, courbe démo ── */}
        <div className="card chart-card">
          <div className="ch-head">
            <div>
              <div className="ch-label">Skin score</div>
              <div className="ch-num">{score}{chart.trend > 0 && <span className="ch-trend">↑ +{chart.trend}</span>}</div>
            </div>
            <button className="ch-go" aria-label="Historique"><svg viewBox="0 0 16 16" fill="none"><path d="M5 3l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg></button>
          </div>
          <div className="ch-plot">
            <svg className="ch-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
              <defs><linearGradient id="chArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#A6C3D6" stopOpacity="0.45" /><stop offset="100%" stopColor="#A6C3D6" stopOpacity="0" /></linearGradient></defs>
              <path d={chart.area} fill="url(#chArea)" />
              <path d={chart.line} fill="none" stroke="#7FA6BE" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
            </svg>
            <span className="ch-guide" style={{ left: `${chart.dotX}%`, top: `${chart.dotY}%`, height: `${100 - chart.dotY}%` }} />
            <span className="ch-dot" style={{ left: `${chart.dotX}%`, top: `${chart.dotY}%` }} />
            <div className="ch-side">
              <div className="gl-k">Objectif</div>
              <div className="gl-v">{goal}</div>
              <div className="gl-s">{goal - score} pts restants</div>
            </div>
          </div>
          <div className="ch-ticks">{Array.from({ length: 34 }, (_, i) => <i key={i} />)}</div>
          <div className="skin-next">
            <div className="skin-next-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2" /><circle cx="12" cy="12" r="3" /></svg></div>
            <div className="skin-next-tx"><b>Prochain scan dans 18 jours</b><div>Pour ajuster ton protocole à mesure que ta peau évolue.</div></div>
            <button className="skin-next-cta">Analyser</button>
          </div>
        </div>

        {/* ── 3 priorités (démo) ── */}
        <div className="sec-label">Tes 3 priorités</div>
        <Priority name="Sébum" pill="En progrès" tip="Modéré" tipLeft={38} segLeft={38} segW={26} was={64} now={38} left="RÉGULÉ" right="EXCÈS" comment={<><b>Modéré → Léger</b> · ton sébum se régule bien depuis ton dernier scan.</>} />
        <Priority name="Marques" pill="En progrès" tip="S'estompe" tipLeft={52} segLeft={52} segW={20} was={72} now={52} left="NET" right="MARQUÉ" comment={<><b>Marqué → S’estompe</b> · les marques post-acné s’éclaircissent.</>} />
        <Priority name="Barrière" pill="En progrès" tip="Solide" tipLeft={34} segLeft={34} segW={30} was={64} now={34} left="SOLIDE" right="FRAGILE" comment={<><b>Fragile → Solide</b> · ta barrière est nettement plus résistante.</>} />

        {/* ── Tonight — routine réelle (dynamique) ── */}
        <div className="card tonight">
          <div className="tn-top">
            <div className="tn-kicker">{kicker}</div>
            <div className="seg">
              <button className={`night ${!isMorning ? "on" : ""}`} onClick={() => setMoment("evening")}><Moon />Soir</button>
              <button className={`day ${isMorning ? "on" : ""}`} onClick={() => setMoment("morning")}><Sun />Matin</button>
            </div>
          </div>
          <div className={`tn-note ${skip ? "alert" : ""}`}>{note}</div>
          <div>
            {steps.map((s, i) => {
              if (isMorning) {
                return (
                  <div key={i} className="rt-step ref">
                    <span className="rt-num">{i + 1}</span>
                    <span className="rt-thumb">{s.img ? <img src={s.img} alt="" /> : <Flacon icon={s.icon} />}</span>
                    <span className="rt-info"><span className="rt-cat">{s.cat}</span><div className="rt-name">{s.name}</div><div className="rt-use">{s.use}</div></span>
                  </div>
                );
              }
              const paused = skip && s.pausable;
              const done = !!eveningDone[i] && !paused;
              return (
                <button key={i} className={`rt-step ${done ? "done" : ""} ${paused ? "paused" : ""}`} disabled={paused}
                  onClick={() => !paused && setEveningDone((d) => ({ ...d, [i]: !d[i] }))}>
                  <span className="rt-check"><Check /></span>
                  <span className="rt-thumb">{s.img ? <img src={s.img} alt="" /> : <Flacon icon={s.icon} />}</span>
                  <span className="rt-info"><span className="rt-cat">{s.cat}{paused ? " · en pause" : ""}</span><div className="rt-name">{s.name}</div><div className="rt-use">{paused ? "En pause — la barrière d'abord." : s.use}</div></span>
                </button>
              );
            })}
          </div>
          <div className="tn-foot">
            {isMorning ? (
              <button className={`tn-confirm ${morningDone ? "done" : ""}`} onClick={() => setMorningDone((v) => !v)}>
                {morningDone && <Check />}{morningDone ? "Fait ce matin" : "J'ai fait ma routine du matin"}
              </button>
            ) : (
              <><span className="tn-prog">{eveningCount}/{eveningTotal}</span> fait ce soir</>
            )}
          </div>
        </div>

        {/* ── Routine plan (démo) ── */}
        <div className="sec-label">Ton plan de routine</div>
        <div className="card plan">
          <div className="plan-tl">
            <PlanNode state="done" label="Départ" />
            <PlanNode state="now" label="BHA 2×/sem" />
            <PlanNode label="BHA 3×/sem" />
            <PlanNode label="+ Rétinoïde" />
            <PlanNode label="Entretien" />
          </div>
          <div className="plan-next">
            <div className="plan-next-row"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg><span><b>Semaine prochaine :</b> ton BHA passe à 3×/sem — si ta peau reste calme.</span></div>
            <div className="plan-next-row"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2.4l2.9 5.9 6.5.95-4.7 4.6 1.1 6.45L12 17.8l-5.8 3.05 1.1-6.45-4.7-4.6 6.5-.95z" /></svg><span><b>Dans ~2 semaines :</b> un rétinoïde rejoint la routine pour tes marques, une fois ta barrière bien solide.</span></div>
          </div>
        </div>

        {/* ── Running low (restock, formule réelle / données démo) ── */}
        {lowRestock.length > 0 && (
          <div className="restock-wrap">
            <div className="sec-label">Bientôt fini</div>
            {lowRestock.map(({ p, e }, i) => (
              <div key={i} className="card prod low">
                <div className="prod-thumb"><Flacon icon={p.icon} /></div>
                <div className="prod-info">
                  <div className="prod-name">{p.name}</div>
                  <div className="prod-left low"><span className="pip" />Fini dans ~{e.left} jours</div>
                  <div className="restock-bar"><i style={{ width: `${e.pctUsed}%` }} /></div>
                </div>
                <a className="prod-buy" href={`https://www.amazon.com/dp/${p.asin}`} target="_blank" rel="noopener noreferrer"><Cart />Racheter</a>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Check-in modal (au chargement) ── */}
      <div className={`ci-modal ${modalOpen ? "" : "hidden"}`}>
        <div className="ci-scrim" onClick={() => setModalOpen(false)} />
        <div className="ci-sheet">
          <button className="ci-x" aria-label="Fermer" onClick={() => setModalOpen(false)}><svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M2 2l10 10M12 2L2 12" /></svg></button>
          <div className="ci-title">Comment va ta peau aujourd’hui ?</div>
          <div className="ci-sub">On adapte ta routine du soir en conséquence.</div>
          <div className="ci-opts">
            <button className={`ci-opt ${mood === "good" ? "on" : ""}`} onClick={() => pickMood("good")}><span className="ci-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M8.5 14a4 4 0 0 0 7 0" /><path d="M9 10h.01M15 10h.01" /></svg></span>Bien</button>
            <button className={`ci-opt ${mood === "sensitive" ? "on" : ""}`} onClick={() => pickMood("sensitive")}><span className="ci-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3s6 6.5 6 10.5a6 6 0 0 1-12 0C6 9.5 12 3 12 3Z" /></svg></span>Sensible</button>
            <button className={`ci-opt ${mood === "irritated" ? "on" : ""}`} onClick={() => pickMood("irritated")}><span className="ci-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3.5l8.5 15h-17z" /><path d="M12 10v3.5" /><path d="M12 16.5h.01" /></svg></span>Irritée</button>
            <button className={`ci-opt ${mood === "breakout" ? "on" : ""}`} onClick={() => pickMood("breakout")}><span className="ci-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="2.4" fill="currentColor" stroke="none" /></svg></span>Boutons</button>
          </div>
          <button className="ci-skip" onClick={() => setModalOpen(false)}>Plus tard</button>
        </div>
      </div>
    </div>
  );
}

// ── Carte « priorité » (spectre + avant/maintenant + commentaire) ──
function Priority(props: { name: string; pill: string; tip: string; tipLeft: number; segLeft: number; segW: number; was: number; now: number; left: string; right: string; comment: React.ReactNode }) {
  return (
    <div className="card p3card">
      <div className="p3-head"><span className="p3-name">{props.name}</span><span className="p3-pill up">{props.pill}</span></div>
      <div className="p3-tip-row"><span className="p3-tip" style={{ left: `${props.tipLeft}%` }}>{props.tip}</span></div>
      <div className="p3-spec">
        <div className="p3-track" />
        <div className="p3-seg" style={{ left: `${props.segLeft}%`, width: `${props.segW}%` }} />
        <div className="p3-was" style={{ left: `${props.was}%` }} />
        <div className="p3-now" style={{ left: `${props.now}%` }} />
      </div>
      <div className="p3-ends"><span>{props.left}</span><span>{props.right}</span></div>
      <div className="p3-comment"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 17l6-6 4 4 8-8" /><path d="M21 11V7h-4" /></svg><span>{props.comment}</span></div>
    </div>
  );
}

function PlanNode({ state, label }: { state?: "done" | "now"; label: string }) {
  return (
    <div className={`plan-node ${state ?? ""}`}><span className="plan-dot" /><span className="plan-lab">{label}</span></div>
  );
}
