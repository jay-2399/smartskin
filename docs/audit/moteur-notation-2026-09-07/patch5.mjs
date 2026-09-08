import fs from "node:fs";
let s = fs.readFileSync("scoring-sim.mjs", "utf8");
let n = 0;
const rep = (a, b) => { const c = s.split(a).length - 1; if (c !== 1) throw new Error(`patch5 #${n + 1}: ${c} occurrence(s) de « ${a.slice(0, 70)} »`); s = s.replace(a, b); n++; };
// 1 — drapeaux
rep(`d9: false };`, `d9: false, s5Mode: false, prereqMode: false, comedoMode: false, banMode: false, sensi3Formule: false, forceFusion: false, texture: false, uvData: false, perfumeAlias: false, ld10: false, d8Dermato: false, matchScale: false };`);
// 2 — alias parfum au parsing
rep(`    if (["PARFUM", "PARFUM (FRAGRANCE)", "FRAGRANCE (PARFUM)"].includes(t)) t = "FRAGRANCE";`,
`    if (["PARFUM", "PARFUM (FRAGRANCE)", "FRAGRANCE (PARFUM)"].includes(t)) t = "FRAGRANCE";
    if (SIM.perfumeAlias && /\\b(PARFUM|FRAGRANCE|PERFUME|AROMA)\\b/.test(t) && !/AROMATIC/.test(t)) t = "FRAGRANCE";`);
// 3 — lowDose LD10 (produit) : 1 en top 10 ou avant la barre, 0,6 après
rep(`  if (it.fiche?.lowDose) return (SIM.lowDoseSousBarre && it.pos >= barre) ? 0.6 : 1.0;`,
    `  if (it.fiche?.lowDose) return (SIM.ld10 ? (it.pos > 10 && it.pos >= barre) : (SIM.lowDoseSousBarre && it.pos >= barre)) ? 0.6 : 1.0;`);
// 4 — prédicats
rep(`    || ctx.list.some((it) => /OCTOCRYLENE|TINOSORB|BEMOTRIZINOL|BISOCTRIZOLE|POLYSILICONE-15|DIETHYLHEXYL/.test(it.name))) ? 1 : 0,`,
`    || ctx.list.some((it) => (SIM.uvData ? /OCTOCRYLENE|BIS-ETHYLHEXYLOXYPHENOL METHOXYPHENYL TRIAZINE|METHYLENE BIS-BENZOTRIAZOLYL|ETHYLHEXYL METHOXYCRYLENE|BUTYLOCTYL SALICYLATE|POLYSILICONE-15|DIETHYLHEXYL 2,6-NAPHTHALATE|DIETHYLHEXYL SYRINGYLIDENEMALONATE|DIETHYLHEXYL BUTAMIDO TRIAZONE/ : /OCTOCRYLENE|TINOSORB|BEMOTRIZINOL|BISOCTRIZOLE|POLYSILICONE-15|DIETHYLHEXYL/).test(it.name))) ? 1 : 0,`);
rep(`  "@filtresUV": (ctx) => (ctx.aFonction("filtre-uva") || ctx.aFonction("filtre-uvb")) ? 1 : 0,`,
    `  "@filtresUV": (ctx) => (ctx.aFonction("filtre-uva") || ctx.aFonction("filtre-uvb") || (SIM.uvData && ctx.cat === "sunscreen" && ctx.filtresUV)) ? 1 : 0,`);
