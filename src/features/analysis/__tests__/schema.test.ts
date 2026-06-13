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
});
