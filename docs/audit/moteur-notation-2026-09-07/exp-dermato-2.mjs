import fs from "node:fs";
const m = await import(process.cwd() + "/src/lib/scan/scoring.mjs");
const { scoreFormule, scorePerso, parseInci, natureProduit, CONFIG } = m;
const C = JSON.parse(fs.readFileSync("data/scan/catalog.json", "utf8")).filter((p) => p.category !== "hors-perimetre" && p.inci);
const D = JSON.parse(fs.readFileSync("data/scan/dictionnaire.json", "utf8"));
const P0 = { skinType: "normal", sensitivity: 0, concerns: {}, strengthCeiling: 2, pregnancy: false, allergies: [], besoinSolaire: 0, libelles: {} };
const sec = (t) => console.log("\n══════ " + t);

sec("1. Sérum mono-actif bien dosé vs cocktail d’extraits à l’état de trace");
const mono = "Water, Niacinamide, Pentylene Glycol, Zinc PCA, Dimethyl Isosorbide, Xanthan Gum, Phenoxyethanol, Chlorphenesin";
const cocktail = "Water, Glycerin, Butylene Glycol, Propanediol, Xanthan Gum, Phenoxyethanol, Camellia Sinensis Leaf Extract, Aloe Barbadensis Leaf Juice, Centella Asiatica Extract, Allantoin, Tocopheryl Acetate, Algae Extract, Snail Secretion Filtrate, Betaine, Trehalose, Caffeine, Bisabolol, Panthenol";
for (const [n, i] of [["mono (niacinamide 10 %, pos 2)", mono], ["cocktail (12 extraits après la barre 1 %)", cocktail]]) { const f = scoreFormule(i, "serum"); console.log(n, "→", f.score, f.details.map((d) => (d.id || d.type) + ":" + d.pts).join(" ")); }

sec("2. Solaires sans « broad spectrum » : combien contiennent un filtre UVA que le dictionnaire ignore ?");
const UVA_IGNORES = /DIETHYLAMINO HYDROXYBENZOYL|METHYLENE BIS-BENZOTRIAZOLYL|TRIS-BIPHENYL|ZINC OXIDE/;
let sans = 0, sansMaisUVA = 0, aucun = [];
for (const p of C.filter((p) => p.category === "sunscreen")) {
  const f = scoreFormule(p.inci, p.category, p.filtresUV);
  const l = parseInci(p.inci);
  if (!f.details.some((d) => d.id === "spectre")) { sans++; if (l.some((it) => UVA_IGNORES.test(it.name) && !(it.fiche?.fonctions || []).includes("filtre-uva"))) sansMaisUVA++; }
  if (f.details.some((d) => d.id === "filtres")) aucun.push(p.brand + " — " + p.name.slice(0, 55) + " | " + l.slice(0, 4).map((x) => x.name).join(", "));
}
console.log({ sansSpectreLarge: sans, dontFiltreUVAnonReconnu: sansMaisUVA });
console.log("« no UV filter at all » (", aucun.length, ") :"); for (const a of aucun.slice(0, 12)) console.log("   ", a);

sec("3. Force du produit lue sur un ingrédient à l’état de trace");
let trace = 0, total = 0; const ex3 = [];
for (const p of C) {
  const l = parseInci(p.inci); const n = natureProduit(l);
  if (!n.forceMax) continue; total++;
  const barre = (() => { for (const it of l) if (CONFIG.marqueurs1pct.includes(it.name)) return it.pos; return Infinity; })();
  const porteurs = l.filter((it) => it.fiche?.strength === n.forceMax);
  if (porteurs.every((it) => it.pos > 10 || it.pos >= barre)) { trace++; if (ex3.length < 5) ex3.push(`${p.brand} — ${p.name.slice(0, 50)} [${p.category}] force ${n.forceMax} portée par ${porteurs.map((x) => x.name + "@" + x.pos)} (barre ${barre}, ${l.length} ingr.)`); }
}
console.log({ produitsAvecForce: total, forcePorteeUniquementParTrace: trace }); console.log(ex3);
const tr = "Water, Glycerin, Cetearyl Alcohol, Caprylic/Capric Triglyceride, Niacinamide, Ceramide NP, Phenoxyethanol, Xanthan Gum, Salicylic Acid";
console.log("crème avec acide salicylique en pos 9 (après phenoxyethanol) × sensibilité 3 / plafond 1 [treatment] →", scorePerso(tr, { ...P0, sensitivity: 3, strengthCeiling: 1 }, "treatment").facts.filter((f) => /Stronger|Strong exfoliating/.test(f.label)));

