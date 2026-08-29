// Retrouve sur Amazon les produits dont on n'a aucun avis, pour pouvoir en collecter.
//
// 635 fiches du catalogue n'ont pas d'avis. Deux causes, une seule issue :
//   — 321 viennent d'INCIdecoder, qui est une base de compositions et ne porte aucun commentaire ;
//   — 166 ont une fiche Ulta qui, vérifiée à la source, en porte réellement zéro (21 sondées,
//     21 à zéro : la collecte n'avait rien oublié).
// Ces produits ne sont pas obscurs — 199 sont des Paula's Choice, dont le 2% BHA Liquid Exfoliant
// et ses 116 000 avis Amazon. Ils manquent parce qu'on n'a jamais eu leur adresse marchande.
//
// Étape 1 (ce script) : trouver l'ASIN. Le jeu de données Amazon de Bright Data sait chercher par
// mot-clé (`discover_by=keyword`) et rend les candidats avec leur titre, leur ASIN et leur nombre
// d'avis. On garde le meilleur candidat SI son titre désigne bien notre produit — même contrôle
// que pour les compositions : un « Niacinamide 20% » de Cos De BAHA est remonté sur une recherche
// « Paula's Choice 10% Niacinamide », et rien dans le nombre d'avis ne le trahirait.
//
// Étape 2 (scripts/collecte-avis.mjs, déjà en place) : collecter les avis des ASIN retenus.
//
//   node scripts/chercher-avis-amazon.mjs --max 20   → échantillon
//   node scripts/chercher-avis-amazon.mjs            → tout
import fs from "node:fs";
import path from "node:path";
import { apparieDepuisPage } from "./verifier-appariement.mjs";

const RACINE = path.resolve(import.meta.dirname, "..");
const SORTIE = path.join(RACINE, "data/scan/avis-asin-trouves.json");
const CLE = fs.readFileSync(path.join(RACINE, "bright_key.txt"), "utf8").trim();
const H = { Authorization: "Bearer " + CLE, "Content-Type": "application/json" };
const JEU = "gd_l7q7dkf244hwjntr0";        // Amazon products, mode découverte
const LOT = 60;                             // mots-clés par déclenchement
const CANDIDATS = 3;                        // propositions retenues par mot-clé

const args = process.argv.slice(2);
const MAX = args.includes("--max") ? parseInt(args[args.indexOf("--max") + 1], 10) : Infinity;

