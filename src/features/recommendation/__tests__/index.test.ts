import { describe, it, expect } from "vitest";
import { buildRecommendedRoutine } from "@/features/recommendation";
import { buildEngineProfile } from "@/features/recommendation/profile";
import { loadCatalog } from "@/features/recommendation/catalog";
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
    expect(dayCats).toEqual(expect.arrayContaining(["Cleanser", "Day cream", "Protection"]));
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

  it("acné → garde l'ENTRETIEN (sérum/exfoliant/masque) + ajoute un soin ciblé acné", async () => {
    const { routine } = await buildRecommendedRoutine(result({ acne: 3, shine: 2 }), ans({ q6: "gt100" }));
    const cats = [...routine.day, ...routine.night].map((s) => s.cat);
    expect(cats).toEqual(expect.arrayContaining(["Cleanser", "Serum", "Day cream", "Protection", "Exfoliant", "Night cream", "Mask"]));
    expect(cats).toContain("Treatment"); // soin ciblé acné présent
    expect(routine.day).toHaveLength(4);
    expect(routine.night).toHaveLength(5);
  });

  it("peau nette (0 concern) → GARDE l'entretien (sérum/exfoliant/masque) mais AUCUN soin ciblé", async () => {
    const { routine } = await buildRecommendedRoutine(result(), ans({ q6: "gt100" }));
    const cats = [...routine.day, ...routine.night].map((s) => s.cat);
    // entretien complet conservé (gestes utiles pour toute peau)
    expect(cats).toEqual(expect.arrayContaining(["Cleanser", "Serum", "Day cream", "Protection", "Exfoliant", "Night cream", "Mask"]));
    // mais PAS de soin ciblé problème (plus de gel/patch anti-acné sur une peau sans souci)
    expect(cats).not.toContain("Treatment");
    expect(cats).not.toContain("Targeted care");
  });


  it("slot ciblé (Treatment) : CHAQUE produit affiché traite un vrai concern (jamais de hors-sujet)", async () => {
    // Peau ROUGE (pas de taches) : le slot ciblé ne doit JAMAIS afficher un sérum anti-taches,
    // même en alternative bien notée. Tout produit du slot doit viser un concern du profil.
    const r = result({ redness: 3 });
    const a = ans({ q6: "gt100" });
    const { routine } = await buildRecommendedRoutine(r, a);
    const concerns = buildEngineProfile(r, a).concerns;
    const all = [...routine.day, ...routine.night];
    // Slot ciblé : 100% pertinent, jamais de produit hors-sujet (même en alternative).
    for (const step of all.filter((s) => s.cat === "Treatment" || s.cat === "Targeted care")) {
      for (const o of step.options) {
        expect(o.targets.some((t) => concerns.includes(t))).toBe(true);
      }
    }
    // Pertinence = gate par concern sur les catégories pilotées par le BESOIN. Les crèmes sont
    // une exception assumée : elles sont gatées par le TYPE DE PEAU (hydratation adaptée), pas
    // par concern — donc elles peuvent mélanger des crèmes qui visent un concern et d'autres non.
    for (const step of all) {
      if (step.cat === "Day cream" || step.cat === "Night cream") continue;
      const rel = step.options.map((o) => o.targets.some((t) => concerns.includes(t)));
      expect(rel.every(Boolean) || rel.every((x) => !x)).toBe(true);
    }
  });

  it("le soir ne re-propose pas le nettoyant du matin ; aucune carte « Contour des yeux »", async () => {
    const { routine } = await buildRecommendedRoutine(result({ acne: 3, under_eye_circles: 2 }), ans({ q6: "60-100" }));
    const dayCats = routine.day.map((s) => s.cat);
    const nightCats = routine.night.map((s) => s.cat);
    expect(dayCats).toContain("Cleanser");
    expect(nightCats).not.toContain("Cleanser"); // pas de double choix du nettoyant
    expect([...dayCats, ...nightCats]).not.toContain("Eye care");
  });

  it("deux crèmes distinctes : « Crème jour » (matin) + « Crème nuit » (soir)", async () => {
    const { routine } = await buildRecommendedRoutine(result({ acne: 3 }), ans({ q6: "60-100" }));
    expect(routine.day.map((s) => s.cat)).toContain("Day cream");
    expect(routine.night.map((s) => s.cat)).toContain("Night cream");
    // 2 produits réellement différents
    const jour = routine.day.find((s) => s.cat === "Day cream")!.options[0];
    const nuit = routine.night.find((s) => s.cat === "Night cream")!.options[0];
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

  it("traitement dermato (q7) → avertissement d'orientation médecin", async () => {
    const { avertissements } = await buildRecommendedRoutine(result({ acne: 3 }), ans({ q7: ["treatment"] }));
    expect(avertissements.length).toBeGreaterThan(0);
  });

  it("plafond actifs forts : jamais plus de 2 produits irritation≥2 (anti sur-exfoliation)", async () => {
    const irr = new Map(loadCatalog().map((p) => [p.name, p.irritationCost ?? 0]));
    // profil très chargé qui pousserait à empiler acides/rétinoïdes
    const { routine } = await buildRecommendedRoutine(
      result({ acne: 3, post_acne_marks: 3, dark_spots: 3, texture: 3, fine_lines: 3 }, "Oily"),
      ans({ q6: "gt100" })
    );
    const strong = allOptions(routine).map((o) => o.name).filter((n) => (irr.get(n) ?? 0) >= 2);
    // au plus 2 produits forts EN TÊTE de chaque étape (les options[0] retenues)
    const chosenStrong = [...routine.day, ...routine.night].filter((s) => (irr.get(s.options[0].name) ?? 0) >= 2);
    expect(chosenStrong.length).toBeLessThanOrEqual(2);
    expect(strong.length).toBeGreaterThan(0); // il reste bien des actifs (pas tout adouci)
  });

  it("peau NETTE (aucun concern) → que de l'entretien DOUX : aucun actif fort (irritation ≥ 2)", async () => {
    // Un produit n'a pas à viser un besoin pour être pertinent — mais sur une peau sans
    // concern, on ne propose QUE du doux (pas de BHA/acne pad fort type Stridex).
    const irr = new Map(loadCatalog().map((p) => [p.name, p.irritationCost ?? 0]));
    const { routine } = await buildRecommendedRoutine(result(), ans({ q6: "gt100" }));
    const strong = allOptions(routine).map((o) => o.name).filter((n) => (irr.get(n) ?? 0) >= 2);
    expect(strong).toEqual([]);
  });

  it("peau sans préoccupation → routine de base + diagnostic « Peau équilibrée »", async () => {
    const { routine } = await buildRecommendedRoutine(result(), ans({ q6: "30-60" }));
    expect(routine.diagnostic).toEqual(["Balanced skin"]);
    expect(routine.day.map((s) => s.cat)).toEqual(expect.arrayContaining(["Cleanser", "Protection"]));
  });
});
