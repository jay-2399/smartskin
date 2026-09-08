import fs from "node:fs";
process.chdir("/Users/jayenbellili/dev/smartskin.app");
const m = await import("./scoring-sim.mjs");
const norm = (s) => String(s || "").replace(/\s*\d+(?:[.,]\d+)?\s*%/g, "").replace(/\bUSP\b/gi, "").replace(/\(\s*\)/g, "").replace(/\s+,/g, ",");
const RAW = JSON.parse(fs.readFileSync("data/scan/catalog.json", "utf8"));
const CAT = RAW.filter((p) => p.category !== "hors-perimetre" && p.inci && p.inci.length > 20).map((p) => ({ ...p, inci: norm(p.inci) }));
const CATS = ["cleanser", "makeup-remover", "toner", "exfoliant", "serum", "treatment", "moisturizer", "eye-cream", "sunscreen", "mask"];
const q = (arr, p) => { const a = [...arr].sort((x, y) => x - y); if (!a.length) return NaN; const i = (a.length - 1) * p, lo = Math.floor(i), hi = Math.ceil(i); return a[lo] + (a[hi] - a[lo]) * (i - lo); };
const mean = (a) => a.reduce((s, x) => s + x, 0) / (a.length || 1);
const r1 = (x) => Math.round(x * 10) / 10;
const pct = (n, d) => Math.round(1000 * n / (d || 1)) / 10;
const tableau = (lignes, cols) => { const w = cols.map((c, i) => Math.max(c.length, ...lignes.map((l) => String(l[i]).length))); const f = (l) => "| " + l.map((v, i) => String(v).padEnd(w[i])).join(" | ") + " |"; return [f(cols), "|" + w.map((x) => "-".repeat(x + 2)).join("|") + "|", ...lignes.map(f)].join("\n"); };
const profil = (o = {}) => ({ skinType: "normal", sensitivity: 0, concerns: {}, strengthCeiling: 2, pregnancy: false, allergies: [], besoinSolaire: 0, libelles: {}, ...o });
const PR = {
  sens3: profil({ sensitivity: 3, concerns: { redness: 2 }, strengthCeiling: 1 }),
  secheReactive: profil({ skinType: "dry", sensitivity: 3, concerns: { dehydration: 3, redness: 2, barrier: 2 }, strengthCeiling: 0 }),
  grasseAcne: profil({ skinType: "oily", concerns: { blemishes: 3, oiliness: 2 }, strengthCeiling: 3, besoinSolaire: 2 }),
  normaleAge: profil({ sensitivity: 1, concerns: { aging: 3, spots: 2 }, besoinSolaire: 1 }),
  grasseRides: profil({ skinType: "oily", concerns: { aging: 3 }, strengthCeiling: 3 }),
  rougeurs: profil({ sensitivity: 2, concerns: { redness: 3 }, strengthCeiling: 1 }),
};
// ── état de référence ──
const G0 = structuredClone(m.CONFIG.RUBRIQUES);
const S0 = { seuilRiche: m.CONFIG.seuilRiche, seuilLegere: m.CONFIG.seuilLegere };
const D = m.dict(); const DB = new Map(); const DNEW = new Set();
const setFiche = (nom, patch) => { let f = D[nom]; if (!f) { f = D[nom] = { role: "support", benefits: [], benefitPower: 0, risks: { irritant: 0, comedogenic: 0, sensibilisant: 0 }, strength: 0, essentialOil: false, fragrance: false, fonctions: [] }; DNEW.add(nom); } else if (!DB.has(nom)) DB.set(nom, structuredClone(f)); const r = { ...f.risks, ...(patch.risks || {}) }; Object.assign(f, patch); f.risks = r; };
const addFn = (nom, ...fns) => setFiche(nom, { fonctions: [...new Set([...(D[nom]?.fonctions || []), ...fns])] });
function reset() { m.resetSim(); m.CONFIG.RUBRIQUES = structuredClone(G0); Object.assign(m.CONFIG, S0); for (const [k, v] of DB) { for (const key of Object.keys(D[k])) delete D[k][key]; Object.assign(D[k], structuredClone(v)); } for (const k of DNEW) delete D[k]; DNEW.clear(); }
// ── briques ──
const B = {
  S1: () => { m.SIM.parfumUneFois = true; },
  DEDUP: () => { m.SIM.dedup = true; },
  ACTW: () => { m.SIM.actifsW = true; },
  GRAD: () => { m.SIM.top5Gradue = true; },
  LD10: () => { m.SIM.ld10 = true; },
  POND: () => { for (const R of Object.values(m.CONFIG.RUBRIQUES)) for (const l of R.merites) if (["antiox", "lipides"].includes(l.id)) l.pondere = true; },
  D4: () => { m.SIM.d4 = true; },
  D7: () => { m.SIM.d7 = true; },
  S3: () => { m.SIM.capPerso = true; },
  D3: () => { for (const n of ["BENZYL ALCOHOL", "PHENETHYL ALCOHOL", "4-T-BUTYLCYCLOHEXANOL", "PHENYLPROPANOL", "BENZOIC ACID"]) if (D[n]) setFiche(n, { fragrance: false, euFragranceAllergen: true }); },
  ALIAS: () => { m.SIM.perfumeAlias = true; },
  UV: () => { for (const n of Object.keys(D)) if (/^ZINC OXIDE/.test(n) || /^BIS-ETHYLHEXYLOXYPHENOL|^METHYLENE BIS-BENZOTRIAZOLYL|^DROMETRIZOLE TRISILOXANE/.test(n)) addFn(n, "filtre-uva", "filtre-uvb");
    addFn("OCTISALATE", "filtre-uvb"); addFn("DIETHYLAMINO HYDROXYBENZOYL HEXYL BENZOATE", "filtre-uva"); addFn("DIETHYLHEXYL BUTAMIDO TRIAZONE", "filtre-uvb"); addFn("TRIS-BIPHENYL TRIAZINE", "filtre-uvb"); addFn("ZINC OXIDE (NANO)", "filtre-uva", "filtre-uvb"); addFn("TITANIUM DIOXIDE (NANO)", "filtre-uvb"); addFn("TITANIUM DIOXIDE (CI 77891)", "filtre-uvb"); addFn("METHYLENE BIS-BENZOTRIAZOLYL TETRAMETHYLBUTYLPHENOL (NANO)", "filtre-uva", "filtre-uvb");
    m.SIM.uvData = true; m.CONFIG.RUBRIQUES.sunscreen.merites.find((l) => l.id === "actifs").plafond = 4; },
  DICO: () => { setFiche("PROPYLENE GLYCOL", { risks: { irritant: 1, sensibilisant: 2 } }); setFiche("TRICLOSAN", { risks: { irritant: 1 } }); setFiche("ADAPALENE", { lowDose: true }); setFiche("MENTHOL", { strength: 0, lowDose: true });
    if (D["NIACINAMIDE"]) setFiche("NIACINAMIDE", { benefits: ["blemishes", "oiliness", "aging", "spots", "redness", "barrier"] }); if (D["AZELAIC ACID"]) setFiche("AZELAIC ACID", { benefits: [...new Set([...(D["AZELAIC ACID"].benefits || []), "redness"])] });
    for (const n of ["LECITHIN", "HYDROGENATED LECITHIN", "DILINOLEIC ACID/BUTANEDIOL COPOLYMER"]) if (D[n]) setFiche(n, { fonctions: [...(D[n].fonctions || []).filter((f) => f !== "lipide-barriere"), "emollient"] });
    for (const n of Object.keys(D)) if (/^GLYCERIN \(VEGETABLE/.test(n)) setFiche(n, { benefitPower: 2, benefits: ["dehydration"] });
    for (const n of Object.keys(D)) if (/HAMAMELIS|WITCH HAZEL/.test(n)) setFiche(n, { benefitPower: 1, risks: { irritant: 1 } });
    for (const n of ["1,3-PROPANEDIOL", "1,2-HEPTANEDIOL"]) if (D[n]) setFiche(n, { role: "support", fonctions: [...new Set([...(D[n].fonctions || []), "humectant"])] });
    for (const n of Object.keys(D)) if (/HYALURON/.test(n) && D[n].role === "active") setFiche(n, { lowDose: true });
    for (const n of Object.keys(D)) if (D[n].banniUE) setFiche(n, { banniUEPortee: /METHYLISOTHIAZOLINONE/.test(n) ? "pose" : "tous" }); if (D["ETANORULAYH MUIDOS"]) setFiche("ETANORULAYH MUIDOS", { role: "support", benefits: [], benefitPower: 0 }); },
  P4: () => { m.CONFIG.RUBRIQUES.cleanser.prerequis[0].quoi = "@douceur"; for (const n of ["PEG-6 CAPRYLIC/CAPRIC GLYCERIDES", "POLOXAMER 184", "POLOXAMER 188", "PEG-40 HYDROGENATED CASTOR OIL", "SODIUM LAUROYL LACTYLATE", "POLYSORBATE 20", "DISODIUM COCOAMPHODIACETATE"]) addFn(n, "tensioactif-doux"); },
  P5: () => { m.CONFIG.RUBRIQUES["makeup-remover"].prerequis[0].quoi = ["emollient", "occlusif", "tensioactif-doux", "emulsifiant"]; },
  D10P: () => { m.SIM.d10 = true; },   // perso × exposition seulement
  D10M: () => { for (const R of Object.values(m.CONFIG.RUBRIQUES)) { const l = R.merites.find((x) => x.id === "sansParfum"); if (l && (R.exposition ?? 1) < 1) l.pts = +(l.pts * R.exposition).toFixed(1); } },   // mérite × exposition (grilles rincées)
  D8: () => { m.SIM.d8Dermato = true; m.SIM.sensi3Formule = true; },
  FORCE: () => { m.SIM.forceFusion = true; },
  TEXT: () => { m.SIM.texture = true; m.SIM.d9 = true; m.CONFIG.seuilRiche = 4; m.CONFIG.seuilLegere = 1.5; },
  MASK5: () => { m.CONFIG.RUBRIQUES.mask.prerequis[0].pts = 5; },
  HUMLD: () => { m.SIM.humLowDose = true; },
  BASE: () => {},
};
const CONSENSUS = ["S1", "DEDUP", "ACTW", "GRAD", "POND", "D4", "D7", "S3", "D3", "ALIAS", "UV", "DICO", "P4", "P5", "D10P", "D8", "FORCE", "TEXT", "HUMLD"];
const KNOBS_DEFAUT = { s5Mode: "half", prereqMode: "d6d", comedoMode: "produit", banMode: 45, matchScale: false };
const apply = (briques, knobs = {}) => { reset(); for (const b of briques) B[b](); Object.assign(m.SIM, KNOBS_DEFAUT, knobs); };
// ── calcul ──
const SF = (p) => m.scoreFormule(p.inci, p.category, p.filtresUV);
const SP = (p, P, f) => m.scorePerso(p.inci, P, p.category, f ?? SF(p), p.filtresUV);
const find = (re, cat, extra) => CAT.find((p) => re.test(p.name) && (!cat || (Array.isArray(cat) ? cat.includes(p.category) : p.category === cat)) && (!extra || extra(p)));
const fict = (name, category, inci, filtresUV = false) => ({ name, category, inci, filtresUV, fictif: true });
const ET = {
  "CeraVe Hydrating Cleanser": find(/^CeraVe Hydrating Facial Cleanser/, "cleanser"),
  "Toleriane Purifying Foaming": find(/Toleriane Purifying Foaming/, "cleanser"),
  "Toleriane Milky Cleanser": find(/Toleriane.*Milky/i, "cleanser"),
  "Cetaphil Gentle Skin Cleanser": find(/^Cetaphil Gentle Skin Cleanser/, "cleanser"),
  "Cetaphil Cleansing Milk": find(/Cetaphil.*Cleansing Milk/i, "cleanser"),
  "Aveeno Calm+Restore": find(/Aveeno Calm\+? ?Restore/i, "cleanser"),
  "Avène Tolerance Foaming": find(/Av[eè]ne.*Tol[eé]rance.*(Foaming|Cleansing)/i, "cleanser"),
  "Nivea Men Face Wash": find(/Nivea Men.*Face Wash/i, "cleanser"),
  "Urban Hydration savon (bar soap)": find(/Urban Hydration.*Bar Soap/i, "cleanser"),
  "Oak Essentials Gel Cleanser": find(/Oak Essentials Pure Gel/i, "cleanser"),
  "Clinique For Men Face Scrub": find(/Clinique For Men.*Scrub/i),
  "Clinique Charcoal Face Wash": find(/Clinique.*Charcoal.*Wash/i),
  "Sensibio H2O": find(/Sensibio H2O/, "makeup-remover"),
  "Toleriane Eau Micellaire (fiche FR)": find(/Toleriane Eau Micellaire/i, "makeup-remover"),
  "Toleriane Micellar Cleansing Water (fiche US)": find(/Toleriane Micellar Cleansing Water/i, "makeup-remover"),
  "Dermalogica Precleanse": find(/Dermalogica Precleanse/i, "makeup-remover"),
  "Toleriane Double Repair": find(/Toleriane Double Repair/, "moisturizer"),
  "Toleriane Dermallergo": find(/Toleriane Dermallergo/, "moisturizer"),
  "Toleriane Sensitive Riche": find(/Toleriane.*Riche/i, "moisturizer"),
  "Cicalfate+ crème": find(/Cicalfate/i, "moisturizer"),
  "Cicalfate+ sérum": find(/Cicalfate/i, "serum"),
  "Vanicream Moisturizing Cream": find(/^Vanicream Moisturizing Cream/, "moisturizer"),
  "Vanicream Enhanced": find(/Vanicream.*Enhanced/i, "moisturizer"),
  "Weleda Skin Food US (fiche propre, 4 allergènes)": find(/Weleda Skin Food/, "moisturizer", (p) => /parfum|fragrance/i.test(p.inci) && !/Travel|Clear 40/i.test(p.name) && !/(^|, )1(,|$)/.test(p.inci)),
  "Weleda Skin Food FR (sans parfum)": find(/Weleda Skin Food/, "moisturizer", (p) => !/parfum|fragrance/i.test(p.inci)),
  "Hydro Boost Water Gel": find(/Hydro Boost Water Gel/i, "moisturizer"),
  "Mixa Soin Nourrissant": find(/Mixa.*Nourrissant/i),
  "SimplyVital": find(/SimplyVital/i),
  "Kiehl's Ultra Facial Cream": find(/Kiehl's Ultra Facial Cream/i, "moisturizer"),
  "CeraVe PM": find(/CeraVe PM/i, "moisturizer"),
  "CeraVe Moisturizing Cream": find(/^CeraVe Moisturizing Cream/, "moisturizer"),
  "PC 2 % BHA Liquid": find(/Paula's Choice.*2% BHA Liquid/i),
  "TO AHA 30 % + BHA 2 %": find(/Ordinary.*AHA 30/i),
  "PC 25 % AHA peel": find(/Paula's Choice.*25% AHA/i),
  "Dr Dennis Gross Extra Strength": find(/Dennis Gross.*Extra Strength/i),
  "RoC 2-step peel": find(/RoC.*Peel/i),
  "LRP Effaclar Adapalene 0,1 %": find(/Effaclar Adapalene/, "treatment", (p) => /La Roche/i.test(p.brand + p.name)),
  "Differin / Evenly Clear (adapalène lisible)": find(/Adapalene/i, "treatment", (p) => !/La Roche|Effaclar/i.test(p.brand + p.name)),
  "Effaclar Duo+M": find(/Effaclar Duo/i, "treatment"),
  "Effaclar BPO": find(/Effaclar.*(BPO|Benzoyl)/i, "treatment"),
  "Effaclar patchs": find(/Effaclar.*Patch/i),
  "Effaclar toner astringent": find(/Effaclar.*(Astringent|Micro-Exfoliating)/i, "toner"),
  "Effaclar Clarifying Solution": find(/Effaclar Clarifying/i, "toner"),
  "Thayers Witch Hazel": find(/THAYERS.*Witch Hazel/i, "toner"),
  "Serozinc": find(/Serozinc/i),
  "Avène Eau Thermale": find(/Av[eè]ne.*(Thermal Spring Water|Eau Thermale)/i, ["toner", "indetermine", "treatment", "mask"]),
  "TO Niacinamide 10 %": find(/Ordinary.*Niacinamide 10/, "serum"),
  "Vichy Minéral 89": find(/Min[eé]ral 89/i, "serum"),
  "Drunk Elephant B-Hydra": find(/Drunk Elephant.*B-Hydra/i),
  "Drunk Elephant A-Gloei": find(/Drunk Elephant.*A-Gloei/i),
  "Estée Lauder ANR": find(/Advanced Night Repair/i, "serum"),
  "SKIN1004 Centella Ampoule (7 ingrédients)": find(/SKIN1004.*Centella.*Ampoule/i, "serum", (p) => m.parseInci(p.inci).length <= 10),
  "SKIN1004 Tea-Trica Relief Ampoule": find(/SKIN1004.*Tea-Trica/i, "serum"),
  "Dermalogica Retinol Serum": find(/Dermalogica Dynamic Skin Retinol/, "serum"),
  "PC 1 % Retinol": find(/Paula's Choice.*1% Retinol/i),
  "ANUA Niacinamide TXA": find(/ANUA Niacinamide 10/i, "serum"),
  "Bubble Day Dream": find(/Bubble Day Dream/i, "serum"),
  "VT PDRN Glow Ampoule": find(/VT Cosmetics PDRN Glow/i, "serum"),
  "PC Resist Pure Radiance": find(/Resist Pure Radiance/i, "serum"),
  "TO Caffeine 5 %": find(/Ordinary Caffeine/, "eye-cream"),
  "TO 100 % Plant-Derived Squalane (n = 1)": find(/Ordinary.*Squalane/i, null, (p) => m.parseInci(p.inci).length <= 2),
  "TO Squalane Cleanser": find(/Ordinary.*Squalane Cleanser/i),
  "Anthelios UV Hydra": find(/Anthelios UV Hydra/, "sunscreen"),
  "Anthelios Mineral Tinted": find(/Anthelios Mineral Tinted/i, "sunscreen"),
  "Anthelios Melt-in Milk": find(/Anthelios Melt-in/i, "sunscreen"),
  "Vanicream Mineral SPF 30": find(/Vanicream.*(SPF|Sunscreen)/i),
  "Cetaphil Sheer Mineral": find(/Cetaphil Sheer Mineral/i),
  "Avène Mineral SPF 50": find(/Av[eè]ne.*Mineral.*(SPF|Sunscreen)/i, "sunscreen"),
  "Neutrogena Hydro Boost HA Moisturizer SPF 50": find(/Hydro Boost.*Moisturizer.*SPF/i),
  "Neutrogena Hydro Boost Water Gel Lotion SPF 50": find(/Hydro Boost.*Water Gel.*SPF|Hydro Boost.*Lotion.*SPF/i),
  // fictifs
  "[F] peel sans tampon": fict("peel sans tampon", "exfoliant", "Water, Glycolic Acid, Lactic Acid, Salicylic Acid, Sodium Hydroxide, Phenoxyethanol"),
  "[F] peel avec tampon": fict("peel avec tampon", "exfoliant", "Water, Glycolic Acid, Glycerin, Panthenol, Lactic Acid, Sodium Hyaluronate, Salicylic Acid, Sodium Hydroxide, Ceramide NP, Phenoxyethanol"),
  "[F] sérum rétinol pos 8": fict("sérum rétinol pos 8", "serum", "Water, Glycerin, Propanediol, Squalane, Caprylic/Capric Triglyceride, Dimethicone, Cetearyl Alcohol, Retinol, Tocopherol, Phenoxyethanol, Xanthan Gum"),
  "[F] eau + glycérine + gomme": fict("eau glycérine gomme", "serum", "Water, Glycerin, Xanthan Gum, Phenoxyethanol"),
  "[F] gel nettoyant parfumé": fict("gel nettoyant parfumé", "cleanser", "Water, Sodium Laureth Sulfate, Cocamidopropyl Betaine, Glycerin, Sodium Chloride, Parfum, Linalool, Limonene, Phenoxyethanol"),
  "[F] crème + Parfum": fict("crème parfum", "moisturizer", "Water, Glycerin, Caprylic/Capric Triglyceride, Niacinamide, Cetearyl Alcohol, Glyceryl Stearate, Ceramide NP, Panthenol, Sodium Hyaluronate, Tocopherol, Parfum, Phenoxyethanol, Xanthan Gum"),
  "[F] crème + Parfum + 6 allergènes": fict("crème parfum allergènes", "moisturizer", "Water, Glycerin, Caprylic/Capric Triglyceride, Niacinamide, Cetearyl Alcohol, Glyceryl Stearate, Ceramide NP, Panthenol, Sodium Hyaluronate, Tocopherol, Parfum, Linalool, Limonene, Citronellol, Geraniol, Coumarin, Citral, Phenoxyethanol, Xanthan Gum"),
  "[F] sérum peptides (sans rétinol)": fict("peptides", "serum", "Water, Glycerin, Propanediol, Palmitoyl Tripeptide-1, Palmitoyl Tetrapeptide-7, Sodium Hyaluronate, Panthenol, Phenoxyethanol, Xanthan Gum"),
  "[F] sérum eau thermale de marque + glycérine": fict("eau thermale", "serum", "Avene Thermal Spring Water (Avene Aqua), Glycerin, Xanthan Gum, Phenoxyethanol"),
  "[F] crème Ceramide NP seul": fict("ceramide 1", "moisturizer", "Water, Glycerin, Caprylic/Capric Triglyceride, Cetearyl Alcohol, Ceramide NP, Cholesterol, Panthenol, Phenoxyethanol"),
  "[F] crème Ceramide NP + Ceramide 3 (synonymes)": fict("ceramide 2", "moisturizer", "Water, Glycerin, Caprylic/Capric Triglyceride, Cetearyl Alcohol, Ceramide NP, Ceramide 3, Cholesterol, Panthenol, Phenoxyethanol"),
  "[F] sérum peptides + Retinol en queue": fict("peptides + retinol", "serum", "Water, Glycerin, Propanediol, Palmitoyl Tripeptide-1, Palmitoyl Tetrapeptide-7, Sodium Hyaluronate, Panthenol, Phenoxyethanol, Xanthan Gum, Retinol"),
};
const manquants = Object.entries(ET).filter(([k, p]) => !p).map(([k]) => k);
if (manquants.length) console.log("  (étalons introuvables : " + manquants.join(" ; ") + ")");
const et = (re) => Object.entries(ET).filter(([k, p]) => p && re.test(k));
const global = (L = CAT) => { const s = L.map((p) => SF(p).score); return { moy: r1(mean(s)), med: q(s, .5), vert: pct(s.filter((v) => v >= 75).length, s.length), rouge: pct(s.filter((v) => v < 45).length, s.length), max: Math.max(...s) }; };
const persoStats = (P, L = CAT) => { const d = L.map((p) => { const f = SF(p); const s = SP(p, P, f).score; return { s, d: s - f.score }; }); return { dmoy: r1(mean(d.map((x) => x.d))), p10: q(d.map((x) => x.d), .1), vert: pct(d.filter((x) => x.s >= 75).length, d.length), rouge: pct(d.filter((x) => x.s < 45).length, d.length), cinq: pct(d.filter((x) => x.s <= 5).length, d.length) }; };
const medCat = (L = CAT) => CATS.map((c) => q(L.filter((p) => p.category === c).map((p) => SF(p).score), .5));
const section = process.argv[2];

if (section === "ARB1") {
  console.log("## ARBITRAGE 1 — irritance des actifs prouvés : S5 plein / demi-tarif / « premier gratuit »\n");
  const rows = [], rowsG = [];
  const noms = /TO AHA|PC 25|Dennis Gross|PC 2 % BHA|rétinol pos 8|Effaclar Clarifying|peel sans|peel avec|Dermalogica Retinol|RoC|Effaclar Adapalene|PC 1 % Retinol/;
  for (const [n, k] of Object.entries({ "aucune exemption": { s5Mode: false }, "S5 plein": { s5Mode: "full" }, "S5 demi-tarif": { s5Mode: "half" }, "premier gratuit, suivants pleins": { s5Mode: "first" } })) {
    apply(CONSENSUS, k);
    for (const [nom, p] of et(noms)) { const f = SF(p); rows.push([n, nom, p.category, f.score, SP(p, PR.grasseAcne, f).score, SP(p, PR.sens3, f).score, f.details.filter((d) => d.type === "risque").map((d) => d.inci.slice(0, 12) + " " + d.pts).join(", ") || "-", f.details.find((d) => d.id === "tampon") ? "tampon +" + f.details.find((d) => d.id === "tampon").pts : "tampon 0"]); }
    const ser = CAT.filter((p) => p.category === "serum"); const dR = ser.map((p) => m.scoreFormule(p.inci + ", Retinol", "serum", p.filtresUV).score - SF(p).score);
    const ex = CAT.filter((p) => p.category === "exfoliant").map((p) => SF(p).score);
    const empil = CAT.filter((p) => { const l = m.parseInci(p.inci); const b = (() => { for (const it of l) if (m.CONFIG.marqueurs1pct.includes(it.name)) return it.pos; return Infinity; })(); return l.filter((it) => it.fiche?.role === "active" && (it.fiche.risks?.irritant || 0) === 2 && (it.fiche.benefitPower || 0) >= 2 && (it.fiche.lowDose || (it.pos <= 10 && it.pos < b))).length >= 2; });
    const g = global();
    rowsG.push([n, g.moy, g.vert, g.rouge, r1(mean(dR)), pct(dR.filter((x) => x < 0).length, dR.length), q(ex, .5), pct(ex.filter((v) => v >= 75).length, ex.length), empil.length, r1(mean(empil.map((p) => SF(p).score))), pct(empil.filter((p) => SF(p).score >= 75).length, empil.length)]);
  }
  console.log(tableau(rowsG, ["variante", "moy", "%vert", "%rouge", "+Retinol Δ sérums", "% baisses", "exfoliants méd", "%vert exfo", "produits ≥2 actifs irritants dosés", "leur moy", "leur %vert"]));
  console.log("\nétalons (formule | perso grasseAcne | perso sens3 | lignes risque | ligne tampon) :");
  console.log(tableau(rows, ["variante", "produit", "cat", "formule", "grasse", "sens3", "risques", "tampon"]));
}
if (section === "ARB2") {
  console.log("## ARBITRAGE 2 — prérequis actifs : « power 3 en top 5 ou lowDose » vs D6d « power ≥ 2 dosé hors glycols OU humectant actif »\n");
  const rows = [], rowsG = [];
  const noms = /TO Niacinamide|Vichy|B-Hydra|Estée|SKIN1004|eau \+ glycérine|Effaclar Adapalene|Cicalfate\+ sérum|ANUA|VT PDRN|PC Resist/;
  for (const [n, k] of Object.entries({ "actuel (3 actifs, toute position)": { prereqMode: false, actifsW: false }, "MONO : 3 dosés OU power 3 top5/lowDose": { prereqMode: "mono" }, "D6d : power ≥ 2 dosé hors glycols OU humectant actif": { prereqMode: "d6d" }, "D6d + masques prérequis 10 → 5": { prereqMode: "d6d", _mask: true } })) {
    apply(CONSENSUS, k); if (k._mask) B.MASK5(); if (k.actifsW === false) m.SIM.actifsW = false;
    for (const [nom, p] of et(noms)) { const f = SF(p); rows.push([n.split(" ")[0], nom, f.score, f.details.find((d) => d.type === "manque" && d.id === "actifs") ? "ÉCHEC" : "ok", SP(p, PR.grasseAcne, f).score, SP(p, PR.normaleAge, f).score]); }
    const st = (c) => { const L = CAT.filter((p) => p.category === c).map((p) => SF(p)); return [q(L.map((f) => f.score), .5), pct(L.filter((f) => f.score >= 75).length, L.length), pct(L.filter((f) => f.details.some((d) => d.type === "manque" && d.id === "actifs")).length, L.length)]; };
    rowsG.push([n, ...st("serum"), ...st("treatment"), ...st("mask"), global().vert]);
  }
  console.log(tableau(rowsG, ["variante", "sérum méd", "%vert", "%échec", "traitement méd", "%vert", "%échec", "masque méd", "%vert", "%échec", "%vert global"]));
  console.log("\nétalons (formule | prérequis | perso grasseAcne | perso normaleAge) :");
  console.log(tableau(rows, ["variante", "produit", "formule", "prérequis", "grasse", "âge"]));
}
if (section === "ARB3") {
  console.log("## ARBITRAGE 3 — « non évaluable » : règle B (stat) / produit / dermato / fusion\n");
  apply(CONSENSUS);
  const BASE1 = /WATER|AQUA|OIL|BUTTER|WAX|ALCOHOL|GLYCERIN|GLYCOL|DIMETHICONE|SILOXANE|SILICONE|SQUALANE|ALKANE|ISODODECANE|PETROLATUM|PARAFFIN|HYPOCHLOROUS|SULFATE|GLUCOSIDE|BETAINE|SARCOSINATE|ISETHIONATE|TAURATE|GLUTAMATE|LACTYLATE|SULFOSUCCINATE|KAOLIN|BENTONITE|CLAY|SILICA|STARCH|TALC|ZINC OXIDE|TITANIUM DIOXIDE|CERA |TRIGLYCERIDE|HYDROGENATED|BENZOYL PEROXIDE|SALICYLIC ACID|ADAPALENE|AVOBENZONE|HOMOSALATE|OCTOCRYLENE|OCTINOXATE|OCTISALATE|SULFUR|LANOLIN|JUICE|FILTRATE|FERMENT|HAMAMELIS|ROSA |CENTELLA|ALOE|PROPANEDIOL|HEXANEDIOL|CHAMOMILLA|SNAIL|EXTRACT/;
  const FILTRE_NOM = /OXIDE|AVOBENZONE|METHOXYDIBENZOYLMETHANE|HOMOSALATE|OCTOCRYLENE|OCTINOXATE|OCTISALATE|ETHYLHEXYL SALICYLATE|ETHYLHEXYL METHOXYCINNAMATE|ETHYLHEXYL TRIAZONE|BENZOPHENONE|OXYBENZONE|PHENYLBENZIMIDAZOLE|ENSULIZOLE|TEREPHTHALYLIDENE|DROMETRIZOLE|BIS-ETHYLHEXYLOXYPHENOL|METHYLENE BIS-BENZOTRIAZOLYL|DIETHYLAMINO HYDROXYBENZOYL|DIETHYLHEXYL BUTAMIDO|TRIS-BIPHENYL|POLYSILICONE-15|ISOAMYL P-METHOXYCINNAMATE|METHYL ANTHRANILATE|BUTYL METHOXY|4-METHYLBENZYLIDENE|PADIMATE/;
  const info = (p) => { const l = m.parseInci(p.inci); const n = l.length; const connus = l.filter((it) => it.fiche).length / (n || 1); const f = SF(p); const base = n ? BASE1.test(l[0].name) : false; const solaireSans = p.category === "sunscreen" && !l.some((it) => (it.fiche?.fonctions || []).some((x) => x.startsWith("filtre"))) && !(p.filtresUV && false); const solaireSansNom = p.category === "sunscreen" && !l.some((it) => FILTRE_NOM.test(it.name)); return { n, connus, couv: f.couverture, base, solaireSans, solaireSansNom, score: f.score }; };
  const regles = {
    "B (stat) : n<8 ∨ couv<0,7 ∨ solaire sans nom de filtre": (i) => i.n < 8 || i.couv < 0.7 || i.solaireSansNom,
    "produit : solaire sans filtre ∨ (n<6 ∧ inconnu) ∨ (n<6 ∧ pas de base pos1)": (i) => i.solaireSans || (i.n < 6 && i.connus < 1) || (i.n < 6 && !i.base),
    "dermato : n≤3 inconnu ∨ (4-5 sauf base+100 %) ∨ solaire sans filtre": (i) => i.solaireSans || (i.n <= 3 && i.connus < 1) || (i.n >= 4 && i.n <= 5 && !(i.base && i.connus >= 1)),
    "fusion : solaire sans filtre ∨ (n≤5 ∧ (inconnu ∨ pas de base pos1))": (i) => i.solaireSans || (i.n <= 5 && (i.connus < 1 || !i.base)),
  };
  const infos = CAT.map((p) => ({ p, i: info(p) }));
  const rows = [];
  for (const [n, f] of Object.entries(regles)) { const h = infos.filter((x) => f(x.i)); const etEx = Object.entries(ET).filter(([k, p]) => p && !p.fictif && f(info(p))).map(([k, p]) => k + " (" + info(p).score + ")"); rows.push([n, h.length, pct(h.length, CAT.length), r1(mean(h.map((x) => x.i.score))), h.filter((x) => x.i.score >= 75).length, etEx.length, etEx.join(" ; ") || "-"]); }
  console.log(tableau(rows, ["règle", "hors note", "%", "moy actuelle", "verts", "étalons exclus", "lesquels"]));
  console.log("\n  solaires : sans filtre reconnu (après données UV) :", infos.filter((x) => x.i.solaireSans).length, "; sans aucun nom de filtre :", infos.filter((x) => x.i.solaireSansNom).length, "; n ≤ 3 :", infos.filter((x) => x.i.n <= 3).length, "dont 100 % connus", infos.filter((x) => x.i.n <= 3 && x.i.connus >= 1).length, "; 4-5 :", infos.filter((x) => x.i.n >= 4 && x.i.n <= 5).length, "dont base+100 %", infos.filter((x) => x.i.n >= 4 && x.i.n <= 5 && x.i.base && x.i.connus >= 1).length, "; n ≥ 6 sans base en pos 1 :", infos.filter((x) => x.i.n >= 6 && !x.i.base).length);
  console.log("  n ≥ 6 sans base en pos 1, exemples :", infos.filter((x) => x.i.n >= 6 && !x.i.base).slice(0, 8).map((x) => x.p.name.slice(0, 30) + " [" + m.parseInci(x.p.inci)[0].name + "]").join(" ; "));
  console.log("  minimalistes (n ≤ 3, 100 % connus, base) :", infos.filter((x) => x.i.n <= 3 && x.i.connus >= 1 && x.i.base).map((x) => x.p.name.slice(0, 30) + " " + x.i.score).slice(0, 12).join(" ; "));
}
if (section === "ARB4") {
  console.log("## ARBITRAGE 4 — comédogène côté perso : actuel / dermato (préoccupation seule, ≥4) / produit (aussi peau grasse, 3 en top 5)\n");
  const rows = [], rowsG = [];
  const noms = /Mixa|SimplyVital|Effaclar Duo|CeraVe Moisturizing|Kiehl|Toleriane Double|Cicalfate\+ crème|Hydro Boost Water/;
  for (const [n, k] of Object.entries({ "actuel (≥3, peau grasse, sans plafond)": { comedoMode: false }, "dermato (≥4, préoccupation seule, plafond −6)": { comedoMode: "dermato" }, "produit (≥4 ou 3 en top 5, peau grasse OU préoccupation, plafond −6)": { comedoMode: "produit" } })) {
    apply(CONSENSUS, k);
    for (const [nom, p] of et(noms)) { const f = SF(p); rows.push([n.split(" ")[0], nom, f.score, SP(p, PR.grasseAcne, f).score, SP(p, PR.grasseRides, f).score, SP(p, PR.secheReactive, f).score, SP(p, PR.grasseRides, f).facts.filter((x) => /pore-clogging/.test(x.label)).map((x) => x.inci.slice(0, 14) + " " + x.points).join(", ") || "-"]); }
    const a = persoStats(PR.grasseAcne), b = persoStats(PR.grasseRides);
    const touch = CAT.filter((p) => SP(p, PR.grasseRides).facts.some((x) => /pore-clogging/.test(x.label))).length;
    rowsG.push([n, a.dmoy, a.vert, b.dmoy, b.vert, touch]);
  }
  console.log(tableau(rowsG, ["variante", "grasseAcne Δ", "%vert", "grasseRides Δ", "%vert", "produits avec ligne comédogène (grasseRides)"]));
  console.log("\nétalons (formule | grasseAcne | grasseRides | sècheR | lignes comédogène grasseRides) :");
  console.log(tableau(rows, ["variante", "produit", "formule", "grasseAcne", "grasseRides", "sècheR", "lignes"]));
}
if (section === "ARB5") {
  console.log("## ARBITRAGE 5 — banniUE : plafond 45 vs 69 (portée posé ; rincé = malus −5 × exposition)\n");
  const ban = CAT.filter((p) => m.parseInci(p.inci).some((it) => it.fiche?.banniUE));
  const rows = [];
  for (const p of ban) { const l = m.parseInci(p.inci); const ing = l.filter((it) => it.fiche?.banniUE).map((it) => it.name.slice(0, 22) + "@" + it.pos).join(",");
    apply(CONSENSUS, { banMode: false }); const s0 = SF(p).score; apply(CONSENSUS, { banMode: 45 }); const s45 = SF(p).score; apply(CONSENSUS, { banMode: 69 }); const s69 = SF(p).score;
    rows.push([p.name.slice(0, 42), p.category, (m.CONFIG.RUBRIQUES[p.category]?.exposition ?? 1) < 1 ? "rincé" : "posé", ing, s0, s45, s69]); }
  console.log(tableau(rows, ["produit", "cat", "exposition", "ingrédient banni", "sans plafond", "cap 45", "cap 69"]));
  const pose = ban.filter((p) => (m.CONFIG.RUBRIQUES[p.category]?.exposition ?? 1) >= 1);
  apply(CONSENSUS, { banMode: false }); const s = pose.map((p) => SF(p).score);
  console.log("\n  produits bannis posés :", pose.length, "; sans plafond : ≥ 75 →", s.filter((v) => v >= 75).length, "; 70-74 →", s.filter((v) => v >= 70 && v < 75).length, "; 46-69 →", s.filter((v) => v > 45 && v < 70).length, "; ≤ 45 →", s.filter((v) => v <= 45).length, "→ le niveau 45 vs 69 ne diffère que pour", s.filter((v) => v > 45).length, "produits");
}
if (section === "ARB6") {
  console.log("## ARBITRAGE 6 — exposition du parfum : perso seulement vs mérite (grilles rincées) + perso\n");
  const rows = [], rowsG = [];
  const noms = /Toleriane Purifying|CeraVe Hydrating|Sensibio|Cetaphil Gentle|gel nettoyant parfumé|Toleriane Milky|Nivea|Oak Essentials|crème \+ Parfum$/;
  for (const [n, b] of Object.entries({ "aucune exposition parfum": CONSENSUS.filter((x) => x !== "D10P"), "perso × exposition (D10P)": CONSENSUS, "mérite × exposition + perso (D10P + D10M)": [...CONSENSUS, "D10M"] })) {
    apply(b);
    for (const [nom, p] of et(noms)) { const f = SF(p); rows.push([n.split(" ")[0] + (n.includes("mérite") ? "+M" : ""), nom, f.score, SP(p, PR.sens3, f).score, SP(p, PR.secheReactive, f).score]); }
    const cl = CAT.filter((p) => p.category === "cleanser"); const sc = cl.map((p) => SF(p).score);
    const coutCl = mean(cl.filter((p) => SF(p).details.every((x) => x.type !== "complexe-parfumant")).map((p) => m.scoreFormule(p.inci + ", Parfum", "cleanser", p.filtresUV).score - SF(p).score));
    const cr = CAT.filter((p) => p.category === "moisturizer"); const coutCr = mean(cr.filter((p) => SF(p).details.every((x) => x.type !== "complexe-parfumant")).map((p) => m.scoreFormule(p.inci + ", Parfum", "moisturizer", p.filtresUV).score - SF(p).score));
    const ps = persoStats(PR.sens3, cl);
    rowsG.push([n, q(sc, .5), pct(sc.filter((v) => v >= 75).length, sc.length), r1(coutCl), r1(coutCr), ps.dmoy, ps.rouge, global().vert]);
  }
  console.log(tableau(rowsG, ["variante", "nettoyants méd", "%vert nettoyants", "coût parfum formule nettoyant", "coût parfum formule crème", "nettoyants perso sens3 Δ", "%rouge", "%vert global"]));
  console.log("\nétalons (formule | perso sens3 | perso sècheR) :");
  console.log(tableau(rows, ["variante", "produit", "formule", "sens3", "sècheR"]));
}
if (section === "ARB7") {
  console.log("## ARBITRAGE 7 — matchs perso × preuve : aucun / × power/3 / × (1+power)/4\n");
  const rows = [], rowsG = [];
  const noms = /Thayers|Avène Eau|Cicalfate\+ crème|Toleriane Dermallergo|TO Niacinamide|Vichy|Effaclar Duo|Estée/;
  for (const [n, k] of Object.entries({ "aucune échelle": { matchScale: false }, "× power/3": { matchScale: "p3" }, "× (1+power)/4": { matchScale: "p14" } })) {
    apply(CONSENSUS, k);
    for (const [nom, p] of et(noms)) { const f = SF(p); const s = SP(p, PR.rougeurs, f); rows.push([n, nom, f.score, s.score, SP(p, PR.normaleAge, f).score, SP(p, PR.grasseAcne, f).score, s.facts.filter((x) => /targets your/.test(x.label)).slice(0, 2).map((x) => x.inci.slice(0, 16) + " +" + x.points).join(", ") || "-"]); }
    const a = persoStats(PR.normaleAge), b = persoStats(PR.rougeurs), c = persoStats(PR.grasseAcne);
    rowsG.push([n, a.dmoy, a.vert, b.dmoy, b.vert, c.dmoy, c.vert, pct(CAT.filter((p) => SP(p, PR.normaleAge).score >= 100).length, CAT.length)]);
  }
  console.log(tableau(rowsG, ["variante", "normaleAge Δ", "%vert", "rougeurs Δ", "%vert", "grasseAcne Δ", "%vert", "% à 100 (âge)"]));
  console.log("\nétalons (formule | perso rougeurs | normaleAge | grasseAcne | 2 premiers matchs rougeurs) :");
  console.log(tableau(rows, ["variante", "produit", "formule", "rougeurs", "âge", "grasse", "matchs"]));
}
if (section === "FINAL") {
  const KN = JSON.parse(process.argv[3] || "{}");
  const EXTRA = (process.argv[4] || "").split(",").filter(Boolean);
  const gate = (p) => { const l = m.parseInci(p.inci); const n = l.length; const connus = l.filter((it) => it.fiche).length / (n || 1); const BASE1 = /WATER|AQUA|OIL|BUTTER|WAX|ALCOHOL|GLYCERIN|GLYCOL|DIMETHICONE|SILOXANE|SILICONE|SQUALANE|ALKANE|ISODODECANE|PETROLATUM|PARAFFIN|HYPOCHLOROUS|SULFATE|GLUCOSIDE|BETAINE|SARCOSINATE|ISETHIONATE|TAURATE|GLUTAMATE|LACTYLATE|SULFOSUCCINATE|KAOLIN|BENTONITE|CLAY|SILICA|STARCH|TALC|ZINC OXIDE|TITANIUM DIOXIDE|CERA |TRIGLYCERIDE|HYDROGENATED|BENZOYL PEROXIDE|SALICYLIC ACID|ADAPALENE|AVOBENZONE|HOMOSALATE|OCTOCRYLENE|OCTINOXATE|OCTISALATE|SULFUR|LANOLIN|JUICE|FILTRATE|FERMENT|HAMAMELIS|ROSA |CENTELLA|ALOE|PROPANEDIOL|HEXANEDIOL|CHAMOMILLA|SNAIL|EXTRACT/; const base = n ? BASE1.test(l[0].name) : false; const solaireSans = p.category === "sunscreen" && !l.some((it) => (it.fiche?.fonctions || []).some((x) => x.startsWith("filtre"))); return !(solaireSans || (n <= 5 && (connus < 1 || !base))); };
  console.log("## PAQUET FINAL — " + JSON.stringify(KN) + " + " + EXTRA.join(","));
  apply(["BASE"], { s5Mode: false, prereqMode: false, comedoMode: false, banMode: false, matchScale: false }); m.SIM.actifsW = false;
  const V0 = new Map(CAT.map((p) => [p, SF(p)])); const V0P = {}; for (const k of Object.keys(PR)) V0P[k] = new Map(CAT.map((p) => [p, SP(p, PR[k], V0.get(p)).score]));
  const V0E = new Map(Object.entries(ET).filter(([k, p]) => p).map(([k, p]) => [k, { f: SF(p).score, sr: SP(p, PR.secheReactive).score, ga: SP(p, PR.grasseAcne).score }]));
  if (EXTRA.includes("P9")) { for (const p of CAT) if (p.category !== "sunscreen" && p.filtresUV) { const l = m.parseInci(p.inci); const orga = l.some((it) => (it.fiche?.fonctions || []).some((x) => x.startsWith("filtre")) && !/ZINC OXIDE|TITANIUM DIOXIDE/.test(it.name) && it.pos <= 8); const nomSansMarque = String(p.name).replace(new RegExp(String(p.brand || "").replace(/[.*+?^${}()|[\]\\]/g, "\\if (!orga && !/SPF|FPS|\bUV\b|SUN/i.test(p.name)) p.filtresUV = false; } }"), "i"), ""); if (!orga && !/\b(SPF|FPS|UV|SUN)\b/i.test(nomSansMarque)) p.filtresUV = false; } }
  apply([...CONSENSUS, ...EXTRA.filter((x) => x !== "P9")], KN); const EV = CAT.filter(gate);
  const ok = gate; const exclus = CAT.filter((p) => !ok(p));
  console.log("\n  non évaluables :", exclus.length, "(" + pct(exclus.length, CAT.length) + "%) ; notés :", EV.length);
  const rows = [];
  const g0 = (() => { const s = CAT.map((p) => V0.get(p).score); return [r1(mean(s)), q(s, .5), pct(s.filter((v) => v >= 75).length, s.length), pct(s.filter((v) => v < 45).length, s.length), Math.max(...s)]; })();
  const g1 = global(EV);
  console.log("\n## F — distribution FORMULE");
  console.log(tableau([["V0 (2 916)", ...g0, ...CATS.map((c) => q(CAT.filter((p) => p.category === c).map((p) => V0.get(p).score), .5))], ["final (" + EV.length + " notés)", g1.moy, g1.med, g1.vert, g1.rouge, g1.max, ...medCat(EV)]], ["variante", "moy", "méd", "%vert", "%rouge", "max", ...CATS]));
  console.log("\n  % vert par famille V0 → final :", CATS.map((c) => { const a = CAT.filter((p) => p.category === c), b = EV.filter((p) => p.category === c); return c + " " + pct(a.filter((p) => V0.get(p).score >= 75).length, a.length) + "→" + pct(b.filter((p) => SF(p).score >= 75).length, b.length); }).join(" ; "));
  console.log("  % rouge par famille V0 → final :", CATS.map((c) => { const a = CAT.filter((p) => p.category === c), b = EV.filter((p) => p.category === c); return c + " " + pct(a.filter((p) => V0.get(p).score < 45).length, a.length) + "→" + pct(b.filter((p) => SF(p).score < 45).length, b.length); }).join(" ; "));
  const chg = EV.map((p) => ({ a: V0.get(p), b: SF(p) })); console.log("  changements de bande :", pct(chg.filter((x) => x.a.bande !== x.b.bande).length, chg.length), "% ; montent :", chg.filter((x) => x.b.score > x.a.score).length, "; descendent :", chg.filter((x) => x.b.score < x.a.score).length, "; Δ moyen", r1(mean(chg.map((x) => x.b.score - x.a.score))), "; |Δ| ≥ 10 :", pct(chg.filter((x) => Math.abs(x.b.score - x.a.score) >= 10).length, chg.length), "%");
  console.log("\n## F — PERSO (V0 → final)");
  const rowsP = []; for (const k of Object.keys(PR)) { const a = EV.map((p) => ({ s: V0P[k].get(p), d: V0P[k].get(p) - V0.get(p).score })); const b = persoStats(PR[k], EV); rowsP.push([k, r1(mean(a.map((x) => x.d))) + " → " + b.dmoy, q(a.map((x) => x.d), .1) + " → " + b.p10, pct(a.filter((x) => x.s >= 75).length, a.length) + " → " + b.vert, pct(a.filter((x) => x.s < 45).length, a.length) + " → " + b.rouge, pct(a.filter((x) => x.s <= 5).length, a.length) + " → " + b.cinq]); }
  console.log(tableau(rowsP, ["profil", "Δ moy", "p10", "%vert", "%rouge", "%=5"]));
  console.log("\n## F — monotonie, robustesse, plafonds (paquet final)");
  const toks = (p) => m.decouperInci(p.inci).map((x) => x.trim()).filter(Boolean);
  let d = EV.map((p) => m.scoreFormule([...toks(p), "Niacinamide"].join(", "), p.category, p.filtresUV).score - SF(p).score); console.log("  niacinamide en queue : baisses", d.filter((x) => x < 0).length);
  d = EV.map((p) => m.scoreFormule([...toks(p), "Parfum"].join(", "), p.category, p.filtresUV).score - SF(p).score); console.log("  parfum en queue : hausses", d.filter((x) => x > 0).length, "; coût moyen sur non parfumés", r1(mean(EV.filter((p) => SF(p).details.every((x) => x.type !== "complexe-parfumant")).map((p) => m.scoreFormule([...toks(p), "Parfum"].join(", "), p.category, p.filtresUV).score - SF(p).score))));
  d = EV.map((p) => m.scoreFormule([...toks(p), ...toks(p).slice(0, 5)].join(", "), p.category, p.filtresUV).score - SF(p).score); console.log("  doublon top 5 en queue : gains", d.filter((x) => x > 0).length, "(V0 : 264)");
  d = EV.map((p) => m.scoreFormule(["Water", ...toks(p)].join(", "), p.category, p.filtresUV).score - SF(p).score); console.log("  eau en tête : hausses", d.filter((x) => x > 0).length, "(V0 : 143)");
  d = EV.map((p) => m.scoreFormule(["Niacinamide", ...toks(p)].join(", "), p.category, p.filtresUV).score - SF(p).score); console.log("  niacinamide en tête : baisses", d.filter((x) => x < 0).length, "(V0 : 165)");
  let seed = 42; const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  const r3 = []; for (const p of EV) { const t = toks(p); if (t.length < 8) continue; t[Math.floor(rnd() * 5)] = "Xqzv"; r3.push(Math.abs(m.scoreFormule(t.join(", "), p.category, p.filtresUV).score - SF(p).score)); } console.log("  un ingrédient du top 5 mal lu : |Δ| moy", r1(mean(r3)), "p90", q(r3, .9), "max", Math.max(...r3), "(V0 : 1,7 / 6 / 31)");
  seed = 42; const r4 = []; for (const p of EV) { const t = toks(p); if (t.length < 8) continue; const i = Math.floor(rnd() * 5); [t[i], t[i + 1]] = [t[i + 1], t[i]]; r4.push(Math.abs(m.scoreFormule(t.join(", "), p.category, p.filtresUV).score - SF(p).score)); } console.log("  deux voisins inversés : |Δ| moy", r1(mean(r4)), "max", Math.max(...r4), "(V0 : 0,2 / 14)");
  const capped = EV.filter((p) => SF(p).cap < Infinity); console.log("  plafonnés :", capped.length, "(" + capped.map((p) => p.name.slice(0, 25) + " " + SF(p).score).join(" ; ") + ") ; perso au-dessus du cap :", capped.filter((p) => Math.max(...Object.values(PR).map((P) => SP(p, P).score)) > SF(p).cap).length);
  const triche = (inci, cat) => m.scoreFormule(inci, cat).score; const TO = ET["TO Niacinamide 10 %"]; const t = toks(TO); const i = t.findIndex((x) => /phenoxyethanol/i.test(x)); const t1 = [...t]; t1.splice(i + 1, 0, "Sodium Hyaluronate", "Panthenol", "Allantoin");
  console.log("  triches TO Niacinamide : base", SF(TO).score, "; +3 actifs après conservateur", triche(t1.join(", "), "serum"), "; +Retinol en queue", triche([...t, "Retinol"].join(", "), "serum"), "; +8 extraits", triche([...t, "Camellia Sinensis Leaf Extract", "Centella Asiatica Extract", "Aloe Barbadensis Leaf Juice", "Chamomilla Recutita Flower Extract", "Glycyrrhiza Glabra Root Extract", "Panthenol", "Allantoin", "Sodium Hyaluronate"].join(", "), "serum"), "; +Ceramide+Tocophérol", triche([...t, "Ceramide NP", "Tocopherol"].join(", "), "serum"), "; +Perfume", triche([...t, "Perfume"].join(", "), "serum"), "; opaque/transparente (crème) :", SF(ET["[F] crème + Parfum"]).score, "/", SF(ET["[F] crème + Parfum + 6 allergènes"]).score, "; perso sens3 :", SP(ET["[F] crème + Parfum"], PR.sens3).score, "/", SP(ET["[F] crème + Parfum + 6 allergènes"], PR.sens3).score);
  console.log("\n## E — étalons : V0 → final (formule | perso sèche réactive | perso grasse acnéique) ; NE = non évaluable");
  const rowsE = []; for (const [k, p] of Object.entries(ET)) { if (!p) continue; const a = V0E.get(k); const f = SF(p); const ne = !p.fictif && !ok(p); rowsE.push([k, p.fictif ? "(construit)" : (p.brand + " | " + p.name).slice(0, 60), p.category, a.f + " → " + (ne ? "NE (" + f.score + ")" : f.score), a.sr + " → " + SP(p, PR.secheReactive, f).score, a.ga + " → " + SP(p, PR.grasseAcne, f).score, f.details.filter((d) => d.type === "manque").map((d) => d.id).join(",") || ""]); }
  console.log(tableau(rowsE, ["étalon", "fiche exacte", "cat", "formule", "sècheR", "grasseAcne", "prérequis manquants"]));
  const bandeUp = chg.filter((x) => ["bad", "mid", "good"].indexOf(x.b.bande) > ["bad", "mid", "good"].indexOf(x.a.bande)).length, bandeDown = chg.filter((x) => ["bad", "mid", "good"].indexOf(x.b.bande) < ["bad", "mid", "good"].indexOf(x.a.bande)).length;
  console.log("\n  bandes : montent de bande", bandeUp, "; descendent de bande", bandeDown, "; inchangées", chg.length - bandeUp - bandeDown, "; notes qui montent", chg.filter((x) => x.b.score > x.a.score).length, "; qui baissent", chg.filter((x) => x.b.score < x.a.score).length, "; inchangées", chg.filter((x) => x.b.score === x.a.score).length);
  // résiduel rétinol : TO Niacinamide, sérum peptides, et les rétinoïdes réels au-delà de la position 10 / barre
  const pep = ET["[F] sérum peptides (sans rétinol)"], pepR = ET["[F] sérum peptides + Retinol en queue"];
  console.log("  résiduel « Retinol en queue » : TO Niacinamide", SF(TO).score, "→", m.scoreFormule(TO.inci + ", Retinol", "serum").score, "; sérum peptides sans power 3 en top 5", SF(pep).score, "→", SF(pepR).score);
  const RET = /RETINOL|RETINAL|RETINYL|RETINOATE|ADAPALENE/;
  const reels = EV.filter((p) => { const l = m.parseInci(p.inci); const b = (() => { for (const it of l) if (m.CONFIG.marqueurs1pct.includes(it.name)) return it.pos; return Infinity; })(); return l.some((it) => it.fiche?.lowDose && RET.test(it.name) && (it.pos > 10 || it.pos >= b)); });
  const sW1 = reels.map((p) => SF(p).score); m.SIM.ld10 = true; const sLD = reels.map((p) => SF(p).score); m.SIM.ld10 = false;
  console.log("  rétinoïdes réels au-delà de la position 10 ou de la barre :", reels.length, "produits ; note moyenne avec lowDose w = 1 partout", r1(mean(sW1)), "contre", r1(mean(sLD)), "avec la clause 0,6 (Δ moyen +" + r1(mean(sW1) - mean(sLD)) + ", max +" + Math.max(...sW1.map((v, i) => v - sLD[i])) + ", produits qui changent " + sW1.filter((v, i) => v !== sLD[i]).length + ")");
  // triche catégorie
  const cv = ET["CeraVe Hydrating Cleanser"], vm = ET["Vanicream Moisturizing Cream"];
  console.log("  triche « catégorie par le nom » : CeraVe Hydrating en nettoyant", SF(cv).score, "/ en démaquillant", m.scoreFormule(cv.inci, "makeup-remover", cv.filtresUV).score, "/ en indéterminé", m.scoreFormule(cv.inci, "indetermine", cv.filtresUV).score, "; Vanicream Moisturizing Cream en hydratant", SF(vm).score, "/ en démaquillant", m.scoreFormule(vm.inci, "makeup-remover", vm.filtresUV).score, "/ en indéterminé", m.scoreFormule(vm.inci, "indetermine", vm.filtresUV).score);
  const et1 = ET["[F] sérum eau thermale de marque + glycérine"]; console.log("  eau thermale de marque en position 1 :", SF(et1).score, "; avec alias → WATER :", m.scoreFormule(et1.inci.replace(/Avene Thermal Spring Water \(Avene Aqua\)/, "Water"), "serum").score, "; perso rougeurs :", SP(et1, PR.rougeurs).score, "→", m.scorePerso(et1.inci.replace(/Avene Thermal Spring Water \(Avene Aqua\)/, "Water"), PR.rougeurs, "serum").score);
  console.log("  synonymes : crème Ceramide NP seul", SF(ET["[F] crème Ceramide NP seul"]).score, "; + Ceramide 3 (même molécule)", SF(ET["[F] crème Ceramide NP + Ceramide 3 (synonymes)"]).score);
  const ban5 = CAT.filter((p) => /Jack Black Face Buff|Jack Black All-Over|Galat[ée]e Confort|Nip \+ Fab Glycolic Fix Night|Paula's Choice Triple-Action Dark Spot/i.test(p.name));
  console.log("  bannis « tous » en rincé :", ban5.map((p) => p.name.slice(0, 40) + " → " + SF(p).score + (SF(p).cap < Infinity ? " (cap " + SF(p).cap + ")" : "")).join(" ; "));
  console.log("  clause humectant lowDose : Vichy Minéral 89", SF(ET["Vichy Minéral 89"]).score, ET["Vichy Minéral 89"] && SF(ET["Vichy Minéral 89"]).details.some((d) => d.type === "manque") ? "ÉCHEC" : "ok", "; Drunk Elephant B-Hydra", SF(ET["Drunk Elephant B-Hydra"]).score, SF(ET["Drunk Elephant B-Hydra"]).details.some((d) => d.type === "manque") ? "ÉCHEC" : "ok", "; échecs sérum", pct(EV.filter((p) => p.category === "serum" && SF(p).details.some((d) => d.type === "manque" && d.id === "actifs")).length, EV.filter((p) => p.category === "serum").length), "%");
}
if (section === "ORACLE") {
  // ORACLE DU PAQUET v2 — figé AVANT toute modification du moteur ou des données.
  // Notes attendues (formule, cap, perso × 6 profils, évaluabilité) pour chaque produit du
  // catalogue (clé = index dans catalog.json, l'`id` du moteur) et chaque formule construite.
  // `verif-paquet.mjs --oracle` compare le vrai moteur à ce fichier.
  // Usage : node sim3.mjs ORACLE '<knobs>' P9   (mêmes arguments que FINAL)
  const KN = JSON.parse(process.argv[3] || '{"s5Mode":"first","prereqMode":"d6d","comedoMode":"produit","banMode":45,"matchScale":"p3"}');
  const EXTRA = (process.argv[4] || "P9").split(",").filter(Boolean);
  const BASE1 = /WATER|AQUA|OIL|BUTTER|WAX|ALCOHOL|GLYCERIN|GLYCOL|DIMETHICONE|SILOXANE|SILICONE|SQUALANE|ALKANE|ISODODECANE|PETROLATUM|PARAFFIN|HYPOCHLOROUS|SULFATE|GLUCOSIDE|BETAINE|SARCOSINATE|ISETHIONATE|TAURATE|GLUTAMATE|LACTYLATE|SULFOSUCCINATE|KAOLIN|BENTONITE|CLAY|SILICA|STARCH|TALC|ZINC OXIDE|TITANIUM DIOXIDE|CERA |TRIGLYCERIDE|HYDROGENATED|BENZOYL PEROXIDE|SALICYLIC ACID|ADAPALENE|AVOBENZONE|HOMOSALATE|OCTOCRYLENE|OCTINOXATE|OCTISALATE|SULFUR|LANOLIN|JUICE|FILTRATE|FERMENT|HAMAMELIS|ROSA |CENTELLA|ALOE|PROPANEDIOL|HEXANEDIOL|CHAMOMILLA|SNAIL|EXTRACT/;
  const gate = (p) => { const l = m.parseInci(p.inci); const n = l.length; const connus = l.filter((it) => it.fiche).length / (n || 1); const base = n ? BASE1.test(l[0].name) : false; const solaireSans = p.category === "sunscreen" && !l.some((it) => (it.fiche?.fonctions || []).some((x) => x.startsWith("filtre"))); return { evaluable: !(solaireSans || (n <= 5 && (connus < 1 || !base))), raison: solaireSans ? "solaire-sans-filtre" : (n <= 5 && (connus < 1 || !base)) ? "liste-courte" : null }; };
  // même liste que CAT, mais on garde l'index du catalogue brut (= id du moteur)
  const EVAL = RAW.map((p, i) => ({ i, p })).filter(({ p }) => p.category !== "hors-perimetre" && p.inci && p.inci.length > 20).map(({ i, p }) => ({ i, p: { ...p, inci: norm(p.inci) } }));
  if (EXTRA.includes("P9")) for (const { p } of EVAL) if (p.category !== "sunscreen" && p.filtresUV) { const l = m.parseInci(p.inci); const orga = l.some((it) => (it.fiche?.fonctions || []).some((x) => x.startsWith("filtre")) && !/ZINC OXIDE|TITANIUM DIOXIDE/.test(it.name) && it.pos <= 8); const nomSansMarque = String(p.name).replace(new RegExp(String(p.brand || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"), ""); if (!orga && !/\b(SPF|FPS|UV|SUN)\b/i.test(nomSansMarque)) p.filtresUV = false; }
  apply([...CONSENSUS, ...EXTRA.filter((x) => x !== "P9")], KN);
  const entree = (p) => { const f = SF(p); const g = gate(p); const perso = {}; for (const k of Object.keys(PR)) perso[k] = SP(p, PR[k], f).score; return { name: p.name, category: p.category, filtresUV: !!p.filtresUV, evaluable: g.evaluable, raison: g.raison, formule: f.score, cap: f.cap === Infinity || f.cap === undefined ? null : f.cap, perso }; };
  const lignes = [];
  for (const { i, p } of EVAL) lignes.push(JSON.stringify(String(i)) + ":" + JSON.stringify(entree(p)));
  for (const [k, p] of Object.entries(ET)) if (p && p.fictif) lignes.push(JSON.stringify(k) + ":" + JSON.stringify({ ...entree(p), inci: p.inci }));
  const meta = { algoCible: "2.1.0-audit", commitReference: "b9cbb30", knobs: KN, extra: EXTRA, produits: EVAL.length, fictifs: Object.values(ET).filter((p) => p && p.fictif).length, profils: Object.keys(PR) };
  fs.writeFileSync("docs/audit/moteur-notation-2026-09-07/oracle-v2.json", "{\n\"_meta\":" + JSON.stringify(meta) + ",\n" + lignes.join(",\n") + "\n}\n");
  const ne = EVAL.filter(({ p }) => !gate(p).evaluable).length;
  console.log("oracle-v2.json écrit :", EVAL.length, "produits +", meta.fictifs, "formules construites ; non évaluables :", ne);
  for (const k of ["CeraVe Hydrating Cleanser", "TO Niacinamide 10 %", "LRP Effaclar Adapalene 0,1 %", "Sensibio H2O", "Anthelios UV Hydra"]) { const p = ET[k]; if (p) console.log("  " + k + " : formule " + SF(p).score + (gate(p).evaluable ? "" : " (NE)") + " ; sècheR " + SP(p, PR.secheReactive).score); }
}
if (section === "ONE") {
  const o = await import("/Users/jayenbellili/dev/smartskin.app/src/lib/scan/scoring.mjs");
  const re = new RegExp(process.argv[3], "i");
  const KN = { s5Mode: "first", prereqMode: "d6d", comedoMode: "produit", banMode: 45, matchScale: "p3" };
  const cible = RAW.filter((p) => p.category !== "hors-perimetre" && p.inci && re.test(p.name));
  apply(CONSENSUS, KN);
  for (const p0 of cible) { const p = { ...p0, inci: norm(p0.inci) }; const v0 = o.scoreFormule(p0.inci, p0.category, p0.filtresUV); const f = SF(p);
    console.log(`${p0.brand} | ${p0.name} | ${p0.category} | n=${m.parseInci(p.inci).length} | V0 (moteur original) ${v0.score} → final ${f.score} | sècheR ${o.scorePerso(p0.inci, PR.secheReactive, p0.category, v0, p0.filtresUV).score} → ${SP(p, PR.secheReactive, f).score} | grasseAcne ${o.scorePerso(p0.inci, PR.grasseAcne, p0.category, v0, p0.filtresUV).score} → ${SP(p, PR.grasseAcne, f).score} | rougeurs ${o.scorePerso(p0.inci, PR.rougeurs, p0.category, v0, p0.filtresUV).score} → ${SP(p, PR.rougeurs, f).score}`); }
}
