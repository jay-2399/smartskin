import { describe, it, expect } from "vitest";
import { buildEngineProfile, normalizeSkinType } from "@/features/recommendation/profile";
import { ATTRIBUTES } from "@/features/analysis/attributes";
import { EMPTY_ANSWERS } from "@/features/funnel/types";
import type { AnalysisResult } from "@/features/analysis/schema";
import type { Answers } from "@/features/funnel/types";

function result(overrides: Record<string, number> = {}, skinType = "Mixte"): AnalysisResult {
  return {
    score: 60, state: "x", sub: "y", photoQuality: { ok: true },
    profile: { skinType, ageRange: "25-35", carnation: 3, carnationLabel: "x",
      undertone: 2, undertoneLabel: "x", phototype: 3, phototypeSub: "x" },
    attributes: ATTRIBUTES.map((a) => ({ id: a.id, level: overrides[a.id] ?? 1, tip: "x", situation: "y" })),
  };
}
const ans = (o: Partial<Answers> = {}): Answers => ({ ...EMPTY_ANSWERS, ...o });

describe("normalizeSkinType", () => {
  it("mappe les libellés FR de l'IA vers l'enum byProfile", () => {
    expect(normalizeSkinType("Mixte")).toBe("mixte");
    expect(normalizeSkinType("Grasse")).toBe("grasse");
    expect(normalizeSkinType("Peau sèche")).toBe("seche");
    expect(normalizeSkinType("Normale")).toBe("normale");
  });
  it("« Grasse sensible » → type de base grasse (la sensibilité est séparée)", () => {
    expect(normalizeSkinType("Grasse sensible")).toBe("grasse");
  });
  it("« Sensible » seul → sensible ; inconnu → normale par défaut", () => {
    expect(normalizeSkinType("Sensible")).toBe("sensible");
    expect(normalizeSkinType("???")).toBe("normale");
  });
});

describe("buildEngineProfile", () => {
  it("dérive concerns (ordonnés, niveau ≥3 pour les produits), pregnant (q7), skinType", () => {
    const p = buildEngineProfile(result({ acne: 3, pores: 3 }), ans({ q7: ["pregnancy"] }));
    expect(p.concerns[0]).toBe("acne");
    expect(p.concerns).toContain("pores");
    expect(p.pregnant).toBe(true);
    expect(p.breastfeeding).toBe(true);
    expect(p.skinType).toBe("mixte");
  });

  it("sensitive=true si rosacée/eczéma (q7 condition)", () => {
    const p = buildEngineProfile(result({ redness: 3 }), ans({ q7: ["condition"] }));
    expect(p.sensitive).toBe(true);
    expect(p.medicalConditions).toContain("condition");
  });

  it("sensitive=true si l'IA qualifie la peau de sensible", () => {
    const p = buildEngineProfile(result({}, "Grasse sensible"), ans());
    expect(p.skinType).toBe("grasse");
    expect(p.sensitive).toBe(true);
  });

  it("un signal LÉGER (niveau 2) ne devient PAS un concern produit (seuil ≥3)", () => {
    // peau quasi nette notée « léger » sur dark_spots → aucun actif ciblé déclenché
    const p = buildEngineProfile(result({ dark_spots: 2, redness: 2 }), ans());
    expect(p.concerns).toHaveLength(0);
  });

  it("les priorités déclarées (q1) passent EN TÊTE des concerns, même non détectées par l'IA", () => {
    const p = buildEngineProfile(result({ redness: 3 }), ans({ q1: ["blemishes"] }));
    expect(p.concerns[0]).toBe("acne");        // q1 « blemishes » → acne prioritaire
    expect(p.concerns).toContain("comedones"); // mapping multi-concerns
    expect(p.concerns).toContain("redness");   // détecté par l'IA → conservé en complément
  });

  it("dédup : une priorité q1 déjà détectée par l'IA n'apparaît qu'une fois", () => {
    const p = buildEngineProfile(result({ shine: 2 }), ans({ q1: ["oiliness"] }));
    expect(p.concerns.filter((c) => c === "shine")).toHaveLength(1);
  });

  it("dérive bucket (sensibilité) et phase (expérience q3) pour le plafond d'irritation", () => {
    const reactive = buildEngineProfile(result({ redness: 3 }), ans({ q7: ["condition"], q3: ["retinol"] }));
    expect(reactive.bucket).toBe("sensible");
    expect(reactive.phase).toBe(3); // q3 rétinol → expert
    const debutant = buildEngineProfile(result(), ans());
    expect(debutant.phase).toBe(1); // aucune expérience déclarée
  });
});
