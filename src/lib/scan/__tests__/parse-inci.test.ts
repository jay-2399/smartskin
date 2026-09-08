import { describe, it, expect } from "vitest";
import { parseInci } from "@/lib/scan/scoring.mjs";

/* LECTURE D'UNE LISTE D'INGRÉDIENTS (audit du 7 septembre, G2 #1).
   « Adapalene USP 0.1% » restait inconnu : l'Effaclar Adapalene était noté 47 avec « trop peu
   d'actifs ». « Octisalate 5% » s'arrêtait sur OCTISALATE, un alias d'alias jamais résolu.
   « Perfume » et « Aroma » échappaient au malus parfum (+12 pour une marque qui les écrit). */

const noms = (inci: string) => parseInci(inci).map((it: { name: string }) => it.name);
const fiche = (inci: string) => parseInci(inci)[0].fiche;

describe("parseInci — normalisations", () => {
  it("retire un pourcentage et « USP » collés au nom", () => {
    expect(noms("Adapalene USP 0.1%")).toEqual(["ADAPALENE"]);
    expect(fiche("Adapalene USP 0.1%")).toBeTruthy();
    expect(noms("Zinc Oxide 20%, Titanium Dioxide 5%")).toEqual(["ZINC OXIDE", "TITANIUM DIOXIDE"]);
    expect(noms("3% Niacinamide, Niacinamide (3%)")).toEqual(["NIACINAMIDE", "NIACINAMIDE"]);
  });
  it("suit une chaîne d'alias jusqu'à la fiche (Octisalate → Ethylhexyl Salicylate)", () => {
    expect(noms("Octisalate 5%")).toEqual(["ETHYLHEXYL SALICYLATE"]);
    expect(fiche("Octisalate 5%")).toBeTruthy();
  });
  it("Perfume, Aroma et les graphies de Parfum sont FRAGRANCE ; « Aromatic » non", () => {
    expect(noms("Perfume, Aroma, Fragrance (Parfum), Parfum/Fragrance, Parfum")).toEqual(["FRAGRANCE", "FRAGRANCE", "FRAGRANCE", "FRAGRANCE", "FRAGRANCE"]);
    expect(noms("Aromatic Water")).toEqual(["AROMATIC WATER"]);
  });
  it("une parenthèse vide laissée par le nettoyage disparaît", () => {
    expect(noms("Zinc Oxide (  ), Glycerin")).toEqual(["ZINC OXIDE", "GLYCERIN"]);
  });
  it("non-régression : « 1,2-Hexanediol » est un seul ingrédient, à une seule position", () => {
    const l = parseInci("Water, 1,2-Hexanediol, Glycerin");
    expect(l.map((it: { name: string; pos: number }) => [it.name, it.pos])).toEqual([["WATER", 1], ["1,2-HEXANEDIOL", 2], ["GLYCERIN", 3]]);
  });
});
