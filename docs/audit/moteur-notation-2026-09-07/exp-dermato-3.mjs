import fs from "node:fs";
const base = await import(process.cwd() + "/src/lib/scan/scoring.mjs");
const C = JSON.parse(fs.readFileSync("data/scan/catalog.json", "utf8")).filter((p) => p.category !== "hors-perimetre" && p.inci);
const D = JSON.parse(fs.readFileSync("data/scan/dictionnaire.json", "utf8"));
const sec = (t) => console.log("\n══════ " + t);
const P0 = { skinType: "normal", sensitivity: 0, concerns: {}, strengthCeiling: 2, pregnancy: false, allergies: [], besoinSolaire: 0, libelles: {} };
const secheReactive = { skinType: "dry", sensitivity: 3, concerns: { dehydration: 3, redness: 2, barrier: 2 }, strengthCeiling: 0, pregnancy: false, allergies: [], besoinSolaire: 0, libelles: {} };
const normaleAge = { skinType: "normal", sensitivity: 1, concerns: { aging: 3, spots: 2 }, strengthCeiling: 2, pregnancy: false, allergies: [], besoinSolaire: 1, libelles: {} };

// charge la copie patchée avec un jeu d'interrupteurs (cache-busting par query)
let k = 0;
async function moteur(sim) { globalThis.SIM = sim; return await import(new URL("./scoring-sim-dermato.mjs?v=" + (k++), import.meta.url).href); }

function stats(m, profil) {
  const sf = [], sp = [];
  for (const p of C) { const f = m.scoreFormule(p.inci, p.category, p.filtresUV); sf.push(f.score); if (profil) sp.push(m.scorePerso(p.inci, profil, p.category, f, p.filtresUV).score); }
  const agg = (a) => { const s = [...a].sort((x, y) => x - y); const n = s.length; return { moy: +(s.reduce((x, y) => x + y, 0) / n).toFixed(1), med: s[Math.floor(n / 2)], p10: s[Math.floor(n * 0.1)], p90: s[Math.floor(n * 0.9)], vert: +(100 * s.filter((x) => x >= 75).length / n).toFixed(1), rouge: +(100 * s.filter((x) => x < 45).length / n).toFixed(1), a5: +(100 * s.filter((x) => x <= 5).length / n).toFixed(1) }; };
  return { formule: agg(sf), perso: profil ? agg(sp) : null };
}

sec("0. Vérifications de faits endossés (P4, P5, OCTISALATE)");
for (const re of [/CeraVe Hydrating Facial Cleanser/i, /Sensibio H2O/i, /Toleriane.*Purifying Foaming/i]) { const p = C.find((x) => re.test(x.name)); if (p) { const f = base.scoreFormule(p.inci, p.category, p.filtresUV); console.log(p.name.slice(0, 60), "[", p.category, "] →", f.score, f.details.filter((d) => d.type !== "risque").map((d) => (d.id || d.type) + ":" + d.pts).join(" ")); } }
let octi = 0; for (const p of C) if (p.category === "sunscreen" && /OCTISALATE/i.test(p.inci)) octi++; console.log("solaires avec OCTISALATE dans l'INCI :", octi, "| fiche OCTISALATE au dictionnaire :", !!D["OCTISALATE"]);

