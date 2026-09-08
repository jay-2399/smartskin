import { describe, it, expect } from "vitest";
import { scoreFormule } from "@/lib/scan/scoring.mjs";
import { catalogue } from "@/lib/scan/moteur";

/* COMPTAGE DES ACTIFS (audit du 7 septembre, G2 #2, #4, #5, #8).
   Un ingrédient écrit deux fois rapportait +14 ; trois traces ajoutées après le conservateur
   +15 ; un mono-actif prouvé (The Ordinary Niacinamide 10 %) était puni « trop peu d'actifs »
   quand une soupe de quinze extraits en fin de liste montait à 92. Le rétinol, efficace à
   0,3 %, est légalement listé n'importe où sous la barre des 1 % : son poids reste plein
   quelle que soit sa position (veto du dermato, B7-5). */

type Detail = { type: string; id?: string; pts: number };
const note = (inci: string, cat = "serum") => scoreFormule(inci, cat, false).score;
const details = (inci: string, cat = "serum") => scoreFormule(inci, cat, false).details as Detail[];
const manqueActifs = (inci: string, cat = "serum") => details(inci, cat).some((d) => d.type === "manque" && d.id === "actifs");
const concentre = (inci: string, cat = "serum") => details(inci, cat).find((d) => d.type === "merite" && d.id === "concentre")?.pts ?? 0;

const TO_NIACINAMIDE = "Water, Niacinamide, Pentylene Glycol, Zinc PCA, Dimethicone, Tamarindus Indica Seed Gum, Xanthan Gum, Isoceteth-20, Ethoxydiglycol, Phenoxyethanol, Chlorphenesin";

describe("un ingrédient = une fois", () => {
  it("recopier les cinq premiers ingrédients en fin de liste ne rapporte rien", () => {
    const l = TO_NIACINAMIDE.split(", ");
    expect(note([...l, ...l.slice(0, 5)].join(", "))).toBe(note(TO_NIACINAMIDE));
  });
  it("trois actifs ajoutés après le conservateur valent au plus 3 points (le hyaluronate, efficace sous 1 %)", () => {
    const l = TO_NIACINAMIDE.split(", ");
    const i = l.indexOf("Phenoxyethanol");
    const triche = [...l.slice(0, i + 1), "Sodium Hyaluronate", "Panthenol", "Allantoin", ...l.slice(i + 1)].join(", ");
    expect(note(triche) - note(TO_NIACINAMIDE)).toBeLessThanOrEqual(3);
  });
});

describe("le prérequis « actifs » d'un sérum", () => {
  it("un mono-actif prouvé bien placé suffit (The Ordinary Niacinamide 10 %)", () => {
    expect(manqueActifs(TO_NIACINAMIDE)).toBe(false);
  });
  it("eau + glycérine + gomme n'est pas un sérum", () => {
    expect(manqueActifs("Water, Glycerin, Xanthan Gum, Phenoxyethanol")).toBe(true);
  });
  it("un sérum hydratant au hyaluronate passe, même après la barre des 1 % (Vichy Minéral 89)", () => {
    const p = catalogue().find((x) => /Min[eé]ral 89/i.test(x.name) && x.category === "serum" && x.inci)!;
    expect(p).toBeDefined();
    expect(manqueActifs(p.inci!, "serum")).toBe(false);
  });
  it("un masque garde sa règle : trois actifs, à toute position", () => {
    expect(manqueActifs("Water, Kaolin, Glycerin, Niacinamide, Sodium Hyaluronate, Panthenol, Phenoxyethanol", "mask")).toBe(false);
    expect(manqueActifs("Water, Kaolin, Bentonite, Xanthan Gum, Phenoxyethanol", "mask")).toBe(true);
  });
});

describe("l'actif fort en tête, gradué par la position", () => {
  const base = "Water, Glycerin, Propanediol, Squalane, Caprylic/Capric Triglyceride, Dimethicone, Cetearyl Alcohol, Tocopherol, Phenoxyethanol, Xanthan Gum";
  it("un rétinol en position 8 compte à plein (efficace sous 1 %)", () => {
    const l = base.split(", "); l.splice(7, 0, "Retinol");
    expect(concentre(l.join(", "))).toBeGreaterThan(0);
  });
  it("un actif fort en position 7 compte moins qu'en position 3, mais compte", () => {
    const l3 = base.split(", "); l3.splice(2, 0, "Niacinamide");
    const l7 = base.split(", "); l7.splice(6, 0, "Niacinamide");
    expect(concentre(l7.join(", "))).toBeGreaterThan(0);
    expect(concentre(l7.join(", "))).toBeLessThan(concentre(l3.join(", ")));
  });
  it("un rétinol en position 40, sous la barre des 1 %, vaut un rétinol en position 3 (veto B7-5)", () => {
    const fillers = Array.from({ length: 36 }, (_, i) => `Filler Ingredient ${i + 1}`);
    const tete = ["Water", "Glycerin", "Retinol", ...fillers, "Phenoxyethanol"].join(", ");
    const queue = ["Water", "Glycerin", ...fillers, "Phenoxyethanol", "Retinol"].join(", ");
    expect(concentre(queue)).toBe(concentre(tete));
  });
});
