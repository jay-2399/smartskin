// Expériences dermato — lecture seule du dépôt
import fs from "node:fs";
const m = await import(process.cwd() + "/src/lib/scan/scoring.mjs");
const { scoreFormule, scorePerso, parseInci, natureProduit, CONFIG } = m;
const C = JSON.parse(fs.readFileSync("data/scan/catalog.json", "utf8")).filter((p) => p.category !== "hors-perimetre" && p.inci);
const D = JSON.parse(fs.readFileSync("data/scan/dictionnaire.json", "utf8"));
const find = (re) => C.find((p) => re.test(p.name));
const P0 = { skinType: "normal", sensitivity: 0, concerns: {}, strengthCeiling: 2, pregnancy: false, allergies: [], besoinSolaire: 0, libelles: {} };
const sec = (t) => console.log("\n══════ " + t);

// ─── A. produits réels ───
sec("A. Produits réels — score formule + détails");
for (const re of [/Hydrabio Gel Moussant/, /Effaclar Duo/, /CeraVe.*Moisturi[sz]ing Cream/i, /Anthelios/i, /Retinol/i, /Niacinamide 10/i]) {
  const p = find(re);
  if (!p) { console.log("absent:", re); continue; }
  const f = scoreFormule(p.inci, p.category, p.filtresUV);
  console.log(`\n${p.brand} — ${p.name} [${p.category}] → ${f.score} (${f.bande}) couverture ${f.couverture.toFixed(2)}`);
  console.log("  INCI:", p.inci.slice(0, 260));
  for (const d of f.details) console.log("  ", JSON.stringify(d));
}

// ─── B. Solaires : photostabilité et spectre ───
sec("B. Solaires — @photostable et @spectreLarge");
const suns = C.filter((p) => p.category === "sunscreen");
let avo = 0, avoFlag = 0, avoFlagAvecTinosorb = 0, sansSpectre = 0, sansFiltre = 0;
const exemplesAvo = [];
const filtresInconnus = {};
const FILTRE_RE = /DIETHYLAMINO HYDROXYBENZOYL|TRIS-BIPHENYL|DIETHYLHEXYL BUTAMIDO|METHYLENE BIS-BENZOTRIAZOLYL|ISOAMYL P-METHOXYCINNAMATE|4-METHYLBENZYLIDENE|BENZYLIDENE CAMPHOR|PHENYLBENZIMIDAZOLE|DISODIUM PHENYL DIBENZIMIDAZOLE|ETHYLHEXYL DIMETHYL PABA|BUTYLOCTYL SALICYLATE|ETHYLHEXYL METHOXYCRYLENE|TITANIUM DIOXIDE|ZINC OXIDE/;
for (const p of suns) {
  const f = scoreFormule(p.inci, p.category, p.filtresUV);
  const list = parseInci(p.inci);
  const aAvo = list.some((it) => /AVOBENZONE|METHOXYDIBENZOYLMETHANE/.test(it.name));
  if (aAvo) avo++;
  const manque = f.details.filter((d) => d.type === "manque").map((d) => d.id);
  if (manque.includes("photostable")) {
    avoFlag++;
    const tino = list.some((it) => /BIS-ETHYLHEXYLOXYPHENOL|METHYLENE BIS-BENZOTRIAZOLYL|TEREPHTHALYLIDENE|DROMETRIZOLE/.test(it.name));
    if (tino) { avoFlagAvecTinosorb++; if (exemplesAvo.length < 6) exemplesAvo.push(p.brand + " — " + p.name); }
  }
  if (manque.includes("filtres")) sansFiltre++;
  if (!f.details.some((d) => d.id === "spectre")) sansSpectre++;
  for (const it of list) if (FILTRE_RE.test(it.name) && !(it.fiche?.fonctions || []).some((x) => /^filtre-/.test(x))) filtresInconnus[it.name] = (filtresInconnus[it.name] || 0) + 1;
}
console.log({ nSolaires: suns.length, avecAvobenzone: avo, flagPhotostable: avoFlag, flagMaisTinosorbOuMexoryl: avoFlagAvecTinosorb, sansSpectreLarge: sansSpectre, sansAucunFiltre: sansFiltre });
console.log("exemples flag photostable avec Tinosorb/Mexoryl présent:", exemplesAvo);
console.log("filtres UV présents dans les INCI mais SANS fonction filtre-uva/uvb au dictionnaire:", filtresInconnus);

