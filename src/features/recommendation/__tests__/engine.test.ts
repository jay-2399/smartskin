import { describe, it, expect } from "vitest";
import {
  hardFilter, scoreProduct, shortlist, planCategories, nightActiveCategories, treatmentCategoryFor,
  splitCreams, irritationTolerance, reconcile, totalsOf,
} from "@/features/recommendation/engine";
import type { CatalogProduct, SkinTypeKey } from "@/features/recommendation/catalog";
import type { EngineProfile } from "@/features/recommendation/profile";
import type { Constraints } from "@/features/recommendation/medical-guard";

const POS = (v = "positive") => ({ grasse: v, seche: v, mixte: v, sensible: v, normale: v }) as Record<SkinTypeKey, "positive" | "caution" | "negative" | "unknown">;

function prod(over: Partial<CatalogProduct> = {}): CatalogProduct {
  const base: CatalogProduct = {
    num: 1, asin: "A", name: "P", brand: "B", category: "serum",
    price: 20, rating: 4.5, reviews: 1000, bsr: 500,
    keyActives: "niacinamide", targets: [], skinTypes: [], moment: "both", frequency: "daily",
    unsafePregnancy: false, unsafeSensitive: false, irritationCost: 0, evidenceLevel: 3,
    fragranceFree: null, image: "img",
    couche3: { sentiment: 0.8, byProfile: POS() },
  };
  return { ...base, ...over };
}

function profile(over: Partial<EngineProfile> = {}): EngineProfile {
  return {
    skinType: "mixte", sensitive: false, bucket: "normale", phase: 3, concerns: [],
    needs: {}, strengthCeiling: 3,
    pregnant: false, breastfeeding: false, medicalConditions: [],
    freeText: "",
    ...over,
  };
}

function constraints(over: Partial<Constraints> = {}): Constraints {
  return { excludePregnancyUnsafe: false, excludeSensitiveUnsafe: false, maxIrritationPerProduct: 5, excludeActives: [], adviseDoctor: null, ...over };
}

describe("hardFilter — Étape 2", () => {
  it("grossesse → élimine les produits unsafePregnancy", () => {
    const list = [prod({ num: 1 }), prod({ num: 2, unsafePregnancy: true })];
    const out = hardFilter(list, profile({ pregnant: true }), constraints({ excludePregnancyUnsafe: true }));
    expect(out.map((p) => p.num)).toEqual([1]);
  });

  it("peau sensible → élimine unsafeSensitive et au-dessus du plafond d'irritation", () => {
    const list = [prod({ num: 1, irritationCost: 1 }), prod({ num: 2, unsafeSensitive: true }), prod({ num: 3, irritationCost: 4 })];
    const out = hardFilter(list, profile({ sensitive: true }), constraints({ excludeSensitiveUnsafe: true, maxIrritationPerProduct: 2 }));
    expect(out.map((p) => p.num)).toEqual([1]);
  });

  it("byProfile == negative pour la peau du user → éliminé", () => {
    const list = [prod({ num: 1 }), prod({ num: 2, couche3: { sentiment: 0.8, byProfile: { ...POS(), mixte: "negative" } } })];
    const out = hardFilter(list, profile({ skinType: "mixte" }), constraints());
    expect(out.map((p) => p.num)).toEqual([1]);
  });

  it("traitement dermato → exclut les rétinoïdes (excludeActives sur keyActives)", () => {
    const list = [prod({ num: 1, keyActives: "niacinamide" }), prod({ num: 2, keyActives: "retinol" })];
    const out = hardFilter(list, profile(), constraints({ excludeActives: ["retinol"] }));
    expect(out.map((p) => p.num)).toEqual([1]);
  });
});

