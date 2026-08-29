// Collecte les FICHES des candidats de parapharmacie (photo, note, nombre d'avis, titre propre).
//
// Passe par le collecteur Amazon général — le jeu dédié Amazon.fr est cassé (erreurs de parsing
// sur toutes les fiches, vérifié le 29/08) et celui-ci accepte les URL des deux marketplaces.
// Le champ `ingredients` d'Amazon.fr est vide : l'INCI viendra du pipeline web, étape suivante.
//
// Lots de 170 : un déclenchement unique de 504 mettrait tout le paiement dans un seul panier —
// un échec réseau au téléchargement perdrait le lot entier (déjà vécu avant le correctif 202).
//
//   node scripts/collecter-fiches-fr.mjs
import fs from "node:fs";
import path from "node:path";

const RACINE = path.resolve(import.meta.dirname, "..");
const SORTIE = path.join(RACINE, "data/scan/fiches-fr-brut.json");
const CLE = fs.readFileSync(path.join(RACINE, "bright_key.txt"), "utf8").trim();
const H = { Authorization: "Bearer " + CLE, "Content-Type": "application/json" };
const JEU = "gd_l7q7dkf244hwjntr0";
const LOT = 170;
const attendre = (ms) => new Promise((r) => setTimeout(r, ms));

// les candidats : hors « déjà en base », un seul par ASIN
const dec = JSON.parse(fs.readFileSync(path.join(RACINE, "data/scan/decouverte-fr.json"), "utf8"));
const vus = new Set();
const cibles = [];
for (const v of Object.values(dec)) for (const c of v.candidats) {
  if (c.deja || vus.has(c.asin)) continue;
  vus.add(c.asin);
  cibles.push({ asin: c.asin, marque: v.marque, gamme: v.gamme, marketplace: c.marketplace,
                url: `https://www.amazon.${c.marketplace === "fr" ? "fr" : "com"}/dp/${c.asin}` });
}

const acquis = fs.existsSync(SORTIE) ? JSON.parse(fs.readFileSync(SORTIE, "utf8")) : {};
const aFaire = cibles.filter((c) => !(c.asin in acquis));
console.log(cibles.length + " candidats — " + aFaire.length + " à collecter, lots de " + LOT + "\n");

async function collecterLot(lot) {
  const t = await fetch(`https://api.brightdata.com/datasets/v3/trigger?dataset_id=${JEU}&include_errors=true`,
    { method: "POST", headers: H, body: JSON.stringify(lot.map((c) => ({ url: c.url }))) });
  const tj = await t.json();
  if (!tj.snapshot_id) throw new Error("déclenchement refusé : " + JSON.stringify(tj).slice(0, 160));
  console.log("  snapshot " + tj.snapshot_id);
  for (let i = 0; i < 200; i++) {
    await attendre(6000);
    const s = await fetch(`https://api.brightdata.com/datasets/v3/snapshot/${tj.snapshot_id}?format=json`,
                          { headers: { Authorization: "Bearer " + CLE } });
    if (s.status === 202) continue;
    if (!s.ok) throw new Error("téléchargement HTTP " + s.status);
    const d = await s.json();
    if (!Array.isArray(d)) { await attendre(5000); continue; }   // objet d'état : pas prêt
    return d;
  }
  throw new Error("lot trop long à assembler");
}

const parAsin = Object.fromEntries(cibles.map((c) => [c.asin, c]));
for (let i = 0; i < aFaire.length; i += LOT) {
  const lot = aFaire.slice(i, i + LOT);
  console.log("lot " + (i / LOT + 1) + " (" + lot.length + ") …");
  let recus;
  try { recus = await collecterLot(lot); }
  catch (e) { console.log("  échec — " + e.message + " (les lots suivants continuent)"); continue; }
  let ok = 0;
  for (const r of recus) {
    const asin = r.asin || (String(r.url || r.input?.url || "").match(/\/dp\/([A-Z0-9]{10})/) || [])[1];
    if (!asin) continue;
    const c = parAsin[asin] || {};
    acquis[asin] = r.error
      ? { asin, marque: c.marque, gamme: c.gamme, marketplace: c.marketplace, erreur: String(r.error).slice(0, 120) }
      : { asin, marque: c.marque, gamme: c.gamme, marketplace: c.marketplace,
          titre: r.title || null, note: r.rating ?? null, nbAvis: r.reviews_count ?? null,
          image: r.image_url || null, categories: r.categories || null,
          ingredients: typeof r.ingredients === "string" ? r.ingredients : null,
          customersSay: (r.customers_say && r.customers_say.text) || r.customer_says || null,
          prix: r.final_price ?? null, devise: r.currency || null, url: r.url || c.url };
    if (!r.error) ok++;
  }
  fs.writeFileSync(SORTIE, JSON.stringify(acquis, null, 1), "utf8");
  console.log("  " + recus.length + " reçues, " + ok + " exploitables — total en base : " + Object.keys(acquis).length);
}

const vals = Object.values(acquis);
console.log("\n— fiches —");
console.log("  " + vals.filter((v) => !v.erreur).length + " exploitables, " + vals.filter((v) => v.erreur).length + " en erreur");
console.log("  avec image : " + vals.filter((v) => v.image).length + " · avec ingredients : " + vals.filter((v) => v.ingredients).length);
console.log("écrit dans " + path.relative(RACINE, SORTIE));
