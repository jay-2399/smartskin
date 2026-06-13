import { describe, it, expect } from "vitest";
import { topConcerns } from "@/features/analysis/highlights";
import { SAMPLE_RESULT } from "@/features/analysis/sample";

describe("topConcerns", () => {
  it("retourne les pires attributs (level décroissant), max n", () => {
    const c = topConcerns(SAMPLE_RESULT, 3);
    expect(c).toHaveLength(3);
    // shine L4 d'abord, puis des L3 (post_acne_marks/pores/dark_spots/redness/under_eye_circles)
    expect(c[0].id).toBe("shine");
    expect(c[0].level).toBe(4);
    expect(c.every((x) => x.level >= 2)).toBe(true);
    // niveaux décroissants
    expect(c[0].level).toBeGreaterThanOrEqual(c[1].level);
    expect(c[1].level).toBeGreaterThanOrEqual(c[2].level);
  });

  it("attache label et tip depuis le catalogue", () => {
    const c = topConcerns(SAMPLE_RESULT, 1);
    expect(c[0]).toMatchObject({ id: "shine", label: "Brillance", tip: "brillante" });
  });

  it("ignore les attributs sans souci (level < 2)", () => {
    const allGood = {
      ...SAMPLE_RESULT,
      attributes: SAMPLE_RESULT.attributes.map((a) => ({ ...a, level: 1 })),
    };
    expect(topConcerns(allGood, 3)).toEqual([]);
  });
});