// ─── C. Benzyl alcohol & co : parfum ? ───
sec("C. Ingrédients fragrance:true qui ne sont pas des parfums (conservateurs, solvants)");
const fragTrue = Object.keys(D).filter((k) => D[k].fragrance && !D[k].essentialOil);
console.log("n fragrance:true (hors HE):", fragTrue.length);
console.log("suspects:", fragTrue.filter((k) => /BENZYL ALCOHOL|BENZOIC|PHENETHYL|BENZYL BENZOATE|MENTHOL|CAMPHOR|VANILLIN|SALICYLATE|CITRIC|TOCOPHER|ANISE|GLYCOL/.test(k)).map((k) => k + " sens=" + D[k].risks?.sensibilisant));
let benzylSeul = 0; const exB = [];
for (const p of C) {
  const list = parseInci(p.inci);
  const frags = list.filter((it) => it.fiche?.fragrance || it.fiche?.essentialOil).map((it) => it.name);
  if (frags.length && frags.every((n) => /^BENZYL ALCOHOL$|^PHENETHYL ALCOHOL$|^BENZOIC ACID$/.test(n))) { benzylSeul++; if (exB.length < 5) exB.push(`${p.brand} — ${p.name} [${p.category}] frags=${frags}`); }
}
console.log("produits dont le SEUL « parfum » détecté est un conservateur (benzyl/phenethyl alcohol, benzoic acid):", benzylSeul, "/", C.length);
console.log(exB);
// effet chiffré : CeraVe-like sans parfum, avec benzyl alcohol en conservateur
const base = "Water, Glycerin, Cetearyl Alcohol, Caprylic/Capric Triglyceride, Niacinamide, Ceramide NP, Phenoxyethanol, Xanthan Gum";
console.log("crème témoin (moisturizer):", scoreFormule(base, "moisturizer").score, "| + Benzyl Alcohol en pos 8:", scoreFormule(base.replace("Phenoxyethanol", "Benzyl Alcohol"), "moisturizer").score);

// ─── D. Comédogénicité universelle ───
sec("D. Comédogène ≥3 → malus FORMULE pour tout le monde (+ cap si 5 en top 5)");
let com = 0, cap5 = 0; const exC = [];
for (const p of C) {
  const f = scoreFormule(p.inci, p.category, p.filtresUV);
  const r = f.details.filter((d) => d.type === "risque" && D[d.inci]?.risks?.comedogenic >= 3 && (D[d.inci]?.risks?.irritant || 0) < 2);
  if (r.length) { com++; if (r.some((d) => d.grav >= 3)) { cap5++; if (exC.length < 5) exC.push(`${p.brand} — ${p.name} [${p.category}] ${f.score} : ${r.map((d) => d.inci + "@" + d.pos + " " + d.pts).join("; ")}`); } }
}
console.log({ produitsAvecMalusComedoSeul: com, dontGrav3_capPlafond: cap5 });
console.log(exC);
const huileGerme = "Water, Triticum Vulgare Germ Oil, Glycerin, Butyrospermum Parkii Butter, Ceramide NP, Cholesterol, Panthenol, Tocopherol, Phenoxyethanol";
const fG = scoreFormule(huileGerme, "moisturizer");
console.log("baume riche (germe de blé pos 2) → formule", fG.score, "| perso peau SÈCHE :", scorePerso(huileGerme, { ...P0, skinType: "dry", concerns: { barrier: 3 } }, "moisturizer", fG).score, "| cap appliqué ?", fG.details.filter((d) => d.type === "risque"));

