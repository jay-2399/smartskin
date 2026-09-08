// Génère des copies patchées de scoring.mjs dans variants/<nom>.mjs. Le dépôt n'est pas touché.
import fs from "node:fs";
const SRC = fs.readFileSync(process.cwd() + "/src/lib/scan/scoring.mjs", "utf8");
const OUT = "/private/tmp/claude-501/-Users-jayenbellili-dev/bbeb88c0-d43a-4f0d-8eaa-2d0f14e599f7/scratchpad/debat/variants/";

function rep(src, find, replace, nom) {
  const i = typeof find === "string" ? src.indexOf(find) : src.search(find);
  if (i < 0) throw new Error(`patch introuvable (${nom}): ${String(find).slice(0, 80)}`);
  return src.replace(find, replace);
}

const P = {
  // ── perso : parfum / HE / sensibilisants UNE fois (S1 = P1) ──
  S1: (s) => {
    s = rep(s, "  const facts = [];\n  let matchTotal = 0", "  const facts = [];\n  let parfumVu = false, heVu = false, sensiTotal = 0;\n  let matchTotal = 0", "S1 decl");
    s = rep(s, "    if (f.fragrance && (profil.sensitivity || 0) > 0) {\n      const pts", "    if (f.fragrance && (profil.sensitivity || 0) > 0 && !parfumVu) {\n      parfumVu = true;\n      const pts", "S1 parfum");
    s = rep(s, "    if (f.essentialOil && (profil.sensitivity || 0) >= 2) {\n      score -= CONFIG.malusHEReactive;", "    if (f.essentialOil && (profil.sensitivity || 0) >= 2 && !heVu) {\n      heVu = true;\n      score -= CONFIG.malusHEReactive;", "S1 HE");
    s = rep(s, "      const pts = -CONFIG.malusSensibilisant * sensi * ((profil.sensitivity || 0) / 3) * w;\n      score += pts;", "      const pts = -CONFIG.malusSensibilisant * sensi * ((profil.sensitivity || 0) / 3) * w;\n      sensiTotal += pts;", "S1 sensi");
    s = rep(s, "  score += Math.min(matchTotal, CONFIG.plafondMatchs);", "  score += Math.max(sensiTotal, -12 * ((profil.sensitivity || 0) / 3));\n  score += Math.min(matchTotal, CONFIG.plafondMatchs);", "S1 cap sensi");
    return s;
  },
  // ── S2 : plus de mérite sansParfum, malus fixe seul ──
  S2: (s) => s.replace(/\n\s*\{ id: "sansParfum"[^\n]*\n/g, "\n"),
  S2b: (s) => { s = P.S2(s); s = rep(s, "malusParfumFixe: 4,", "malusParfumFixe: 8,", "S2b"); s = rep(s, "plafondMalusParfum: 12,", "plafondMalusParfum: 16,", "S2b cap"); return s; },
  // ── D10 : mérite sansParfum × exposition sur les rincés + perso × exposition ──
  D10: (s) => {
    s = rep(s, '{ id: "sansParfum", quoi: "@sansParfum", pts: 12, dit: "no fragrance" },        // 48 %', '{ id: "sansParfum", quoi: "@sansParfum", pts: 6.6, dit: "no fragrance" },', "D10 cleanser");
    s = rep(s, '{ id: "sansParfum", quoi: "@sansParfum", pts: 14, dit: "no fragrance — it works near the eyes" },', '{ id: "sansParfum", quoi: "@sansParfum", pts: 7, dit: "no fragrance — it works near the eyes" },', "D10 mr");
    s = rep(s, '{ id: "sansParfum", quoi: "@sansParfum", pts: 14, dit: "no fragrance on freshly exfoliated skin" },', '{ id: "sansParfum", quoi: "@sansParfum", pts: 11.9, dit: "no fragrance on freshly exfoliated skin" },', "D10 exfo");
    s = rep(s, '{ id: "sansParfum", quoi: "@sansParfum", pts: 12, dit: "no fragrance" },\n        { id: "richesse", quoi: "@actifs", pts: 2, plafond: 14', '{ id: "sansParfum", quoi: "@sansParfum", pts: 8.4, dit: "no fragrance" },\n        { id: "richesse", quoi: "@actifs", pts: 2, plafond: 14', "D10 mask");
    s = rep(s, "      const pts = -CONFIG.malusParfumSensible * profil.sensitivity;", "      const pts = -CONFIG.malusParfumSensible * profil.sensitivity * ((CONFIG.RUBRIQUES[categorie] || CONFIG.RUBRIQUES.indetermine).exposition ?? 1);", "D10 perso");
    return s;
  },
  D10b: (s) => { s = P.D10(s); return rep(s, "malusParfumFixe: 4,", "malusParfumFixe: 0,", "D10b"); },
  // ── S5 : pas de malus irritant générique sur un actif prouvé (irritant ≤ 2) ──
  S5: (s) => rep(s, "if (grav >= 2 && !aMalusFixe && !dejaFactures.has(it.name)) {", "const actifProuve = f.role === \"active\" && (f.benefitPower || 0) >= 3 && (f.risks?.irritant || 0) <= 2 && grav === (f.risks?.irritant || 0);\n    if (grav >= 2 && !aMalusFixe && !dejaFactures.has(it.name) && !actifProuve) {", "S5"),
  // ── D4 : comédogénicité hors formule ; perso seulement ≥4 et si blemishes/oiliness ──
  D4: (s) => {
    s = rep(s, "const grav = Math.max(f.risks?.irritant || 0, Math.ceil((f.risks?.comedogenic || 0) / 2));\n    // spec", "const grav = f.risks?.irritant || 0;\n    // spec", "D4 grav");
    s = rep(s, 'if ((f.risks?.comedogenic || 0) >= 3 && ["oily", "combination"].includes(profil.skinType)) {', 'if ((f.risks?.comedogenic || 0) >= 4 && (profil.concerns?.blemishes || profil.concerns?.oiliness)) {', "D4 perso");
    return s;
  },
  // D4' : ma variante — perso déclenchée aussi par skinType oily, comedo ≥ 4 ; ≥3 seulement en top 5
  D4p: (s) => {
    s = rep(s, "const grav = Math.max(f.risks?.irritant || 0, Math.ceil((f.risks?.comedogenic || 0) / 2));\n    // spec", "const grav = f.risks?.irritant || 0;\n    // spec", "D4p grav");
    s = rep(s, 'if ((f.risks?.comedogenic || 0) >= 3 && ["oily", "combination"].includes(profil.skinType)) {', 'if (((f.risks?.comedogenic || 0) >= 4 || ((f.risks?.comedogenic || 0) >= 3 && it.pos <= 5)) && (profil.concerns?.blemishes || profil.concerns?.oiliness || profil.skinType === "oily")) {', "D4p perso");
    return s;
  },
  // ── D5 : lowDose compte pour @actifTop5 ──
  D5: (s) => rep(s, "ctx.list.some((it) => it.pos <= 5 && it.fiche?.role === \"active\" &&", "ctx.list.some((it) => (it.pos <= 5 || it.fiche?.lowDose) && it.fiche?.role === \"active\" &&", "D5"),
  // ── S4 : @actifTop5 gradué par w(pos) ──
  S4: (s) => rep(s, /"@actifTop5": \(ctx\) => [\s\S]*?\? 1 : 0,/, '"@actifTop5": (ctx) => Math.max(0, ...ctx.list.filter((it) => it.fiche?.role === "active" && (it.fiche.benefitPower || 0) >= 3).map((it) => ctx.w(it))),', "S4"),
  // ── lowDose plafonné à 0,6 hors top 5 (anti « retinol en dernier ») ──
  LD06: (s) => rep(s, "if (it.fiche?.lowDose) return 1.0;", "if (it.fiche?.lowDose) return it.pos <= 5 ? 1.0 : 0.6;", "LD06"),
  // ── prérequis actifs : variantes ──
  D6a: (s) => rep(s, /"@troisActifs": \(ctx\) => [^\n]*\n/, '"@troisActifs": (ctx) => ctx.list.some((it) => it.fiche?.role === "active" && it.fiche.benefits?.length && (it.fiche.benefitPower || 0) >= 2 && (ctx.w(it) >= 0.6 || it.fiche.lowDose)) ? 1 : 0,\n', "D6a"),
  D6b: (s) => rep(s, /"@troisActifs": \(ctx\) => [^\n]*\n/, '"@troisActifs": (ctx) => ctx.list.some((it) => it.fiche?.role === "active" && it.fiche.benefits?.length && (it.fiche.benefitPower || 0) >= 2 && !(it.fiche.benefits.length === 1 && it.fiche.benefits[0] === "dehydration") && (ctx.w(it) >= 0.6 || it.fiche.lowDose)) ? 1 : 0,\n', "D6b"),
  P6: (s) => rep(s, /"@troisActifs": \(ctx\) => [^\n]*\n/, '"@troisActifs": (ctx) => { const ok = (it) => it.fiche?.role === "active" && it.fiche.benefits?.length && (ctx.w(it) >= 0.6 || it.fiche.lowDose); const noms = new Set(ctx.list.filter(ok).map((it) => it.name)); const top = ctx.list.some((it) => ok(it) && (it.fiche.benefitPower || 0) >= 3 && (it.pos <= 5 || it.fiche.lowDose)); return (top || noms.size >= 3) ? 1 : 0; },\n', "P6"),
  // ── S6 + règle unique : dédoublonner les mérites, actifs comptés seulement à w ≥ 0,6 ou lowDose ──
  UNI: (s) => {
    s = rep(s, "      const parFamille = {};\n      for (const it of ctx.list) {\n        const f = it.fiche;\n        if (!f || f.role !== \"active\" || !f.benefits?.length) continue;", "      const parFamille = {}; const nomsVus = new Set();\n      for (const it of ctx.list) {\n        const f = it.fiche;\n        if (!f || f.role !== \"active\" || !f.benefits?.length) continue;\n        if (nomsVus.has(it.name)) continue; nomsVus.add(it.name);\n        if (!(ctx.w(it) >= 0.6 || f.lowDose)) continue;", "UNI actifs");
    s = rep(s, "  const vus = new Set();\n  let total = 0, n = 0;\n  for (const it of ctx.list) {\n    if (l.maxPos && it.pos > l.maxPos) continue;", "  const vus = new Set(); const nomsVus = new Set();\n  let total = 0, n = 0;\n  for (const it of ctx.list) {\n    if (l.maxPos && it.pos > l.maxPos) continue;\n    if (nomsVus.has(it.name)) continue; nomsVus.add(it.name);", "UNI fonctions");
    return s;
  },
  // ── D8 : perso = irritants × réactivité ; sensibilisants 1-2 seulement à S=3, −1×w ──
  D8: (s) => rep(s, "    const sensi = f.risks?.sensibilisant || 0;\n    if (sensi > 0 && (profil.sensitivity || 0) > 0 && !f.fragrance && !f.essentialOil) {\n      const pts = -CONFIG.malusSensibilisant * sensi * ((profil.sensitivity || 0) / 3) * w;",
    "    const irr = f.risks?.irritant || 0;\n    if (irr > 0 && (profil.sensitivity || 0) > 0 && !f.fragrance && !f.essentialOil) {\n      const pts = -2 * irr * ((profil.sensitivity || 0) / 3) * w;\n      score += pts;\n      facts.push({ label: `${titre(it.name)} — may sting on reactive skin`, points: +pts.toFixed(1), inci: it.name, pos: it.pos });\n    }\n    const sensi = f.risks?.sensibilisant || 0;\n    if (sensi > 0 && sensi <= 2 && (profil.sensitivity || 0) >= 3 && !f.fragrance && !f.essentialOil) {\n      const pts = -1 * w;", "D8"),
  // ── S3 : le plafond formule s'applique aussi au perso ──
  S3: (s) => {
    s = rep(s, "return { score: clamp(score), bande: bande(clamp(score)), details, couverture, metier: R.metier,", "return { score: clamp(score), bande: bande(clamp(score)), details, couverture, metier: R.metier, cap,", "S3 ret");
    s = rep(s, "  score = Math.min(score, capAbsolu);", "  score = Math.min(score, capAbsolu, F.cap ?? Infinity);", "S3 perso");
    return s;
  },
  // ── D7/S11 : force et alcool pondérés par la position côté perso ; richesse hors rincés (P8) ──
  DOSE: (s) => {
    s = rep(s, "    strengthMax = Math.max(strengthMax, f.strength || 0);", "    if (w >= 0.6 || f.lowDose) strengthMax = Math.max(strengthMax, f.strength || 0);", "DOSE strength");
    s = rep(s, "    if (it.fiche?.strength) forceMax = Math.max(forceMax, it.fiche.strength);", "    if (it.fiche?.strength && (p <= 10 || it.fiche.lowDose)) forceMax = Math.max(forceMax, it.fiche.strength);", "DOSE forceMax");
    s = rep(s, 'if (f.dryingAlcohol && ["dry"].includes(profil.skinType)) {', 'if (f.dryingAlcohol && ["dry"].includes(profil.skinType) && it.pos <= 5) {', "DOSE alcool");
    s = rep(s, "  } else if (nat.legere) {", "  } else if (nat.legere && ((CONFIG.RUBRIQUES[categorie] || CONFIG.RUBRIQUES.indetermine).exposition ?? 1) >= 1 && [\"moisturizer\", \"eye-cream\"].includes(categorie)) {", "DOSE legere");
    s = rep(s, "  if (nat.riche) {", "  if (nat.riche && ((CONFIG.RUBRIQUES[categorie] || CONFIG.RUBRIQUES.indetermine).exposition ?? 1) >= 1) {", "DOSE riche");
    return s;
  },
  // ── dictionnaire : ZnO large spectre, faux parfums, tensioactifs doux micellaires, PG (D1/D3/P3/P4/P5/P7/D11) ──
  DICO: (s) => rep(s, 'try { DICT = JSON.parse(fs.readFileSync(D + "dictionnaire.json", "utf8")); } catch { DICT = null; }',
    `try { DICT = JSON.parse(fs.readFileSync(D + "dictionnaire.json", "utf8")); } catch { DICT = null; }
if (DICT) {
  const fn = (k, f) => { if (DICT[k]) DICT[k].fonctions = [...new Set([...(DICT[k].fonctions || []), ...f])]; };
  fn("ZINC OXIDE", ["filtre-uva", "filtre-uvb"]); fn("BIS-ETHYLHEXYLOXYPHENOL METHOXYPHENYL TRIAZINE", ["filtre-uva", "filtre-uvb"]);
  fn("METHYLENE BIS-BENZOTRIAZOLYL TETRAMETHYLBUTYLPHENOL", ["filtre-uva", "filtre-uvb"]); fn("DROMETRIZOLE TRISILOXANE", ["filtre-uva", "filtre-uvb"]);
  DICT["OCTISALATE"] = DICT["ETHYLHEXYL SALICYLATE"]; DICT["ZINC OXIDE (NANO)"] = DICT["ZINC OXIDE"]; DICT["TITANIUM DIOXIDE (NANO)"] = DICT["TITANIUM DIOXIDE"];
  DICT["DIETHYLAMINO HYDROXYBENZOYL HEXYL BENZOATE"] = { role: "support", benefits: [], benefitPower: 0, risks: { irritant: 0, comedogenic: 0, sensibilisant: 0 }, fonctions: ["filtre-uva"] };
  for (const k of ["BENZYL ALCOHOL", "4-T-BUTYLCYCLOHEXANOL", "PHENETHYL ALCOHOL", "PHENYLPROPANOL"]) if (DICT[k]) { DICT[k].fragrance = false; }
  for (const k of ["PEG-6 CAPRYLIC/CAPRIC GLYCERIDES", "POLOXAMER 184", "POLOXAMER 188", "DISODIUM COCOAMPHODIACETATE", "SODIUM LAUROYL LACTYLATE", "POLYSORBATE 20", "PEG-40 HYDROGENATED CASTOR OIL"]) fn(k, ["tensioactif-doux"]);
  if (DICT["PROPYLENE GLYCOL"]) { DICT["PROPYLENE GLYCOL"].risks.irritant = 1; DICT["PROPYLENE GLYCOL"].risks.sensibilisant = 2; }
  DICT["PERFUME"] = DICT["FRAGRANCE"]; DICT["AROMA"] = DICT["FRAGRANCE"];
}`, "DICO"),
  // ── nettoyant : douceur = doux OU (pas d'agressif ET émollient/émulsifiant) ; démaquillant : emulsifiant dissout ──
  DOUX: (s) => {
    s = rep(s, '"@tensioDoux": (ctx) => ctx.aFonction("tensioactif-doux") ? 1 : 0,', '"@tensioDoux": (ctx) => (ctx.aFonction("tensioactif-doux") || (!ctx.aFonction("tensioactif-agressif") && (ctx.aFonction("emollient") || ctx.aFonction("emulsifiant") || ctx.aFonction("occlusif")))) ? 1 : 0,', "DOUX");
    s = rep(s, 'prerequis: [{ id: "dissout", quoi: ["emollient", "occlusif", "tensioactif-doux"], pts: 12,', 'prerequis: [{ id: "dissout", quoi: ["emollient", "occlusif", "tensioactif-doux", "emulsifiant"], pts: 12,', "DOUX dissout");
    return s;
  },
  // ── solaire : le drapeau catalogue suffit ; hors solaire, ZnO/TiO2 seuls ne valent un bonus qu'en top 6 (P9/S8) ──
  UV: (s) => {
    s = rep(s, '"@filtresUV": (ctx) => (ctx.aFonction("filtre-uva") || ctx.aFonction("filtre-uvb")) ? 1 : 0,', '"@filtresUV": (ctx) => (ctx.filtresUV || ctx.aFonction("filtre-uva") || ctx.aFonction("filtre-uvb")) ? 1 : 0,', "UV pred");
    s = rep(s, "  const ctx = {\n    list, barre, w: (it) => wPos(it, barre),", "  const ctx = {\n    list, barre, filtresUV: !!filtresUV, w: (it) => wPos(it, barre),", "UV ctx");
    s = rep(s, 'if (filtresUV && categorie !== "sunscreen") {', 'const uvCredible = list.some((it) => ((it.fiche?.fonctions || []).includes("filtre-uva") || (it.fiche?.fonctions || []).includes("filtre-uvb")) && (!/ZINC OXIDE|TITANIUM DIOXIDE/.test(it.name) || it.pos <= 6));\n  if (filtresUV && uvCredible && categorie !== "sunscreen") {', "UV hors solaire");
    s = rep(s, "  if (filtresUV && (grille.exposition ?? 1) >= 1) {", "  const uvCredibleP = list.some((it) => ((it.fiche?.fonctions || []).includes(\"filtre-uva\") || (it.fiche?.fonctions || []).includes(\"filtre-uvb\")) && (!/ZINC OXIDE|TITANIUM DIOXIDE/.test(it.name) || it.pos <= 6 || categorie === \"sunscreen\"));\n  if (filtresUV && uvCredibleP && (grille.exposition ?? 1) >= 1) {", "UV perso");
    return s;
  },
  // ── D2 : sensibilisant 3 hors parfum → malus fixe ; banni UE → plafond 45 ──
  D2: (s) => rep(s, "    let fixe = 0, typeFixe = null;", "    if ((f.risks?.sensibilisant || 0) >= 3 && !f.fragrance && !f.essentialOil) { const m = 5 * R.severite * (R.exposition ?? 1); score -= m; details.push({ type: \"sensibilisant-fort\", inci: it.name, pos: it.pos, pts: -+m.toFixed(1) }); }\n    if (f.banniUE) cap = Math.min(cap, 45);\n    let fixe = 0, typeFixe = null;", "D2"),
  // ── D9 : richesse par classe de corps gras ──
  D9: (s) => rep(s, "    if (MOTS_RICHE.some((w) => it.name.includes(w)) && !MOTS_LEGER.some((w) => it.name === w)) richesse += poids;",
    "    { const n = it.name; let k = 0; if (/BUTTER|WAX|PETROLATUM|LANOLIN|SHEA|CERA |CERA$|PARAFFIN/.test(n)) k = 1; else if (/\\bOIL\\b/.test(n) && !/PEG|HYDROGENATED CASTOR/.test(n)) k = 0.7; else if (/TRIGLYCERIDE|SQUALANE|PALMITATE|MYRISTATE|STEARATE|ALKANE/.test(n)) k = /^(GLYCERYL|PEG|SORBITAN|SUCROSE|POLYGLYCERYL)/.test(n) ? 0 : 0.3; if (k && !MOTS_LEGER.some((w) => n === w)) richesse += poids * k; }", "D9"),
};

export { P, rep };
export function genere(nom, patches) {
  let s = SRC;
  for (const p of patches) s = P[p](s);
  fs.writeFileSync(OUT + nom + ".mjs", s);
  return OUT + nom + ".mjs";
}
export const SETS = {
  base: [],
  S1: ["S1"],
  S2: ["S1", "S2"], S2b: ["S1", "S2b"], D10: ["S1", "D10"],
  S5: ["S1", "S5"], S5D8: ["S1", "S5", "D8"],
  D4: ["S1", "D4"], D4p: ["S1", "D4p"],
  D6a: ["S1", "UNI", "D6a"], D6b: ["S1", "UNI", "D6b"], P6: ["S1", "UNI", "P6"],
  D5: ["S1", "D5"], D5LD: ["S1", "D5", "LD06"], D5UNI: ["S1", "UNI", "D6b", "D5"], D5UNILD: ["S1", "UNI", "D6b", "D5", "LD06"],
  D8: ["S1", "D8"],
  DICO: ["S1", "DICO"],
  FINALb: ["S1", "DICO", "DOUX", "UV", "UNI", "D6b", "D5", "LD06", "S4", "D4p", "DOSE", "S3", "D2", "D9", "D10b"],
  FINAL: ["S1", "DICO", "DOUX", "UV", "UNI", "D6b", "D5", "LD06", "S4", "D4p", "DOSE", "S3", "D2", "D9", "D10"],
};
if (process.argv[1]?.endsWith("variants.mjs")) { for (const [n, p] of Object.entries(SETS)) { genere(n, p); console.log("ok", n); } }
