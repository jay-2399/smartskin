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

export function DashboardScreen({ name, score, routine, restock, startedDaysAgo, loggedIn, history, priorities, lastAnswers }: { name: string; score: number; routine: RoutineData; restock: RestockItem[]; startedDaysAgo: number; loggedIn: boolean; history: HistPoint[]; priorities: PriorityData[]; lastAnswers: Answers }) {
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
      const s = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
      // Date locale du client (évite un mismatch SSR/CSR) → setState en effet justifié.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setToday(s.charAt(0).toUpperCase() + s.slice(1));
    } catch { /* noop */ }
  }, []);

  // Check-in « comment va ta peau » : proposé UNIQUEMENT à un utilisateur connecté
  // (un vrai scan déjà enregistré). En démo (non connecté) → pas de modale.
  useEffect(() => {
    if (!loggedIn) return;
    const t = setTimeout(() => setModalOpen(true), 250);
    return () => clearTimeout(t);
  }, [loggedIn]);

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

  const goal = Math.min(100, score + 6);
  // Verrou du re-scan : le décompte va jusqu'au jour J (0). Tant que > 0 → scan bloqué
  // (un clic « Analyser » ouvre le modal « patiente »). À 0 ou moins → analyse possible.
  const rawDaysToNext = NEXT_SCAN_DAYS - startedDaysAgo;
  const scanLocked = rawDaysToNext > 0;
  const daysToNext = Math.max(0, rawDaysToNext);
  // Courbe : hauteur d'un point dans le plot (% du haut) — score élevé = haut.
  const yOf = (s: number) => 80 - Math.max(0, Math.min(100, s)) * 0.66;
  // ≥ 2 scans → un point par scan (répartis 6 %→55 %, le dernier près du repère),
  // reliés par une ligne. 1 scan (ou compte neuf) → point unique à gauche.
  const multi = history.length >= 2;
  const pts = multi
    ? history.map((h, i) => ({ x: 8 + (58 * i) / (history.length - 1), y: yOf(h.score) }))
    : [{ x: 8, y: yOf(score) }];
  const last = pts[pts.length - 1];
  const nextX = multi ? 86 : 52; // position horizontale du repère « prochain scan »
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

  // Tous les consommables recommandés, du plus proche de la fin au plus loin. Chaque
  // produit passe en alerte (style « low » + « Fini dans ») à ≤ 14 j de la fin ;
  // sinon affichage neutre « Il te reste ~X j ».
  const restockList = restock.map((p) => ({ p, e: estimate(p, startedDaysAgo) }))
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
        {/* ── Skin score (hero) — score réel. 1 seul scan → pas de courbe : point unique
             à gauche (= score actuel) + repère vertical du futur scan (la courbe viendra
             avec l'historique). ── */}
        <div className="card chart-card">
          <div className="ch-head">
            <div>
              <div className="ch-label">Skin score</div>
              <div className="ch-num">{score}</div>
            </div>
            {/* Objectif déplacé dans l'en-tête → toute la largeur du plot est libre. */}
            <div className="ch-goal">
              <span className="ch-goal-k">Objectif</span>
              <span className="ch-goal-v">{goal}</span>
              <span className="ch-goal-s">{goal - score} pts restants</span>
            </div>
          </div>
          <div className="ch-plot">
            {/* ≥ 2 scans : la ligne reliant les points + la projection (pointillés)
                vers le prochain scan (coords en % du plot). */}
            {multi && (
              <svg className="ch-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
                <polyline points={pts.map((p) => `${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(" ")} fill="none" stroke="#7FA6BE" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
                <line x1={last.x} y1={last.y} x2={nextX} y2={last.y} stroke="#7FA6BE" strokeWidth="1.6" strokeDasharray="3 3" opacity="0.55" vectorEffect="non-scaling-stroke" />
              </svg>
            )}
            {/* points des scans précédents (cas courbe) */}
            {pts.slice(0, -1).map((p, i) => (
              <span key={i} className="ch-dot past" style={{ left: `${p.x}%`, top: `${p.y}%` }} />
            ))}
            {/* dernier point = aujourd'hui (valeur au-dessus ; « Aujourd'hui » en mode 1 scan) */}
            <span className="ch-nowval" style={{ left: `${last.x}%`, top: `calc(${last.y}% - 16px)` }}>{score}</span>
            <span className="ch-dot" style={{ left: `${last.x}%`, top: `${last.y}%` }} />
            {!multi && <span className="ch-nowlab" style={{ left: "3%", top: `calc(${last.y}% + 9px)` }}>Aujourd’hui</span>}
            {/* repère du prochain scan : anneau creux + ligne verticale + label en bas */}
            <span className="ch-ring" style={{ left: `${nextX}%`, top: `${last.y}%` }} />
            <span className="ch-guide" style={{ left: `${nextX}%`, top: `${last.y}%`, height: `calc(100% - ${last.y}%)` }} />
            <span className="ch-flab" style={{ left: `${nextX}%` }}>Prochain scan</span>
          </div>
          <div className="ch-ticks">{Array.from({ length: 34 }, (_, i) => <i key={i} />)}</div>
          <div className="skin-next">
            <div className="skin-next-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2" /><circle cx="12" cy="12" r="3" /></svg></div>
            <div className="skin-next-tx"><b>{scanLocked ? `Prochain scan dans ${daysToNext} jour${daysToNext > 1 ? "s" : ""}` : "Ton analyse est disponible"}</b><div>{scanLocked ? "Pour mesurer un vrai changement de ta peau." : "Refais un scan pour mettre à jour ton suivi."}</div></div>
            <button className={`skin-next-cta ${scanLocked ? "locked" : ""}`} onClick={() => (scanLocked ? setLockOpen(true) : startRescan())}>
              {scanLocked && <svg className="cta-lock" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>}
              Analyser
            </button>
          </div>
        </div>

        {/* ── Priorités dynamiques (top préoccupations du scan + évolution) ── */}
        {priorities.length > 0 && (
          <>
            <div className="sec-label">Tes priorités</div>
            {priorities.map((p, i) => <Priority key={i} data={p} multiScan={multi} />)}
          </>
        )}

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

        {/* ── Recharges : tous les consommables, alerte (low) à ≤ 14 j ── */}
        {restockList.length > 0 && (
          <div className="restock-wrap">
            <div className="sec-label">Tes recharges</div>
            {restockList.map(({ p, e }, i) => {
              const low = e.left <= 14;
              return (
                <div key={i} className={`card prod ${low ? "low" : ""}`}>
                  <div className="prod-thumb"><Flacon icon={p.icon} /></div>
                  <div className="prod-info">
                    <div className="prod-name">{p.name}</div>
                    <div className={`prod-left ${low ? "low" : ""}`}><span className="pip" />{low ? `Fini dans ~${e.left} jours` : `Il te reste ~${e.left} jours`}</div>
                    <div className="restock-bar"><i style={{ width: `${e.pctUsed}%` }} /></div>
                  </div>
                  <a className="prod-buy" href={`https://www.amazon.com/dp/${p.asin}`} target="_blank" rel="noopener noreferrer"><Cart />Racheter</a>
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

      {/* ── Modal « patiente » : re-scan bloqué tant que le décompte n'est pas fini ── */}
      <div className={`ci-modal ${lockOpen ? "" : "hidden"}`}>
        <div className="ci-scrim" onClick={() => setLockOpen(false)} />
        <div className="ci-sheet">
          <button className="ci-x" aria-label="Fermer" onClick={() => setLockOpen(false)}><svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M2 2l10 10M12 2L2 12" /></svg></button>
          <div className="ci-lock-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg></div>
          <div className="ci-title">Encore {daysToNext} jour{daysToNext > 1 ? "s" : ""} à patienter</div>
          <div className="ci-sub">Ta peau évolue sur environ une semaine. On attend la prochaine analyse pour mesurer un vrai changement — pas du bruit au jour le jour.</div>
          <button className="ci-skip" onClick={() => setLockOpen(false)}>Compris</button>
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
  const pill = !hasPrev ? "1ᵉ scan" : improving ? "En progrès" : worsening ? "À surveiller" : "Stable";
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
          ? <><b>{cap(data.prevTip ?? "")} → {cap(data.tip)}</b> · {improving ? "en progrès depuis ton dernier scan." : worsening ? "à surveiller depuis ton dernier scan." : "stable depuis ton dernier scan."}</>
          : <><b>{cap(data.tip)}</b> · on mesurera l’évolution à ton prochain scan.</>}</span>
      </div>
    </div>
  );
}

function PlanNode({ state, label }: { state?: "done" | "now"; label: string }) {
  return (
    <div className={`plan-node ${state ?? ""}`}><span className="plan-dot" /><span className="plan-lab">{label}</span></div>
  );
}