// ─── E. Propylene glycol irritant 2 ───
sec("E. Propylene Glycol irritant 2 en top 10");
let pg = 0, pgPts = 0;
for (const p of C) { const f = scoreFormule(p.inci, p.category, p.filtresUV); const d = f.details.find((x) => x.type === "risque" && x.inci === "PROPYLENE GLYCOL"); if (d) { pg++; pgPts += d.pts; } }
console.log({ produitsPenalisesPG: pg, malusMoyen: pg ? (pgPts / pg).toFixed(2) : 0 });

// ─── F. Alcool loin dans la liste → -6 peau sèche ───
sec("F. dryingAlcohol au-delà de la position 5 → malus perso peau sèche sans pondération");
let alcLoin = 0, alcTop = 0; const exF = [];
for (const p of C) {
  const list = parseInci(p.inci);
  const a = list.filter((it) => it.fiche?.dryingAlcohol);
  if (!a.length) continue;
  if (a.some((it) => it.pos <= 5)) alcTop++; else { alcLoin++; if (exF.length < 4) exF.push(`${p.brand} — ${p.name}: ${a.map((it) => it.name + "@" + it.pos)} / ${list.length} ingr.`); }
}
console.log({ alcoolTop5: alcTop, alcoolSeulementApres5: alcLoin });
console.log(exF);
const s1 = "Water, Glycerin, Niacinamide, Propanediol, Sodium Hyaluronate, Panthenol, Allantoin, Phenoxyethanol, Xanthan Gum, Centella Asiatica Extract, Alcohol";
const fS = scoreFormule(s1, "serum");
console.log("sérum témoin avec Alcohol en pos 11 (solvant d’extrait) → formule", fS.score, "perso peau sèche:", scorePerso(s1, { ...P0, skinType: "dry" }, "serum", fS).facts.filter((f) => /alcohol/i.test(f.label)));

// ─── G. Sodium cetearyl sulfate = émulsifiant, flaggé tensioactif agressif ───
sec("G. Émulsifiants sulfatés comptés comme « sulfate décapant » dans les crèmes");
let cet = 0; const exG = [];
for (const p of C) {
  if (!/moisturizer|serum|eye-cream|sunscreen|treatment/.test(p.category)) continue;
  const list = parseInci(p.inci);
  const s = list.filter((it) => it.pos <= 8 && /SODIUM CETEARYL SULFATE|SODIUM BETA-SITOSTERYL SULFATE|SODIUM MYRETH SULFATE|SODIUM TRIDECETH SULFATE/.test(it.name) && (it.fiche?.fonctions || []).includes("tensioactif-agressif"));
  if (s.length) { cet++; if (exG.length < 5) { const pp = scorePerso(p.inci, { ...P0, skinType: "dry" }, p.category); exG.push(`${p.brand} — ${p.name} [${p.category}] ${s.map((x) => x.name + "@" + x.pos)} → fact: ${JSON.stringify(pp.facts.find((f) => /Sulfate/.test(f.label)))}`); } }
}
console.log({ produitsPosesAvecEmulsifiantSulfateEnTop8: cet }); console.log(exG);

