// Seconde passe : retrouver sur Amazon les produits que la recherche par mot-clé a manqués.
//
// chercher-avis-amazon.mjs interroge le moteur de découverte du jeu de données Amazon, qui rend
// trois candidats par mot-clé. Sur les marques à gamme large — 171 Paula's Choice, 35 Neutrogena,
// 31 Cetaphil — ces trois candidats sont souvent trois cousins et aucun le bon : la fiche existe,
// elle n'est simplement pas dans les trois premiers.
//
// Ici on passe par un moteur de recherche restreint à amazon.com, avec le nom entre guillemets.
// La réponse porte directement l'ASIN dans l'URL et le titre de la fiche dans le résultat, donc
// le contrôle d'appariement s'applique sans requête supplémentaire.
//
//   node scripts/chercher-avis-amazon-serp.mjs --max 20
//   node scripts/chercher-avis-amazon-serp.mjs
import fs from "node:fs";
import path from "node:path";
import { apparieTitreMarchand } from "./verifier-appariement.mjs";

const RACINE = path.resolve(import.meta.dirname, "..");
const DEJA = path.join(RACINE, "data/scan/avis-asin-trouves.json");
const SORTIE = path.join(RACINE, "data/scan/avis-asin-serp.json");
const CLE = fs.readFileSync(path.join(RACINE, "bright_key.txt"), "utf8").trim();
const H = { Authorization: "Bearer " + CLE, "Content-Type": "application/json" };
const PARALLELE = 5;

const args = process.argv.slice(2);
const MAX = args.includes("--max") ? parseInt(args[args.indexOf("--max") + 1], 10) : Infinity;

async function chercher(requete) {
  const u = "https://www.google.com/search?q=" + encodeURIComponent(requete) + "&brd_json=1";
  for (let n = 0; n < 2; n++) {
    try {
      const r = await fetch("https://api.brightdata.com/request", { method: "POST", headers: H,
        body: JSON.stringify({ zone: "mcp_unlocker", url: u, format: "raw" }),
        signal: AbortSignal.timeout(45000) });
      if (!r.ok) throw new Error("HTTP " + r.status);
      return (JSON.parse(await r.text()).organic || []);
    } catch (e) { if (n) throw e; }
  }
  return [];
}

const produits = JSON.parse(fs.readFileSync(path.join(RACINE, "data/scan/catalog.json"), "utf8"));
const parNom = new Map(produits.map((p) => [p.name, p]));
const premiere = JSON.parse(fs.readFileSync(DEJA, "utf8"));
// on ne reprend QUE ce que la première passe n'a pas su apparier
const cibles = Object.entries(premiere).filter(([, v]) => !v.trouve)
  .map(([n]) => parNom.get(n)).filter((p) => p && !p.asin && !p.asinAvis).slice(0, MAX);

const acquis = fs.existsSync(SORTIE) ? JSON.parse(fs.readFileSync(SORTIE, "utf8")) : {};
const aFaire = cibles.filter((p) => !(p.name in acquis));
console.log(cibles.length + " fiches manquées par la première passe — " + aFaire.length + " à chercher\n");

let faits = 0;
const sauver = () => fs.writeFileSync(SORTIE, JSON.stringify(acquis, null, 2), "utf8");

async function traiter(p) {
  let res = { trouve: false };
  try {
    const org = await chercher(`site:amazon.com "${p.name}"`);
    const cands = [];
    for (const o of org) {
      const asin = (String(o.link || o.url || "").match(/\/dp\/([A-Z0-9]{10})/) || [])[1];
      if (!asin) continue;
      // Un titre Amazon n'est pas un titre de page : c'est une ligne de référencement, avec sa
      // queue d'adjectifs, sa contenance, et parfois une autre marque. Le contrôle dédié vérifie
      // d'abord la marque et le numéro de version, puis compare sur le nom débarrassé.
      const j = apparieTitreMarchand(p.name, p.brand, o.title || "");
      if (j.ok) cands.push({ asin, titre: o.title || "", appariement: j.partSiens });
      else res.ecartes = (res.ecartes || []).concat([{ asin, titre: o.title || "", motif: j.motif || null, marqueurs: j.marqueurs || [] }]);
    }
    if (cands.length) res = { trouve: true, ...cands[0], ecartes: res.ecartes };
    else if (!org.length) res.motif = "aucun résultat";
    else res.motif = res.ecartes ? "candidats écartés" : "aucun lien produit";
  } catch (e) { res = { trouve: false, motif: "erreur", erreur: String(e.message) }; }
  acquis[p.name] = res;
  faits++;
  process.stdout.write(res.trouve ? "✓" : res.motif === "erreur" ? "!" : "·");
  if (faits % 25 === 0) { sauver(); process.stdout.write(" " + faits + "/" + aFaire.length + "\n"); }
}

const file = aFaire.slice();
await Promise.all(Array.from({ length: PARALLELE }, async () => { while (file.length) await traiter(file.shift()); }));
sauver();

// Deux fiches ne peuvent pas être la même référence : même filet que la première passe.
const parAsin = {};
for (const [nom, v] of Object.entries(acquis)) if (v.trouve && v.asin) (parAsin[v.asin] ||= []).push(nom);
let collisions = 0;
for (const [asin, noms] of Object.entries(parAsin)) {
  if (noms.length < 2) continue;
  console.log("\ncollision — " + noms.length + " fiches sur " + asin);
  for (const n of noms) { console.log("     ⨯ " + n.slice(0, 58)); acquis[n] = { trouve: false, motif: "collision" }; collisions++; }
}
if (collisions) sauver();

const t = {};
for (const v of Object.values(acquis)) t[v.trouve ? "apparié" : (v.motif || "rien")] = (t[v.trouve ? "apparié" : (v.motif || "rien")] || 0) + 1;
console.log("\n\n— seconde passe —");
for (const [k, n] of Object.entries(t).sort((a, b) => b[1] - a[1])) console.log("  " + k.padEnd(18) + n);
console.log("\nécrit dans " + path.relative(RACINE, SORTIE) + " — aucune collecte lancée.");