sec("4. « Riche » à cause des émulsifiants / esters légers");
const LEGER_MAIS_COMPTE = /STEARATE|PALMITATE|MYRISTATE|TRIGLYCERIDE|SQUALANE/;
let riche = 0, richeParEmuls = 0; const ex4 = [];
for (const p of C.filter((p) => p.category === "moisturizer")) {
  const l = parseInci(p.inci); const n = natureProduit(l); if (!n.riche) continue; riche++;
  let part = 0;
  for (const it of l) { const poids = it.pos <= 3 ? 4 : it.pos <= 6 ? 2.5 : it.pos <= 10 ? 1 : 0.3; const MOTS_RICHE = ["BUTTER", "OIL", "WAX", "PETROLATUM", "LANOLIN", "SHEA", "SQUALANE", "TRIGLYCERIDE", "STEARATE", "PALMITATE", "MYRISTATE", "CERA "]; if (MOTS_RICHE.some((w) => it.name.includes(w)) && LEGER_MAIS_COMPTE.test(it.name) && !/BUTTER|WAX|PETROLATUM|LANOLIN|SHEA| OIL$|OIL /.test(it.name)) part += poids; }
  if (part / n.richesse >= 0.5) { richeParEmuls++; if (ex4.length < 6) ex4.push(`${p.brand} — ${p.name.slice(0, 55)} richesse ${n.richesse} dont ${part} par stéarates/esters/CCT/squalane`); }
}
console.log({ hydratantsRiches: riche, dontMoitieOuPlusParEmulsifiantsEstersLegers: richeParEmuls }); console.log(ex4);

sec("5. Fiches en doublon (nom botanique avec/sans parenthèse) aux valeurs divergentes");
const norm = (k) => k.replace(/\s*\([^)]*\)\s*/g, " ").replace(/\s+/g, " ").trim();
const groupes = {}; for (const k of Object.keys(D)) { const b = norm(k); if (b !== k && D[b]) { (groupes[b] = groupes[b] || []).push(k); } }
let div = 0, n5 = 0; const ex5 = [];
for (const [b, vars] of Object.entries(groupes)) for (const v of vars) { n5++; const a = D[b], c = D[v]; const diff = [];
  if (a.benefitPower !== c.benefitPower) diff.push(`power ${a.benefitPower}≠${c.benefitPower}`);
  if (JSON.stringify([...(a.benefits || [])].sort()) !== JSON.stringify([...(c.benefits || [])].sort())) diff.push(`benefits ${a.benefits}≠${c.benefits}`);
  for (const r of ["irritant", "sensibilisant", "comedogenic"]) if ((a.risks?.[r] || 0) !== (c.risks?.[r] || 0)) diff.push(`${r} ${a.risks?.[r]}≠${c.risks?.[r]}`);
  if (!!a.fragrance !== !!c.fragrance) diff.push("fragrance"); if (!!a.essentialOil !== !!c.essentialOil) diff.push("HE"); if (!!a.pregnancyFlag !== !!c.pregnancyFlag) diff.push("grossesse");
  if (a.role !== c.role) diff.push(`role ${a.role}≠${c.role}`);
  if (JSON.stringify([...(a.fonctions || [])].sort()) !== JSON.stringify([...(c.fonctions || [])].sort())) diff.push(`fonctions ${a.fonctions}≠${c.fonctions}`);
  if (diff.length) { div++; if (ex5.length < 12) ex5.push(`${b}  vs  ${v} : ${diff.join(" | ")}`); } }
console.log({ pairesBaseVariante: n5, dontDivergentes: div }); for (const e of ex5) console.log("   ", e);

sec("6. Nettoyant parfumé × sensibilité 3 : d’où viennent les −25 ?");
const clean = "Water, Glycerin, Coco-Glucoside, Cocamidopropyl Betaine, Sodium Cocoyl Isethionate, Panthenol, Xanthan Gum, Phenoxyethanol, Parfum";
console.log(scorePerso(clean, { ...P0, sensitivity: 3 }, "cleanser").facts.map((f) => f.label + " " + f.points));

