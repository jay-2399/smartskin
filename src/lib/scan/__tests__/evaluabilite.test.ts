import { describe, it, expect } from "vitest";
import { scoreFormule, evaluabilite, parseInci } from "@/lib/scan/scoring.mjs";

/* CE QU'ON PEUT NOTER, ET CE QU'ON NE PEUT PAS (audit du 7 septembre, B4).
   Le moteur notait tout. Une liste tronquée par le cadrage d'une photo ou par une fiche
   marchande incomplète recevait une note moyenne rassurante — 48 — et, en prime, le mérite
   « sans parfum », puisqu'aucun parfum n'apparaît dans une liste vide. Un solaire dont la
   section « Active ingredients » manque affichait « aucun filtre UV, mauvais » : un solaire sans
   filtre n'existe pas, c'est toujours une liste incomplète. Mieux vaut ne pas noter que noter
   faux — mais une formule courte ET complète reste une bonne formule : Paula's Choice 2 % BHA
   a huit ingrédients, Sensibio dix. */

const ev = (inci: string, cat = "moisturizer", filtresUV = false, lecture = {}) =>
  evaluabilite(parseInci(inci), cat, filtresUV, lecture);

describe("un solaire sans filtre lisible n'est pas notable", () => {
  const SANS = "Water, Glycerin, Dimethicone, Cetearyl Alcohol, Squalane, Panthenol, Tocopherol, Phenoxyethanol, Xanthan Gum, Disodium EDTA";
  it("aucun filtre dans la liste et rien au catalogue → non évaluable", () => {
    expect(ev(SANS, "sunscreen")).toMatchObject({ evaluable: false, raison: "solaire-sans-filtre" });
  });
  it("le drapeau du catalogue suffit à le rendre notable", () => {
    expect(ev(SANS, "sunscreen", true).evaluable).toBe(true);
  });
  it("un filtre dans la liste aussi", () => {
    expect(ev(`Water, Zinc Oxide, ${SANS}`, "sunscreen").evaluable).toBe(true);
  });
  it("hors solaire, une liste sans filtre est parfaitement notable", () => {
    expect(ev(SANS, "moisturizer").evaluable).toBe(true);
  });
});

describe("les listes trop courtes pour être vraies", () => {
  it("cinq ingrédients sans base en tête → non évaluable (Avène Tolérance, liste amputée)", () => {
    expect(ev("Citrate, Niacinamide, Sodium Benzoate, Tocopherol, Xanthan Gum", "cleanser"))
      .toMatchObject({ evaluable: false, raison: "liste-courte" });
  });
  it("quatre ingrédients dont un inconnu → non évaluable", () => {
    expect(ev("Water, Glycerin, Xqzv Unknownium, Phenoxyethanol").evaluable).toBe(false);
  });
  it("six ingrédients dont un inconnu → notable : la liste est plausible", () => {
    expect(ev("Water, Glycerin, Niacinamide, Xqzv Unknownium, Panthenol, Phenoxyethanol").evaluable).toBe(true);
  });
  it("une formule minimaliste connue est notée, et le dit", () => {
    expect(ev("Squalane")).toMatchObject({ evaluable: true, badges: ["minimaliste"] });
    expect(ev("Water, Zinc Sulfate", "toner")).toMatchObject({ evaluable: true, badges: ["minimaliste"] });
  });
  it("une formule courte mais complète reste notée sans badge (Paula's Choice 2 % BHA)", () => {
    const pc = "Water, Methylpropanediol, Butylene Glycol, Salicylic Acid, Polysorbate 20, Camellia Oleifera Leaf Extract, Sodium Hydroxide, Tetrasodium EDTA";
    expect(ev(pc, "exfoliant")).toMatchObject({ evaluable: true });
    expect(ev(pc, "exfoliant").badges).not.toContain("minimaliste");
  });
});

describe("la lecture d'étiquette", () => {
  it("le modèle de vision dit que la liste est coupée → non évaluable", () => {
    expect(ev("Water, Glycerin, Niacinamide, Panthenol, Squalane, Tocopherol, Phenoxyethanol", "serum", false, { partielle: true }))
      .toMatchObject({ evaluable: false, raison: "lecture-partielle" });
  });
});

describe("le badge « analyse partielle »", () => {
  it("s'allume quand trop d'ingrédients de tête sont inconnus", () => {
    const inconnus = Array.from({ length: 4 }, (_, i) => `Xqzv Unknownium ${i}`).join(", ");
    const r = scoreFormule(`Water, Glycerin, ${inconnus}, Niacinamide, Panthenol, Squalane, Tocopherol, Phenoxyethanol`, "serum", false);
    expect(r.analysePartielle).toBe(true);
  });
  it("reste éteint sur une liste ordinaire", () => {
    expect(scoreFormule("Water, Glycerin, Niacinamide, Panthenol, Squalane, Tocopherol, Cetearyl Alcohol, Dimethicone, Phenoxyethanol, Xanthan Gum", "serum", false).analysePartielle).toBe(false);
  });
});

describe("scoreFormule porte le verdict, sans jamais lever d'exception", () => {
  it("une INCI vide ou absente est non évaluable, pas une erreur", () => {
    for (const v of ["", null, undefined]) {
      const r = scoreFormule(v as unknown as string, "moisturizer", false);
      expect(r.evaluable).toBe(false);
      expect(typeof r.score).toBe("number");
    }
  });
  it("le verdict et les badges voyagent avec la note", () => {
    const r = scoreFormule("Water, Glycerin, Dimethicone, Cetearyl Alcohol, Squalane, Phenoxyethanol", "sunscreen", false);
    expect(r).toMatchObject({ evaluable: false, raison: "solaire-sans-filtre" });
    expect(r.algoVersion).toBe("2.1.0-audit");
  });
});
