import { describe, it, expect } from "vitest";
import { categoriser } from "@/lib/scan/categorise.mjs";

/* LE DRAPEAU « PROTECTION UV » HORS SOLAIRE (audit du 7 septembre, B4).
   Avant : posé dès que ZINC OXIDE ou TITANIUM DIOXIDE apparaissait dans les 8 premiers
   ingrédients, par sous-chaîne. Cicalfate+ (oxyde de zinc cicatrisant en position 3, aucun SPF)
   disait « ça vous protège des UV » à qui ne se protège pas. Désormais : filtre organique haut
   placé, ou SPF/FPS/UV/SUN en mot entier dans le nom débarrassé de la marque. */

const CREME_ZNO = "Water, Glycerin, Zinc Oxide, Mineral Oil, Copper Sulfate, Zinc Sulfate, Glyceryl Stearate, Cetearyl Alcohol, Phenoxyethanol";
const CREME_AVO_HAUT = "Water, Glycerin, Avobenzone, Octocrylene, Dimethicone, Cetearyl Alcohol, Phenoxyethanol";
const CREME_AVO_BAS = "Water, Glycerin, Dimethicone, Cetearyl Alcohol, Glyceryl Stearate, Squalane, Niacinamide, Panthenol, Tocopherol, Xanthan Gum, Phenoxyethanol, Avobenzone";
const SERUM_TIO2_QUEUE = "Water, Glycerin, Niacinamide, Propanediol, Sodium Hyaluronate, Panthenol, Xanthan Gum, Phenoxyethanol, Titanium Dioxide";

describe("filtresUV hors solaire", () => {
  it("l'oxyde de zinc seul ne vaut pas un SPF (Cicalfate)", () => {
    expect(categoriser("Cicalfate+ Restorative Protective Cream", CREME_ZNO, "Avène").filtresUV).toBe(false);
  });
  it("un filtre organique en tête compte, en queue non", () => {
    expect(categoriser("Daily Moisturizer", CREME_AVO_HAUT, "Brand").filtresUV).toBe(true);
    expect(categoriser("Daily Moisturizer", CREME_AVO_BAS, "Brand").filtresUV).toBe(false);
  });
  it("« SPF », « FPS » ou « UV » dans le nom compte, collé au chiffre ou en mot entier", () => {
    expect(categoriser("Hydro Boost Moisturizer SPF 30", SERUM_TIO2_QUEUE, "Neutrogena").filtresUV).toBe(true);
    expect(categoriser("Crème d'eau compacte teintée spf30", SERUM_TIO2_QUEUE, "Uriage").filtresUV).toBe(true);
    expect(categoriser("UV Shield Day Fluid", SERUM_TIO2_QUEUE, "Brand").filtresUV).toBe(true);
  });
  it("« Sun » ne suffit pas : marque, tournesol, après-soleil", () => {
    expect(categoriser("SUNDAY RILEY A+ High-Dose Retinoid Serum", SERUM_TIO2_QUEUE, "SUNDAY RILEY").filtresUV).toBe(false);
    expect(categoriser("Gentle Cleanser with Sunflower Oil", SERUM_TIO2_QUEUE, "Cetaphil").filtresUV).toBe(false);
    expect(categoriser("The After Sun Club", SERUM_TIO2_QUEUE, "BYROE").filtresUV).toBe(false);
  });
  it("dans un solaire, la règle actuelle reste : filtre organique ≤ 14 ou minéral ≤ 8", () => {
    const r = categoriser("Mineral Sunscreen SPF 50", "Water, Zinc Oxide, Glycerin, Caprylic/Capric Triglyceride, Phenoxyethanol");
    expect(r.categorie).toBe("sunscreen");
    expect(r.filtresUV).toBe(true);
  });
});
