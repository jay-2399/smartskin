import {
  ATTRIBUTE_BY_ID, SECTIONS, SECTION_LABELS, LEVEL_TO_PERCENT,
  type Section,
} from "./attributes";
import type { AnalysisResult } from "./schema";

export type AttributeView = {
  id: string;
  label: string;
  low: string;
  high: string;
  binary: boolean;
  icon?: string;
  level: number;
  percent: number;
  betterHigh: boolean; // true = une valeur élevée est le bon côté (gradient inversé)
  tip: string;
  situation: string;
};

export type SectionView = { id: Section; label: string; items: AttributeView[] };

/** Regroupe les attributs du bilan par section (ordre du catalogue) et y attache
 *  les métadonnées d'affichage (libellés de bornes, icône, position de jauge). */
export function toSections(result: AnalysisResult): SectionView[] {
  const byId = new Map(result.attributes.map((a) => [a.id, a]));

  return SECTIONS.map((section) => {
    const items: AttributeView[] = Object.values(ATTRIBUTE_BY_ID)
      .filter((def) => def.section === section)
      .map((def): AttributeView | null => {
        const r = byId.get(def.id);
        if (!r) return null;
        return {
          id: def.id,
          label: def.label,
          low: def.low,
          high: def.high,
          binary: !!def.binary,
          icon: def.icon,
          level: r.level,
          percent: LEVEL_TO_PERCENT[r.level] ?? 6,
          betterHigh: !!def.betterHigh,
          tip: r.tip,
          situation: r.situation,
        };
      })
      .filter((x): x is AttributeView => x !== null);

    return { id: section, label: SECTION_LABELS[section], items };
  }).filter((s) => s.items.length > 0);
}
