import { ATTRIBUTE_BY_ID } from "./attributes";
import type { AnalysisResult } from "./schema";

export type Concern = { id: string; label: string; tip: string; level: number };

/** Les `n` attributs les plus problématiques (level décroissant, ≥ 2).
 *  Sert au bandeau « Tes priorités » en tête des résultats. Pur, dérivé du bilan. */
export function topConcerns(result: AnalysisResult, n = 3): Concern[] {
  return result.attributes
    .filter((a) => a.level >= 2)
    .sort((a, b) => b.level - a.level)
    .slice(0, n)
    .map((a) => ({
      id: a.id,
      label: ATTRIBUTE_BY_ID[a.id]?.label ?? a.id,
      tip: a.tip,
      level: a.level,
    }));
}
