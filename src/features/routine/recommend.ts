import type { AnalysisResult } from "@/features/analysis/schema";
import type { Answers } from "@/features/funnel/types";
import { ACTIVES, CONCERN_PHRASE, type Active } from "./actives";

export type RoutineStep = {
  role: string;
  active: string; // nom de l'ingrédient
  why: string; // pourquoi, en lien avec le bilan (peut contenir <b>)
  frequency: string;
};

export type Routine = {
  day: RoutineStep[];
  night: RoutineStep[];
  priorities: string[]; // libellés des préoccupations traitées en priorité
  avoid: string[]; // « à éviter pour toi » (issus de q2/q7)
  gentleStart: boolean; // introduire un actif à la fois
  timeline: string; // « ce que tu peux espérer »
  minimal: boolean; // routine volontairement minimale (traitement dermato en cours)
};

// Importance d'un attribut pour prioriser les préoccupations (aligné au barème).
const IMPORTANCE: Record<string, number> = {
  acne: 3, redness: 3, dark_spots: 3,
  comedones: 2, pores: 2, post_acne_marks: 2, texture: 2, shine: 2, tone_evenness: 2, radiance: 2,
  flaking: 1, visible_vessels: 1, fine_lines: 1, wrinkles: 1, under_eye_circles: 1, under_eye_puffiness: 1,
};

/** Préoccupations (niveau ≥ 2) triées des plus importantes aux moins. */
function topConcerns(result: AnalysisResult): string[] {
  return result.attributes
    .filter((a) => a.level >= 2)
    .sort((a, b) => (IMPORTANCE[b.id] ?? 1) * b.level - (IMPORTANCE[a.id] ?? 1) * a.level)
    .map((a) => a.id);
}

/** « pourquoi » personnalisé : cible la 1ʳᵉ préoccupation de l'actif présente chez l'utilisateur. */
function why(active: Active, concerns: string[]): string {
  const hit = active.targets.find((t) => concerns.includes(t));
  const phrase = hit ? CONCERN_PHRASE[hit] : null;
  return phrase ? `Pour <b>${phrase}</b> : ${active.benefit}` : active.benefit;
}

function step(active: Active, concerns: string[]): RoutineStep {
  return { role: active.role, active: active.name, why: why(active, concerns), frequency: active.frequency };
}

/** Construit une routine personnalisée (actifs uniquement) à partir du bilan
 *  et du questionnaire. 100 % déterministe, sécurisé par q2/q7. */
export function buildRoutine(result: AnalysisResult, answers: Answers): Routine {
  const concerns = topConcerns(result);
  const has = (id: string) => concerns.includes(id);

  // Garde-fous issus du questionnaire q7
  const pregnancy = answers.q7.includes("pregnancy");
  const condition = answers.q7.includes("condition"); // rosacée / eczéma
  const treatment = answers.q7.includes("treatment"); // suivi dermato en cours
  const irritants = answers.q2.filter((v) => v !== "none");
  const noExperience = answers.q3.length === 0 || answers.q3.includes("none");

  const usable = (a: Active): boolean => {
    if (pregnancy && a.unsafePregnancy) return false;
    if (condition && a.unsafeSensitive) return false;
    return true;
  };

  // Routine MINIMALE si traitement dermato en cours (on n'ajoute pas d'actif).
  if (treatment) {
    const day = [step(ACTIVES.gentle_cleanser, concerns), step(ACTIVES.moisturizer, concerns), step(ACTIVES.spf, concerns)];
    const night = [step(ACTIVES.gentle_cleanser, concerns), step(ACTIVES.moisturizer, concerns)];
    return {
      day, night, priorities: concerns.slice(0, 3).map((c) => CONCERN_PHRASE[c]),
      avoid: avoidList(irritants, { pregnancy, condition, treatment }),
      gentleStart: true, timeline: timelineFor(concerns), minimal: true,
    };
  }

  // Sérum du MATIN : vitamine C (éclat/taches) sinon niacinamide sinon hydratation.
  const morningSerum =
    (has("dark_spots") || has("radiance") || has("tone_evenness")) && usable(ACTIVES.vitamin_c)
      ? ACTIVES.vitamin_c
      : ACTIVES.niacinamide.targets.some(has)
        ? ACTIVES.niacinamide
        : ACTIVES.hyaluronic_acid;

  // Traitement du SOIR : on prend le 1er actif pertinent (par ordre de priorité) et utilisable.
  const nightCandidates = [ACTIVES.salicylic_acid, ACTIVES.retinoid, ACTIVES.aha, ACTIVES.azelaic_acid];
  const nightTreatment =
    nightCandidates.find((a) => a.targets.some(has) && usable(a)) ??
    (ACTIVES.niacinamide.targets.some(has) ? ACTIVES.niacinamide : ACTIVES.hyaluronic_acid);

  // MATIN : nettoyant → sérum → hydratant → SPF
  const day: RoutineStep[] = [
    step(ACTIVES.gentle_cleanser, concerns),
    step(morningSerum, concerns),
    step(ACTIVES.moisturizer, concerns),
    step(ACTIVES.spf, concerns),
  ];

  // SOIR : nettoyant → traitement → (apaisant si rougeurs et peau sensible) → hydratant
  const night: RoutineStep[] = [step(ACTIVES.gentle_cleanser, concerns), step(nightTreatment, concerns)];
  if (condition && has("redness") && nightTreatment.id !== ACTIVES.azelaic_acid.id) {
    night.push(step(ACTIVES.centella, concerns));
  }
  if (has("flaking") && nightTreatment.id !== ACTIVES.hyaluronic_acid.id) {
    night.push(step(ACTIVES.hyaluronic_acid, concerns));
  }
  night.push(step(ACTIVES.moisturizer, concerns));

  return {
    day, night,
    priorities: concerns.slice(0, 3).map((c) => CONCERN_PHRASE[c]),
    avoid: avoidList(irritants, { pregnancy, condition, treatment }),
    gentleStart: noExperience || condition,
    timeline: timelineFor(concerns),
    minimal: false,
  };
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
