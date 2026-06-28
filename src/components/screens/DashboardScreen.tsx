"use client";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useResult } from "@/features/analysis/resultStore";
import type { IconKey, RoutineData, RestockItem } from "@/features/routine/products";
import { useFunnel } from "@/features/funnel/store";
import type { Answers } from "@/features/funnel/types";
import "./dashboard.css";

/* Dashboard — espace de suivi post-achat (port de dashboard_smartskin/dashboard.html,
   responsive + tokens SmartSkin). RÉEL : la routine « Tonight » (vrais produits du
   moteur de reco) + le score (dernier scan). DÉMO : courbe, évolution des 3 priorités,
   restock (formule réelle), check-in/plan — activés quand l'historique existera. */

type Mood = "good" | "sensitive" | "irritated" | "breakout";
type TnStep = { cat: string; name: string; use: string; img?: string; icon: IconKey; pausable: boolean };
// Historique (1 point/scan) pour la courbe + données d'une priorité dynamique.
type HistPoint = { date: string; score: number };
type PriorityData = { name: string; low: string; high: string; now: number; was: number | null; tip: string; prevTip: string | null };
// Majuscule à la 1ʳᵉ lettre (les `tip` du bilan sont en minuscules).
const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

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

// Cadence de re-scan : hebdomadaire (7 j) → repère du prochain scan.
const NEXT_SCAN_DAYS = 7;

// Plan de routine : 4 jalons de progression (selon la phase) + 2 lignes « maintenant / la suite ».
const PLAN_LABELS = ["Start", "Ramp-up", "Strengthen", "Maintain"];
const PLAN_NEXT: Record<number, [string, string]> = {
  1: ["For the first weeks, we keep a gentle routine while your skin adjusts.", "Then we gradually raise the frequency of your targeted actives."],
  2: ["Your skin already tolerates actives: we can raise the frequency without irritating it.", "A stronger active (like a retinoid) can join the routine for your marks."],
  3: ["Your routine is complete — you're in the maintenance phase.", "We only adjust based on how your skin evolves, scan after scan."],
};

// ── Restock : formule réelle (contenance ÷ dose × usages/jour). Produits = les VRAIS
//    produits recommandés ; `elapsedDays` = jours écoulés depuis le scan de l'utilisateur. ──
const DOSE: Record<string, number> = { nettoyant: 2, démaquillant: 2, serum: 0.5, creme: 1.2, hydratant: 1.2, spf: 1.2, exfoliant: 1 };
const FREQ: Record<string, number> = { daily: 1, "3x/sem": 3 / 7, "1-2x/sem": 1.5 / 7 };
function estimate(p: RestockItem, elapsedDays: number) {
  const dose = DOSE[p.category] || 1;
  let perDay = FREQ[p.frequency] || 1;
  if (p.moment === "both" && p.frequency === "daily") perDay = 2;
  const total = p.size_ml / (dose * perDay);
  return { left: Math.max(0, Math.round(total - elapsedDays)), pctUsed: Math.min(100, Math.round((elapsedDays / total) * 100)) };
}