// ─── H. Richesse ───
sec("H. natureProduit — richesse sur produits connus");
for (const re of [/CeraVe.*PM/i, /Hydro Boost/i, /Effaclar Mat/i, /Toleriane.*Fluide/i, /Toleriane.*Sensitive/i, /Cicaplast/i, /Nutritic/i, /Cold Cream/i, /Weleda.*Skin Food/i, /Lipikar/i]) {
  const p = find(re); if (!p) { console.log("absent", re); continue; }
  const n = natureProduit(parseInci(p.inci));
  console.log(`${p.brand} — ${p.name.slice(0, 60)} [${p.category}] richesse=${n.richesse} riche=${n.riche} legere=${n.legere}`);
}
const lotion = "Water, Glycerin, Caprylic/Capric Triglyceride, Glyceryl Stearate, PEG-100 Stearate, Cetearyl Alcohol, Niacinamide, Dimethicone, Phenoxyethanol, Carbomer";
console.log("lotion légère type (CCT + glyceryl stearate + PEG-100 stearate):", natureProduit(parseInci(lotion)));
console.log("répartition riche/léger par catégorie :");
const rep = {};
for (const p of C) { const n = natureProduit(parseInci(p.inci)); rep[p.category] = rep[p.category] || { n: 0, riche: 0, legere: 0 }; rep[p.category].n++; if (n.riche) rep[p.category].riche++; if (n.legere) rep[p.category].legere++; }
console.log(rep);

// ─── I. Parfum rincé vs posé ───
sec("I. Coût du parfum : nettoyant (rincé) vs crème (posé)");
const clean = "Water, Glycerin, Coco-Glucoside, Cocamidopropyl Betaine, Sodium Cocoyl Isethionate, Panthenol, Xanthan Gum, Phenoxyethanol";
const cream = "Water, Glycerin, Cetearyl Alcohol, Caprylic/Capric Triglyceride, Niacinamide, Ceramide NP, Phenoxyethanol, Xanthan Gum";
for (const [lab, inci, cat] of [["nettoyant", clean, "cleanser"], ["crème", cream, "moisturizer"], ["contour yeux", cream, "eye-cream"]]) {
  const a = scoreFormule(inci, cat).score, b = scoreFormule(inci + ", Parfum", cat).score, c3 = scoreFormule(inci + ", Parfum, Limonene, Linalool", cat).score;
  console.log(`${lab}: sans parfum ${a} | + Parfum ${b} (Δ ${b - a}) | + Parfum+2 allergènes ${c3} (Δ ${c3 - a})`);
  const pS = scorePerso(inci + ", Parfum", { ...P0, sensitivity: 3 }, cat);
  console.log(`   perso sensibilité 3 avec Parfum : ${pS.score} (Δ vs formule sans parfum ${pS.score - a})`);
}

// ─── J. Marqueur 1 % très haut ───
sec("J. Marqueur de la barre des 1 % en position ≤ 4");
let mk = 0; const exJ = [];
for (const p of C) { const list = parseInci(p.inci); const b = list.find((it) => CONFIG.marqueurs1pct.includes(it.name)); if (b && b.pos <= 4 && list.length >= 8) { mk++; if (exJ.length < 5) exJ.push(`${p.brand} — ${p.name.slice(0, 50)}: ${b.name}@${b.pos} ; suite: ${list.slice(b.pos, b.pos + 3).map((x) => x.name)}`); } }
console.log({ produitsMarqueurAvantPos5: mk }); console.log(exJ);

// ─── K. Glycérine power 3 par alias ───
sec("K. Incohérences d’alias (même molécule, fiches différentes)");
for (const [a, b] of [["GLYCERIN", "GLYCERIN (VEGETABLE SOURCE)"], ["NIACINAMIDE", "NIACINAMIDE (VITAMIN B3)"], ["COCOS NUCIFERA OIL", "COCOS NUCIFERA (COCONUT) OIL"], ["LAVANDULA ANGUSTIFOLIA OIL", "LAVANDULA ANGUSTIFOLIA (LAVENDER) OIL"], ["BUTYROSPERMUM PARKII BUTTER", "BUTYROSPERMUM PARKII (SHEA) BUTTER"], ["ROSMARINUS OFFICINALIS LEAF OIL", "ROSMARINUS OFFICINALIS (ROSEMARY) LEAF OIL"]])
  console.log(a, "power", D[a]?.benefitPower, "sens", D[a]?.risks?.sensibilisant, "ben", D[a]?.benefits, "|", b, "power", D[b]?.benefitPower, "sens", D[b]?.risks?.sensibilisant, "ben", D[b]?.benefits);