// ── qui n'a pas d'avis ──
const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const pidUlta = (u) => (String(u || "").match(/\/p\/[^?#]*?-((?:pimprod|xlsImpprod|mkt)?\w{6,})(?:$|[?#])/i) || [])[1] || null;
const parRef = {}, parNom = new Map();
for (const f of fs.readdirSync(path.join(RACINE, "data/avis-enrichis"))) {
  if (!f.endsWith(".json")) continue;
  try {
    const e = JSON.parse(fs.readFileSync(path.join(RACINE, "data/avis-enrichis", f), "utf8"));
    if (e.ref) parRef[e.ref] = e;
    if (e.asin) parRef[e.asin] = e;
    const k = norm(e.nom || e.name); if (k) parNom.set(k, e);
  } catch {}
}
const aDesAvis = (x) => {
  const r = x.asin || pidUlta(x.url);
  if (r && parRef[r]) return true;
  const k = norm(x.name); if (!k) return false;
  if (parNom.get(k)) return true;
  for (const [m] of parNom) if (m.length >= 12 && (m.includes(k) || k.includes(m))) return true;
  return false;
};

const cat = JSON.parse(fs.readFileSync(path.join(RACINE, "data/scan/catalog.json"), "utf8"));
const produits = Array.isArray(cat) ? cat : (cat.produits || cat.products || Object.values(cat).find(Array.isArray));
const cibles = produits.filter((x) => x.category !== "hors-perimetre" && !aDesAvis(x)).slice(0, MAX);

const acquis = fs.existsSync(SORTIE) ? JSON.parse(fs.readFileSync(SORTIE, "utf8")) : {};
const aFaire = cibles.filter((x) => !(x.name in acquis));
console.log(cibles.length + " fiches sans avis (hors périmètre exclu) — " + aFaire.length + " à chercher");
console.log(Math.ceil(aFaire.length / LOT) + " lots de " + LOT + " mots-clés\n");

const attendre = (ms) => new Promise((r) => setTimeout(r, ms));

async function decouvrir(motsCles) {
  const u = `https://api.brightdata.com/datasets/v3/trigger?dataset_id=${JEU}` +
            `&type=discover_new&discover_by=keyword&include_errors=true&limit_per_input=${CANDIDATS}`;
  const t = await fetch(u, { method: "POST", headers: H, body: JSON.stringify(motsCles.map((k) => ({ keyword: k }))) });
  const tj = await t.json();
  if (!tj.snapshot_id) throw new Error("déclenchement refusé : " + JSON.stringify(tj).slice(0, 160));
  for (let i = 0; i < 150; i++) {
    await attendre(6000);
    const s = await fetch(`https://api.brightdata.com/datasets/v3/snapshot/${tj.snapshot_id}?format=json`,
                          { headers: { Authorization: "Bearer " + CLE } });
    if (s.status === 202) continue;
    if (!s.ok) throw new Error("HTTP " + s.status);
    const d = await s.json();
    return Array.isArray(d) ? d : [d];
  }
  throw new Error("collecte trop longue");
}

// La correspondance se fait sur le TITRE, pas sur l'ordre des résultats : le jeu de données ne
// renvoie pas le mot-clé d'origine avec chaque fiche.
function meilleur(x, candidats) {
  let best = null;
  for (const c of candidats) {
    const titre = c.title_clean || c.title || "";
    if (!titre) continue;
    const j = apparieDepuisPage(x.name, x.brand, titre, c.url || "");
    if (!j.ok) continue;
    const n = Number(c.reviews_count) || 0;
    if (!best || n > best.nbAvis) best = { asin: c.asin, url: c.url, titre, nbAvis: n,
                                           note: c.rating ?? null, appariement: j.partSiens };
  }
  return best;
}

let lot = 0;
for (let i = 0; i < aFaire.length; i += LOT) {
  const paquet = aFaire.slice(i, i + LOT);
  lot++;
  process.stdout.write("lot " + lot + " (" + paquet.length + ") … ");
  let recus = [];
  try { recus = await decouvrir(paquet.map((x) => `${x.brand} ${x.name}`.replace(/\s+/g, " ").slice(0, 110))); }
  catch (e) { console.log("échec — " + e.message); continue; }

  let ok = 0;
  for (const x of paquet) {
    const m = meilleur(x, recus);
    acquis[x.name] = m ? { ...m, trouve: true } : { trouve: false, candidats: recus.length };
    if (m) ok++;
  }
  fs.writeFileSync(SORTIE, JSON.stringify(acquis, null, 2), "utf8");
  console.log(recus.length + " candidats → " + ok + "/" + paquet.length + " appariés");
}

// ── collisions ──
// Deux fiches différentes ne peuvent pas être la même référence Amazon. Quand ça arrive, la
// recherche a ramené un produit voisin pour au moins l'une des deux — et on ne sait pas laquelle.
// Vu en vrai : le « Kojic Acid Turmeric Peel Shot » et le « …Toning Cleanser » de medicube
// renvoyaient tous deux au « Body Peel Shot ». On refuse les deux.
const parAsin = {};
for (const [nom, v] of Object.entries(acquis)) if (v.trouve && v.asin) (parAsin[v.asin] ||= []).push(nom);
let collisions = 0;
for (const [asin, noms] of Object.entries(parAsin)) {
  if (noms.length < 2) continue;
  console.log("\ncollision — " + noms.length + " fiches sur " + asin + " (« " + String(acquis[noms[0]].titre).slice(0, 52) + " »)");
  for (const n of noms) {
    console.log("     ⨯ " + n.slice(0, 58));
    acquis[n] = { trouve: false, motif: "collision", asinRejete: asin, partage: noms };
    collisions++;
  }
}
if (collisions) fs.writeFileSync(SORTIE, JSON.stringify(acquis, null, 2), "utf8");

const trouves = Object.values(acquis).filter((v) => v.trouve);
const total = trouves.reduce((s, v) => s + (v.nbAvis || 0), 0);
console.log("\n— recherche Amazon —");
console.log("  " + trouves.length + " / " + Object.keys(acquis).length + " fiches appariées");
console.log("  " + total.toLocaleString("fr-FR") + " avis atteignables au total");
console.log("\nécrit dans " + path.relative(RACINE, SORTIE) + " — aucune collecte lancée.");
