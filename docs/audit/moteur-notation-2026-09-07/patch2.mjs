import fs from "node:fs";
let s = fs.readFileSync("scoring-sim.mjs", "utf8");
const a = `(f.risks?.irritant || 0) >= 1 && (f.risks?.irritant || 0) <= 2 && S > 0`;
if (s.split(a).length !== 2) throw new Error("d8min introuvable");
s = s.replace(a, `(f.risks?.irritant || 0) >= (SIM.d8min || 1) && (f.risks?.irritant || 0) <= 2 && S > 0`);
if (!s.includes(`lowDoseSousBarre: false };`)) throw new Error("SIM");
s = s.replace(`lowDoseSousBarre: false };`, `lowDoseSousBarre: false, d8min: false };`);
fs.writeFileSync("scoring-sim.mjs", s);
let t = fs.readFileSync("sim2.mjs", "utf8");
const rep = (x, y) => { if (t.split(x).length !== 2) throw new Error("sim2 : " + x.slice(0, 50)); t = t.replace(x, y); };
rep(`  BASE: () => {},`, `  D8B: () => { m.SIM.d8 = true; m.SIM.d8min = 2; },
  P4: () => { m.CONFIG.RUBRIQUES.cleanser.prerequis[0].quoi = ["tensioactif-doux", "emollient", "emulsifiant"]; },
  P5: () => { m.CONFIG.RUBRIQUES["makeup-remover"].prerequis[0].quoi = ["emollient", "occlusif", "tensioactif-doux", "emulsifiant"]; },
  POND: () => { for (const R of Object.values(m.CONFIG.RUBRIQUES)) for (const l of R.merites) if (["antiox", "lipides"].includes(l.id)) l.pondere = true; },
  BASE: () => {},`);
rep(`"VT Cosmetics PDRN": find(/VT Cosmetics.*PDRN|PDRN.*VT/, "serum"),`, `"VT Cosmetics PDRN": find(/PDRN/, "serum", (p) => m.scoreFormule(p.inci, "serum", p.filtresUV).score >= 90) || find(/VT Cosmetics.*PDRN/, "serum"),`);
rep(`const PAQUET = ["S1", "V1", "S6", "ACTW", "MONO", "D5", "S5", "D8", "D4", "D7", "S3", "D3", "ZNO", "PG"];`,
    `const PAQUET = ["S1", "V1", "S6", "ACTW", "MONO", "D5", "P6D", "POND", "S5", "D8B", "D4", "D7", "S3", "D3", "ZNO", "PG", "P4", "P5"];`);
rep(`"PAQUET sans V1 (mérite parfum gardé)": PAQUET.filter((x) => x !== "V1")`, `"PAQUET sans V1 (mérite parfum gardé)": PAQUET.filter((x) => x !== "V1"), "PAQUET avec D10 au lieu de V1": [...PAQUET.filter((x) => x !== "V1"), "D10"]`);
t += fs.readFileSync("sections-sup.txt", "utf8");
fs.writeFileSync("sim2.mjs", t);
console.log("patch2 ok");