const glyV = "Water, Glycerin (Vegetable Source), Niacinamide, Sodium Hyaluronate, Panthenol, Phenoxyethanol";
console.log("sérum avec « Glycerin (Vegetable Source) » pos 2 → concentre ?", scoreFormule(glyV, "serum").details.find((d) => d.id === "concentre"), "| avec « Glycerin » :", scoreFormule(glyV.replace(" (Vegetable Source)", ""), "serum").details.find((d) => d.id === "concentre"));
console.log("entrée fantôme ETANORULAYH MUIDOS encore là ?", !!D["ETANORULAYH MUIDOS"]);

// ─── L. Sensibilisants forts (MI, MCI, DMDM) invisibles pour un profil non sensible ───
sec("L. MI / MCI / DMDM hydantoin / bannis UE : effet sur la note");
const mi = "Water, Glycerin, Cetearyl Alcohol, Caprylic/Capric Triglyceride, Niacinamide, Ceramide NP, Methylisothiazolinone, Methylchloroisothiazolinone, Xanthan Gum";
const fMi = scoreFormule(mi, "moisturizer"), fRef = scoreFormule(mi.replace("Methylisothiazolinone, Methylchloroisothiazolinone", "Phenoxyethanol"), "moisturizer");
console.log("crème avec MI+MCI (interdit UE en leave-on) :", fMi.score, "| même crème au phenoxyethanol :", fRef.score);
console.log("perso sensibilité 0 :", scorePerso(mi, P0, "moisturizer", fMi).score, "| sensibilité 3 :", scorePerso(mi, { ...P0, sensitivity: 3 }, "moisturizer", fMi).score);
let nMi = 0, nDmdm = 0, nBan = 0;
for (const p of C) { const l = parseInci(p.inci); if (l.some((it) => /^METHYL(CHLORO)?ISOTHIAZOLINONE$/.test(it.name))) nMi++; if (l.some((it) => it.fiche?.libereFormaldehyde)) nDmdm++; if (l.some((it) => it.fiche?.banniUE)) nBan++; }
console.log({ produitsAvecMIouMCI: nMi, produitsAvecLibFormaldehyde: nDmdm, produitsAvecBanniUE: nBan });

// ─── M. Lécithine = « lipide barrière » ───
sec("M. Mérite « barrier lipids » obtenu uniquement par la lécithine (émulsifiant)");
let lec = 0, lipTot = 0;
for (const p of C) { if (p.category !== "moisturizer") continue; const l = parseInci(p.inci); const lip = l.filter((it) => (it.fiche?.fonctions || []).includes("lipide-barriere")); if (lip.length) { lipTot++; if (lip.every((it) => /LECITHIN|DILINOLEIC/.test(it.name))) lec++; } }
console.log({ hydratantsAvecMeriteLipides: lipTot, dontUniquementLecithineOuCopolymere: lec });

// ─── N. Rétinol jamais « concentré » ───
sec("N. @actifTop5 ignore lowDose : le rétinol n’est jamais « bien dosé »");
const ret = C.filter((p) => /serum|treatment/.test(p.category) && parseInci(p.inci).some((it) => /^RETIN(OL|AL)$/.test(it.name)));
let retConc = 0; for (const p of ret) if (scoreFormule(p.inci, p.category).details.some((d) => d.id === "concentre")) retConc++;
console.log({ serumsTraitementsAvecRetinolOuRetinal: ret.length, dontMeriteConcentre: retConc });
const rp = ret.find((p) => /Retinol/i.test(p.name)); if (rp) { const f = scoreFormule(rp.inci, rp.category); console.log(rp.brand, rp.name, "→", f.score, f.details.filter((d) => d.type !== "risque").map((d) => d.id + ":" + d.pts)); }
const vitc = "Water, Ascorbic Acid, Glycerin, Propanediol, Sodium Hyaluronate, Panthenol, Phenoxyethanol";
const retS = "Water, Glycerin, Propanediol, Caprylic/Capric Triglyceride, Squalane, Sodium Hyaluronate, Panthenol, Phenoxyethanol, Xanthan Gum, Retinol";
console.log("sérum vit C (acide ascorbique pos 2):", scoreFormule(vitc, "serum").score, "| sérum rétinol (rétinol pos 10, ~0,5 %) :", scoreFormule(retS, "serum").score);