sec("7. Sensibilisant 2 : les ingrédients les plus fréquents du catalogue (pénalisés −6×w à sensibilité 3)");
const freq = {}; for (const p of C) for (const it of parseInci(p.inci)) if (it.fiche?.risks?.sensibilisant === 2 && !it.fiche.fragrance && !it.fiche.essentialOil) freq[it.name] = (freq[it.name] || 0) + 1;
console.log(Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 20));

sec("8. strength ≥ 1 hors acides/rétinoïdes/BPO : bruit ?");
console.log(Object.keys(D).filter((k) => D[k].strength >= 1 && !/ACID|RETIN|PEROXIDE|ARBUTIN|ADAPALEN|SULFUR|KOJIC|HYDROQUINONE|LACTONE|ENZYME|PAPAIN|BROMELAIN|SALICYL|RESORCINOL|MENTHOL|CAMPHOR|PEEL/.test(k)).slice(0, 40));

sec("9. Prédicat @apaisants utilisé ?");
console.log(fs.readFileSync("src/lib/scan/scoring.mjs", "utf8").split("\n").filter((l) => /@apaisants/.test(l)).length, "occurrence(s) — dont définition");

sec("10. Comédogène : est-ce que le malus formule + malus perso se cumulent pour une peau grasse ?");
const cc = "Water, Cocos Nucifera Oil, Glycerin, Cetearyl Alcohol, Isopropyl Myristate, Niacinamide, Phenoxyethanol, Xanthan Gum";
const fc = scoreFormule(cc, "moisturizer");
console.log("formule", fc.score, fc.details.filter((d) => d.type === "risque"));
console.log("perso grasse", scorePerso(cc, { ...P0, skinType: "oily" }, "moisturizer", fc).score, "| perso sèche", scorePerso(cc, { ...P0, skinType: "dry" }, "moisturizer", fc).score);

sec("11. Filtres UV et allergie de contact : coût perso d’un solaire moderne pour une sensibilité 3");
const suns = C.filter((p) => p.category === "sunscreen");
let d = 0, k = 0; for (const p of suns) { const f = scoreFormule(p.inci, p.category, p.filtresUV); const pp = scorePerso(p.inci, { ...P0, sensitivity: 3 }, p.category, f, p.filtresUV); const s = pp.facts.filter((x) => /contact allergen/.test(x.label)).reduce((a, x) => a + x.points, 0); if (s) { d += s; k++; } }
console.log({ solairesAvecMalusAllergene: k, malusMoyen: (d / k).toFixed(1) });

sec("12. Rétinol : où tombe-t-il dans les listes réelles ?");
const pos = []; for (const p of C) for (const it of parseInci(p.inci)) if (/^RETINOL$|^RETINAL$/.test(it.name)) pos.push(it.pos);
pos.sort((a, b) => a - b); console.log({ n: pos.length, median: pos[Math.floor(pos.length / 2)], pos5ouMoins: pos.filter((x) => x <= 5).length });

sec("13. Acide salicylique en grossesse : ce que fait le moteur");
const sa = "Water, Salicylic Acid, Glycerin, Niacinamide, Phenoxyethanol";
console.log("SA 2 % pos 2, profil enceinte →", scorePerso(sa, { ...P0, pregnancy: true }, "treatment").facts.filter((f) => f.absolu));
console.log("Retinyl palmitate pos 20 (trace), profil enceinte →", scorePerso("Water, Glycerin, Cetearyl Alcohol, Caprylic/Capric Triglyceride, Niacinamide, Phenoxyethanol, Xanthan Gum, Tocopherol, Retinyl Palmitate", { ...P0, pregnancy: true }, "moisturizer").score);
console.log("Benzophenone-3 (oxybenzone) pos 3, enceinte →", scorePerso("Water, Homosalate, Benzophenone-3, Octocrylene, Glycerin, Phenoxyethanol", { ...P0, pregnancy: true }, "sunscreen").facts.filter((f) => f.absolu).length, "fait(s) absolu(s)");