rep(`  "@troisActifs": (ctx) => { const vus = new Set();
    const n = ctx.list.filter((it) => it.fiche?.role === "active" && it.fiche.benefits?.length && (!SIM.actifsW || ctx.w(it) >= 0.6) && (!SIM.dedup || (!vus.has(it.name) && vus.add(it.name)))).length;
    return (n >= 3 || (SIM.prerequisMono && PREDICATS["@actifTop5"](ctx))) ? 1 : 0; },`,
`  "@troisActifs": (ctx) => { const vus = new Set();
    if (SIM.prereqMode === "d6d" && ctx.cat !== "mask") return PREDICATS["@prereqD6d"](ctx);
    const filtre = SIM.prereqMode === "d6d" ? false : SIM.actifsW;
    const n = ctx.list.filter((it) => it.fiche?.role === "active" && it.fiche.benefits?.length && (!filtre || ctx.w(it) >= 0.6) && (!SIM.dedup || (!vus.has(it.name) && vus.add(it.name)))).length;
    const mono = (SIM.prerequisMono || SIM.prereqMode === "mono") && ctx.list.some((it) => it.fiche?.role === "active" && (it.fiche.benefitPower || 0) >= 3 && (it.pos <= 5 || it.fiche.lowDose));
    return (n >= 3 || mono) ? 1 : 0; },
  "@prereqD6d": (ctx) => { const GLY = /^(GLYCERIN|BUTYLENE GLYCOL|PROPANEDIOL|PENTYLENE GLYCOL|PROPYLENE GLYCOL|DIPROPYLENE GLYCOL|1,2-HEXANEDIOL|CAPRYLYL GLYCOL|HEXYLENE GLYCOL|1,3-PROPANEDIOL|METHYLPROPANEDIOL|1,2-HEPTANEDIOL)\\b/;
    const dose = ctx.list.some((it) => it.fiche?.role === "active" && (it.fiche.benefitPower || 0) >= 2 && it.fiche.benefits?.length && ctx.w(it) >= 0.6 && !GLY.test(it.name));
    const hum = ctx.list.some((it) => it.fiche?.role === "active" && (it.fiche.fonctions || []).includes("humectant") && !GLY.test(it.name));
    return (dose || hum) ? 1 : 0; },
  "@douceur": (ctx) => (ctx.aFonction("tensioactif-doux") || ((ctx.aFonction("emollient") || ctx.aFonction("emulsifiant") || ctx.aFonction("occlusif")) && !ctx.aFonction("tensioactif-agressif") && !PREDICATS["@savon"](ctx))) ? 1 : 0,`);
// 5 — contexte : catégorie et drapeau UV
rep(`  const ctx = {
    list, barre, w: (it) => wPos(it, barre),`,
`  const ctx = {
    list, barre, w: (it) => wPos(it, barre), cat: categorie, filtresUV: !!filtresUV,`);
// 6 — trois tarifs d'irritance des actifs prouvés
rep(`  const vusRisque = new Set();`, `  const vusRisque = new Set(); let nActifsIrritants = 0;`);
rep(`    const exemptS5 = SIM.s5 && f.role === "active" && (f.benefitPower || 0) >= 3 && (f.risks?.irritant || 0) <= 2 && Math.ceil((f.risks?.comedogenic || 0) / 2) < 2;
    if (grav >= 2 && !aMalusFixe && !dejaFactures.has(it.name) && !exemptS5) {`,
`    const actifIrritant = f.role === "active" && (f.risks?.irritant || 0) === 2 && Math.ceil((f.risks?.comedogenic || 0) / 2) < 2;
    let factS5 = 1;
    if ((SIM.s5 || SIM.s5Mode === "full") && actifIrritant && (f.benefitPower || 0) >= 3) factS5 = 0;
    if (SIM.s5Mode === "half" && actifIrritant && (f.benefitPower || 0) >= 3) factS5 = 0.5;
    if (SIM.s5Mode === "first" && actifIrritant && (f.benefitPower || 0) >= 2 && wPos(it, barre) >= 0.6) { nActifsIrritants += 1; if (nActifsIrritants === 1) factS5 = 0; }
    const exemptS5 = factS5 === 0;
    if (grav >= 2 && !aMalusFixe && !dejaFactures.has(it.name) && !exemptS5) {`);
