import fs from "node:fs";
const m = await import(process.cwd() + "/src/lib/scan/scoring.mjs");
const c = JSON.parse(fs.readFileSync("data/scan/catalog.json", "utf8")).map((p, i) => ({ ...p, id: i }));
const byCat = {};
const rows = [];
for (const p of c) {
  if (p.category === "hors-perimetre" || !p.inci) continue;
  const f = m.scoreFormule(p.inci, p.category, p.filtresUV);
  rows.push({ p, f });
  (byCat[p.category] ??= []).push(f.score);
}
const q = (a, x) => { const s = [...a].sort((u, v) => u - v); return s[Math.floor(x * (s.length - 1))]; };
console.log("cat | n | moy | p10 | p50 | p90 | %vert | %rouge");
for (const [k, v] of Object.entries(byCat)) console.log(k.padEnd(15), v.length, (v.reduce((a, b) => a + b, 0) / v.length).toFixed(1), q(v, .1), q(v, .5), q(v, .9), (100 * v.filter(x => x >= 75).length / v.length).toFixed(0) + "%", (100 * v.filter(x => x < 45).length / v.length).toFixed(0) + "%");
// solaires : sans filtre détecté / sans spectre
const sun = rows.filter(r => r.p.category === "sunscreen");
const sansFiltre = sun.filter(r => r.f.details.some(d => d.id === "filtres"));
const sansSpectre = sun.filter(r => !r.f.details.some(d => d.id === "spectre") && !r.f.details.some(d => d.id === "filtres"));
console.log(`\nSOLAIRES: ${sun.length} ; 'no UV filter at all' : ${sansFiltre.length} ; filtre détecté mais pas 'spectre large' : ${sansSpectre.length}`);
sansFiltre.slice(0, 40).forEach(r => console.log("  sansFiltre", r.f.score, "|", r.p.brand, "|", r.p.name, "| uv=", r.p.filtresUV));
// parmi sansSpectre : combien ont ZINC OXIDE
const zno = sansSpectre.filter(r => /ZINC OXIDE/i.test(r.p.inci));
console.log(`  parmi les ${sansSpectre.length} sans 'spectre' : ${zno.length} contiennent ZINC OXIDE (large spectre par nature)`);
zno.slice(0, 12).forEach(r => console.log("   ", r.f.score, "|", r.p.brand, "|", r.p.name));
// non-solaires avec bonus filtres-uv
const bonusUV = rows.filter(r => r.p.category !== "sunscreen" && r.f.details.some(d => d.type === "filtres-uv"));
console.log(`\nNON-SOLAIRES avec bonus +8 'filtres-uv' : ${bonusUV.length}`);
const parCat = {}; for (const r of bonusUV) parCat[r.p.category] = (parCat[r.p.category] || 0) + 1; console.log(parCat);
bonusUV.filter(r => !/spf|sun|uv/i.test(r.p.name)).slice(0, 25).forEach(r => console.log("  ", r.f.score, "|", r.p.category, "|", r.p.brand, "|", r.p.name));
// nettoyants sans tensioactif doux (-12 douceur)
const cl = rows.filter(r => r.p.category === "cleanser");
const sansDouceur = cl.filter(r => r.f.details.some(d => d.id === "douceur"));
console.log(`\nNETTOYANTS -12 'douceur' : ${sansDouceur.length}/${cl.length}`);
sansDouceur.sort((a, b) => a.f.score - b.f.score).slice(0, 40).forEach(r => console.log("  ", r.f.score, "|", r.p.brand, "|", r.p.name));
// démaquillants -12 dissout
const mr = rows.filter(r => r.p.category === "makeup-remover");
const sansDissout = mr.filter(r => r.f.details.some(d => d.id === "dissout"));
const dissoutEtRincable = sansDissout.filter(r => r.f.details.some(d => d.id === "rincable"));
console.log(`\nDÉMAQUILLANTS -12 'dissout' : ${sansDissout.length}/${mr.length} ; dont AVEC '+rincable' en même temps : ${dissoutEtRincable.length}`);
dissoutEtRincable.slice(0, 15).forEach(r => console.log("  ", r.f.score, "|", r.p.brand, "|", r.p.name));
// plafond (cap) appliqué sans ligne d'explication
let capped = 0; const ex = [];
for (const r of rows) { const g3 = r.f.details.filter(d => d.type === "risque" && d.grav >= 3); if (g3.length) { const somme = 50 + r.f.details.reduce((a, d) => a + (d.pts || 0), 0); if (r.f.score < Math.round(somme) - 1) { capped++; if (ex.length < 10) ex.push(`${r.f.score} (somme ${somme.toFixed(0)}) | ${r.p.brand} | ${r.p.name} | ${g3.map(d => d.inci).join(",")}`); } } }
console.log(`\nPLAFOND gravité 3 appliqué sans ligne 'details' : ${capped}`); ex.forEach(e => console.log("  ", e));
// INCI vides ou < 4 ingrédients
const vides = c.filter(p => p.category !== "hors-perimetre" && (!p.inci || p.inci.split(",").length < 4));
console.log(`\nINCI vide ou <4 ingrédients (périmètre) : ${vides.length}`);
vides.slice(0, 8).forEach(p => { const f = m.scoreFormule(p.inci, p.category, p.filtresUV); console.log("  ", f.score, f.bande, "|", p.category, "|", p.brand, "|", p.name, "| inci=", JSON.stringify(p.inci)?.slice(0, 60)); });
// sérums/treatments à -12/-10 'too few actives'
for (const cat of ["serum", "treatment"]) { const r2 = rows.filter(r => r.p.category === cat && r.f.details.some(d => d.id === "actifs" && d.type === "manque")); console.log(`\n${cat} 'too few actives' : ${r2.length}/${rows.filter(r => r.p.category === cat).length}`); r2.sort((a,b)=>a.f.score-b.f.score).slice(0, 25).forEach(r => console.log("  ", r.f.score, "|", r.p.brand, "|", r.p.name)); }
