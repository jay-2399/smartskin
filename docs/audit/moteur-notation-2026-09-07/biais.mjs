import fs from "node:fs";
const m = await import(process.cwd() + "/src/lib/scan/scoring.mjs");
const D = JSON.parse(fs.readFileSync("data/scan/dictionnaire.json", "utf8"));
const c = JSON.parse(fs.readFileSync("data/scan/catalog.json", "utf8")).map((p, i) => ({ ...p, id: i })).filter(p => p.category !== "hors-perimetre" && p.inci);
// 1. produits qui perdent 'sansParfum' UNIQUEMENT à cause d'un conservateur/anti-irritant flaggé fragrance
const FAUX = new Set(["BENZYL ALCOHOL", "4-T-BUTYLCYCLOHEXANOL", "PHENETHYL ALCOHOL", "PHENYLPROPANOL"]);
let n = 0; const ex = [];
for (const p of c) {
  const L = m.parseInci(p.inci);
  const frag = L.filter(it => it.fiche?.fragrance || it.fiche?.essentialOil);
  if (frag.length && frag.every(it => FAUX.has(it.name))) { n++; if (ex.length < 14) { const f = m.scoreFormule(p.inci, p.category, p.filtresUV); ex.push(`${f.score} | ${p.category} | ${p.brand} | ${p.name} | ${frag.map(x => x.name).join("+")}`); } }
}
console.log(`Produits dont le SEUL 'parfum' est benzyl alcohol / 4-t-butylcyclohexanol / phenethyl alcohol / phenylpropanol : ${n}/${c.length}`); ex.forEach(e => console.log("  ", e));
// sensibilité de ces produits : combien de points perdus (formule) si on ne comptait pas ces 4 comme parfum
// 2. corrélation longueur INCI ↔ score par catégorie
console.log("\nScore moyen par tranche de longueur d'INCI (nb ingrédients)");
const buckets = [[0, 10], [11, 20], [21, 30], [31, 45], [46, 999]];
for (const cat of ["serum", "moisturizer", "cleanser", "treatment", "toner", "sunscreen"]) {
  const line = [cat.padEnd(12)];
  for (const [a, b] of buckets) { const xs = c.filter(p => p.category === cat).map(p => ({ p, n: m.parseInci(p.inci).length })).filter(x => x.n >= a && x.n <= b); const sc = xs.map(x => m.scoreFormule(x.p.inci, x.p.category, x.p.filtresUV).score); line.push(`${a}-${b === 999 ? "+" : b}: ${sc.length ? (sc.reduce((u, v) => u + v, 0) / sc.length).toFixed(0) : "-"} (n=${sc.length})`); }
  console.log(line.join("  "));
}
// 3. nombre d'actifs comptés (role active + benefits) par tranche : preuve que 'richesse' récompense la longueur
// 4. top 12 sérums : combien d'actifs après la barre 1% ?
console.log("\nTop 12 sérums (formule) — actifs total / actifs sous la barre des 1 %");
const ser = c.filter(p => p.category === "serum").map(p => ({ p, f: m.scoreFormule(p.inci, p.category, p.filtresUV) })).sort((a, b) => b.f.score - a.f.score).slice(0, 12);
for (const { p, f } of ser) {
  const L = m.parseInci(p.inci); let barre = Infinity; for (const it of L) if (m.CONFIG.marqueurs1pct.includes(it.name)) { barre = it.pos; break; }
  const act = L.filter(it => it.fiche?.role === "active" && it.fiche.benefits?.length);
  console.log(`  ${f.score} | ${p.brand} | ${p.name.slice(0, 60)} | n=${L.length} actifs=${act.length} sousBarre=${act.filter(a => a.pos >= barre).length} (barre pos ${barre})`);
}
// 5. jeton BHA
console.log("\nBHA =>", JSON.stringify(D["BHA"]));
// 6. adéquation texture sur produits rincés : impact peau sèche vs grasse par catégorie
const seche = { skinType: "dry", sensitivity: 0, concerns: {}, strengthCeiling: 2, pregnancy: false, allergies: [], besoinSolaire: 0, libelles: {} };
const grasse = { ...seche, skinType: "oily" };
console.log("\nÉcart moyen perso(grasse) − perso(sèche) par catégorie, profil sans préoccupation (seule la 'texture' joue) :");
for (const cat of ["cleanser", "makeup-remover", "toner", "exfoliant", "serum", "moisturizer", "sunscreen"]) {
  const xs = c.filter(p => p.category === cat); let d = 0, legere = 0;
  for (const p of xs) { const f = m.scoreFormule(p.inci, p.category, p.filtresUV); const a = m.scorePerso(p.inci, grasse, p.category, f, p.filtresUV).score, b = m.scorePerso(p.inci, seche, p.category, f, p.filtresUV).score; d += a - b; if (m.natureProduit(m.parseInci(p.inci)).legere) legere++; }
  console.log(`  ${cat.padEnd(15)} écart moyen ${(d / xs.length).toFixed(1)} pts ; 'légers' ${(100 * legere / xs.length).toFixed(0)} %`);
}
// 7. combien de produits ont un fact 'UV filters — you say you skip sunscreen' hors solaire
const skip = { ...seche, skinType: "normal", besoinSolaire: 3 };
let nUV = 0; const exUV = [];
for (const p of c.filter(p => p.category !== "sunscreen" && p.filtresUV)) { const f = m.scoreFormule(p.inci, p.category, p.filtresUV); const s = m.scorePerso(p.inci, skip, p.category, f, p.filtresUV); const l = s.facts.find(x => /UV filters/.test(x.label)); if (l) { nUV++; if (!/spf|sun|uv/i.test(p.name) && exUV.length < 10) exUV.push(`${l.points} | ${p.category} | ${p.brand} | ${p.name}`); } }
console.log(`\nNon-solaires recevant 'UV filters — you say you skip sunscreen' : ${nUV} ; sans SPF/sun dans le nom :`); exUV.forEach(e => console.log("  ", e));
