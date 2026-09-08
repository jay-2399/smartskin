// usage: node bench.mjs <mode> <variant> [variant...]   modes: etalons | stats | cheat | perso
import fs from "node:fs";
const V = "/private/tmp/claude-501/-Users-jayenbellili-dev/bbeb88c0-d43a-4f0d-8eaa-2d0f14e599f7/scratchpad/debat/variants/";
const [mode, ...variants] = process.argv.slice(2);
const c = JSON.parse(fs.readFileSync("data/scan/catalog.json", "utf8")).map((p, i) => ({ ...p, id: i }));
const inScope = c.filter((p) => p.category !== "hors-perimetre" && p.inci);
const find = (re) => c.find((p) => new RegExp(re, "i").test(p.name));
export const ETALONS = [
  ["CeraVe Hydrating Cleanser", "^CeraVe Hydrating Facial Cleanser$"],
  ["Toleriane Purifying Foaming", "^La Roche-Posay Toleriane Purifying Foaming Face Wash"],
  ["Toleriane Double Repair", "Toleriane Double Repair Face Moisturizer with Niacinamide"],
  ["Toleriane Dermallergo", "Toleriane Dermallergo Face Moisturizer"],
  ["Sensibio H2O", "Sensibio H2O Micellar Water Face Cleanser"],
  ["Toleriane Eau Micellaire FR", "Toleriane Eau Micellaire"],
  ["PC 2% BHA Liquid", "SKIN PERFECTING 2% BHA Liquid"],
  ["PC 2% BHA Toner", "Paula's Choice 2% BHA Exfoliating Toner"],
  ["TO Niacinamide 10%", "Ordinary Niacinamide 10"],
  ["SKIN1004 Centella Ampoule", "SKIN1004 Madagascar Centella Ampoule$"],
  ["Cicalfate+ crème", "Cicalfate\\+ Restorative Protective"],
  ["Cicalfate+ sérum", "Cicalfate\\+ Intensive"],
  ["Anthelios UV Hydra SPF50", "Anthelios UV Hydra"],
  ["Anthelios Mineral Tinted SPF50", "Anthelios Mineral Tinted Ultra"],
  ["Anthelios Melt-in Milk SPF100", "Anthelios Melt-in Milk"],
  ["Vanicream Mineral SPF30", "VANICREAM Facial Moisturizer Broad Spectrum Mineral"],
  ["Cetaphil Sheer Mineral Drops", "Cetaphil Sheer Mineral Face Liquid Drops"],
  ["Neutrogena HB Sunscreen SPF50 (octocrylène)", "Hydro Boost Water Gel Lotion Sunscreen"],
  ["Vanicream Moisturizing Cream", "Vanicream Moisturizing Cream with Pump Dispenser"],
  ["Vanicream Enhanced", "VANICREAM Enhanced Moisturizer"],
  ["Cetaphil Gentle Skin Cleanser", "^Cetaphil Gentle Skin Cleanser Face Wash"],
  ["Cetaphil Cleansing Milk (SLS)", "^Cetaphil Cleansing Milk"],
  ["Weleda Skin Food US (parfum)", "Weleda Skin Food Face Care Nourishing Day Cream"],
  ["Weleda Skin Food FR (sans parfum listé)", "Weleda Skin Food Crème de Jour"],
  ["Weleda Skin Food Travel", "^Weleda Skin Food Travel Size$"],
  ["Nivea Men Face Wash", "NIVEA MEN Maximum Hydration Face Wash"],
  ["Savon Urban Hydration", "Urban Hydration Aloe Vera Leaf"],
  ["Effaclar Adapalene 0,1%", "Effaclar Adapalene"],
  ["Effaclar Duo+M", "Effaclar Duo\\+M"],
  ["Effaclar toner alcool", "Effaclar Micro-Exfoliating Astringent"],
  ["Effaclar Clarifying (SA+glyco+menthol)", "Effaclar Clarifying Solution"],
  ["Effaclar BPO", "Effaclar BPO"],
  ["Neutrogena Hydro Boost Gel (parfum)", "^Neutrogena Hydro Boost Water Gel$"],
  ["Vichy Minéral 89 sérum", "Vichy Mineral 89 Hyaluronic Acid Face Serum"],
  ["TO Caffeine Solution (yeux)", "Ordinary Caffeine Solution"],
  ["TO Multi-Peptide Eye", "Ordinary Multi-Peptide Eye"],
  ["TO AHA 30% + BHA 2%", "Ordinary AHA 30"],
  ["TO Glycolic 7% toner", "Ordinary Glycolic Acid 7"],
  ["Dermalogica Retinol Serum", "Dermalogica Dynamic Skin Retinol"],
  ["PC Resist Pure Radiance (92)", "Resist Pure Radiance"],
  ["ANUA Niacinamide TXA (92)", "ANUA Niacinamide 10 TXA"],
  ["VT PDRN Glow Ampoule (92)", "VT Cosmetics PDRN Glow Ampoule"],
  ["Bubble Day Dream (92)", "Bubble Day Dream"],
  ["Oak Essentials Gel Cleanser (19 parfums)", "Oak Essentials Pure Gel"],
  ["Thayers Witch Hazel toner", "Thayers.*Witch Hazel.*Toner"],
  ["Kiehl's Ultra Facial Cream", "^Kiehl's Since 1851 Ultra Facial Cream$"],
  ["TO Squalane 100%", "Ordinary 100% Plant-Derived Squalane"],
  ["Avène Eau Thermale spray", "Av.ne.*(Thermal Spring Water|Eau Thermale).*(Spray|Brumisateur|Face Mist)"],
];
export const PROFILS = {
  sens3: { skinType: "normal", sensitivity: 3, concerns: { redness: 2 }, strengthCeiling: 1, pregnancy: false, allergies: [], besoinSolaire: 0, libelles: {} },
  sensibleSeche: { skinType: "dry", sensitivity: 3, concerns: { redness: 2, dehydration: 2 }, strengthCeiling: 1, pregnancy: false, allergies: [], besoinSolaire: 0, libelles: {} },
  grasseAcne: { skinType: "oily", sensitivity: 0, concerns: { blemishes: 3, oiliness: 2 }, strengthCeiling: 3, pregnancy: false, allergies: [], besoinSolaire: 1, libelles: {} },
  aging: { skinType: "normal", sensitivity: 1, concerns: { aging: 3, spots: 2 }, strengthCeiling: 2, pregnancy: false, allergies: [], besoinSolaire: 1, libelles: {} },
};
const mods = {};
for (const v of variants) mods[v] = await import(V + v + ".mjs");

