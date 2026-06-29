import { describe, it, expect } from "vitest";
import { AnalysisResultSchema } from "@/features/analysis/schema";
import { SAMPLE_RESULT } from "@/features/analysis/sample";
import { ATTRIBUTES } from "@/features/analysis/attributes";

describe("AnalysisResultSchema", () => {
  it("accepte le bilan d'exemple", () => {
    expect(() => AnalysisResultSchema.parse(SAMPLE_RESULT)).not.toThrow();
  });

  it("le bilan d'exemple couvre les 16 attributs du catalogue", () => {
    expect(SAMPLE_RESULT.attributes).toHaveLength(ATTRIBUTES.length);
    const ids = new Set(SAMPLE_RESULT.attributes.map((a) => a.id));
    for (const a of ATTRIBUTES) expect(ids.has(a.id)).toBe(true);
  });

  it("rejette un score hors bornes", () => {
    expect(() => AnalysisResultSchema.parse({ ...SAMPLE_RESULT, score: 140 })).toThrow();
  });

  it("rejette un attribut hors catalogue", () => {
    const bad = { ...SAMPLE_RESULT, attributes: [{ id: "magic", level: 2, tip: "x", situation: "y" }] };
    expect(() => AnalysisResultSchema.parse(bad)).toThrow();
  });

  it("rejette un niveau hors 1..4", () => {
    const bad = { ...SAMPLE_RESULT, attributes: [{ id: "acne", level: 9, tip: "x", situation: "y" }] };
    expect(() => AnalysisResultSchema.parse(bad)).toThrow();
  });

  it("reveal v2 : conserve skinAge / skinTypeBreakdown / verdict du bilan d'exemple", () => {
    const r = AnalysisResultSchema.parse(SAMPLE_RESULT);
    expect(r.skinAge).toBe(26);
    expect(r.verdict?.plan).toHaveLength(3);
    expect(r.skinTypeBreakdown).toContain("T-zone");
  });

  it("reveal v2 : tolère l'absence des nouveaux champs (bilan « ancien » sans verdict)", () => {
    const { skinAge: _a, skinTypeBreakdown: _b, verdict: _c, ...sansReveal } = SAMPLE_RESULT;
    void _a; void _b; void _c;
    const r = AnalysisResultSchema.parse(sansReveal);
    expect(r.verdict).toBeUndefined();
    expect(r.skinAge).toBeUndefined();
  });

  it("reveal v2 : un verdict malformé est neutralisé (.catch) sans casser le bilan", () => {
    const r = AnalysisResultSchema.parse({ ...SAMPLE_RESULT, verdict: { title: "x" } }); // plan manquant
    expect(r.verdict).toBeUndefined(); // .catch(undefined) → masqué, pas d'exception
    expect(r.score).toBe(SAMPLE_RESULT.score); // le reste du bilan survit
  });
});