sec("1. Friction 1 — parfum à UN canal (S2) : tarif 4 / 6 / 8, coût d'une trace par famille, et distribution");
const clean = "Water, Glycerin, Coco-Glucoside, Cocamidopropyl Betaine, Sodium Cocoyl Isethionate, Panthenol, Xanthan Gum, Phenoxyethanol";
const cream = "Water, Glycerin, Cetearyl Alcohol, Caprylic/Capric Triglyceride, Niacinamide, Ceramide NP, Phenoxyethanol, Xanthan Gum";
const serum = "Water, Glycerin, Niacinamide, Propanediol, Sodium Hyaluronate, Panthenol, Allantoin, Phenoxyethanol, Xanthan Gum";
const b0 = stats(base, null).formule; console.log("BASE :", JSON.stringify(b0));
for (const tarif of [4, 6, 8]) {
  const m = await moteur({ parfumUnique: true, tarifParfum: tarif });
  const cout = {}; for (const [lab, inci, cat] of [["cleanser", clean, "cleanser"], ["moisturizer", cream, "moisturizer"], ["eye-cream", cream, "eye-cream"], ["serum", serum, "serum"]]) { const a = m.scoreFormule(inci, cat).score; cout[lab] = { sans: a, parfum: m.scoreFormule(inci + ", Parfum", cat).score - a, parfum2all: m.scoreFormule(inci + ", Parfum, Limonene, Linalool", cat).score - a }; }
  console.log(`tarif ${tarif} :`, JSON.stringify(stats(m, null).formule), JSON.stringify(cout));
}

sec("2. Friction 2 — irritance des actifs prouvés : S5 pur vs « premier gratuit, empilement payé »");
{
  const m = await moteur({ actifStack: true });
  const ser = C.filter((p) => /serum|treatment/.test(p.category));
  let d = 0, up = 0, stack = 0;
  for (const p of ser) { const a = base.scoreFormule(p.inci, p.category).score, b = m.scoreFormule(p.inci, p.category).score; d += b - a; if (b > a) up++;
    const l = base.parseInci(p.inci); const barre = (() => { for (const it of l) if (base.CONFIG.marqueurs1pct.includes(it.name)) return it.pos; return Infinity; })();
    const irr = l.filter((it) => it.fiche?.role === "active" && (it.fiche.benefitPower || 0) >= 2 && it.fiche.risks?.irritant === 2 && (it.pos <= 10 && it.pos < barre || it.fiche.lowDose)); if (irr.length >= 2) stack++; }
  console.log({ serumsTraitements: ser.length, deltaMoyen: +(d / ser.length).toFixed(2), montent: up, avecEmpilementDe2ActifsIrritantsBienPlaces: stack });
  const retS = "Water, Glycerin, Propanediol, Caprylic/Capric Triglyceride, Squalane, Sodium Hyaluronate, Panthenol, Phenoxyethanol, Xanthan Gum, Retinol";
  const pile = "Water, Glycolic Acid, Glycerin, Ascorbic Acid, Propanediol, Retinol, Phenoxyethanol";
  console.log("sérum rétinol : base", base.scoreFormule(retS, "serum").score, "→ premier gratuit", m.scoreFormule(retS, "serum").score, "| empilement glycolique+vitC+rétinol : base", base.scoreFormule(pile, "serum").score, "→", m.scoreFormule(pile, "serum").score);
  const m2 = await moteur({ actifStack: true, lowDoseTop5: true });
  console.log("+ lowDose dans @actifTop5 (D5) : sérum rétinol →", m2.scoreFormule(retS, "serum").score);
}

sec("3. Friction 3 — comédogénicité hors formule (D4) + cap perso (S3) + sensibilisants forts (D2)");
{
  const m = await moteur({ comedoOut: true, capPerso: true, sensiFort: true });
  let capN = 0, capNoms = {}, chg = 0, mi = [];
  for (const p of C) { const f = m.scoreFormule(p.inci, p.category, p.filtresUV); if (f.cap < Infinity) { capN++; for (const d of f.details) if (d.type === "risque" && d.grav >= 3) capNoms[d.inci] = (capNoms[d.inci] || 0) + 1; for (const it of base.parseInci(p.inci)) if (it.fiche?.banniUE) capNoms["banni:" + it.name] = (capNoms["banni:" + it.name] || 0) + 1; }
    if (f.score !== base.scoreFormule(p.inci, p.category, p.filtresUV).score) chg++;
    if (f.details.some((d) => d.type === "sensibilisant-fort")) mi.push(p.brand + " — " + p.name.slice(0, 40) + " " + base.scoreFormule(p.inci, p.category, p.filtresUV).score + "→" + f.score); }
  console.log({ produitsPlafonnes: capN, plafonneurs: capNoms, produitsDontLaNoteChange: chg });
  console.log("exemples sensibilisant fort :", mi.slice(0, 6));
  const mi2 = "Water, Glycerin, Cetearyl Alcohol, Caprylic/Capric Triglyceride, Niacinamide, Ceramide NP, Methylisothiazolinone, Methylchloroisothiazolinone, Xanthan Gum";
  console.log("crème MI+MCI : base 75 →", m.scoreFormule(mi2, "moisturizer").score, "| en nettoyant (rincé, MI autorisé 15 ppm) :", m.scoreFormule(mi2, "cleanser").score, "vs sans MI", m.scoreFormule(mi2.replace("Methylisothiazolinone, Methylchloroisothiazolinone", "Phenoxyethanol"), "cleanser").score);
}