if (mode === "etalons") {
  const prof = process.env.PROF ? PROFILS[process.env.PROF] : null;
  console.log(("étalon" + (prof ? ` [perso ${process.env.PROF}]` : " [formule]")).padEnd(46) + variants.map((v) => v.padStart(7)).join(""));
  for (const [label, re] of ETALONS) {
    const p = find(re); if (!p) { console.log(label.padEnd(46) + "  (absent)"); continue; }
    const row = variants.map((v) => { const m = mods[v]; const f = m.scoreFormule(p.inci, p.category, p.filtresUV); return String(prof ? m.scorePerso(p.inci, prof, p.category, f, p.filtresUV).score : f.score).padStart(7); });
    console.log(label.padEnd(46) + row.join(""));
  }
}
if (mode === "stats") {
  for (const v of variants) {
    const m = mods[v];
    const cats = {}; let parfN = 0, parfVert = 0, nonParfN = 0, cout = 0, coutN = 0;
    const seche = { n: 0, cinq: 0, d: 0, rouge: 0 };
    for (const p of inScope) {
      const f = m.scoreFormule(p.inci, p.category, p.filtresUV);
      const k = (cats[p.category] ??= { n: 0, vert: 0, rouge: 0, s: 0 }); k.n++; k.s += f.score; if (f.score >= 75) k.vert++; if (f.score < 45) k.rouge++;
      const parf = f.details.some((d) => d.type === "complexe-parfumant");
      if (parf) { parfN++; if (f.score >= 75) parfVert++; } else { nonParfN++; if (coutN < 600) { const f2 = m.scoreFormule(p.inci + ", Parfum", p.category, p.filtresUV); cout += f2.score - f.score; coutN++; } }
      const s = m.scorePerso(p.inci, PROFILS.sensibleSeche, p.category, f, p.filtresUV).score; seche.n++; seche.d += s - f.score; if (s <= 5) seche.cinq++; if (s < 45) seche.rouge++;
    }
    const tot = Object.values(cats).reduce((a, k) => ({ n: a.n + k.n, vert: a.vert + k.vert, rouge: a.rouge + k.rouge, s: a.s + k.s }), { n: 0, vert: 0, rouge: 0, s: 0 });
    console.log(`\n== ${v} == moy ${(tot.s / tot.n).toFixed(1)} · vert ${(100 * tot.vert / tot.n).toFixed(1)} % · rouge ${(100 * tot.rouge / tot.n).toFixed(1)} % · parfumés verts ${(100 * parfVert / parfN).toFixed(1)} % (${parfVert}/${parfN}) · coût d'une trace de Parfum ${(cout / coutN).toFixed(1)} · perso sècheRéactive : Δ ${(seche.d / seche.n).toFixed(1)}, rouge ${(100 * seche.rouge / seche.n).toFixed(1)} %, à 5 : ${(100 * seche.cinq / seche.n).toFixed(1)} %`);
    console.log("  " + Object.entries(cats).map(([k, x]) => `${k} ${(x.s / x.n).toFixed(0)}/${(100 * x.vert / x.n).toFixed(0)}%v/${(100 * x.rouge / x.n).toFixed(0)}%r`).join(" · "));
  }
}
if (mode === "cheat") {
  const base = "Aqua, Glycerin, Caprylic/Capric Triglyceride, Cetearyl Alcohol, Niacinamide, Butyrospermum Parkii Butter, Glyceryl Stearate, Ceramide NP, Tocopherol, Xanthan Gum, Phenoxyethanol";
  const to = find("Ordinary Niacinamide 10").inci;
  const tests = [
    ["crème sans parfum", base, "moisturizer"], ["+ Parfum", base + ", Parfum", "moisturizer"], ["+ Parfum + 6 allergènes", base + ", Parfum, Linalool, Limonene, Citronellol, Geraniol, Coumarin, Benzyl Alcohol", "moisturizer"],
    ["+ Benzyl Alcohol seul", base + ", Benzyl Alcohol", "moisturizer"], ["+ Perfume", base + ", Perfume", "moisturizer"],
    ["gel nettoyant sans parfum", "Aqua, Cocamidopropyl Betaine, Glycerin, Sodium Cocoyl Isethionate, Coco-Glucoside, Xanthan Gum, Phenoxyethanol", "cleanser"],
    ["gel nettoyant + Parfum", "Aqua, Cocamidopropyl Betaine, Glycerin, Sodium Cocoyl Isethionate, Coco-Glucoside, Xanthan Gum, Phenoxyethanol, Parfum", "cleanser"],
    ["TO Niacinamide", to, "serum"], ["TO + 3 traces après conservateur", to + ", Sodium Hyaluronate, Panthenol, Allantoin", "serum"], ["TO + Retinol en dernier", to + ", Retinol", "serum"], ["TO + Niacinamide écrit 2 fois", to + ", Niacinamide", "serum"],
    ["sérum 3 extraits faibles", "Aqua, Aloe Barbadensis Leaf Juice, Glycerin, Panthenol, Allantoin, Xanthan Gum, Phenoxyethanol", "serum"],
    ["sérum eau+glycérine", "Aqua, Glycerin, Butylene Glycol, Xanthan Gum, Phenoxyethanol", "serum"],
    ["rétinol honnête pos 8 (0,5 %)", "Aqua, Glycerin, Caprylic/Capric Triglyceride, Dimethicone, Cetearyl Alcohol, Squalane, Glyceryl Stearate, Retinol, Tocopherol, Phenoxyethanol, Xanthan Gum", "serum"],
    ["peel AHA sans tampon", "Aqua, Glycolic Acid, Lactic Acid, Salicylic Acid, Sodium Hydroxide, Phenoxyethanol", "exfoliant"],
    ["peel AHA tamponné", "Aqua, Glycolic Acid, Glycerin, Lactic Acid, Sodium Hyaluronate, Ceramide NP, Salicylic Acid, Sodium Hydroxide, Phenoxyethanol", "exfoliant"],
    ["tonique acides en tête sans tampon", "Aqua, Glycolic Acid, Alcohol Denat, Salicylic Acid, Menthol, Phenoxyethanol", "toner"],
    ["INCI vide (cleanser)", "", "cleanser"], ["Aqua seul (indetermine)", "Aqua", "indetermine"],
  ];
  console.log("cas".padEnd(40) + variants.map((v) => v.padStart(7)).join("") + "   | perso sens3 " + variants.map((v) => v.padStart(7)).join("") + "   | grasseAcne " + variants.map((v) => v.padStart(7)).join(""));
  for (const [t, inci, cat] of tests) {
    const f = variants.map((v) => mods[v].scoreFormule(inci, cat, false));
    const s = variants.map((v, i) => mods[v].scorePerso(inci, PROFILS.sens3, cat, f[i], false).score);
    const g = variants.map((v, i) => mods[v].scorePerso(inci, PROFILS.grasseAcne, cat, f[i], false).score);
    console.log(t.padEnd(40) + f.map((x) => String(x.score).padStart(7)).join("") + "   |             " + s.map((x) => String(x).padStart(7)).join("") + "   |            " + g.map((x) => String(x).padStart(7)).join(""));
  }
}
