// Récupère l'INCI des fiches AMAZON manquantes via le collecteur dédié de Bright Data.
//
// Pourquoi un script à part : sur Amazon, la section « Ingredients » n'est pas dans le HTML servi
// (elle se charge après coup), donc l'aspiration de page — celle qu'utilise
// recuperer-inci-manquants.mjs — repart les mains vides : 45 des 66 fiches Amazon en « introuvable ».
// Le collecteur « Amazon Products » (dataset gd_l7q7dkf244hwjntr0) rend, lui, un champ
// `ingredients` déjà propre. Testé le 29/07 sur 5 produits : 5 INCI complets.
//
//   node scripts/recuperer-inci-amazon.mjs
//
// Complète data/scan/inci-recuperes.json. N'ÉCRIT PAS dans le catalogue.
import fs from "node:fs";
import path from "node:path";
import { normaliserInci, tauxReconnu } from "./normaliser-inci.mjs";

const RACINE = path.resolve(import.meta.dirname, "..");
const SORTIE = path.join(RACINE, "data/scan/inci-recuperes.json");
const CLE = fs.readFileSync(path.join(RACINE, "bright_key.txt"), "utf8").trim();
const DATASET = "gd_l7q7dkf244hwjntr0";
const H = { Authorization: "Bearer " + CLE, "Content-Type": "application/json" };

const cat = JSON.parse(fs.readFileSync(path.join(RACINE, "data/scan/catalog.json"), "utf8"));
const produits = Array.isArray(cat) ? cat : (cat.produits || cat.products || Object.values(cat).find(Array.isArray));
const acquis = fs.existsSync(SORTIE) ? JSON.parse(fs.readFileSync(SORTIE, "utf8")) : {};

// toutes les fiches Amazon sans INCI, y compris celles que l'aspiration a mal classées :
// le collecteur fait autorité sur ce qu'elle a pu attraper au passage.
const cibles = produits.filter((x) => !x.inci && x.source === "amazon" && x.url);
console.log(cibles.length + " fiches Amazon à collecter");

const trig = await fetch(
  `https://api.brightdata.com/datasets/v3/trigger?dataset_id=${DATASET}&include_errors=true`,
  { method: "POST", headers: H, body: JSON.stringify(cibles.map((x) => ({ url: x.url }))) });
const tj = await trig.json();
if (!tj.snapshot_id) { console.error("échec du déclenchement :", JSON.stringify(tj).slice(0, 300)); process.exit(1); }
console.log("collecte lancée — snapshot " + tj.snapshot_id);

let data = null;
for (let i = 0; i < 100; i++) {
  await new Promise((r) => setTimeout(r, 6000));
  const s = await fetch(`https://api.brightdata.com/datasets/v3/snapshot/${tj.snapshot_id}?format=json`,
                        { headers: { Authorization: "Bearer " + CLE } });
  if (s.status === 202) { if (i % 5 === 0) process.stdout.write(`  … ${i * 6}s\n`); continue; }
  if (!s.ok) { console.error("erreur " + s.status + " : " + (await s.text()).slice(0, 300)); process.exit(1); }
  data = await s.json();
  break;
}
if (!data) { console.error("la collecte n'a pas abouti dans le temps imparti"); process.exit(1); }

const recus = Array.isArray(data) ? data : [data];
console.log(recus.length + " fiches reçues\n");

// on rapproche par ASIN (l'URL peut être réécrite par Amazon en cours de route)
const asinDe = (u) => (String(u || "").match(/\/dp\/([A-Z0-9]{10})/) || [])[1];
const parAsin = new Map();
for (const r of recus) { const a = r.asin || asinDe(r.url) || asinDe(r.input?.url); if (a) parAsin.set(a, r); }

let maj = 0;
const compte = {};
for (const x of cibles) {
  const r = parAsin.get(x.asin || asinDe(x.url));
  if (!r) { compte.manquant = (compte.manquant || 0) + 1; continue; }
  const brut = typeof r.ingredients === "string" ? r.ingredients : null;
  const q = normaliserInci(brut);
  const reconnu = q.inci ? tauxReconnu(q.inci) : 0;
  let type;
  if (!q.inci) type = "absent";
  else if (q.n >= 8 && reconnu >= 0.5) type = "inci";
  else if (q.n >= 8) type = "inci-douteux";
  else if (q.n >= 2 && reconnu >= 0.6) type = "court-vrai";
  else type = "phrase";
  acquis[x.name] = { source: "amazon", url: x.url, via: "collecteur", brut, inci: q.inci,
                     type, forme: q.forme, n: q.n, reconnu: Math.round(reconnu * 100) / 100 };
  compte[type] = (compte[type] || 0) + 1;
  maj++;
}
fs.writeFileSync(SORTIE, JSON.stringify(acquis, null, 2), "utf8");

console.log("— collecte Amazon —");
for (const [t, n] of Object.entries(compte).sort((a, b) => b[1] - a[1])) console.log("  " + t.padEnd(14) + n);
console.log("\n" + maj + " fiches mises à jour dans " + path.relative(RACINE, SORTIE));
