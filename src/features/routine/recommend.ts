import type { AnalysisResult } from "@/features/analysis/schema";
import type { Answers } from "@/features/funnel/types";
import { ACTIVES, CONCERN_PHRASE, type Active } from "./actives";

/* ───────────────────────────────────────────────────────────────────────────
   Moteur de routine — Phase 1 (100 % sans marque, ingrédients uniquement).
   Affichage : liste de cartes d'actifs (l'ancien layout), MAIS organisée et
   construite selon le « Playbook Construction Routine v2 ».

   Méthode du playbook :
   1. 3 COUCHES (§1) : socle quotidien · actifs ciblés (rotatifs) · rituel hebdo.
   2. BUDGET DE TOLÉRANCE (§3) : chaque actif a un coût d'irritation (actives.ts).
      On déduit sensibilité + état de barrière du bilan → un PLAFOND hebdo. La
      FRÉQUENCE des actifs forts est calculée pour tenir sous ce plafond
      (sensible → rétinoïde 1×/sem, tolérant → 3×/sem).
   3. PHASES (§5) : le plafond monte avec l'expérience (débutant 50 % → expert 100 %).
   4. Garde-fou bloquant (§4 étape 0) : acné sévère / dermato / barrière fragile
      → socle seul + orientation médecin.
   100 % déterministe.
   ─────────────────────────────────────────────────────────────────────────── */

export type Phase = 1 | 2 | 3;
export type Bucket = "fragile" | "sensible" | "normale" | "tolerante";
export type Layer = "socle" | "actif" | "rituel"; // les 3 couches du playbook (§1)

export type RoutineStep = {
  layer: Layer;
  role: string;
  active: string; // nom de l'ingrédient
  why: string; // pourquoi, en lien avec le bilan (peut contenir <b>)
  frequency: string; // ex. « matin & soir », « 2×/sem le soir » (calculée par le budget)
};

export type Routine = {
  steps: RoutineStep[];
  priorities: string[]; // libellés des préoccupations traitées en priorité
  avoid: string[]; // « à éviter pour toi » (issus de q2/q7)
  introduction: string; // progression : où on en est, quoi monter ensuite (phase)
  load: number; // charge active de la semaine (budget de tolérance)
  ceiling: number; // plafond courant (ce que la peau tolère)
  timeline: string; // « ce que tu peux espérer »
  minimal: boolean; // protocole volontairement minimal (socle seul)
  medicalNote?: string; // orientation médecin (acné sévère / suivi dermato / barrière fragile)
};

// Ordre d'application des soins (du plus fin au plus couvrant).
const ROLE_ORDER: Record<string, number> = {
  Nettoyant: 0, Sérum: 1, Traitement: 2, Rituel: 3, Hydratant: 4, Protection: 5,
};

// Importance d'un attribut pour prioriser les préoccupations (aligné au barème).
const IMPORTANCE: Record<string, number> = {
  acne: 3, redness: 3, dark_spots: 3,
  comedones: 2, pores: 2, post_acne_marks: 2, texture: 2, shine: 2, tone_evenness: 2, radiance: 2,
  flaking: 1, visible_vessels: 1, fine_lines: 1, wrinkles: 1, under_eye_circles: 1, under_eye_puffiness: 1,
};

// Plafond de tolérance de base par profil (playbook §3.4), avant le % de phase.
const BASE_CEILING: Record<Bucket, number> = { fragile: 2, sensible: 6, normale: 12, tolerante: 16 };
// La tolérance se construit : le plafond monte avec les phases d'introduction (§5).
const PHASE_FACTOR: Record<Phase, number> = { 1: 0.5, 2: 0.75, 3: 1 };

export function levelOf(result: AnalysisResult, id: string): number {
  return result.attributes.find((a) => a.id === id)?.level ?? 1;
}

/** Préoccupations détectées, triées des plus importantes aux moins. `minLevel` =
 *  sévérité minimale retenue : 2 (léger) pour l'AFFICHAGE du bilan, mais 3 (modéré)
 *  pour le CHOIX DES PRODUITS — on ne pousse un actif ciblé que si le souci est
 *  vraiment là (évite un anti-taches sur une peau quasi nette notée « léger »). */
