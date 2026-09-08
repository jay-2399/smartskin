import fs from "node:fs";
let s = fs.readFileSync("/Users/jayenbellili/dev/smartskin.app/src/lib/scan/scoring.mjs", "utf8");
let n = 0;
const rep = (a, b) => { const c = s.split(a).length - 1; if (c !== 1) throw new Error(`patch ${++n}: ${c} occurrences de « ${a.slice(0, 60)} »`); s = s.replace(a, b); n++; };
// A — drapeaux + accès dictionnaire
rep(`const D = path.join(process.cwd(), "data", "scan") + path.sep;`,
`const D = path.join(process.cwd(), "data", "scan") + path.sep;
export const SIM = { d10: false, s5: false, d4: false, actifsW: false, dedup: false, capPerso: false, parfumUneFois: false, d8: false, d7: false, actifTop5LowDose: false, prerequisMono: false, lowDoseSousBarre: false };
export const dict = () => DICT;
export const resetSim = () => { for (const k of Object.keys(SIM)) SIM[k] = false; };`);
// cache du max de grille désactivé (les grilles sont mutées entre variantes)
rep(`  if (_maxCache.has(R.label)) return _maxCache.get(R.label);\n`, ``);
// B — @actifTop5 accepte lowDose (D5)
rep(`"@actifTop5": (ctx) => ctx.list.some((it) => it.pos <= 5 && it.fiche?.role === "active" &&`,
    `"@actifTop5": (ctx) => ctx.list.some((it) => (it.pos <= 5 || (SIM.actifTop5LowDose && it.fiche?.lowDose)) && it.fiche?.role === "active" &&`);
// C — @troisActifs : w ≥ 0,6, dédoublonné, ou un actif fort en tête (P6b)
rep(`"@troisActifs": (ctx) => ctx.list.filter((it) => it.fiche?.role === "active" && it.fiche.benefits?.length).length >= 3 ? 1 : 0,`,
`"@troisActifs": (ctx) => { const vus = new Set();
    const n = ctx.list.filter((it) => it.fiche?.role === "active" && it.fiche.benefits?.length && (!SIM.actifsW || ctx.w(it) >= 0.6) && (!SIM.dedup || (!vus.has(it.name) && vus.add(it.name)))).length;
    return (n >= 3 || (SIM.prerequisMono && PREDICATS["@actifTop5"](ctx))) ? 1 : 0; },`);
// D — @actifs : w ≥ 0,6 + dédoublonnage
rep(`      const parFamille = {};
      for (const it of ctx.list) {
        const f = it.fiche;
        if (!f || f.role !== "active" || !f.benefits?.length) continue;`,
`      const parFamille = {}; const vusA = new Set();
      for (const it of ctx.list) {
        const f = it.fiche;
        if (!f || f.role !== "active" || !f.benefits?.length) continue;
        if (SIM.actifsW && ctx.w(it) < 0.6) continue;
        if (SIM.dedup) { if (vusA.has(it.name)) continue; vusA.add(it.name); }`);
// E — lignes par fonction : dédoublonnage
rep(`  const vus = new Set();
  let total = 0, n = 0;
  for (const it of ctx.list) {
    if (l.maxPos && it.pos > l.maxPos) continue;`,
`  const vus = new Set(); const vusN = new Set();
  let total = 0, n = 0;
  for (const it of ctx.list) {
    if (l.maxPos && it.pos > l.maxPos) continue;
    if (SIM.dedup) { if (vusN.has(it.name)) continue; vusN.add(it.name); }`);
// F — D4 : comédogène hors gravité
rep(`    const grav = Math.max(f.risks?.irritant || 0, Math.ceil((f.risks?.comedogenic || 0) / 2));
    // spec §5.2`,
`    const grav = SIM.d4 ? (f.risks?.irritant || 0) : Math.max(f.risks?.irritant || 0, Math.ceil((f.risks?.comedogenic || 0) / 2));
    // spec §5.2`);
// G — S5 : pas de malus générique pour un actif power 3 irritant ≤ 2
rep(`    if (grav >= 2 && !aMalusFixe && !dejaFactures.has(it.name)) {`,
`    const exemptS5 = SIM.s5 && f.role === "active" && (f.benefitPower || 0) >= 3 && (f.risks?.irritant || 0) <= 2 && Math.ceil((f.risks?.comedogenic || 0) / 2) < 2;
    if (grav >= 2 && !aMalusFixe && !dejaFactures.has(it.name) && !exemptS5) {`);
// H — renvoyer le cap
rep(`  return { score: clamp(score), bande: bande(clamp(score)), details, couverture, metier: R.metier,`,
    `  return { score: clamp(score), bande: bande(clamp(score)), details, couverture, metier: R.metier, cap, brut: score,`);
