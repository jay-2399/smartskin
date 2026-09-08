import fs from "node:fs";
const m = await import(process.cwd() + "/src/lib/scan/scoring.mjs");
const c = JSON.parse(fs.readFileSync("data/scan/catalog.json", "utf8"));
const F = (inci, cat, uv) => m.scoreFormule(inci, cat, uv);
const P = (inci, pr, cat, uv) => m.scorePerso(inci, pr, cat, undefined, uv);
const sens3 = { skinType: "normal", sensitivity: 3, concerns: { redness: 2 }, strengthCeiling: 2, pregnancy: false, allergies: [], besoinSolaire: 0, libelles: {} };
const sens1 = { ...sens3, sensitivity: 1 };
const seche = { skinType: "dry", sensitivity: 0, concerns: { dehydration: 2 }, strengthCeiling: 2, pregnancy: false, allergies: [], besoinSolaire: 0, libelles: {} };
const grasse = { skinType: "oily", sensitivity: 0, concerns: { blemishes: 2 }, strengthCeiling: 3, pregnancy: false, allergies: [], besoinSolaire: 0, libelles: {} };
const show = (t, inci, cat, uv) => { const f = F(inci, cat, uv); console.log(`${t.padEnd(70)} FORMULE ${f.score} | perso sens3 ${P(inci, sens3, cat, uv).score} | sens1 ${P(inci, sens1, cat, uv).score} | seche ${P(inci, seche, cat, uv).score} | grasse ${P(inci, grasse, cat, uv).score}`); return f; };

console.log("═══ A. Parfum opaque vs allergènes déclarés (base : crème simple) ═══");
const base = "Aqua, Glycerin, Caprylic/Capric Triglyceride, Cetearyl Alcohol, Niacinamide, Butyrospermum Parkii Butter, Glyceryl Stearate, Ceramide NP, Tocopherol, Xanthan Gum, Phenoxyethanol";
show("sans parfum", base, "moisturizer");
show("+ Parfum (opaque)", base + ", Parfum", "moisturizer");
show("+ Parfum, Linalool, Limonene", base + ", Parfum, Linalool, Limonene", "moisturizer");
show("+ Parfum + 6 allergènes UE déclarés", base + ", Parfum, Linalool, Limonene, Citronellol, Geraniol, Coumarin, Benzyl Alcohol", "moisturizer");
show("+ Parfum + 12 allergènes UE déclarés", base + ", Parfum, Linalool, Limonene, Citronellol, Geraniol, Coumarin, Benzyl Alcohol, Citral, Eugenol, Benzyl Benzoate, Farnesol, Hexyl Cinnamal, Benzyl Salicylate", "moisturizer");
show("Benzyl Alcohol seul (conservateur, sans parfum)", base + ", Benzyl Alcohol", "moisturizer");
show("Parfum mal orthographié : 'Perfume'", base + ", Perfume", "moisturizer");
show("Parfum sous 'Aroma'", base + ", Aroma", "moisturizer");
const p = P(base + ", Parfum, Linalool, Limonene, Citronellol, Geraniol, Coumarin, Benzyl Alcohol", sens3, "moisturizer");
console.log("  facts sens3 (6 allergènes):", p.facts.map(x => `${x.points} ${x.label}`).join(" | "));

console.log("\n═══ B. Saupoudrage d'actifs en fin de liste (sérum) ═══");
const to = "Aqua, Niacinamide, Pentylene Glycol, Zinc Pca, Dimethyl Isosorbide, Tamarindus Indica Seed Gum, Xanthan Gum, Isoceteth-20, Ethoxydiglycol, Phenoxyethanol, Chlorphenesin";
show("The Ordinary Niacinamide 10% tel quel", to, "serum");
show("+ Sodium Hyaluronate, Panthenol, Allantoin en fin", to + ", Sodium Hyaluronate, Panthenol, Allantoin", "serum");
show("+ 8 extraits/actifs traces en fin", to + ", Sodium Hyaluronate, Panthenol, Allantoin, Centella Asiatica Extract, Tocopherol, Retinol, Palmitoyl Tripeptide-1, Ascorbyl Glucoside, Bisabolol", "serum");
show("+ Retinol seul en toute fin (lowDose → w=1)", to + ", Retinol", "serum");
show("Sérum 'creux' 3 extraits faibles au top", "Aqua, Aloe Barbadensis Leaf Juice, Glycerin, Panthenol, Allantoin, Xanthan Gum, Phenoxyethanol", "serum");

console.log("\n═══ C. Même produit, catégorie différente ═══");
for (const [name, re] of [["TO Niacinamide", /Ordinary Niacinamide 10/], ["Paula's 2% BHA Liquid", /SKIN PERFECTING 2% BHA Liquid/], ["CeraVe Hydrating Cleanser", /^CeraVe Hydrating Facial Cleanser$/], ["Sensibio H2O", /Sensibio H2O Micellar Water Face/], ["Vanicream Moisturizing Cream", /Vanicream Moisturizing Cream with Pump Dispenser/]]) {
  const pr = c.find(x => re.test(x.name));
  const out = {};
  for (const cat of ["cleanser", "makeup-remover", "toner", "exfoliant", "serum", "treatment", "moisturizer", "eye-cream", "mask", "sunscreen", "indetermine"]) out[cat] = F(pr.inci, cat, pr.filtresUV).score;
  console.log(name.padEnd(30), JSON.stringify(out));
}

console.log("\n═══ D. INCI abrégée / vide / mal orthographiée (lecture étiquette) ═══");
const cer = c.find(x => /^CeraVe Hydrating Facial Cleanser$/.test(x.name));
show("CeraVe HC complet (24)", cer.inci, "cleanser");
show("CeraVe HC tronqué aux 8 premiers", cer.inci.split(",").slice(0, 8).join(","), "cleanser");
show("INCI vide", "", "cleanser");
show("INCI vide (serum)", "", "serum");
show("INCI = 'Aqua'", "Aqua", "moisturizer");
show("INCI = 'Aqua' (indetermine)", "Aqua", "indetermine");
const ocr = "Aqua, Glycerine, Cetearyl Alchol, Phenoxyethanol, Stearyl Alcohol, Cetyl Alcohol, Behentrimonium Methosulfate, Ceramide NP, Ceramide AP, Phytosphingosine, Cholesterol, Sodium Hyaluronate, Xanthan Gum, Carbomer, Tocopherol";
show("CeraVe-like avec 2 fautes OCR", ocr, "cleanser");
const ocr2 = "Aqua, Niacinamid, Pentylene Glycol, Zinc PCA, Dimethyl Isosorbide, Xanthan Gum, Phenoxyethanol, Chlorphenesin";
show("TO niacinamide 'Niacinamid' (faute OCR)", ocr2, "serum");
show("Crème parfumée dont l'OCR a raté 'Parfum' → 'Parfun'", base + ", Parfun, Linalool", "moisturizer");