export function topConcerns(result: AnalysisResult, minLevel = 2): string[] {
  return result.attributes
    .filter((a) => a.level >= minLevel)
    .sort((a, b) => (IMPORTANCE[b.id] ?? 1) * b.level - (IMPORTANCE[a.id] ?? 1) * a.level)
    .map((a) => a.id);
}

/* ── Déduire sensibilité + barrière (décision produit : on DÉDUIT depuis les
   données existantes, on ne change pas le contrat IA). ── */
export function deriveBucket(result: AnalysisResult, answers: Answers): Bucket {
  const redness = levelOf(result, "redness");
  const flaking = levelOf(result, "flaking"); // binaire : 1 absent, ≥ 2 présent
  const vessels = levelOf(result, "visible_vessels");
  const condition = answers.q7.includes("condition"); // rosacée / eczéma
  const irritants = answers.q2.filter((v) => v !== "none").length;
  const reactiveSkin = /sensible|réactive|reactive/i.test(result.profile.skinType);
  const usesStrong = answers.q3.includes("retinol") || answers.q3.includes("acids");

  if (flaking >= 2 && (redness >= 3 || condition)) return "fragile"; // barrière rompue → réparer
  if (condition || redness >= 3 || vessels >= 2 || irritants >= 2 || reactiveSkin) return "sensible";
  if (usesStrong && redness <= 2 && flaking < 2) return "tolerante";
  return "normale";
}

/* ── Phase d'introduction (§5) déduite de l'expérience déclarée (q3). ── */
export function derivePhase(answers: Answers): Phase {
  if (answers.q3.includes("retinol") || answers.q3.includes("acids")) return 3;
  if (answers.q3.includes("vitc") || answers.q3.includes("niacinamide")) return 2;
  return 1; // débutant → on introduit en douceur
}

/** Fréquence hebdo d'un actif fort, calculée par le budget. */
function rotFrequency(freq: number): string {
  return freq <= 1 ? "1×/sem le soir" : `${freq}×/sem le soir`;
}

/* ── « pourquoi » personnalisé : cible la 1ʳᵉ préoccupation de l'actif présente. ── */
function why(active: Active, concerns: string[]): string {
  const hit = active.targets.find((t) => concerns.includes(t));
  const phrase = hit ? CONCERN_PHRASE[hit] : null;
  return phrase ? `Pour <b>${phrase}</b> : ${active.benefit}` : active.benefit;
}

type Picked = { active: Active; frequency: string; layer: Layer };

/** Dédoublonne par id, ordonne par étape de soin, et fabrique les cartes. */
function toSteps(picked: Picked[], concerns: string[]): RoutineStep[] {
  const seen = new Set<string>();
  const unique = picked.filter((p) => (seen.has(p.active.id) ? false : (seen.add(p.active.id), true)));
  unique.sort((a, b) => (ROLE_ORDER[a.active.role] ?? 9) - (ROLE_ORDER[b.active.role] ?? 9));
  return unique.map((p) => ({ layer: p.layer, role: p.active.role, active: p.active.name, why: why(p.active, concerns), frequency: p.frequency }));
}

const socle = (a: Active, frequency = a.frequency): Picked => ({ active: a, frequency, layer: "socle" });

/** Construit la routine personnalisée (actifs uniquement) à partir du bilan
 *  et du questionnaire. 100 % déterministe, sécurisé par q2/q7. */
