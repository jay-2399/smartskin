// DIFF LISIBLE ENTRE DEUX FICHIERS JSON D'UNE LIGNE.
// `git diff` est aveugle sur dictionnaire.json et catalog.json (une seule ligne) : ce script
// dit ce qui a changé, clé par clé. Objet indexé par nom (dictionnaire) : clés ajoutées,
// retirées, champs modifiés. Tableau (catalogue) : entrées par index, nommées par `name`.
//
// Usage : node scripts/diff-json.mjs <avant.json> <apres.json> [--max 200]
import fs from "node:fs";

const [avantPath, apresPath] = process.argv.slice(2).filter((a) => !a.startsWith("--"));
if (!avantPath || !apresPath) { console.error("usage : diff-json.mjs <avant> <apres> [--max N]"); process.exit(2); }
const maxIdx = process.argv.indexOf("--max");
const MAX = maxIdx > 0 ? Number(process.argv[maxIdx + 1]) : 200;

const avant = JSON.parse(fs.readFileSync(avantPath, "utf8"));
const apres = JSON.parse(fs.readFileSync(apresPath, "utf8"));

// aplatit un objet en chemins pointés : { risks: { irritant: 1 } } → { "risks.irritant": 1 }
function aplatir(o, prefixe = "", out = {}) {
  if (o === null || typeof o !== "object" || Array.isArray(o)) { out[prefixe] = JSON.stringify(o); return out; }
  for (const k of Object.keys(o)) aplatir(o[k], prefixe ? prefixe + "." + k : k, out);
  return out;
}
function champsModifies(a, b) {
  const fa = aplatir(a), fb = aplatir(b), lignes = [];
  for (const k of new Set([...Object.keys(fa), ...Object.keys(fb)])) {
    if (fa[k] !== fb[k]) lignes.push(`${k} ${fa[k] ?? "∅"} → ${fb[k] ?? "∅"}`);
  }
  return lignes;
}

const sortie = [];
let ajoutees = 0, retirees = 0, modifiees = 0;

if (Array.isArray(avant) && Array.isArray(apres)) {
  if (avant.length !== apres.length) sortie.push(`longueur ${avant.length} → ${apres.length}`);
  const n = Math.min(avant.length, apres.length);
  for (let i = 0; i < n; i++) {
    const l = champsModifies(avant[i], apres[i]);
    if (l.length) { modifiees++; sortie.push(`[${i}] ${apres[i]?.name ?? avant[i]?.name ?? ""}\n    ${l.join("\n    ")}`); }
  }
  ajoutees = Math.max(0, apres.length - avant.length);
  retirees = Math.max(0, avant.length - apres.length);
} else {
  const ka = new Set(Object.keys(avant)), kb = new Set(Object.keys(apres));
  for (const k of ka) if (!kb.has(k)) { retirees++; sortie.push(`− ${k}`); }
  for (const k of kb) if (!ka.has(k)) { ajoutees++; sortie.push(`+ ${k}  ${JSON.stringify(apres[k])}`); }
  for (const k of ka) if (kb.has(k)) {
    const l = champsModifies(avant[k], apres[k]);
    if (l.length) { modifiees++; sortie.push(`~ ${k}\n    ${l.join("\n    ")}`); }
  }
}

console.log(sortie.slice(0, MAX).join("\n"));
if (sortie.length > MAX) console.log(`… ${sortie.length - MAX} ligne(s) de plus (--max)`);
console.log(`\n${ajoutees} ajoutée(s) · ${retirees} retirée(s) · ${modifiees} modifiée(s)`);