rep(`      const pts = -CONFIG.malusRisque * grav * wPos(it, barre) * R.severite * (R.exposition ?? 1);
      score += pts;
      details.push({ type: "risque", inci: it.name, pos: it.pos, pts: +pts.toFixed(1), grav });`,
`      const pts = -CONFIG.malusRisque * grav * wPos(it, barre) * R.severite * (R.exposition ?? 1) * factS5;
      score += pts;
      details.push({ type: "risque", inci: it.name, pos: it.pos, pts: +pts.toFixed(1), grav });`);
// 7 — bannis UE (portée posé) et sensibilisants 3 en formule
rep(`    let fixe = 0, typeFixe = null;`,
`    if (SIM.banMode && f.banniUE) {
      if ((R.exposition ?? 1) >= 1) { cap = Math.min(cap, SIM.banMode); details.push({ type: "banni", inci: it.name, cap: SIM.banMode }); }
      else { const pb = -5 * (R.exposition ?? 1); score += pb; details.push({ type: "banni", inci: it.name, pts: +pb.toFixed(1) }); }
    }
    if (SIM.sensi3Formule && (f.risks?.sensibilisant || 0) >= 3 && !f.fragrance && !f.essentialOil) { const ps = -5 * R.severite * (R.exposition ?? 1); score += ps; details.push({ type: "sensibilisant3", inci: it.name, pts: +ps.toFixed(1) }); }
    let fixe = 0, typeFixe = null;`);
// 8 — perso : déclarations
rep(`let parfumVu = false, heVu = false, sensiTotal = 0;`, `let parfumVu = false, heVu = false, sensiTotal = 0, irrTotal = 0, comedoTotal = 0;`);
// 9 — échelle des matchs par preuve
rep(`        const pts = Math.min(CONFIG.bonusMatch * sev * w, CONFIG.maxMatchParIngredient);`,
`        const echelle = SIM.matchScale === "p3" ? (f.benefitPower || 1) / 3 : SIM.matchScale === "p14" ? (1 + (f.benefitPower || 1)) / 4 : 1;
        const pts = Math.min(CONFIG.bonusMatch * sev * w * echelle, CONFIG.maxMatchParIngredient);`);
// 10 — canal sensibilisant / irritant version dermato
rep(`    const sensiOk = SIM.d8 ? (sensi === 3 ? S > 0 : (sensi > 0 && S >= 3)) : (sensi > 0 && S > 0);
    if (sensiOk && !f.fragrance && !f.essentialOil) {
      let pts = (SIM.d8 && sensi < 3) ? -1 * w : -CONFIG.malusSensibilisant * sensi * (S / 3) * w;
      if (SIM.parfumUneFois) { pts = Math.min(0, Math.max(pts, -12 * (S / 3) - sensiTotal)); sensiTotal += pts; }`,
`    const sensiOk = SIM.d8Dermato ? (sensi > 0 && sensi < 3 && S > 0) : SIM.d8 ? (sensi === 3 ? S > 0 : (sensi > 0 && S >= 3)) : (sensi > 0 && S > 0);
    if (sensiOk && !f.fragrance && !f.essentialOil) {
      let pts = SIM.d8Dermato ? -1 * sensi * (S / 3) * w * (grille0.exposition ?? 1) : (SIM.d8 && sensi < 3) ? -1 * w : -CONFIG.malusSensibilisant * sensi * (S / 3) * w;
      if (SIM.d8Dermato) { pts = Math.min(0, Math.max(pts, -8 * (S / 3) - sensiTotal)); sensiTotal += pts; }
      else if (SIM.parfumUneFois) { pts = Math.min(0, Math.max(pts, -12 * (S / 3) - sensiTotal)); sensiTotal += pts; }`);