export function DashboardScreen({ name, score, routine, startedDaysAgo, loggedIn, history, priorities, lastAnswers, firstDateLabel, nextDateLabel, nextDateFull, phase }: { name: string; score: number; routine: RoutineData; startedDaysAgo: number; loggedIn: boolean; history: HistPoint[]; priorities: PriorityData[]; lastAnswers: Answers; firstDateLabel: string | null; nextDateLabel: string; nextDateFull: string; phase: number }) {
  const router = useRouter();
  // « Analyser » : re-scan = on réutilise les réponses du dernier scan, on ne refait
  // que la photo, et on reviendra au dashboard à la fin (cf. funnel store `rescan`).
  const startRescan = () => {
    useFunnel.setState({ answers: lastAnswers, rescan: true });
    router.push("/capture");
  };
  const [moment, setMoment] = useState<"evening" | "morning">("evening");
  const [mood, setMood] = useState<Mood | null>(null);
  const [eveningDone, setEveningDone] = useState<Record<number, boolean>>({});
  const [morningDone, setMorningDone] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [lockOpen, setLockOpen] = useState(false); // modal « patiente » si re-scan trop tôt
  const [today, setToday] = useState("");
  // Routine VALIDÉE au reveal (gardée en mémoire) → prioritaire sur celle recalculée
  // côté serveur. Lue APRÈS le montage (SSR = prop) pour éviter un mismatch d'hydratation.
  const [validated, setValidated] = useState<RoutineData | null>(null);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setValidated(useResult.getState().validatedRoutine);
  }, []);

  useEffect(() => {
    try {
      const s = new Date().toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long" });
      // Date locale du client (évite un mismatch SSR/CSR) → setState en effet justifié.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setToday(s.charAt(0).toUpperCase() + s.slice(1));
    } catch { /* noop */ }
  }, []);

  // Check-in « comment va ta peau » : on RESTAURE le choix du jour (localStorage) → la
  // routine du soir reste adaptée après reload et la modale ne re-popup pas. Sinon, on la
  // propose à un utilisateur connecté.
  useEffect(() => {
    const key = "ss_mood_" + new Date().toLocaleDateString("en-CA");
    const saved = (() => { try { return localStorage.getItem(key); } catch { return null; } })();
    if (saved) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMood(saved as Mood); // déjà répondu aujourd'hui
      return;
    }
    if (!loggedIn) return;
    const t = setTimeout(() => setModalOpen(true), 250);
    return () => clearTimeout(t);
  }, [loggedIn]);

  // Scan fait AVANT une inscription Google (mémoire perdue à la redirection OAuth → stocké
  // en sessionStorage) : on l'enregistre sous le nouveau compte puis on rafraîchit la page.
  useEffect(() => {
    const raw = (() => { try { return sessionStorage.getItem("ss_pending_scan"); } catch { return null; } })();
    if (!raw) return;
    try { sessionStorage.removeItem("ss_pending_scan"); } catch { /* noop */ }
    fetch("/api/scan", { method: "POST", headers: { "Content-Type": "application/json" }, body: raw })
      .then(() => router.refresh())
      .catch(() => {});
  }, [router]);

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
  // Routine affichée : celle VALIDÉE par l'utilisateur si dispo, sinon la prop serveur.
  const effRoutine = validated ?? routine;
  const evening = useMemo(() => toSteps(effRoutine.night), [effRoutine]);
  const morning = useMemo(() => toSteps(effRoutine.day), [effRoutine]);

  // Objectif FIXE (cible « belle peau ») ; « X restants » = objectif − score.
  const GOAL_SCORE = 90;
  const goalRemaining = Math.max(0, GOAL_SCORE - score);
  // Verrou du re-scan : le décompte va jusqu'au jour J (0). Tant que > 0 → scan bloqué
  // (un clic « Analyser » ouvre le modal « patiente »). À 0 ou moins → analyse possible.
  const rawDaysToNext = NEXT_SCAN_DAYS - startedDaysAgo;
  const scanLocked = rawDaysToNext > 0;
  const daysToNext = Math.max(0, rawDaysToNext);
  const planNext = PLAN_NEXT[phase] ?? PLAN_NEXT[1];
  // Graphe : ≥ 2 scans → courbe + aire (points 8 %→55 %, « aujourd'hui » au centre) ;
  // 1 scan → point « Départ » à gauche. Anneau « prochain scan » à droite (78 %).
  const yOf = (s: number) => 86 - Math.max(0, Math.min(100, s)) * 0.56; // % top : haut = score élevé
  const multi = history.length >= 2;
  const pts = multi
    ? history.map((h, i) => ({ x: 8 + (47 * i) / (history.length - 1), y: yOf(h.score) }))
    : [{ x: 8, y: yOf(score) }];
  const last = pts[pts.length - 1];
  const nextX = 78; // position de l'anneau « prochain scan »
  const trend = multi ? score - history[0].score : 0; // évolution depuis le 1ᵉ scan
  const linePoints = pts.map((p) => `${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(" ");
  const areaPath = multi ? `M${pts.map((p) => `${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(" L")} L${last.x.toFixed(2)} 100 L${pts[0].x.toFixed(2)} 100 Z` : "";
  const isMorning = moment === "morning";
  const skip = !isMorning && (mood === "irritated" || mood === "sensitive");
  const hasExfo = evening.some((s) => s.pausable);
  const kicker = isMorning ? "THIS MORNING · ANTIOXIDANT + SHIELD"
    : skip ? "TONIGHT · GENTLE NIGHT"
    : hasExfo ? "TONIGHT · EXFOLIANT NIGHT" : "TONIGHT";
  const note = isMorning ? "Mornings protect your skin all day — serum, then SPF."
    : skip ? "Skipping the exfoliant tonight — your barrier needs a break. Just cleanse + moisturize."
    : mood === "breakout" ? "Keep your exfoliant tonight — it targets breakouts. Dab a little extra on the affected area."
    : hasExfo ? "Tonight is your exfoliant night." : "Your evening routine, step by step.";

  const steps = isMorning ? morning : evening;
  const eveningTotal = evening.filter((s) => !(skip && s.pausable)).length;
  const eveningCount = evening.reduce((n, s, i) => n + (!(skip && s.pausable) && eveningDone[i] ? 1 : 0), 0);

  const initial = (name.charAt(0) || "S").toUpperCase();

  const pickMood = (m: Mood) => {
    setMood(m);
    try { localStorage.setItem("ss_mood_" + new Date().toLocaleDateString("en-CA"), m); } catch { /* noop */ }
    setTimeout(() => setModalOpen(false), 320);
  };

  // Restock = consommables de la routine AFFICHÉE (validée au swipe si dispo, sinon
  // serveur) → toujours cohérent avec « Tonight ». On reconstruit les RestockItem depuis
  // les produits choisis. Alerte (« low » + « Fini dans ») à ≤ 14 j ; sinon « Il te reste ~X j ».
  const restockItems: RestockItem[] = [...effRoutine.day, ...effRoutine.night]
    .map((s): RestockItem | null => {
      const p = s.options[0];
      if (!p || !p.size_ml) return null;
      return { name: p.name, asin: p.asin ?? "", icon: s.icon, img: p.img, category: p.category ?? "", frequency: p.frequency ?? "daily", moment: p.moment ?? "both", size_ml: p.size_ml };
    })
    .filter((x): x is RestockItem => x !== null);
  const restockList = restockItems.map((p) => ({ p, e: estimate(p, startedDaysAgo) }))
    .sort((a, b) => a.e.left - b.e.left);

  return (
    <div className="dash">
      <div className="dash-top">
        <div>
          <div className="hello">Hi {name.charAt(0).toUpperCase() + name.slice(1)} 👋</div>
          <div className="date">{today}</div>
        </div>
        <div className="ava">{initial}</div>
      </div>

      <div className="dash-scroll">
        {/* ── Skin score (hero) — score réel. 1 seul scan → pas de courbe : point unique
             à gauche (= score actuel) + repère vertical du futur scan (la courbe viendra
             avec l'historique). ── */}
        <div className="card chart-card">
          <div className="ch-head">
            <div>
              <div className="ch-label">Skin score</div>
              <div className="ch-num">
                {score}
                {multi
                  ? (trend !== 0 && <span className={`ch-trend ${trend > 0 ? "up" : "down"}`}>{trend > 0 ? "↑ +" : "↓ "}{Math.abs(trend)}</span>)
                  : <span className="ch-base">Baseline</span>}
              </div>
            </div>
            <div className="ch-goal">
              <span className="ch-goal-k">Goal</span>
              <span className="ch-goal-v">{GOAL_SCORE}</span>
              <span className="ch-goal-s">{goalRemaining > 0 ? `${goalRemaining} to go` : "reached 🎉"}</span>
            </div>
          </div>
          <div className="ch-plot">
            <svg className="ch-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
              {multi && (
                <>
                  <defs><linearGradient id="chArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#A6C3D6" stopOpacity="0.4" /><stop offset="100%" stopColor="#A6C3D6" stopOpacity="0" /></linearGradient></defs>
                  <path d={areaPath} fill="url(#chArea)" />
                  <polyline points={linePoints} fill="none" stroke="#7FA6BE" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                </>
              )}
              {/* projection pointillée du dernier point vers le prochain scan */}
              <line x1={last.x} y1={last.y} x2={nextX} y2={last.y} stroke="#7FA6BE" strokeWidth="1.6" strokeDasharray="3 3" opacity="0.5" vectorEffect="non-scaling-stroke" />
            </svg>
            {/* pastilles : « Départ » (1 scan) au-dessus du point + « Prochain scan » au-dessus de l'anneau */}
            {!multi && <span className="ch-pill" style={{ left: `${last.x}%` }}>Baseline</span>}
            <span className="ch-pill" style={{ left: `${nextX}%` }}>Next scan</span>
            {/* point « aujourd'hui » (dernier scan) + anneau du prochain scan */}
            <span className="ch-dot today" style={{ left: `${last.x}%`, top: `${last.y}%` }} />
            <span className="ch-ring" style={{ left: `${nextX}%`, top: `${last.y}%` }} />
          </div>
          <div className="ch-axis">
            {multi && firstDateLabel && <span style={{ left: "8%" }}>{firstDateLabel}</span>}
            <span className="now" style={{ left: `${last.x}%` }}>Today</span>
            <span style={{ left: `${nextX}%` }}>{nextDateLabel}</span>
          </div>
          <div className="skin-next">
            <div className="skin-next-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2" /><circle cx="12" cy="12" r="3" /></svg></div>
            <div className="skin-next-tx"><b>{scanLocked ? `Next scan · ${nextDateFull}` : "Your analysis is ready"}</b><div>{scanLocked ? `In ${daysToNext} day${daysToNext > 1 ? "s" : ""} · we fine-tune your routine after each scan.` : "Re-scan to update your tracking."}</div></div>
            <button className={`skin-next-cta ${scanLocked ? "locked" : ""}`} onClick={() => (scanLocked ? setLockOpen(true) : startRescan())}>
              {scanLocked && <svg className="cta-lock" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>}
              Analyze
            </button>
          </div>
        </div>

        {/* ── Priorités dynamiques (top préoccupations du scan + évolution) ── */}
        {priorities.length > 0 && (
          <>
            <div className="sec-label">Your priorities</div>
            {priorities.map((p, i) => <Priority key={i} data={p} multiScan={multi} />)}
          </>
        )}

        {/* ── Tonight — routine réelle (dynamique) ── */}
        <div className="card tonight">
          <div className="tn-top">
            <div className="tn-kicker">{kicker}</div>
            <div className="seg">
              <button className={`night ${!isMorning ? "on" : ""}`} onClick={() => setMoment("evening")}><Moon />Evening</button>
              <button className={`day ${isMorning ? "on" : ""}`} onClick={() => setMoment("morning")}><Sun />Morning</button>
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
                  <span className="rt-info"><span className="rt-cat">{s.cat}{paused ? " · paused" : ""}</span><div className="rt-name">{s.name}</div><div className="rt-use">{paused ? "Paused — barrier first." : s.use}</div></span>
                </button>
              );
            })}
          </div>
          <div className="tn-foot">
            {isMorning ? (
              <button className={`tn-confirm ${morningDone ? "done" : ""}`} onClick={() => setMorningDone((v) => !v)}>
                {morningDone && <Check />}{morningDone ? "Done this morning" : "I did my morning routine"}
              </button>
            ) : (
              <><span className="tn-prog">{eveningCount}/{eveningTotal}</span> done tonight</>
            )}
          </div>
        </div>

        {/* ── Ton plan de routine — progression réelle selon ta phase (expérience déclarée) ── */}
        <div className="sec-label">Your routine plan</div>
        <div className="card plan">
          <div className="plan-tl">
            {PLAN_LABELS.map((label, i) => (
              <PlanNode key={i} state={i < phase ? "done" : i === phase ? "now" : undefined} label={label} />
            ))}
          </div>
          <div className="plan-next">
            <div className="plan-next-row"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg><span><b>Now:</b> {planNext[0]}</span></div>
            <div className="plan-next-row"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2.4l2.9 5.9 6.5.95-4.7 4.6 1.1 6.45L12 17.8l-5.8 3.05 1.1-6.45-4.7-4.6 6.5-.95z" /></svg><span><b>Next:</b> {planNext[1]}</span></div>
          </div>
        </div>

        {/* ── Recharges : tous les consommables, alerte (low) à ≤ 14 j ── */}
        {restockList.length > 0 && (
          <div className="restock-wrap">
            <div className="sec-label">Your restock</div>
            {restockList.map(({ p, e }, i) => {
              const low = e.left <= 14;
              return (
                <div key={i} className={`card prod ${low ? "low" : ""}`}>
                  <div className="prod-thumb">{p.img ? <img src={p.img} alt="" /> : <Flacon icon={p.icon} />}</div>
                  <div className="prod-info">
                    <div className="prod-name">{p.name}</div>
                    <div className={`prod-left ${low ? "low" : ""}`}><span className="pip" />{low ? `Out in ~${e.left} days` : `~${e.left} days left`}</div>
                    <div className="restock-bar"><i style={{ width: `${e.pctUsed}%` }} /></div>
                  </div>
                  <a className="prod-buy" href={`https://www.amazon.com/dp/${p.asin}`} target="_blank" rel="noopener noreferrer"><Cart />Restock</a>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Check-in modal (au chargement) ── */}
      <div className={`ci-modal ${modalOpen ? "" : "hidden"}`}>
        <div className="ci-scrim" onClick={() => setModalOpen(false)} />
        <div className="ci-sheet">
          <button className="ci-x" aria-label="Fermer" onClick={() => setModalOpen(false)}><svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M2 2l10 10M12 2L2 12" /></svg></button>
          <div className="ci-title">How's your skin today?</div>
          <div className="ci-sub">We'll tailor tonight's routine to it.</div>
          <div className="ci-opts">
            <button className={`ci-opt ${mood === "good" ? "on" : ""}`} onClick={() => pickMood("good")}><span className="ci-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M8.5 14a4 4 0 0 0 7 0" /><path d="M9 10h.01M15 10h.01" /></svg></span>Good</button>
            <button className={`ci-opt ${mood === "sensitive" ? "on" : ""}`} onClick={() => pickMood("sensitive")}><span className="ci-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3s6 6.5 6 10.5a6 6 0 0 1-12 0C6 9.5 12 3 12 3Z" /></svg></span>Sensitive</button>
            <button className={`ci-opt ${mood === "irritated" ? "on" : ""}`} onClick={() => pickMood("irritated")}><span className="ci-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3.5l8.5 15h-17z" /><path d="M12 10v3.5" /><path d="M12 16.5h.01" /></svg></span>Irritated</button>
            <button className={`ci-opt ${mood === "breakout" ? "on" : ""}`} onClick={() => pickMood("breakout")}><span className="ci-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="2.4" fill="currentColor" stroke="none" /></svg></span>Breakout</button>
          </div>
          <button className="ci-skip" onClick={() => setModalOpen(false)}>Skip for now</button>
        </div>
      </div>

      {/* ── Modal « patiente » : re-scan bloqué tant que le décompte n'est pas fini ── */}
      <div className={`ci-modal ${lockOpen ? "" : "hidden"}`}>
        <div className="ci-scrim" onClick={() => setLockOpen(false)} />
        <div className="ci-sheet">
          <button className="ci-x" aria-label="Fermer" onClick={() => setLockOpen(false)}><svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M2 2l10 10M12 2L2 12" /></svg></button>
          <div className="ci-lock-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg></div>
          <div className="ci-title">{daysToNext} more day{daysToNext > 1 ? "s" : ""} to wait</div>
          <div className="ci-sub">Your skin changes over about a week. We wait for the next scan to measure real change — not day-to-day noise.</div>
          <button className="ci-skip" onClick={() => setLockOpen(false)}>Got it</button>
        </div>
      </div>
    </div>
  );
}

// ── Carte « priorité » DYNAMIQUE (spectre + avant/maintenant + commentaire).
//    `now`/`was` sont déjà des % (LEVEL_TO_PERCENT) ; niveau bas = mieux (1 = idéal). ──
function Priority({ data, multiScan }: { data: PriorityData; multiScan: boolean }) {
  const hasPrev = multiScan && data.was != null;
  const was = data.was ?? data.now;
  const improving = hasPrev && data.now < was;
  const worsening = hasPrev && data.now > was;
  const pill = !hasPrev ? "1st scan" : improving ? "Improving" : worsening ? "Watch" : "Stable";
  const pillCls = improving ? "up" : worsening ? "down" : "flat";
  const segLeft = Math.min(was, data.now);
  const segW = Math.abs(data.now - was);
  return (
    <div className="card p3card">
      <div className="p3-head"><span className="p3-name">{data.name}</span><span className={`p3-pill ${pillCls}`}>{pill}</span></div>
      <div className="p3-tip-row"><span className="p3-tip" style={{ left: `${data.now}%` }}>{cap(data.tip)}</span></div>
      <div className="p3-spec">
        <div className="p3-track" />
        {hasPrev && segW > 0 && <div className="p3-seg" style={{ left: `${segLeft}%`, width: `${segW}%` }} />}
        {hasPrev && <div className="p3-was" style={{ left: `${was}%` }} />}
        <div className="p3-now" style={{ left: `${data.now}%` }} />
      </div>
      <div className="p3-ends"><span>{data.low.toUpperCase()}</span><span>{data.high.toUpperCase()}</span></div>
      <div className="p3-comment">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 17l6-6 4 4 8-8" /><path d="M21 11V7h-4" /></svg>
        <span>{hasPrev
          ? <><b>{cap(data.prevTip ?? "")} → {cap(data.tip)}</b> · {improving ? "improving since your last scan." : worsening ? "to watch since your last scan." : "stable since your last scan."}</>
          : <><b>{cap(data.tip)}</b> · we'll measure the change at your next scan.</>}</span>
      </div>
    </div>
  );
}

function PlanNode({ state, label }: { state?: "done" | "now"; label: string }) {
  return (
    <div className={`plan-node ${state ?? ""}`}><span className="plan-dot" /><span className="plan-lab">{label}</span></div>
  );
}
