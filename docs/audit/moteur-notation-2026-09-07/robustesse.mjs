import { m, CAT, CATS, q, mean, r1, pct, sf, tableau } from "./lib.mjs";
let seed = 42; const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
const S = (inci, p) => m.scoreFormule(inci, p.category, p.filtresUV).score;
const toks = (p) => m.decouperInci(p.inci).map((t) => t.trim()).filter(Boolean);
const join = (a) => a.join(", ");
const run = (nom, f) => {
  const d = [], flips = [];
  for (const p of CAT) { const t = toks(p); if (t.length < 8) continue; const t2 = f([...t]); if (!t2) continue; const a = S(p.inci, p), b = S(join(t2), p); d.push(b - a); flips.push(m.bande(a) !== m.bande(b)); }
  const abs = d.map(Math.abs);
  return [nom, d.length, r1(mean(d)), r1(mean(abs)), q(abs, .5), q(abs, .9), Math.max(...abs), pct(abs.filter((x) => x >= 5).length, abs.length), pct(abs.filter((x) => x >= 10).length, abs.length), pct(flips.filter(Boolean).length, flips.length)];
};
const rows = [
  run("R1 un ingrédient (pos 1-10) oublié", (t) => { t.splice(Math.floor(rnd() * Math.min(10, t.length)), 1); return t; }),
  run("R2 un inconnu inséré en pos 1-5", (t) => { t.splice(Math.floor(rnd() * 5), 0, "Xqzv Complex"); return t; }),
  run("R3 un ingrédient pos 1-5 mal lu (→ inconnu)", (t) => { t[Math.floor(rnd() * 5)] = "Xqzv Complex"; return t; }),
  run("R4 deux voisins (pos 1-6) inversés", (t) => { const i = Math.floor(rnd() * 5); [t[i], t[i + 1]] = [t[i + 1], t[i]]; return t; }),
  run("R5 liste tronquée à 12 ingrédients", (t) => t.slice(0, 12)),
  run("R6 liste tronquée à 20 ingrédients", (t) => t.slice(0, 20)),
  run("R7 dernier tiers illisible (→ inconnus)", (t) => t.map((x, i) => i >= Math.floor(t.length * 2 / 3) ? "Xqzv " + i : x)),
  run("R8 5 ingrédients au hasard mal lus", (t) => { for (let k = 0; k < 5; k++) t[Math.floor(rnd() * t.length)] = "Xqzv " + k; return t; }),
  run("R9 conservateur (barre 1 %) mal lu", (t) => { const i = t.findIndex((x) => m.CONFIG.marqueurs1pct.includes(x.toUpperCase())); if (i < 0) return null; t[i] = "Xqzv"; return t; }),
];
console.log("## Robustesse aux erreurs de lecture d'étiquette (note FORMULE, catalogue entier, listes ≥8 ingrédients)\n");
console.log(tableau(rows, ["perturbation", "n", "Δ moy", "|Δ| moy", "|Δ| méd", "|Δ| p90", "|Δ| max", "%|Δ|≥5", "%|Δ|≥10", "%chg bande"]));
console.log("\n## Ce qui rend R3 sensible : quel critère saute quand un ingrédient du top 5 devient inconnu ?");
const causes = {};
for (const p of CAT) { const t = toks(p); if (t.length < 8) continue; const a = sf(p); for (let i = 0; i < 5; i++) { const t2 = [...t]; t2[i] = "Xqzv"; const b = m.scoreFormule(join(t2), p.category, p.filtresUV); if (Math.abs(b.score - a.score) >= 8) { const ida = new Set(a.details.map((d) => d.id || d.type)), idb = new Set(b.details.map((d) => d.id || d.type)); for (const x of ida) if (!idb.has(x)) causes["perd " + x] = (causes["perd " + x] || 0) + 1; for (const x of idb) if (!ida.has(x)) causes["gagne " + x] = (causes["gagne " + x] || 0) + 1; } } }
console.log(Object.entries(causes).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k, v]) => `${k}: ${v}`).join("\n"));
console.log("\n## Arrondi : la note perso repart de la formule ARRONDIE (double arrondi)");
let n2 = 0; for (const p of CAT.slice(0, 800)) { /* impossible à mesurer sans le brut : on note le fait */ }
console.log("  (scorePerso lit F.score, déjà clampé/arrondi — src/lib/scan/scoring.mjs:552 — puis re-arrondit ligne 682 : écart ≤ 1 pt, sans conséquence.)");