rep(`    if (SIM.d8 && (f.risks?.irritant || 0) >= (SIM.d8min || 1) && (f.risks?.irritant || 0) <= 2 && S > 0 && !f.fragrance && !f.essentialOil) {
      const pts = -2 * f.risks.irritant * (S / 3) * w;
      score += pts;`,
`    const irrOk = SIM.d8Dermato ? ((f.risks?.irritant || 0) === 2 && S > 0 && !f.fragrance && !f.essentialOil && !((f.strength || 0) >= 1) && !f.dryingAlcohol && !(f.fonctions || []).includes("tensioactif-agressif"))
      : (SIM.d8 && (f.risks?.irritant || 0) >= (SIM.d8min || 1) && (f.risks?.irritant || 0) <= 2 && S > 0 && !f.fragrance && !f.essentialOil);
    if (irrOk) {
      let pts = -2 * f.risks.irritant * (S / 3) * w * (SIM.d8Dermato ? (grille0.exposition ?? 1) : 1);
      if (SIM.d8Dermato) { pts = Math.min(0, Math.max(pts, -10 * (S / 3) - irrTotal)); irrTotal += pts; }
      score += pts;`);
// 11 — comédogène côté perso : trois modes
rep(`    if ((f.risks?.comedogenic || 0) >= 3 && ["oily", "combination"].includes(profil.skinType)) {
      const pts = -CONFIG.malusComedoGras * w;
      score += pts;`,
`    const com = f.risks?.comedogenic || 0; const grasse = ["oily", "combination"].includes(profil.skinType); const preoc = !!(profil.concerns?.blemishes || profil.concerns?.oiliness);
    const comOk = !SIM.comedoMode ? (com >= 3 && grasse) : SIM.comedoMode === "dermato" ? (com >= 4 && preoc) : ((com >= 4 || (com >= 3 && it.pos <= 5)) && (grasse || preoc));
    if (comOk) {
      let pts = -CONFIG.malusComedoGras * w;
      if (SIM.comedoMode) { pts = Math.min(0, Math.max(pts, -6 - comedoTotal)); comedoTotal += pts; }
      score += pts;`);
// 12 — alcool aussi pour la peau réactive (dermato)
rep(`    if (f.dryingAlcohol && ["dry"].includes(profil.skinType)) {`, `    if (f.dryingAlcohol && (["dry"].includes(profil.skinType) || (SIM.d8Dermato && S >= 2))) {`);
// 13 — fusion des deux lignes force
rep(`  const depassement = Math.max(0, strengthMax - (profil.strengthCeiling ?? 2));
  if (depassement > 0) {
    const pts = -CONFIG.malusForceParCran * depassement;`,
`  const depassement = Math.max(0, strengthMax - (profil.strengthCeiling ?? 2));
  const acidePose = SIM.forceFusion && (profil.sensitivity || 0) >= 2 && natureProduit(list).forceMax >= 2 && ["exfoliant", "treatment", "toner"].includes(categorie);
  if (depassement > 0 || acidePose) {
    const pts = -CONFIG.malusForceParCran * depassement - (acidePose ? 5 : 0);`);
rep(`  if (sensible && nat.forceMax >= 2 && ["exfoliant", "treatment", "toner"].includes(categorie)) {`,
    `  if (!SIM.forceFusion && sensible && nat.forceMax >= 2 && ["exfoliant", "treatment", "toner"].includes(categorie)) {`);
// 14 — texture : rien sur les rincés, « légère » seulement crèmes / yeux
rep(`  if (nat.riche) {
    const pts = CONFIG.richesse.riche[peau] ?? 0;`,
`  const textureOk = !SIM.texture || (grille0.exposition ?? 1) >= 1;
  if (nat.riche && textureOk) {
    const pts = CONFIG.richesse.riche[peau] ?? 0;`);
rep(`  } else if (nat.legere) {
    const pts = CONFIG.richesse.legere[peau] ?? 0;`,
`  } else if (nat.legere && textureOk && (!SIM.texture || ["moisturizer", "eye-cream"].includes(categorie))) {
    const pts = CONFIG.richesse.legere[peau] ?? 0;`);
fs.writeFileSync("scoring-sim.mjs", s);
console.log("patch5 : " + n + " remplacements");
