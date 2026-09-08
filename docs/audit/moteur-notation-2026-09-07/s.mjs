// usage: node s.mjs "<regex>" [max] [--inci] [--perso]   (cwd = racine du dépôt)
import fs from "node:fs";
const m = await import(process.cwd() + "/src/lib/scan/scoring.mjs");
const c = JSON.parse(fs.readFileSync("data/scan/catalog.json", "utf8"));
const [re, max = "8", ...flags] = process.argv.slice(2);
const R = new RegExp(re, "i");
const hits = c.map((p, i) => ({ ...p, id: i })).filter((p) => R.test(p.name) || R.test(p.brand || ""));
const PROFILS = {
  sensibleSeche: { skinType: "dry", sensitivity: 3, concerns: { redness: 2, dehydration: 2 }, strengthCeiling: 1, pregnancy: false, allergies: [], besoinSolaire: 0, libelles: {} },
  grasseAcne: { skinType: "oily", sensitivity: 0, concerns: { blemishes: 3, oiliness: 2 }, strengthCeiling: 3, pregnancy: false, allergies: [], besoinSolaire: 1, libelles: {} },
  normale: { skinType: "normal", sensitivity: 1, concerns: { aging: 1 }, strengthCeiling: 2, pregnancy: false, allergies: [], besoinSolaire: 0, libelles: {} },
};
console.log(`${hits.length} produits pour /${re}/`);
for (const p of hits.slice(0, +max)) {
  const f = m.scoreFormule(p.inci, p.category, p.filtresUV);
  const det = f.details.map((d) => d.type === "merite" ? `+${d.pts} ${d.id}` : d.type === "risque" ? `${d.pts} ${d.inci}@${d.pos}(g${d.grav})` : d.type === "complexe-parfumant" ? `${d.pts} parfum(${d.nComposants})` : `${d.pts} ${d.id || d.type}${d.inci ? " " + d.inci : ""}`).join(" | ");
  console.log(`\n[${p.id}] ${p.brand} | ${p.name} | cat=${p.category} uv=${!!p.filtresUV} | n=${f.nIngredients} couv=${f.couverture.toFixed(2)}${f.analysePartielle ? " PARTIELLE" : ""}`);
  console.log(`  FORMULE ${f.score} (${f.bande})  ${det}`);
  if (flags.includes("--perso")) for (const [k, pr] of Object.entries(PROFILS)) {
    const s = m.scorePerso(p.inci, pr, p.category, f, p.filtresUV);
    console.log(`  PERSO ${k}: ${s.score} (${s.bande})  ` + s.facts.map((x) => `${x.points ?? "ABS"} ${x.label}`).join(" | "));
  }
  if (flags.includes("--inci")) console.log("  INCI: " + p.inci);
}
