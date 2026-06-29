import type { AttributeResult } from "./schema";

/** Barème de notation validé avec l'utilisateur (2026-06-14).
 *
 *  Le score n'est PLUS choisi par l'IA : il est CALCULÉ à partir des 16 notes,
 *  pour qu'il soit cohérent (« plein de boutons » fait forcément baisser la note)
 *  et reproductible (même peau = même score).
 *
 *  Deux mécanismes complémentaires :
 *   1. ADDITION — on part de 100 et chaque défaut retire des points (selon son
 *      poids et sa sévérité). L'accumulation de petits défauts grignote la note.
 *   2. PLAFOND — le défaut le plus grave impose un score maximum : une acné
 *      sévère ne peut JAMAIS donner un bon score, même si tout le reste est nickel.
 */

type Tier = "gros" | "moyen" | "petit";

/** Poids de chaque critère (gros = le plus visible/pénalisant). */
const TIER: Record<string, Tier> = {
  // Gros — saute aux yeux
  acne: "gros", redness: "gros", dark_spots: "gros",
  // Moyen — visible mais secondaire
  comedones: "moyen", pores: "moyen", post_acne_marks: "moyen",
  texture: "moyen", shine: "moyen", tone_evenness: "moyen", radiance: "moyen",
  // Petit — discret / mineur
  flaking: "petit", visible_vessels: "petit", fine_lines: "petit",
  wrinkles: "petit", under_eye_circles: "petit", under_eye_puffiness: "petit",
};

/** Points retirés par niveau (1 = idéal → 0 ; 2 = léger ; 3 = modéré ; 4 = sévère). */
const COST: Record<Tier, Record<number, number>> = {
  gros: { 1: 0, 2: 5, 3: 14, 4: 29 },
  moyen: { 1: 0, 2: 3, 3: 10, 4: 19 },
  petit: { 1: 0, 2: 2, 3: 5, 4: 10 },
};

/** Plafond imposé par le défaut le plus grave (score max atteignable). */
const CEILING: Record<Tier, Record<number, number>> = {
  gros: { 3: 66, 4: 40 },
  moyen: { 3: 75, 4: 55 },
  petit: { 4: 70 },
};

/** Calcule le score global 0-100 à partir des 16 notes (addition + plafond). */
export function computeScore(attributes: AttributeResult[]): number {
  let total = 0;
  let ceiling = 100;
  for (const a of attributes) {
    const tier = TIER[a.id];
    if (!tier) continue;
    total += COST[tier][a.level] ?? 0;
    const cap = CEILING[tier][a.level];
    if (cap !== undefined) ceiling = Math.min(ceiling, cap);
  }
  const additive = Math.max(5, 100 - total);
  return Math.min(additive, ceiling);
}

/** Libellé d'état (headline) cohérent avec le score calculé. */
export function scoreState(score: number): string {
  if (score >= 80) return "Excellent overall condition";
  if (score >= 65) return "Good overall condition";
  if (score >= 50) return "Decent condition, keep an eye on it";
  if (score >= 35) return "Needs close care";
  return "Skin to rebalance";
}
