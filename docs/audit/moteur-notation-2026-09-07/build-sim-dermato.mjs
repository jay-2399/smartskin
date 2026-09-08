// Construit scoring-sim-dermato.mjs : copie de scoring.mjs avec des interrupteurs globalThis.SIM
import fs from "node:fs";
let s = fs.readFileSync(process.cwd() + "/src/lib/scan/scoring.mjs", "utf8");
const rep = (a, b, label) => { if (!s.includes(a)) throw new Error("patch introuvable: " + label); s = s.replace(a, b); };

// 0. interrupteurs
s = "const SIM = globalThis.SIM || {};\n" + s;

// 1. Architecture parfum à UN canal (S2) : le mérite sansParfum est neutralisé (pts 0 → jamais compté, et sorti du max)
rep("function maxTheorique(R) {\n  if (_maxCache.has(R.label)) return _maxCache.get(R.label);\n  const m = R.merites.reduce((a, l) => a + (l.plafond ?? l.pts), 0);",
    "function maxTheorique(R) {\n  const key = R.label + (SIM.parfumUnique ? \"-pu\" : \"\");\n  if (_maxCache.has(key)) return _maxCache.get(key);\n  const m = R.merites.filter((l) => !(SIM.parfumUnique && l.id === \"sansParfum\")).reduce((a, l) => a + (l.plafond ?? l.pts), 0);\n  _maxCache.set(key, m); return m;", "maxTheorique");
rep("  for (const l of R.merites) {\n    const { pts, n } = evalueLigne(l, ctx);",
    "  for (const l of R.merites) {\n    if (SIM.parfumUnique && l.id === \"sansParfum\") continue;\n    const { pts, n } = evalueLigne(l, ctx);", "merites loop");
rep("if (f.fragrance && CONFIG.malusParfumFixe > fixe) { fixe = CONFIG.malusParfumFixe;",
    "if (f.fragrance && (SIM.parfumUnique ? SIM.tarifParfum : CONFIG.malusParfumFixe) > fixe) { fixe = (SIM.parfumUnique ? SIM.tarifParfum : CONFIG.malusParfumFixe);", "tarif parfum");

// 2. Comédogénicité hors formule (D4)
rep("const grav = Math.max(f.risks?.irritant || 0, Math.ceil((f.risks?.comedogenic || 0) / 2));\n    // spec",
    "const grav = SIM.comedoOut ? (f.risks?.irritant || 0) : Math.max(f.risks?.irritant || 0, Math.ceil((f.risks?.comedogenic || 0) / 2));\n    // spec", "grav");

// 3. Sensibilisant fort en formule + banni UE → cap (D2)
rep("    let fixe = 0, typeFixe = null;\n    if (f.fragrance",
    "    if (SIM.sensiFort && (f.risks?.sensibilisant || 0) >= 3 && !f.fragrance && !f.essentialOil) { const p3 = -5 * R.severite * (R.exposition ?? 1); score += p3; details.push({ type: \"sensibilisant-fort\", inci: it.name, pts: +p3.toFixed(1) }); }\n    if (SIM.sensiFort && f.banniUE && (R.exposition ?? 1) >= 1) cap = Math.min(cap, 45);\n    let fixe = 0, typeFixe = null;\n    if (f.fragrance", "sensiFort");

// 4. Actif prouvé : premier gratuit, empilement payé (variante S5)
rep("    if (grav >= 2 && !aMalusFixe && !dejaFactures.has(it.name)) {",
    "    let actifProuve = SIM.actifStack && f.role === \"active\" && (f.benefitPower || 0) >= 2 && (f.risks?.irritant || 0) <= 2 && (f.risks?.irritant || 0) >= 2;\n    if (actifProuve) { ctx.nActifsIrritants = (ctx.nActifsIrritants || 0) + 1; if (ctx.nActifsIrritants === 1) actifProuve = \"gratuit\"; else actifProuve = false; }\n    if (grav >= 2 && !aMalusFixe && !dejaFactures.has(it.name) && actifProuve !== \"gratuit\") {", "actifStack");

// 5. @actifTop5 avec lowDose (D5)
rep("\"@actifTop5\": (ctx) => ctx.list.some((it) => it.pos <= 5 && it.fiche?.role === \"active\" &&",
    "\"@actifTop5\": (ctx) => ctx.list.some((it) => (it.pos <= 5 || (SIM.lowDoseTop5 && it.fiche?.lowDose)) && it.fiche?.role === \"active\" &&", "actifTop5");

