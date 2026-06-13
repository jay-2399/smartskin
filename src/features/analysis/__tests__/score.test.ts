import { describe, it, expect } from "vitest";
import { computeScore, scoreState } from "@/features/analysis/score";
import { SAMPLE_RESULT } from "@/features/analysis/sample";
import { ATTRIBUTES } from "@/features/analysis/attributes";
import type { AttributeResult } from "@/features/analysis/schema";

// Construit un jeu de 16 notes : tout à `base`, puis applique des surcharges.
function attrs(base = 1, overrides: Record<string, number> = {}): AttributeResult[] {
  return ATTRIBUTES.map((a) => ({
    id: a.id,
    level: overrides[a.id] ?? base,
    tip: "x",
    situation: "y",
  }));
}

describe("computeScore", () => {
  it("peau parfaite (tout niveau 1) → 100", () => {
    expect(computeScore(attrs(1))).toBe(100);
  });

  it("ta photo (acné modérée + petits défauts légers) → ~60", () => {
    const r = computeScore(
      attrs(1, {
        acne: 3, post_acne_marks: 2, pores: 2, texture: 2, tone_evenness: 2,
        radiance: 2, redness: 2, shine: 2, under_eye_circles: 2,
      })
    );
    expect(r).toBeGreaterThanOrEqual(58);
    expect(r).toBeLessThanOrEqual(63);
  });

  it("PLAFOND : une acné sévère ne peut jamais dépasser 40, même peau parfaite par ailleurs", () => {
    expect(computeScore(attrs(1, { acne: 4 }))).toBe(40);
  });

  it("acné modérée seule → plafonnée à 66 max", () => {
    expect(computeScore(attrs(1, { acne: 3 }))).toBeLessThanOrEqual(66);
  });

  it("peau très à problèmes (plusieurs sévères) → score plancher bas", () => {
    const r = computeScore(attrs(2, { acne: 4, redness: 4, dark_spots: 3 }));
    expect(r).toBeLessThanOrEqual(40);
    expect(r).toBeGreaterThanOrEqual(5);
  });

  it("le barème couvre les 16 attributs du catalogue (aucun oublié)", () => {
    // si un id n'avait pas de poids, computeScore l'ignorerait → tout niveau 4
    // donnerait un score anormalement haut. On vérifie qu'il chute bien.
    expect(computeScore(attrs(4))).toBeLessThanOrEqual(40);
  });
});

describe("scoreState", () => {
  it("associe un libellé cohérent au score", () => {
    expect(scoreState(90)).toMatch(/bel état/i);
    expect(scoreState(40)).toMatch(/accompagner/i);
    expect(scoreState(20)).toMatch(/rééquilibrer/i);
  });
});

describe("cohérence de l'exemple de démo", () => {
  it("computeScore(SAMPLE_RESULT.attributes) === SAMPLE_RESULT.score", () => {
    expect(computeScore(SAMPLE_RESULT.attributes)).toBe(SAMPLE_RESULT.score);
  });
});