describe("scoreProduct — Étape 3", () => {
  it("un produit qui traite plus de préoccupations score plus haut", () => {
    const p = profile({ concerns: ["acne", "pores"] });
    const matches = prod({ targets: ["acne", "pores"] });
    const noMatch = prod({ targets: [] });
    expect(scoreProduct(matches, p)).toBeGreaterThan(scoreProduct(noMatch, p));
  });

  it("byProfile positive bat caution (toutes choses égales)", () => {
    const p = profile({ skinType: "mixte" });
    const good = prod({ couche3: { sentiment: 0.8, byProfile: { ...POS(), mixte: "positive" } } });
    const meh = prod({ couche3: { sentiment: 0.8, byProfile: { ...POS(), mixte: "caution" } } });
    expect(scoreProduct(good, p)).toBeGreaterThan(scoreProduct(meh, p));
  });
});

describe("shortlist — Étape 4", () => {
  it("garde N produits max, recommandé (meilleur score) en [0]", () => {
    const p = profile({ concerns: ["acne"] });
    const list = [
      prod({ num: 1, brand: "A", targets: [] }),
      prod({ num: 2, brand: "B", targets: ["acne"] }), // meilleur match
      prod({ num: 3, brand: "C", targets: [] }),
      prod({ num: 4, brand: "D", targets: [] }),
      prod({ num: 5, brand: "E", targets: [] }),
      prod({ num: 6, brand: "F", targets: [] }),
    ];
    const sl = shortlist(list, p, 5);
    expect(sl).toHaveLength(5);
    expect(sl[0].num).toBe(2);
  });

  it("préfère la diversité de marque mais ne descend pas sous N si possible", () => {
    const p = profile();
    const list = [
      prod({ num: 1, brand: "Same", rating: 4.9 }),
      prod({ num: 2, brand: "Same", rating: 4.8 }),
      prod({ num: 3, brand: "Other", rating: 4.0 }),
    ];
    const sl = shortlist(list, p, 3);
    // 3 demandés, 3 dispos → on remonte le doublon de marque pour atteindre N.
    expect(sl).toHaveLength(3);
    expect(sl[0].brand).toBe("Same"); // meilleur score d'abord
    expect(sl[1].brand).toBe("Other"); // diversité préférée en 2e
  });
});

describe("structure fixe — slots actifs du soir", () => {
  it("planCategories source un set FIXE (socle + 3 familles d'actifs), sans contour", () => {
    const cats = planCategories();
    expect(cats).toEqual(expect.arrayContaining(["nettoyant", "serum", "hydratant", "spf", "démaquillant", "masque", "traitement", "exfoliant", "soin_cible"]));
    expect(cats).not.toContain("contour_yeux");
  });

  it("acné → soin traitant = traitement, bonus = exfoliant", () => {
    expect(nightActiveCategories(profile({ concerns: ["acne"] }))).toEqual(["traitement", "exfoliant"]);
  });

  it("pores (peau grasse) → soin = exfoliant, bonus distinct (soin_cible)", () => {
    const [s, b] = nightActiveCategories(profile({ concerns: ["pores"] }));
    expect(s).toBe("exfoliant");
    expect(b).not.toBe(s);
  });

  it("rougeurs → soin n°1 = soin_cible (jamais exfoliant en tête pour une réactive)", () => {
    expect(treatmentCategoryFor("redness")).toBe("soin_cible");
    expect(nightActiveCategories(profile({ concerns: ["redness"] }))[0]).toBe("soin_cible");
  });

  it("aucune préoccupation → 2 slots quand même (entretien), distincts", () => {
    const [s, b] = nightActiveCategories(profile({ concerns: [] }));
    expect(s).toBeTruthy();
    expect(b).toBeTruthy();
    expect(s).not.toBe(b);
  });
});

