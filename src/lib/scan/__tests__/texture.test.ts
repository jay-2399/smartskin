import { describe, it, expect } from "vitest";
import { scoreFormule, scorePerso } from "@/lib/scan/scoring.mjs";
import { catalogue } from "@/lib/scan/moteur";

/* TEXTURE ET ADÉQUATION (audit du 7 septembre, G2 #19).
   La « richesse » se lisait sur des mots-clés qui incluaient les émulsifiants et les esters
   légers : une lotion au glycéryl stéarate était « heavy for your oily skin » (−12). Elle
   s'appliquait aux produits rincés (une huile démaquillante « riche » pour une peau grasse) et
   aux toniques (« pas assez nourrissant » pour une eau micellaire, peau sèche). */

type Fact = { label: string; points: number | null };
const profil = (o: Record<string, unknown> = {}) => ({ skinType: "normal", sensitivity: 0, concerns: {}, strengthCeiling: 2, pregnancy: false, allergies: [], besoinSolaire: 0, libelles: {}, ...o });
const texture = (inci: string, cat: string, p: object) =>
  (scorePerso(inci, p, cat, scoreFormule(inci, cat, false), false).facts as Fact[]).filter((x) => /texture/i.test(x.label));
const SECHE = profil({ skinType: "dry" }), GRASSE = profil({ skinType: "oily" });

describe("ce qui fait une texture riche", () => {
  it("les stéarates d'émulsifiants et les esters légers ne font pas une crème riche", () => {
    const lotion = "Water, Glycerin, Caprylic/Capric Triglyceride, Glyceryl Stearate, PEG-100 Stearate, Cetearyl Alcohol, Dimethicone, Phenoxyethanol";
    expect(texture(lotion, "moisturizer", GRASSE).filter((x) => /heavy/i.test(x.label))).toHaveLength(0);
  });
  it("un beurre de karité en tête fait une crème riche, bonne pour une peau sèche", () => {
    const baume = "Water, Butyrospermum Parkii Butter, Glycerin, Cera Alba, Lanolin, Cetearyl Alcohol, Phenoxyethanol";
    const f = texture(baume, "moisturizer", SECHE);
    expect(f).toHaveLength(1);
    expect(f[0].points).toBeGreaterThan(0);
  });
  it("Toleriane Sensitive Riche reste riche après le recalage des seuils", () => {
    const p = catalogue().find((x) => /Toleriane.*Riche/i.test(x.name) && x.category === "moisturizer" && x.inci)!;
    expect(p).toBeDefined();
    expect(texture(p.inci as string, p.category, SECHE).some((x) => (x.points ?? 0) > 0)).toBe(true);
  });
});

describe("où la texture compte", () => {
  it("un produit rincé n'a pas de texture à juger (huile démaquillante, peau grasse)", () => {
    const p = catalogue().find((x) => /Dermalogica Precleanse/i.test(x.name) && x.inci)!;
    expect(p).toBeDefined();
    expect(texture(p.inci as string, "makeup-remover", GRASSE)).toHaveLength(0);
  });
  it("un tonique aqueux n'est pas « pas assez nourrissant » pour une peau sèche", () => {
    expect(texture("Water, Glycerin, Butylene Glycol, Sodium Hyaluronate, Panthenol, Phenoxyethanol", "toner", SECHE)).toHaveLength(0);
  });
  it("un hydratant aqueux l'est", () => {
    const f = texture("Water, Glycerin, Butylene Glycol, Sodium Hyaluronate, Panthenol, Carbomer, Phenoxyethanol", "moisturizer", SECHE);
    expect(f).toHaveLength(1);
    expect(f[0].points).toBeLessThan(0);
  });
});