// 6. Perso : parfum UNE ligne (S1) ; canal irritant (D8) ; sensibilisants ≤2 allégés et plafonnés
rep("    const sensi = f.risks?.sensibilisant || 0;\n    if (sensi > 0 && (profil.sensitivity || 0) > 0 && !f.fragrance && !f.essentialOil) {\n      const pts = -CONFIG.malusSensibilisant * sensi * ((profil.sensitivity || 0) / 3) * w;\n      score += pts;",
    "    const sensi = f.risks?.sensibilisant || 0;\n    const S = profil.sensitivity || 0;\n    if (SIM.persoIrritant && S > 0 && !f.fragrance && !f.essentialOil && !f.dryingAlcohol && !(f.strength >= 1) && !(f.fonctions || []).includes(\"tensioactif-agressif\") && (f.risks?.irritant || 0) > 0) {\n      const expo = SIM.persoExposition ? (CONFIG.RUBRIQUES[categorie]?.exposition ?? 1) : 1; const pi = -2 * (f.risks.irritant) * (S / 3) * w * expo; irrCumul = irrCumul || 0; const reste = Math.max(0, 10 * S / 3 + irrCumul); const app = Math.max(pi, -reste); irrCumul += app; score += app;\n      if (app) facts.push({ label: `${titre(it.name)} — may sting on reactive skin`, points: +app.toFixed(1), inci: it.name, pos: it.pos });\n    }\n    if (sensi > 0 && S > 0 && !f.fragrance && !f.essentialOil && !(SIM.persoIrritant && sensi >= 3)) {\n      let pts = -(SIM.persoIrritant ? 1 : CONFIG.malusSensibilisant) * sensi * (S / 3) * w * (SIM.persoExposition ? (CONFIG.RUBRIQUES[categorie]?.exposition ?? 1) : 1);\n      if (SIM.persoPlafonds) { sensCumul = sensCumul || 0; const reste = Math.max(0, 8 * S / 3 + sensCumul); pts = Math.max(pts, -reste); sensCumul += pts; }\n      score += pts;", "sensibilisant perso");
rep("    if (f.fragrance && (profil.sensitivity || 0) > 0) {\n      const pts = -CONFIG.malusParfumSensible * profil.sensitivity;",
    "    if (f.fragrance && (profil.sensitivity || 0) > 0 && !(SIM.persoPlafonds && parfumFait)) {\n      parfumFait = true;\n      const pts = -CONFIG.malusParfumSensible * profil.sensitivity * (SIM.persoPlafonds ? (CONFIG.RUBRIQUES[categorie]?.exposition ?? 1) : 1);", "parfum perso");
rep("    if (f.essentialOil && (profil.sensitivity || 0) >= 2) {\n      score -= CONFIG.malusHEReactive;",
    "    if (f.essentialOil && (profil.sensitivity || 0) >= 2 && !(SIM.persoPlafonds && heFait)) {\n      heFait = true;\n      score -= CONFIG.malusHEReactive;", "HE perso");
rep("  let matchTotal = 0, capAbsolu = Infinity, strengthMax = 0;",
    "  let matchTotal = 0, capAbsolu = Infinity, strengthMax = 0;\n  let parfumFait = false, heFait = false, sensCumul = 0, irrCumul = 0;", "vars perso");
// 7. Force et alcool pondérés (D7/S11) : strengthMax seulement si w ≥ 0.6 ou lowDose ; alcool × w
rep("    strengthMax = Math.max(strengthMax, f.strength || 0);",
    "    if (!SIM.forcePonderee || w >= 0.6 || f.lowDose) strengthMax = Math.max(strengthMax, f.strength || 0);", "strengthMax");
rep("    if (f.dryingAlcohol && [\"dry\"].includes(profil.skinType)) {\n      score -= CONFIG.malusAlcoolSeche;",
    "    if (f.dryingAlcohol && [\"dry\"].includes(profil.skinType) && (!SIM.forcePonderee || it.pos <= 5)) {\n      score -= CONFIG.malusAlcoolSeche;", "alcool perso");
rep("    if (it.fiche?.strength) forceMax = Math.max(forceMax, it.fiche.strength);",
    "    if (it.fiche?.strength && (!SIM.forcePonderee || p <= 10 || it.fiche.lowDose)) forceMax = Math.max(forceMax, it.fiche.strength);", "forceMax");
// 8. cap formule appliqué en perso (S3)
rep("  return { score: clamp(score), bande: bande(clamp(score)), details, couverture, metier: R.metier,",
    "  return { score: clamp(score), cap, bande: bande(clamp(score)), details, couverture, metier: R.metier,", "cap retour");
rep("  score = Math.min(score, capAbsolu);\n  const final = clamp(score);",
    "  score = Math.min(score, capAbsolu, SIM.capPerso ? (F.cap ?? Infinity) : Infinity);\n  const final = clamp(score);", "cap perso");

fs.writeFileSync(new URL("./scoring-sim-dermato.mjs", import.meta.url), s);
console.log("ok, scoring-sim-dermato.mjs écrit");
