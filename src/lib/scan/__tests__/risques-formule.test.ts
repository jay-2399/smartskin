import { describe, it, expect } from "vitest";
import { scoreFormule } from "@/lib/scan/scoring.mjs";
import { dictionnaire, ficheIngredients } from "@/lib/scan/moteur";
import { PROFIL_NEUTRE } from "@/lib/scan/acces";

/* LES RISQUES ET LES PLAFONDS DE LA NOTE FORMULE (audit du 7 septembre, G2 #9-#12).
   La comédogénicité (échelle oreille de lapin, Fulton 1989) ne prédit pas le produit fini
   (Draelos & DiNardo 2006) : elle sort de la note formule et de son plafond « jamais vert ».
   Un actif prouvé irritant (rétinol, acide) n'est plus puni pour l'irritation normale de son
   efficacité, mais en empiler plusieurs reste sanctionné. Un ingrédient interdit dans l'UE
   plafonne la note selon la portée de l'interdiction. Le plafond est renvoyé et expliqué. */

type Detail = { type: string; id?: string; inci?: string; pts: number; cap?: number };
const f = (inci: string, cat: string) => scoreFormule(inci, cat, false);
const risques = (inci: string, cat: string) => (f(inci, cat).details as Detail[]).filter((d) => d.type === "risque").map((d) => d.inci);
const ligne = (inci: string, cat: string, type: string) => (f(inci, cat).details as Detail[]).find((d) => d.type === type);

describe("comédogénicité hors formule", () => {
  it("un ingrédient comédogène mais non irritant ne prend aucune ligne de risque", () => {
    const dico = dictionnaire() as Record<string, { risks?: { comedogenic?: number; irritant?: number }; fragrance?: boolean; essentialOil?: boolean }>;
    const nom = Object.keys(dico).find((n) => (dico[n].risks?.comedogenic ?? 0) >= 4 && !dico[n].risks?.irritant && !dico[n].fragrance && !dico[n].essentialOil)!;
    expect(nom, "un comédogène ≥ 4 non irritant existe au dictionnaire").toBeDefined();
    expect(risques(`Water, Glycerin, ${nom}, Cetearyl Alcohol, Phenoxyethanol`, "moisturizer")).toEqual([]);
    expect(f(`Water, Glycerin, ${nom}, Cetearyl Alcohol, Phenoxyethanol`, "moisturizer").cap).toBeNull();
  });
});

describe("le premier actif irritant bien dosé ne coûte rien, les suivants coûtent", () => {
  it("un sérum au rétinol n'est pas puni pour son rétinol", () => {
    expect(risques("Water, Glycerin, Propanediol, Squalane, Caprylic/Capric Triglyceride, Dimethicone, Cetearyl Alcohol, Retinol, Tocopherol, Phenoxyethanol, Xanthan Gum", "serum")).not.toContain("RETINOL");
  });
  it("un peel qui empile deux acides paie le second", () => {
    const r = risques("Water, Glycolic Acid, Salicylic Acid, Sodium Hydroxide, Phenoxyethanol", "exfoliant");
    expect(r).not.toContain("GLYCOLIC ACID");
    expect(r).toContain("SALICYLIC ACID");
  });
});

describe("ingrédients interdits dans l'UE, selon la portée", () => {
  const BASE = "Water, Sodium Cocoyl Isethionate, Glycerin, Coco-Glucoside, Cetearyl Alcohol";
  it("le lilial plafonne à 45 même dans un nettoyant rincé, et la ligne « plafond » le dit", () => {
    const r = f(`${BASE}, Butylphenyl Methylpropional, Phenoxyethanol`, "cleanser");
    expect(r.cap).toBe(45);
    expect(r.score).toBeLessThanOrEqual(45);
    expect(ligne(`${BASE}, Butylphenyl Methylpropional, Phenoxyethanol`, "cleanser", "plafond")).toMatchObject({ cap: 45 });
  });
  it("la méthylisothiazolinone, légale en rincé, coûte −5 × exposition sans plafond ; posée, elle plafonne", () => {
    const rince = f(`${BASE}, Methylisothiazolinone, Phenoxyethanol`, "cleanser");
    expect(rince.cap).toBeNull();
    expect(ligne(`${BASE}, Methylisothiazolinone, Phenoxyethanol`, "cleanser", "banni")?.pts).toBeCloseTo(-5 * 0.55, 1);
    expect(f("Water, Glycerin, Cetearyl Alcohol, Methylisothiazolinone, Phenoxyethanol", "moisturizer").cap).toBe(45);
  });
  it("sans ingrédient interdit ni hydroquinone, pas de plafond : cap vaut null (JSON-safe)", () => {
    expect(f(BASE + ", Phenoxyethanol", "cleanser").cap).toBeNull();
  });
});

describe("ficheIngredients suit la même règle de gravité", () => {
  const groupe = (inci: string) => (ficheIngredients(inci, dictionnaire(), PROFIL_NEUTRE) as { nom: string; groupe: string }[]).map((x) => x.groupe);
  it("irritant ≥ 2, parfum, huile essentielle ou comédogène ≥ 4 → « surveiller » ; comédogène 3 seul → neutre", () => {
    expect(groupe("Sodium Lauryl Sulfate")).toEqual(["surveiller"]);
    expect(groupe("Parfum")).toEqual(["surveiller"]);
    const dico = dictionnaire() as Record<string, { risks?: { comedogenic?: number; irritant?: number }; role?: string; benefits?: string[]; fragrance?: boolean }>;
    const c4 = Object.keys(dico).find((n) => (dico[n].risks?.comedogenic ?? 0) >= 4 && !dico[n].risks?.irritant && dico[n].role !== "active" && !dico[n].fragrance)!;
    const c3 = Object.keys(dico).find((n) => dico[n].risks?.comedogenic === 3 && !dico[n].risks?.irritant && dico[n].role !== "active" && !dico[n].fragrance)!;
    expect(groupe(c4)).toEqual(["surveiller"]);
    expect(groupe(c3)).toEqual(["neutre"]);
  });
});