sec("4. Friction 2/D8/S1 — perso : parfum une ligne + plafonds + canal irritant, profil secheReactive");
console.log("BASE secheReactive :", JSON.stringify(stats(base, secheReactive).perso));
{
  const m1 = await moteur({ persoPlafonds: true }); console.log("S1 seul (parfum/HE une ligne, sensibilisants plafonnés −8×S/3) :", JSON.stringify(stats(m1, secheReactive).perso));
  const m2 = await moteur({ persoPlafonds: true, persoIrritant: true, sensiFort: true }); console.log("S1 + D8 (irritants −2×irr×S/3×w plafond −10×S/3 ; sensibilisants ≤2 à −1×niv ; niv 3 en formule) :", JSON.stringify(stats(m2, secheReactive).perso));
  const m3 = await moteur({ persoPlafonds: true, persoIrritant: true, sensiFort: true, forcePonderee: true, comedoOut: true, capPerso: true }); console.log("+ force/alcool pondérés (D7) + comédo hors formule :", JSON.stringify(stats(m3, secheReactive).perso));
  const tonique = "Water, Glycerin, Niacinamide, Propanediol, Sodium Hyaluronate, Panthenol, Phenoxyethanol, Xanthan Gum, Menthol, Hamamelis Virginiana Water, Alcohol";
  const doux = "Water, Glycerin, Coco-Glucoside, Cocamidopropyl Betaine, Sodium Cocoyl Isethionate, Panthenol, Xanthan Gum, Phenoxyethanol";
  for (const [lab, inci, cat] of [["tonique menthol/hamamélis/alcool", tonique, "toner"], ["nettoyant doux glucosides", doux, "cleanser"]]) {
    const pb = base.scorePerso(inci, { ...P0, sensitivity: 3 }, cat), pm = m2.scorePerso(inci, { ...P0, sensitivity: 3 }, cat);
    console.log(lab, ": base", pb.scoreFormule, "→ perso", pb.score, "| D8 :", pm.scoreFormule, "→", pm.score, pm.facts.filter((f) => f.points && Math.abs(f.points) >= 1).map((f) => f.label.slice(0, 45) + " " + f.points));
  }
}

sec("5. Friction 5 — comptage des actifs : règle unifiée (dédoublonnage + w ≥ 0,6 sauf lowDose + prérequis « un actif prouvé bien placé »)");
{
  // implémentation locale du prédicat proposé, appliquée aux sérums pour compter qui passe / échoue
  const ser = C.filter((p) => /serum|treatment|mask/.test(p.category));
  let echoueActuel = 0, echoueNouveau = 0, mono = 0;
  for (const p of ser) {
    const l = base.parseInci(p.inci); const barre = (() => { for (const it of l) if (base.CONFIG.marqueurs1pct.includes(it.name)) return it.pos; return Infinity; })();
    const vus = new Set(); const actifs = l.filter((it) => { if (!it.fiche || it.fiche.role !== "active" || !it.fiche.benefits?.length) return false; if (vus.has(it.name)) return false; vus.add(it.name); return true; });
    const bienPlace = (it) => it.fiche.lowDose || (it.pos <= 10 && it.pos < barre);
    const actuel = actifs.length >= 3;
    const nouveau = actifs.some((it) => (it.fiche.benefitPower || 0) >= 2 && bienPlace(it));
    if (!actuel) echoueActuel++; if (!nouveau) echoueNouveau++; if (!actuel && nouveau) mono++;
  }
  console.log({ serumsTraitementsMasques: ser.length, echouentPrerequisActuel: echoueActuel, echoueraientPrerequisUnifie: echoueNouveau, monoActifsSauves: mono });
  const ex = ["The Ordinary Niacinamide 10", "Effaclar Adapalene", "Vichy Min", "Argireline", "Ascorbyl Glucoside"];
  for (const e of ex) { const p = ser.find((x) => x.name.includes(e)); if (!p) continue; const l = base.parseInci(p.inci); const t = l.filter((it) => it.fiche?.role === "active" && it.fiche.benefits?.length).map((it) => it.name + "@" + it.pos + "(p" + it.fiche.benefitPower + (it.fiche.lowDose ? ",ld" : "") + ")"); console.log("  ", p.name.slice(0, 50), "actifs:", t.join(", ")); }
}