// I — cap appliqué en perso
rep(`  score = Math.min(score, capAbsolu);`, `  score = Math.min(score, capAbsolu, SIM.capPerso ? (F.cap ?? Infinity) : Infinity);`);
// J — perso : déclarations
rep(`  let matchTotal = 0, capAbsolu = Infinity, strengthMax = 0;`,
    `  let matchTotal = 0, capAbsolu = Infinity, strengthMax = 0; let parfumVu = false, heVu = false, sensiTotal = 0;
  const grille0 = CONFIG.RUBRIQUES[categorie] || CONFIG.RUBRIQUES.indetermine;`);
// K — D7 : force pondérée
rep(`    strengthMax = Math.max(strengthMax, f.strength || 0);`, `    if (!SIM.d7 || w >= 0.6) strengthMax = Math.max(strengthMax, f.strength || 0);`);
rep(`    if (it.fiche?.strength) forceMax = Math.max(forceMax, it.fiche.strength);`,
    `    if (it.fiche?.strength && (!SIM.d7 || p <= 10 || it.fiche.lowDose)) forceMax = Math.max(forceMax, it.fiche.strength);`);
// L — sensibilisants : plafond (S1) et D8
rep(`    const sensi = f.risks?.sensibilisant || 0;
    if (sensi > 0 && (profil.sensitivity || 0) > 0 && !f.fragrance && !f.essentialOil) {
      const pts = -CONFIG.malusSensibilisant * sensi * ((profil.sensitivity || 0) / 3) * w;
      score += pts;`,
`    const sensi = f.risks?.sensibilisant || 0; const S = profil.sensitivity || 0;
    const sensiOk = SIM.d8 ? (sensi === 3 ? S > 0 : (sensi > 0 && S >= 3)) : (sensi > 0 && S > 0);
    if (sensiOk && !f.fragrance && !f.essentialOil) {
      let pts = (SIM.d8 && sensi < 3) ? -1 * w : -CONFIG.malusSensibilisant * sensi * (S / 3) * w;
      if (SIM.parfumUneFois) { pts = Math.min(0, Math.max(pts, -12 * (S / 3) - sensiTotal)); sensiTotal += pts; }
      score += pts;`);
rep(`    // flags perso (le malus parfum formule+perso s'affiche en UNE ligne : on fusionne ici)`,
`    if (SIM.d8 && (f.risks?.irritant || 0) >= 1 && (f.risks?.irritant || 0) <= 2 && S > 0 && !f.fragrance && !f.essentialOil) {
      const pts = -2 * f.risks.irritant * (S / 3) * w;
      score += pts;
      facts.push({ label: \`\${titre(it.name)} — may sting on reactive skin\`, points: +pts.toFixed(1), inci: it.name, pos: it.pos });
    }
    // flags perso (le malus parfum formule+perso s'affiche en UNE ligne : on fusionne ici)`);
// M — parfum perso une fois (+ exposition si d10)
rep(`    if (f.fragrance && (profil.sensitivity || 0) > 0) {
      const pts = -CONFIG.malusParfumSensible * profil.sensitivity;`,
`    if (f.fragrance && (profil.sensitivity || 0) > 0 && !(SIM.parfumUneFois && parfumVu)) { parfumVu = true;
      const pts = -CONFIG.malusParfumSensible * profil.sensitivity * (SIM.d10 ? (grille0.exposition ?? 1) : 1);`);
// N — HE perso une fois
rep(`    if (f.essentialOil && (profil.sensitivity || 0) >= 2) {
      score -= CONFIG.malusHEReactive;`,
`    if (f.essentialOil && (profil.sensitivity || 0) >= 2 && !(SIM.parfumUneFois && heVu)) { heVu = true;
      score -= CONFIG.malusHEReactive;`);
// O — alcool perso pondéré (D7)
rep(`    if (f.dryingAlcohol && ["dry"].includes(profil.skinType)) {
      score -= CONFIG.malusAlcoolSeche;
      facts.push({ label: \`Drying alcohol — hard on your dry skin\`, points: -CONFIG.malusAlcoolSeche, inci: it.name });`,
`    if (f.dryingAlcohol && ["dry"].includes(profil.skinType)) {
      const alc = SIM.d7 ? CONFIG.malusAlcoolSeche * w : CONFIG.malusAlcoolSeche;
      score -= alc;
      facts.push({ label: \`Drying alcohol — hard on your dry skin\`, points: -alc, inci: it.name });`);
// P — lowDose sous la barre → 0,6 (P6d)
rep(`  if (it.fiche?.lowDose) return 1.0;`, `  if (it.fiche?.lowDose) return (SIM.lowDoseSousBarre && it.pos >= barre) ? 0.6 : 1.0;`);
fs.writeFileSync("scoring-sim.mjs", s);
console.log("patches appliqués :", n);
