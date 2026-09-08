import { describe, it, expect } from "vitest";
import { scoreFormule, scorePerso } from "@/lib/scan/scoring.mjs";
import { catalogue } from "@/lib/scan/moteur";

/* LA TABLE DE CALIBRATION — quatorze produits de référence, note attendue.
   C'est le tableau E du rapport d'audit du 7 septembre, devenu test : si un barème bouge sans
   qu'on le veuille, un de ces produits le dit. Les valeurs ne se modifient qu'avec une entrée au
   journal de calibration (docs/specs/scan-scoring-v2-calcul.md) : elles sont la mémoire de ce
   qui a été mesuré, pas une commodité à réajuster quand un test rougit.

   Sur trente-deux étalons mesurés, vingt-huit tombent exactement sur le tableau E. Les deux
   Avène Cicalfate+ s'en écartent de −3, pour une raison voulue : leur eau thermale de marque ne
   compte plus comme un actif anti-rougeurs. */

type Etalon = [nom: string, formule: number | null, sècheReactive: number | null, grasseAcneique: number | null];

const p = (o: Record<string, unknown> = {}) => ({ skinType: "normal", sensitivity: 0, concerns: {}, strengthCeiling: 2, pregnancy: false, allergies: [], besoinSolaire: 0, libelles: {}, ...o });
const SECHE_REACTIVE = p({ skinType: "dry", sensitivity: 3, concerns: { dehydration: 3, redness: 2, barrier: 2 }, strengthCeiling: 0 });
const GRASSE_ACNEIQUE = p({ skinType: "oily", concerns: { blemishes: 3, oiliness: 2 }, strengthCeiling: 3, besoinSolaire: 2 });

// nom EXACT de la fiche du catalogue → [formule, perso peau sèche réactive, perso peau grasse acnéique]
// `null` en formule = produit qu'on ne peut pas noter.
const ETALONS: Etalon[] = [
  ["CeraVe Hydrating Facial Cleanser", 72, 88, 72],
  ["La Roche-Posay Toleriane Purifying Foaming Face Wash for Oily Skin", 72, 82, 75],
  ["Cetaphil Gentle Skin Cleanser Face Wash, For Sensitive Skin", 70, 90, 80],
  ["Urban Hydration Aloe Vera Leaf Face & Body Bar Soap", 32, 33, 31],
  ["Bioderma Sensibio H2O Micellar Water Makeup Remover", 77, 78, 77],
  ["La Roche-Posay Toleriane Double Repair Face Moisturizer with Niacinamide", 84, 94, 99],
  ["Avène Cicalfate+ Restorative Protective Cream", 67, 80, 57],
  ["Avène Cicalfate+ Intensive Skin Restorative Serum", 64, 75, 64],
  ["CeraVe Moisturizing Cream", 88, 100, 88],
  ["CeraVe PM Facial Moisturizing Lotion", 82, 100, 97],
  ["The Ordinary Niacinamide 10% + Zinc 1% Serum for Oily Skin", 78, 84, 93],
  ["SKIN1004 Madagascar Centella Ampoule", 65, 76, 65],
  ["The Ordinary Caffeine Solution 5% + EGCG Depuffing Eye Serum for Dark Circles", 71, 77, 76],
  ["La Roche-Posay Anthelios Melt-in Milk Body & Face Sunscreen Lotion SPF 100", 74, 75, 82],
];

const fiche = (nom: string) => catalogue().find((x) => x.name === nom && x.inci);

describe("table de calibration — les étalons du rapport d'audit", () => {
  it("les fiches de référence existent toutes au catalogue", () => {
    const absents = ETALONS.map(([n]) => n).filter((n) => !fiche(n));
    expect(absents).toEqual([]);
  });

  for (const [nom, formule, sr, ga] of ETALONS) {
    it(nom, () => {
      const x = fiche(nom)!;
      const f = scoreFormule(x.inci as string, x.category, x.filtresUV);
      if (formule === null) { expect(f.evaluable).toBe(false); return; }
      expect(f.evaluable, "doit rester notable").toBe(true);
      expect(f.score, "note de formule").toBe(formule);
      expect(scorePerso(x.inci as string, SECHE_REACTIVE, x.category, f, x.filtresUV).score, "peau sèche réactive").toBe(sr);
      expect(scorePerso(x.inci as string, GRASSE_ACNEIQUE, x.category, f, x.filtresUV).score, "peau grasse acnéique").toBe(ga);
    });
  }
});

describe("ce qu'on ne note pas", () => {
  it("un solaire dont la liste américaine a perdu ses filtres", () => {
    const x = fiche("La Roche-Posay Anthelios UV Hydra Sunscreen SPF 50 with Hyaluronic Acid")!;
    expect(x).toBeDefined();
    expect(scoreFormule(x.inci as string, x.category, x.filtresUV)).toMatchObject({ evaluable: false, raison: "solaire-sans-filtre" });
  });
  it("une fiche dont la liste d'ingrédients est corrompue", () => {
    const x = catalogue().find((q) => q.name === "Weleda Skin Food Travel Size Clear 40 Count")!;
    expect(x).toBeDefined();
    expect(x.inci ?? null).toBeNull();
  });
});

describe("les triches que l'audit a fermées", () => {
  const TO = "Water, Niacinamide, Pentylene Glycol, Zinc PCA, Dimethicone, Tamarindus Indica Seed Gum, Xanthan Gum, Isoceteth-20, Ethoxydiglycol, Phenoxyethanol, Chlorphenesin";
  const base = scoreFormule(TO, "serum", false).score;
  const avec = (suffixe: string) => scoreFormule(TO + ", " + suffixe, "serum", false).score - base;

  it("recopier des ingrédients ne rapporte rien", () => {
    expect(scoreFormule(TO + ", " + TO.split(", ").slice(0, 5).join(", "), "serum", false).score).toBe(base);
  });
  it("saupoudrer huit extraits en fin de liste ne rapporte presque rien", () => {
    expect(avec("Camellia Sinensis Leaf Extract, Centella Asiatica Extract, Aloe Barbadensis Leaf Juice, Chamomilla Recutita Flower Extract, Glycyrrhiza Glabra Root Extract, Panthenol, Allantoin, Sodium Hyaluronate")).toBeLessThanOrEqual(5);
  });
  it("écrire « Perfume » coûte autant qu'écrire « Parfum »", () => {
    expect(avec("Perfume")).toBe(avec("Parfum"));
    expect(avec("Perfume")).toBeLessThan(0);
  });
  it("une eau thermale de marque en tête de liste ne vaut pas un actif", () => {
    const eau = "Avene Thermal Spring Water (Avene Aqua), Glycerin, Xanthan Gum, Phenoxyethanol";
    const eauSimple = "Water, Glycerin, Xanthan Gum, Phenoxyethanol";
    expect(scoreFormule(eau, "serum", false).score).toBe(scoreFormule(eauSimple, "serum", false).score);
  });
});
