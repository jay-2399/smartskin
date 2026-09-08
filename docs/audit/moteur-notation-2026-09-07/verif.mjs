import fs from "node:fs";
process.chdir("/Users/jayenbellili/dev/smartskin.app");
const m = await import("./scoring-sim.mjs");
const o = await import("/Users/jayenbellili/dev/smartskin.app/src/lib/scan/scoring.mjs");
const c = JSON.parse(fs.readFileSync("data/scan/catalog.json", "utf8")).filter((p) => p.category !== "hors-perimetre" && p.inci && p.inci.length > 20);
const P = { skinType: "dry", sensitivity: 3, concerns: { dehydration: 3, redness: 2, barrier: 2 }, strengthCeiling: 0, pregnancy: false, allergies: [], besoinSolaire: 0, libelles: {} };
let d1 = 0, d2 = 0;
for (const p of c) { const a = m.scoreFormule(p.inci, p.category, p.filtresUV), b = o.scoreFormule(p.inci, p.category, p.filtresUV); if (a.score !== b.score) d1++; if (m.scorePerso(p.inci, P, p.category, a, p.filtresUV).score !== o.scorePerso(p.inci, P, p.category, b, p.filtresUV).score) d2++; }
console.log("copie patchée, drapeaux éteints : écarts formule", d1, "/ perso", d2, "sur", c.length);
const d = m.dict();
for (const k of ["MENTHOL", "HAMAMELIS VIRGINIANA (WITCH HAZEL) WATER", "ADAPALENE", "BENZYL ALCOHOL", "PROPYLENE GLYCOL", "OCTOCRYLENE", "COCAMIDOPROPYL BETAINE", "4-T-BUTYLCYCLOHEXANOL", "PHENETHYL ALCOHOL", "PHENYLPROPANOL", "ALCOHOL DENAT"]) { const v = d[k]; console.log(k.padEnd(42), v ? `role=${v.role} power=${v.benefitPower} irr=${v.risks.irritant} sens=${v.risks.sensibilisant} com=${v.risks.comedogenic} str=${v.strength} frag=${v.fragrance} HE=${v.essentialOil} lowDose=${!!v.lowDose} fn=${v.fonctions.join("+")}` : "ABSENT"); }