export function buildRoutine(result: AnalysisResult, answers: Answers): Routine {
  const concerns = topConcerns(result);
  const has = (id: string) => concerns.includes(id);
  const lvl = (id: string) => levelOf(result, id);

  const pregnancy = answers.q7.includes("pregnancy");
  const condition = answers.q7.includes("condition");
  const treatment = answers.q7.includes("treatment"); // suivi dermato en cours
  const irritants = answers.q2.filter((v) => v !== "none");

  const bucket = deriveBucket(result, answers);
  const phase = derivePhase(answers);
  const ceiling = Math.round(BASE_CEILING[bucket] * PHASE_FACTOR[phase]);

  const usable = (a: Active): boolean => {
    if (pregnancy && a.unsafePregnancy) return false;
    if (condition && a.unsafeSensitive) return false;
    return true;
  };

  const avoid = avoidList(irritants, { pregnancy, condition, treatment });
  const priorities = concerns.slice(0, 3).map((c) => CONCERN_PHRASE[c]);

  // ── Garde-fou bloquant (playbook §4 étape 0). Acné sévère probable (kystique),
  //    suivi dermatologique ou barrière fragile → socle seul + orientation. ──
  const severeAcne = lvl("acne") >= 4;
  if (treatment || bucket === "fragile" || severeAcne) {
    const base: Picked[] = [socle(ACTIVES.gentle_cleanser)];
    if (has("redness") && usable(ACTIVES.azelaic_acid)) base.push(socle(ACTIVES.azelaic_acid));
    else if (has("flaking")) base.push(socle(ACTIVES.hyaluronic_acid));
    base.push(socle(ACTIVES.moisturizer), socle(ACTIVES.spf));
    const medicalNote = treatment
      ? "Tu as indiqué un suivi dermatologique : on s'en tient au socle. Valide tout nouvel actif avec ton dermatologue."
      : severeAcne
        ? "Des imperfections marquées comme les tiennes se traitent mieux avec un dermatologue : un avis médical t'évitera des cicatrices."
        : "Ta barrière cutanée a besoin d'être réparée d'abord : on consolide le socle 2 à 3 semaines avant d'introduire un actif.";
    return {
      steps: toSteps(base, concerns), priorities, avoid,
      introduction: introFor(phase, false), load: 0, ceiling,
      timeline: timelineFor(concerns), minimal: true, medicalNote,
    };
  }

  // ── Couche 1 — SOCLE : actif « éclat/teint » du matin (vit. C ou niacinamide). ──
  const brightening =
    (has("dark_spots") || has("radiance") || has("tone_evenness")) && usable(ACTIVES.vitamin_c)
      ? ACTIVES.vitamin_c
      : ACTIVES.niacinamide.targets.some(has)
        ? ACTIVES.niacinamide
        : ACTIVES.hyaluronic_acid;

  // ── Couche 2 — ACTIFS CIBLÉS (coût ≥ 2 : exfoliants / rétinoïde), choisis selon
  //    la préoccupation dominante. C'est leur FRÉQUENCE que le budget va doser. ──
  const rotating: { active: Active; freq: number }[] = [];
  const addRot = (a: Active, freq: number) => { if (usable(a) && !rotating.some((r) => r.active.id === a.id)) rotating.push({ active: a, freq }); };
  if (has("acne") || has("comedones")) addRot(ACTIVES.salicylic_acid, 3); // BHA : seulement si acné/points noirs
  if (has("fine_lines") || has("wrinkles") || has("texture")) addRot(ACTIVES.retinoid, 3); // rétinoïde : âge/texture
  if ((has("dark_spots") || has("tone_evenness")) && !rotating.length) addRot(ACTIVES.aha, 1);

  // ── Couche 3 — RITUEL : UN masque hebdo choisi selon le besoin dominant
  //    (purifiant, hydratant, désincrustant ou apaisant), sécurisé par q7. ──
  const MASKS = [ACTIVES.clay_mask, ACTIVES.soothing_mask, ACTIVES.hydrating_mask, ACTIVES.exfoliating_mask];
  let mask: Active | null = null;
  for (const c of concerns) {
    const m = MASKS.find((mk) => mk.targets.includes(c) && usable(mk));
    if (m) { mask = m; break; }
  }

  // ── Budget de tolérance (§3.5) : baisser les fréquences jusqu'à charge ≤ plafond. ──
  const load = () => rotating.reduce((s, r) => s + r.active.cost * r.freq, 0) + (mask?.cost ?? 0);
  let guard = 0;
  while (load() > ceiling && guard++ < 30) {
    const reducible = rotating.filter((r) => r.freq > 1).sort((a, b) => b.active.cost - a.active.cost)[0];
    if (reducible) { reducible.freq -= 1; continue; }
    if (mask && mask.cost > 0) { mask = null; continue; } // on lâche un masque coûteux avant de tout couper
    const idx = rotating.reduce((mi, r, i, arr) => (r.active.cost > arr[mi].active.cost ? i : mi), 0);
    if (rotating.length) rotating.splice(idx, 1); else break;
  }

  // ── Composer la liste, taguée par couche. ──
  const picked: Picked[] = [socle(ACTIVES.gentle_cleanser), socle(brightening)];
  for (const r of rotating) picked.push({ active: r.active, frequency: rotFrequency(r.freq), layer: "actif" });
  if (mask) picked.push({ active: mask, frequency: mask.frequency, layer: "rituel" });
  if (condition && has("redness") && !rotating.length) picked.push(socle(ACTIVES.centella));
  if (has("flaking")) picked.push(socle(ACTIVES.hyaluronic_acid));
  picked.push(socle(ACTIVES.moisturizer), socle(ACTIVES.spf));

  const steps = toSteps(picked, concerns);
  const hasActives = steps.some((s) => s.layer === "actif");
  return {
    steps, priorities, avoid,
    introduction: introFor(phase, hasActives), load: load(), ceiling,
    timeline: timelineFor(concerns), minimal: false,
  };
}