// ─── O. Variantes de « parfum » non reconnues ───
sec("O. Parfum écrit autrement que PARFUM/FRAGRANCE, non reconnu");
let nonRec = 0; const variantes = {};
for (const p of C) { if (!/PARFUM|FRAGRANCE|AROMA|FLAVOR/i.test(p.inci)) continue; const l = parseInci(p.inci); if (!l.some((it) => it.fiche?.fragrance)) { nonRec++; for (const it of l) if (/PARFUM|FRAGRANCE|AROMA|FLAVOR/.test(it.name)) variantes[it.name] = (variantes[it.name] || 0) + 1; } }
console.log({ produitsAvecMotParfumMaisAucunTokenFragrance: nonRec }); console.log(Object.entries(variantes).sort((a, b) => b[1] - a[1]).slice(0, 12));

// ─── P. Azélaïque & rougeurs ───
sec("P. Bénéfice « redness » : actifs attendus");
for (const k of ["AZELAIC ACID", "NIACINAMIDE", "ALLANTOIN", "BISABOLOL", "PANTHENOL", "ZINC OXIDE", "GLYCYRRHETINIC ACID", "DIPOTASSIUM GLYCYRRHIZATE", "MADECASSOSIDE", "OAT", "AVENA SATIVA KERNEL EXTRACT", "COLLOIDAL OATMEAL", "AVENA SATIVA (OAT) KERNEL FLOUR", "BETA-GLUCAN", "4-T-BUTYLCYCLOHEXANOL", "HYDROXYPHENYL PROPAMIDOBENZOIC ACID", "TOCOPHEROL", "CAFFEINE", "AMBOPHENOL", "NEUROSENSINE", "ACETYL DIPEPTIDE-1 CETYL ESTER"]) console.log(k, "→", D[k] ? JSON.stringify({ role: D[k].role, ben: D[k].benefits, pow: D[k].benefitPower, str: D[k].strength }) : "(ABSENT)");

// ─── Q. Exemple de la spec : Effaclar Duo+ ───
sec("Q. Exemple §5 de la spec — Effaclar Duo+ × mixte/imperfections 3/sensibilité 3");
const eff = find(/Effaclar Duo/);
if (eff) { const f = scoreFormule(eff.inci, eff.category); const pp = scorePerso(eff.inci, { ...P0, skinType: "combination", sensitivity: 3, concerns: { blemishes: 3, oiliness: 2 }, strengthCeiling: 1 }, eff.category, f);
  console.log(eff.name, "[", eff.category, "] formule", f.score, "perso", pp.score); for (const x of pp.facts) console.log("  ", JSON.stringify(x)); }

// ─── R. Irritants côté perso ───
sec("R. Le score perso lit-il `irritant` ? (grep) ");
console.log(fs.readFileSync("src/lib/scan/scoring.mjs", "utf8").split("\n").map((l, i) => [i + 1, l]).filter(([, l]) => /irritant/.test(l)).map(([i, l]) => i + ": " + l.trim()));
const menth = "Water, Glycerin, Niacinamide, Propanediol, Sodium Hyaluronate, Panthenol, Phenoxyethanol, Xanthan Gum, Menthol, Hamamelis Virginiana Water";
console.log("tonique avec menthol+hamamélis, sensibilité 3 → facts:", scorePerso(menth, { ...P0, sensitivity: 3 }, "toner").facts.map((f) => f.label + " " + f.points));
