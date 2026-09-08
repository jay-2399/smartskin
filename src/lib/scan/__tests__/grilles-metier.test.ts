import { describe, it, expect } from "vitest";
import { scoreFormule, CONFIG } from "@/lib/scan/scoring.mjs";

/* GRILLES MÉTIER (audit du 7 septembre, G2 #3, #6, #7).
   La douceur d'un nettoyant n'est pas la présence d'un tensioactif : un lait démaquillant sans
   agent lavant, la forme la plus douce qui existe, perdait 12 points « no gentle cleansing
   agent » (CeraVe Hydrating 59). Les eaux micellaires perdaient 12 « nothing dissolves makeup »
   pour le tensioactif même qui leur valait « rinses off cleanly ». Le prédicat @photostable
   lisait des noms commerciaux absents des INCI. Les lignes antioxydants/lipides comptaient une
   trace en fin de liste comme un ingrédient de tête. */

type Detail = { type: string; id?: string; pts: number };
const manque = (inci: string, cat: string, id: string) =>
  (scoreFormule(inci, cat, false).details as Detail[]).some((d) => d.type === "manque" && d.id === id);
const merite = (inci: string, cat: string, id: string) =>
  (scoreFormule(inci, cat, false).details as Detail[]).find((d) => d.type === "merite" && d.id === id)?.pts ?? 0;

describe("nettoyants : la douceur n'est pas un tensioactif", () => {
  const LAIT = "Water, Glycerin, Caprylic/Capric Triglyceride, Cetearyl Alcohol, Glyceryl Stearate, Ceramide NP, Phenoxyethanol, Xanthan Gum";
  it("un lait sans agent lavant (émollient + émulsifiant, aucun sulfate) n'est pas puni", () => {
    expect(manque(LAIT, "cleanser", "douceur")).toBe(false);
  });
  it("un système lavant agressif sans rien de doux reste puni", () => {
    expect(manque("Water, Sodium Lauryl Sulfate, Glycerin, Cetearyl Alcohol, Phenoxyethanol", "cleanser", "douceur")).toBe(true);
  });
  it("un savon reste puni", () => {
    expect(manque("Sodium Palmate, Sodium Cocoate, Water, Glycerin, Sodium Chloride", "cleanser", "douceur")).toBe(true);
  });
  it("une eau micellaire au poloxamer dissout le maquillage", () => {
    expect(manque("Water, PEG-6 Caprylic/Capric Glycerides, Poloxamer 184, Glycerin, Cetrimonium Bromide, Disodium EDTA", "makeup-remover", "dissout")).toBe(false);
  });
});

describe("solaires : stabilisants et filtres", () => {
  const BASE = "Water, Glycerin, Dimethicone, Cetearyl Alcohol, Phenoxyethanol";
  it("l'avobenzone seule est instable ; avec de l'octocrylène elle ne l'est plus", () => {
    expect(manque(`Water, Avobenzone, ${BASE}`, "sunscreen", "photostable")).toBe(true);
    expect(manque(`Water, Avobenzone, Octocrylene, ${BASE}`, "sunscreen", "photostable")).toBe(false);
    expect(manque(`Water, Avobenzone, Bis-Ethylhexyloxyphenol Methoxyphenyl Triazine, ${BASE}`, "sunscreen", "photostable")).toBe(false);
  });
  it("un solaire dont le catalogue atteste les filtres n'est pas « sans filtre », même si la liste les a perdus", () => {
    const sans = scoreFormule(BASE, "sunscreen", false).details as Detail[];
    const avec = scoreFormule(BASE, "sunscreen", true).details as Detail[];
    expect(sans.some((d) => d.type === "manque" && d.id === "filtres")).toBe(true);
    expect(avec.some((d) => d.type === "manque" && d.id === "filtres")).toBe(false);
  });
  it("la ligne « actifs » d'un solaire est plafonnée à 4, celle de la grille indéterminée à 14", () => {
    const ligneActifs = (g: { merites: { id: string; plafond?: number }[] }) => g.merites.find((l) => l.id === "actifs")?.plafond;
    expect(ligneActifs(CONFIG.RUBRIQUES.sunscreen)).toBe(4);
    expect(ligneActifs(CONFIG.RUBRIQUES.indetermine)).toBe(14);
  });
});

describe("antioxydants et lipides : la position compte partout", () => {
  it("un tocophérol en tête d'un sérum vaut plus qu'en fin de liste", () => {
    const tete = "Water, Glycerin, Niacinamide, Tocopherol, Propanediol, Phenoxyethanol, Xanthan Gum, Panthenol, Allantoin, Sodium Hyaluronate, Citric Acid, Sodium Citrate, Disodium EDTA";
    const queue = "Water, Glycerin, Niacinamide, Propanediol, Phenoxyethanol, Xanthan Gum, Panthenol, Allantoin, Sodium Hyaluronate, Citric Acid, Sodium Citrate, Disodium EDTA, Tocopherol";
    expect(merite(tete, "serum", "antiox")).toBeGreaterThan(merite(queue, "serum", "antiox"));
  });
  it("un céramide en tête d'un traitement vaut plus qu'en fin de liste", () => {
    const tete = "Water, Ceramide NP, Glycerin, Niacinamide, Propanediol, Phenoxyethanol, Xanthan Gum, Panthenol, Allantoin, Sodium Hyaluronate, Citric Acid, Disodium EDTA";
    const queue = "Water, Glycerin, Niacinamide, Propanediol, Phenoxyethanol, Xanthan Gum, Panthenol, Allantoin, Sodium Hyaluronate, Citric Acid, Disodium EDTA, Ceramide NP";
    expect(merite(tete, "treatment", "lipides")).toBeGreaterThan(merite(queue, "treatment", "lipides"));
  });
});
