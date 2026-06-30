import type { AnalysisResult } from "@/features/analysis/schema";
import type { Answers } from "@/features/funnel/types";
import { topConcerns, deriveBucket, derivePhase, type Bucket, type Phase } from "@/features/routine/recommend";
import type { SkinTypeKey } from "./catalog";

/* Profil moteur (entrée n°2) — assemblé depuis le bilan IA + le questionnaire.
   Cf. docs/moteur-reco-implementation.md §3 / §3bis.
   On RÉUTILISE topConcerns()/deriveBucket() de recommend.ts (déjà testés). */

export type BudgetTier = "lt30" | "30-60" | "60-100" | "gt100";
export type Budget = number | "no_limit";

export interface EngineProfile {
  skinType: SkinTypeKey;
  sensitive: boolean;
  bucket: Bucket; // sensibilité/barrière (fragile→tolerante) — pour le plafond d'irritation §4.6
  phase: Phase;   // expérience actifs (1 débutant → 3 expert) — module le plafond
  concerns: string[]; // ConcernIds, ordonnés par priorité (1er = + important)
  pregnant: boolean;
  breastfeeding: boolean;
  medicalConditions: string[]; // valeurs q7 : "condition" (rosacée/eczéma), "treatment" (dermato)
  budgetTier: BudgetTier | null;
  budget: Budget; // enveloppe Σ prix résolue (USD) ou "no_limit"
  freeText: string;
}

/* Plafond Σ prix de la routine par palier q6 = le budget TOTAL que l'utilisateur
   est prêt à mettre pour TOUTE sa routine (borne haute de la tranche). Pas de
   notion mensuelle. Cf. doc §3bis. */
const ENVELOPE: Record<BudgetTier, Budget> = {
  lt30: 30,
  "30-60": 60,
  "60-100": 100,
  gt100: "no_limit", // 4ᵉ palier = mode « sans limite / recommandé »
};

/** Plafond Σ prix de la routine pour un palier (ou "no_limit"). */
export function enveloppe(tier: BudgetTier | null): Budget {
  return tier ? ENVELOPE[tier] : "no_limit"; // pas de réponse (démo) → sans contrainte
}

/** Normalise le `skinType` libre de l'IA vers l'enum byProfile (5 valeurs).
 *  « Grasse sensible » → grasse (la sensibilité est captée séparément). */
export function normalizeSkinType(raw: string): SkinTypeKey {
  const s = raw.toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "");
  if (s.includes("grasse") || s.includes("oily")) return "grasse";
  if (s.includes("seche") || s.includes("dry")) return "seche";
  if (s.includes("mixte") || s.includes("combination")) return "mixte";
  if (s.includes("normale") || s.includes("normal")) return "normale";
  if (s.includes("sensible") || s.includes("sensitive")) return "sensible";
  return "normale";
}

/* Priorités déclarées par l'utilisateur (q1) → ids de concerns (mêmes ids que les
   16 attributs / les `targets` des produits). Ce que l'utilisateur DIT vouloir doit
   peser sur le choix des produits, pas seulement ce que l'IA détecte. */
const Q1_CONCERNS: Record<string, string[]> = {
  hydration: ["flaking"],
  radiance: ["radiance"],
  blemishes: ["acne", "comedones", "post_acne_marks"],
  pores: ["pores", "texture"],
  dark_spots: ["dark_spots", "tone_evenness"],
  fine_lines: ["fine_lines", "wrinkles"],
  firmness: ["wrinkles"],
  redness: ["redness", "visible_vessels"],
  eye_area: ["under_eye_circles", "under_eye_puffiness"],
  oiliness: ["shine"],
  texture: ["texture", "pores"],
  // "discover" (« je ne suis pas sûr ») = aucune priorité déclarée.
};

/** Fusionne les priorités déclarées (q1, en tête) avec les concerns détectés par
 *  l'IA (en complément). Dédupliqué, ordre = priorité (1er = + important). */
export function mergeConcerns(q1: string[], detected: string[]): string[] {
  const wanted = q1.flatMap((v) => Q1_CONCERNS[v] ?? []);
  return [...new Set([...wanted, ...detected])];
}

export function buildEngineProfile(result: AnalysisResult, answers: Answers): EngineProfile {
  const bucket = deriveBucket(result, answers);
  const reactiveStr = /sensible|sensitive|réactive|reactive/i.test(result.profile.skinType);
  const tier = (answers.q6 as BudgetTier | null) ?? null;

  return {
    skinType: normalizeSkinType(result.profile.skinType),
    sensitive: bucket === "sensible" || bucket === "fragile" || reactiveStr,
    bucket,
    phase: derivePhase(answers),
    // Seuil ≥ 3 (modéré) pour le CHOIX PRODUITS : un signal « léger » (niveau 2) ne
    // déclenche pas d'actif ciblé. Les priorités déclarées (q1) restent prioritaires.
    concerns: mergeConcerns(answers.q1, topConcerns(result, 3)),
    pregnant: answers.q7.includes("pregnancy"),
    breastfeeding: answers.q7.includes("pregnancy"), // q7 couvre « Grossesse / allaitement »
    medicalConditions: answers.q7.filter((v) => v === "condition" || v === "treatment"),
    budgetTier: tier,
    budget: enveloppe(tier),
    freeText: "",
  };
}