describe("splitCreams — pool jour (matin) / nuit (crème dédiée)", () => {
  it("range les 'both' au jour et les 'pm'/night=true à la nuit (pools disjoints)", () => {
    const creams: CatalogProduct[] = [
      prod({ num: 1, category: "hydratant", moment: "both" }),
      prod({ num: 2, category: "hydratant", moment: "pm", night: true }),
      prod({ num: 3, category: "hydratant", moment: "pm", night: true }),
    ];
    const { day, night } = splitCreams(creams);
    expect(day.map((p) => p.num)).toEqual([1]);
    expect(night.map((p) => p.num).sort()).toEqual([2, 3]);
    expect(night.map((p) => p.num)).not.toContain(day[0].num); // nuit ≠ jour
  });

  it("repli sur la regex de nom quand `moment`/`night` manquent", () => {
    const creams: CatalogProduct[] = [
      prod({ num: 1, category: "hydratant", name: "Hydro Boost Water Gel", moment: undefined }),
      prod({ num: 2, category: "hydratant", name: "Ultra Repair Cream", moment: undefined }),
    ];
    const { day, night } = splitCreams(creams);
    expect(day.map((p) => p.num)).toContain(1); // gel d'eau → jour
    expect(night.map((p) => p.num)).toContain(2); // crème réparatrice → nuit
  });
});

describe("irritationTolerance — matrice bucket × phase (§4.6)", () => {
  it("fragile/débutant→1 · sensible/phase2→5 · normale/débutant→6 · tolérante/expert→16", () => {
    expect(irritationTolerance(profile({ bucket: "fragile", phase: 1 }))).toBe(1);
    expect(irritationTolerance(profile({ bucket: "sensible", phase: 2 }))).toBe(5);
    expect(irritationTolerance(profile({ bucket: "normale", phase: 1 }))).toBe(6);
    expect(irritationTolerance(profile({ bucket: "tolerante", phase: 3 }))).toBe(16);
  });
});

describe("reconcile — Étape 6 (irritation)", () => {
  it("dépassement d'irritation → swap vers plus doux", () => {
    const picks: Record<string, CatalogProduct[]> = {
      exfoliant: [prod({ num: 1, irritationCost: 4 }), prod({ num: 2, irritationCost: 1 })],
      traitement: [prod({ num: 3, irritationCost: 4 }), prod({ num: 4, irritationCost: 1 })],
    };
    const p = profile({ bucket: "sensible", phase: 2 }); // tol = 5
    const r = reconcile(picks, p);
    expect(r.totals.irritation).toBeLessThanOrEqual(5);
    expect(r.swaps.some((s) => s.reason === "irritation")).toBe(true);
  });

  it("tolérance respectée → aucun swap ; prix reste informatif", () => {
    const picks: Record<string, CatalogProduct[]> = { serum: [prod({ num: 1, price: 200 })] };
    const r = reconcile(picks, profile());
    expect(r.swaps).toHaveLength(0);
    expect(totalsOf(picks).prix).toBe(200);
  });

  it("taille fixe : aucun retrait d'étape même si le plafond est dépassé (swap seulement)", () => {
    const picks: Record<string, CatalogProduct[]> = {
      exfoliant: [prod({ num: 2, irritationCost: 4, frequency: "daily", category: "exfoliant" })], // pas d'alternative
      traitement: [prod({ num: 3, irritationCost: 4, frequency: "daily", category: "traitement" })],
    };
    const r = reconcile(picks, profile({ bucket: "sensible", phase: 1 })); // tol = 3
    expect(r.picks.exfoliant).toBeDefined(); // RIEN n'est retiré
    expect(r.picks.traitement).toBeDefined();
    expect(r.swaps).toHaveLength(0); // aucun swap possible non plus
  });

  it("l'irritation est pondérée par la fréquence : un exfoliant 1-2×/sem pèse ≪ qu'un quotidien", () => {
    const occasional = totalsOf({ exfoliant: [prod({ irritationCost: 3, frequency: "1-2x/sem" })] });
    const daily = totalsOf({ exfoliant: [prod({ irritationCost: 3, frequency: "daily" })] });
    expect(daily.irritation).toBe(3); // quotidien → coût plein
    expect(occasional.irritation).toBeLessThan(daily.irritation); // 1-2×/sem → bien moins
  });
});