sec("6. Friction 6 — listes courtes : qui sont les produits à < 6 ingrédients ?");
{
  const courts = C.filter((p) => base.parseInci(p.inci).length < 6);
  const BASE_RE = /^WATER$|OIL|SQUALANE|BUTTER|WAX|ALCOHOL|GLYCERIN|GLYCOL|SILICONE|DIMETHICONE|TRIGLYCERIDE|WATER$|SPRING WATER|THERMAL|GLUCOSIDE|BETAINE|SULFATE|ISETHIONATE|EXTRACT|JUICE|HYALURON|NIACINAMIDE|ACID$/;
  let legit = 0; const ex = [];
  for (const p of courts) { const l = base.parseInci(p.inci); const tousConnus = l.every((it) => it.fiche); const baseEnTete = l.length && BASE_RE.test(l[0].name); if (tousConnus && baseEnTete && l.length <= 3) { legit++; if (ex.length < 8) ex.push(p.name.slice(0, 45) + " | " + l.map((x) => x.name).join(", ")); } }
  console.log({ produitsMoinsDe6: courts.length, dontSimplesLegitimes_1a3_connus_baseEnTete: legit }); console.log(ex);
  const tronques = courts.filter((p) => { const l = base.parseInci(p.inci); return l.length >= 4 && !BASE_RE.test(l[0]?.name || "") ; }); console.log("4-5 ingrédients SANS base en tête (tronqués probables) :", tronques.length, tronques.slice(0, 4).map((p) => p.name.slice(0, 40) + " | " + p.inci.slice(0, 80)));
}

sec("7. Effet cumulé des règles que je retiens (formule) — distribution");
{
  const m = await moteur({ parfumUnique: true, tarifParfum: 8, comedoOut: true, sensiFort: true, actifStack: true, lowDoseTop5: true, capPerso: true, persoPlafonds: true, persoIrritant: true, forcePonderee: true });
  console.log("BASE :", JSON.stringify(stats(base, null).formule));
  console.log("CUMUL :", JSON.stringify(stats(m, null).formule));
  console.log("CUMUL perso secheReactive :", JSON.stringify(stats(m, secheReactive).perso), "| normaleAge :", JSON.stringify(stats(m, normaleAge).perso));
  const parCat = {}; for (const p of C) { const a = base.scoreFormule(p.inci, p.category, p.filtresUV).score, b = m.scoreFormule(p.inci, p.category, p.filtresUV).score; parCat[p.category] = parCat[p.category] || { n: 0, d: 0, vertA: 0, vertB: 0 }; const c = parCat[p.category]; c.n++; c.d += b - a; if (a >= 75) c.vertA++; if (b >= 75) c.vertB++; }
  for (const [c, v] of Object.entries(parCat)) console.log(`  ${c.padEnd(15)} Δ moy ${(v.d / v.n).toFixed(1).padStart(5)}  vert ${(100 * v.vertA / v.n).toFixed(0)}% → ${(100 * v.vertB / v.n).toFixed(0)}%`);
}
