import { describe, it, expect } from "vitest";
import { fitScore, selectByFit } from "@/features/recommendation/fit";
import type { CatalogProduct, SkinTypeKey } from "@/features/recommendation/catalog";
import type { EngineProfile } from "@/features/recommendation/profile";

const POS = (v = "positive") =>
  ({ grasse: v, seche: v, mixte: v, sensible: v, normale: v }) as Record<SkinTypeKey, "positive" | "caution" | "negative" | "unknown">;

function prod(over: Partial<CatalogProduct> = {}): CatalogProduct {
  const base: CatalogProduct = {
    num: 1, asin: "A", name: "P", brand: "B", category: "traitement",
    price: 20, rating: 4.5, reviews: 1000, bsr: 500,
    keyActives: "x", targets: [], skinTypes: [], moment: "both", frequency: "daily",
    unsafePregnancy: false, unsafeSensitive: false, irritationCost: 0, evidenceLevel: 3,
    activeStrength: 1, fragranceFree: null, image: "img",
    couche3: { sentiment: 0.8, byProfile: POS() },
  };
  return { ...base, ...over };
}

function profile(over: Partial<EngineProfile> = {}): EngineProfile {
  return {
    skinType: "mixte", sensitive: false, bucket: "normale", phase: 3, concerns: [],
    needs: {}, strengthCeiling: 3,
    pregnant: false, breastfeeding: false, medicalConditions: [],
    budgetTier: "gt100", budget: "no_limit", freeText: "",
    ...over,
  };
}

describe("fit — l'adéquation décide, la popularité ne fait que départager", () => {
  it("un produit ADAPTÉ mais peu connu passe AVANT un produit hors-sujet ultra-populaire", () => {
    const p = profile({ needs: { acne: 3 }, strengthCeiling: 3 });
    const adapté = prod({ num: 1, brand: "Niche", targets: ["acne"], activeStrength: 3, rating: 4.0, reviews: 40 });
    const populaire = prod({ num: 2, brand: "Star", targets: ["dark_spots"], activeStrength: 3, rating: 4.9, reviews: 80000 });
    expect(fitScore(adapté, p)).toBeGreaterThan(fitScore(populaire, p));
    expect(selectByFit([populaire, adapté], p, 2)[0].num).toBe(1); // l'adapté gagne malgré 80k avis
  });

  it("à adéquation ÉGALE, la popularité départage (le mieux noté/avis devant)", () => {
    const p = profile({ needs: { acne: 3 }, strengthCeiling: 3 });
    const peuVu = prod({ num: 1, brand: "Aa", targets: ["acne"], activeStrength: 3, rating: 4.4, reviews: 50 });
    const connu = prod({ num: 2, brand: "Bb", targets: ["acne"], activeStrength: 3, rating: 4.4, reviews: 20000 });
    expect(selectByFit([peuVu, connu], p, 2)[0].num).toBe(2); // même fit → la popularité tranche
  });
});

describe("fit — l'intensité se DOSE selon gravité × tolérance", () => {
  it("acné sévère + peau tolérante → l'actif FORT bat le doux", () => {
    const p = profile({ needs: { acne: 4 }, bucket: "tolerante", phase: 3, strengthCeiling: 4 });
    const fort = prod({ num: 1, brand: "Aa", targets: ["acne"], activeStrength: 4 });
    const doux = prod({ num: 2, brand: "Bb", targets: ["acne"], activeStrength: 1 });
    expect(selectByFit([doux, fort], p, 2)[0].num).toBe(1);
  });

  it("MÊME acné sévère mais peau SENSIBLE (plafond 2) → l'actif fort est recalé au profit du modéré", () => {
    const p = profile({ needs: { acne: 4 }, bucket: "sensible", phase: 1, strengthCeiling: 2 });
    const fort = prod({ num: 1, brand: "Aa", targets: ["acne"], activeStrength: 4 });
    const modéré = prod({ num: 2, brand: "Bb", targets: ["acne"], activeStrength: 2 });
    expect(selectByFit([fort, modéré], p, 2)[0].num).toBe(2); // dépassement de tolérance pénalisé
  });

  it("peau nette (aucun besoin) → le DOUX bat le fort, même mieux noté", () => {
    const p = profile({ needs: {}, strengthCeiling: 3 });
    const doux = prod({ num: 1, brand: "Aa", category: "exfoliant", targets: ["pores"], activeStrength: 1, rating: 4.2, reviews: 100 });
    const fort = prod({ num: 2, brand: "Bb", category: "exfoliant", targets: ["acne"], activeStrength: 4, rating: 4.8, reviews: 50000 });
    expect(selectByFit([fort, doux], p, 2)[0].num).toBe(1);
  });
});
