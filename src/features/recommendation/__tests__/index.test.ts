import { describe, it, expect } from "vitest";
import { buildRecommendedRoutine } from "@/features/recommendation";
import { ATTRIBUTES } from "@/features/analysis/attributes";
import { EMPTY_ANSWERS } from "@/features/funnel/types";
import type { AnalysisResult } from "@/features/analysis/schema";
import type { Answers } from "@/features/funnel/types";
import type { RoutineData } from "@/features/routine/products";

function result(overrides: Record<string, number> = {}, skinType = "Mixte"): AnalysisResult {
  return {
    score: 60, state: "x", sub: "y", photoQuality: { ok: true },
    profile: { skinType, ageRange: "25-35", carnation: 3, carnationLabel: "x",
      undertone: 2, undertoneLabel: "x", phototype: 3, phototypeSub: "x" },
    attributes: ATTRIBUTES.map((a) => ({ id: a.id, level: overrides[a.id] ?? 1, tip: "x", situation: "y" })),
  };
}
const ans = (o: Partial<Answers> = {}): Answers => ({ ...EMPTY_ANSWERS, ...o });
const allOptions = (r: RoutineData) => [...r.day, ...r.night].flatMap((s) => s.options);

describe("buildRecommendedRoutine — pipeline complet (vrai catalogue, sans LLM)", () => {
  it("produit une routine cohérente (socle nettoyant/hydratant/SPF, vrais produits)", async () => {
    const { routine } = await buildRecommendedRoutine(result({ acne: 3, shine: 2, pores: 2 }), ans({ q6: "60-100" }));
    const dayCats = routine.day.map((s) => s.cat);
    expect(dayCats).toEqual(expect.arrayContaining(["Nettoyant", "Crème jour", "Protection"]));
    expect(routine.productCount).toBe(routine.day.length + routine.night.length);
    // chaque étape propose AU PLUS 3 produits (1 reco + 2 alternatives) — jamais plus.
    for (const s of [...routine.day, ...routine.night]) {
      expect(s.options.length).toBeGreaterThanOrEqual(1);
      expect(s.options.length).toBeLessThanOrEqual(3);
    }
    // chaque produit a une justification + un lien affilié + un prix formaté
    for (const o of allOptions(routine)) {
      expect(o.why.length).toBeGreaterThan(0);
      expect(o.url).toMatch(/amazon\.com\/dp\//);
      expect(o.price).toMatch(/^\$/);
    }
  });

  it("structure FIXE : toujours 4 matin + 5 soir = 9 étapes, quel que soit le profil", async () => {
    for (const ov of [{}, { acne: 3, shine: 2 }, { redness: 3, flaking: 2 }, { fine_lines: 3, dark_spots: 2 }]) {
      const { routine } = await buildRecommendedRoutine(result(ov), ans({ q6: "gt100" }));
      expect(routine.day).toHaveLength(4);
      expect(routine.night).toHaveLength(5);
      expect(routine.productCount).toBe(9);
    }
  });

  it("le soir ne re-propose pas le nettoyant du matin ; aucune carte « Contour des yeux »", async () => {
    const { routine } = await buildRecommendedRoutine(result({ acne: 3, under_eye_circles: 2 }), ans({ q6: "60-100" }));
    const dayCats = routine.day.map((s) => s.cat);
    const nightCats = routine.night.map((s) => s.cat);
    expect(dayCats).toContain("Nettoyant");
    expect(nightCats).not.toContain("Nettoyant"); // pas de double choix du nettoyant
    expect([...dayCats, ...nightCats]).not.toContain("Contour des yeux");
  });

  it("deux crèmes distinctes : « Crème jour » (matin) + « Crème nuit » (soir)", async () => {
    const { routine } = await buildRecommendedRoutine(result({ acne: 3 }), ans({ q6: "60-100" }));
    expect(routine.day.map((s) => s.cat)).toContain("Crème jour");
    expect(routine.night.map((s) => s.cat)).toContain("Crème nuit");
    // 2 produits réellement différents
    const jour = routine.day.find((s) => s.cat === "Crème jour")!.options[0];
    const nuit = routine.night.find((s) => s.cat === "Crème nuit")!.options[0];
    expect(jour.name).not.toBe(nuit.name);
  });

  it("grossesse → AUCUN produit unsafePregnancy proposé", async () => {
    const { routine } = await buildRecommendedRoutine(result({ acne: 3, comedones: 2 }), ans({ q7: ["pregnancy"] }));
    expect(allOptions(routine).some((o) => o.unsafePregnancy)).toBe(false);
    // le créneau soir existe quand même (socle), la routine n'est pas vide
    expect(routine.productCount).toBeGreaterThan(0);
  });

  it("rosacée/eczéma → AUCUN produit unsafeSensitive proposé", async () => {
    const { routine } = await buildRecommendedRoutine(result({ redness: 3, acne: 2 }), ans({ q7: ["condition"] }));
    expect(allOptions(routine).some((o) => o.unsafeSensitive)).toBe(false);
  });

  it("budget serré (lt30) → respecte l'enveloppe ou tente des swaps", async () => {
    const { totaux, swaps } = await buildRecommendedRoutine(result({ acne: 3, dark_spots: 2, redness: 2 }), ans({ q6: "lt30" }));
    expect(totaux.budget).toBe(30);
    expect(totaux.dansLeBudget || swaps.length > 0).toBe(true);
  });

  it("budget gt100 (no_limit) → aucune contrainte de prix", async () => {
    const { totaux } = await buildRecommendedRoutine(result({ dark_spots: 3 }), ans({ q6: "gt100" }));
    expect(totaux.budget).toBe("no_limit");
    expect(totaux.dansLeBudget).toBe(true);
  });

  it("traitement dermato (q7) → avertissement d'orientation médecin", async () => {
    const { avertissements } = await buildRecommendedRoutine(result({ acne: 3 }), ans({ q7: ["treatment"] }));
    expect(avertissements.length).toBeGreaterThan(0);
  });

  it("peau sans préoccupation → routine de base + diagnostic « Peau équilibrée »", async () => {
    const { routine } = await buildRecommendedRoutine(result(), ans({ q6: "30-60" }));
    expect(routine.diagnostic).toEqual(["Peau équilibrée"]);
    expect(routine.day.map((s) => s.cat)).toEqual(expect.arrayContaining(["Nettoyant", "Protection"]));
  });
});