function introFor(phase: Phase, hasActives: boolean): string {
  if (!hasActives) return "Pour l'instant, on consolide le socle. On pourra introduire un actif ciblé dès que ta peau est prête.";
  if (phase === 1) return "Tu débutes : on introduit les actifs forts à basse fréquence. Dans 3 à 4 semaines, si ta peau le tolère, tu pourras monter la cadence.";
  if (phase === 2) return "Tu connais déjà des actifs doux : on est sur une cadence intermédiaire, à augmenter progressivement selon ta tolérance.";
  return "Ta peau tolère bien les actifs : cadence pleine, à ajuster selon tes résultats.";
}

const IRRITANT_LABEL: Record<string, string> = {
  fragrance: "les parfums et fragrances",
  alcohol: "l'alcool dénaturé (alcohol denat.)",
  "essential-oils": "les huiles essentielles",
  sulfates: "les sulfates (SLS/SLES)",
};

function avoidList(irritants: string[], f: { pregnancy: boolean; condition: boolean; treatment: boolean }): string[] {
  const out: string[] = [];
  for (const i of irritants) if (IRRITANT_LABEL[i]) out.push(IRRITANT_LABEL[i]);
  if (f.pregnancy) out.push("les rétinoïdes et l'acide salicylique (déconseillés pendant la grossesse)");
  if (f.condition) out.push("les exfoliants agressifs (acides forts, gommages) sur ta peau réactive");
  if (f.treatment) out.push("tout nouvel actif sans l'avis de ton dermatologue");
  return out;
}

const TIMELINE: { ids: string[]; msg: string }[] = [
  { ids: ["acne", "comedones"], msg: "Compte 4 à 8 semaines de régularité pour voir les imperfections s'apaiser." },
  { ids: ["post_acne_marks", "dark_spots"], msg: "Les marques et taches s'estompent en général sur 8 à 12 semaines." },
  { ids: ["redness"], msg: "Les rougeurs se calment progressivement sur 4 à 8 semaines." },
  { ids: ["texture", "pores"], msg: "Le grain de peau s'affine en 6 à 8 semaines." },
  { ids: ["radiance"], msg: "L'éclat revient souvent en 2 à 4 semaines." },
  { ids: ["fine_lines", "wrinkles"], msg: "Les résultats anti-âge se voient sur 8 à 12 semaines." },
];

function timelineFor(concerns: string[]): string {
  for (const t of TIMELINE) if (t.ids.some((id) => concerns.includes(id))) return t.msg;
  return "Compte 4 à 12 semaines de régularité pour les premiers résultats visibles.";
}
