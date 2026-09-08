import { P, rep, genere } from "./variants.mjs";
P.S5h = (s) => {
  s = rep(s, "if (grav >= 2 && !aMalusFixe && !dejaFactures.has(it.name)) {", "const actifProuve = f.role === \"active\" && (f.benefitPower || 0) >= 3 && (f.risks?.irritant || 0) <= 2 && grav === (f.risks?.irritant || 0);\n    if (grav >= 2 && !aMalusFixe && !dejaFactures.has(it.name)) {", "S5h");
  return rep(s, "const pts = -CONFIG.malusRisque * grav * wPos(it, barre) * R.severite * (R.exposition ?? 1);", "const pts = -CONFIG.malusRisque * grav * wPos(it, barre) * R.severite * (R.exposition ?? 1) * (actifProuve ? 0.5 : 1);", "S5h pts");
};
P.D6c = (s) => rep(s, /"@troisActifs": \(ctx\) => [^\n]*\n/, '"@troisActifs": (ctx) => ctx.list.some((it) => it.fiche?.role === "active" && it.fiche.benefits?.length && (it.fiche.benefitPower || 0) >= 2 && !/^(GLYCERIN|PROPANEDIOL|BUTYLENE GLYCOL|PROPYLENE GLYCOL|PENTYLENE GLYCOL|GLYCERIN \\(.*)$/.test(it.name) && (ctx.w(it) >= 0.6 || it.fiche.lowDose)) ? 1 : 0,\n', "D6c");
P.LD10 = (s) => rep(s, "if (it.fiche?.lowDose) return 1.0;", "if (it.fiche?.lowDose) return (it.pos <= 10 || it.pos < barre) ? 1.0 : 0.6;", "LD10");
P.D8b = (s) => rep(s, "    const sensi = f.risks?.sensibilisant || 0;\n    if (sensi > 0 && (profil.sensitivity || 0) > 0 && !f.fragrance && !f.essentialOil) {\n      const pts = -CONFIG.malusSensibilisant * sensi * ((profil.sensitivity || 0) / 3) * w;",
  "    const irr = f.risks?.irritant || 0;\n    if (irr >= 2 && (profil.sensitivity || 0) > 0 && !f.fragrance && !f.essentialOil) {\n      const pts = -2 * irr * ((profil.sensitivity || 0) / 3) * w;\n      score += pts;\n      facts.push({ label: `${titre(it.name)} — may sting on reactive skin`, points: +pts.toFixed(1), inci: it.name, pos: it.pos });\n    }\n    const sensi = f.risks?.sensibilisant || 0;\n    if (sensi >= 2 && (profil.sensitivity || 0) >= 3 && !f.fragrance && !f.essentialOil) {\n      const pts = -1 * w;", "D8b");
const SETS2 = {
  D10b: ["S1", "D10b"],
  S5h: ["S1", "S5h"], S5hD8b: ["S1", "S5h", "D8b"],
  D6c: ["S1", "UNI", "D6c"], D5UNIS4LD10: ["S1", "UNI", "D6c", "D5", "S4", "LD10"], D8b: ["S1", "D8b"],
  FINALb: ["S1", "DICO", "DOUX", "UV", "UNI", "D6b", "D5", "LD06", "S4", "D4p", "DOSE", "S3", "D2", "D9", "D10b"],
  FINAL2: ["S1", "DICO", "DOUX", "UV", "UNI", "D6c", "D5", "S4", "LD10", "D4p", "DOSE", "S3", "D2", "D9", "D10", "D8b", "S5h"],
};
for (const [n, p] of Object.entries(SETS2)) { genere(n, p); console.log("ok", n); }
P.D10p = (s) => rep(s, "      const pts = -CONFIG.malusParfumSensible * profil.sensitivity;", "      const pts = -CONFIG.malusParfumSensible * profil.sensitivity * ((CONFIG.RUBRIQUES[categorie] || CONFIG.RUBRIQUES.indetermine).exposition ?? 1);", "D10p");
P.D6d = (s) => {
  s = rep(s, "    list, barre, ", "    list, barre, categorie, ", "D6d ctx");
  return rep(s, /"@troisActifs": \(ctx\) => [^\n]*\n/, '"@troisActifs": (ctx) => { const ok = (it) => it.fiche?.role === "active" && it.fiche.benefits?.length; if (ctx.categorie === "mask") return ctx.list.filter(ok).length >= 3 ? 1 : 0; const base = /^(GLYCERIN|PROPANEDIOL|BUTYLENE GLYCOL|PROPYLENE GLYCOL|PENTYLENE GLYCOL|GLYCERIN \\(.*)$/; const dose = (it) => (ctx.w(it) >= 0.6 || it.fiche.lowDose) && (it.fiche.benefitPower || 0) >= 2 && !base.test(it.name); const hydratant = (it) => (it.fiche.fonctions || []).includes("humectant") && (it.fiche.benefitPower || 0) >= 2 && !base.test(it.name); return ctx.list.some((it) => ok(it) && (dose(it) || hydratant(it))) ? 1 : 0; },\n', "D6d");
};
genere("FINAL3", ["S1", "DICO", "DOUX", "UV", "UNI", "D6d", "D5", "S4", "LD10", "D4p", "DOSE", "S3", "D2", "D9", "D10p", "D8b", "S5h"]); console.log("ok FINAL3");
