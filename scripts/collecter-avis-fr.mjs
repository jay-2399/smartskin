// Collecte les AVIS des produits de parapharmacie — pendant que la chasse aux INCI tourne à côté.
//
// Même collecteur que pour les 167 d'hier ; il accepte les URL amazon.fr (vérifié sur le SVR
// Sebiaclear : 14 avis structurés, en français). Le rangement est identique à collecte-avis.mjs :
// un fichier par ASIN dans data/avis-bruts/, tout est gardé, tri par votes utiles.
//
//   node scripts/collecter-avis-fr.mjs
import fs from "node:fs";
import path from "node:path";

const RACINE = path.resolve(import.meta.dirname, "..");
const FICHES = path.join(RACINE, "data/scan/fiches-fr-brut.json");
const SORTIE = path.join(RACINE, "data/avis-bruts");
const CLE = fs.readFileSync(path.join(RACINE, "bright_key.txt"), "utf8").trim();
const H = { Authorization: "Bearer " + CLE, "Content-Type": "application/json" };
const JEU = "gd_le8e811kzy4ggddlq";
const LOT = 170;
const attendre = (ms) => new Promise((r) => setTimeout(r, ms));

const fiches = JSON.parse(fs.readFileSync(FICHES, "utf8"));
const cibles = Object.values(fiches)
  .filter((f) => !f.erreur && f.asin && !fs.existsSync(path.join(SORTIE, f.asin + ".json")));
console.log(cibles.length + " produits à collecter, lots de " + LOT + "\n");

async function collecterLot(lot) {
  const t = await fetch(`https://api.brightdata.com/datasets/v3/trigger?dataset_id=${JEU}&format=json`,
    { method: "POST", headers: H, body: JSON.stringify(lot.map((f) =>
      ({ url: `https://www.amazon.${f.marketplace === "fr" ? "fr" : "com"}/dp/${f.asin}` }))) });
  const tj = await t.json();
  if (!tj.snapshot_id) throw new Error("déclenchement refusé : " + JSON.stringify(tj).slice(0, 160));
  console.log("  snapshot " + tj.snapshot_id);
  for (let i = 0; i < 300; i++) {
    await attendre(6000);
    const s = await fetch(`https://api.brightdata.com/datasets/v3/snapshot/${tj.snapshot_id}?format=json`,
                          { headers: { Authorization: "Bearer " + CLE } });
    if (s.status === 202) continue;
    if (!s.ok) throw new Error("téléchargement HTTP " + s.status);
    const d = await s.json();
    if (!Array.isArray(d)) { await attendre(5000); continue; }
    return d;
  }
  throw new Error("lot trop long à assembler");
}

function ranger(lignes) {
  const groupes = {};
  for (const l of lignes) { const a = l.asin; if (a) (groupes[a] ||= []).push(l); }
  let ecrits = 0;
  for (const [asin, avis] of Object.entries(groupes)) {
    const f = Object.values(fiches).find((x) => x.asin === asin) || {};
    const t = avis[0] || {};
    const tries = avis
      .filter((r) => typeof r.review_text === "string" && r.review_text.trim().length > 60)
      .sort((x, y) => (Number(y.helpful_count) || 0) - (Number(x.helpful_count) || 0))
      .map((r) => ({
        note: Number(r.rating) || null,
        auteur: String(r.author_name || "").slice(0, 40),
        titre: String(r.review_header || "").slice(0, 120),
        texte: String(r.review_text).replace(/\s+/g, " ").trim().slice(0, 1500),
        date: String(r.review_posted_date || "").slice(0, 24),
        verifie: r.is_verified === true,
        utiles: Number(r.helpful_count) || 0,
        langue: f.marketplace === "fr" ? "fr" : "en",
      }));
    fs.writeFileSync(path.join(SORTIE, asin + ".json"), JSON.stringify({
      asin, nom: f.titre || t.product_name || "", categorie: "",
      note: Number(t.product_rating) || null,
      nbAvis: Number(t.product_rating_count) || null,
      distribution: t.product_rating_object || null,
      avis: tries,
    }, null, 1));
    ecrits++;
  }
  return ecrits;
}

for (let i = 0; i < cibles.length; i += LOT) {
  const lot = cibles.slice(i, i + LOT);
  console.log("lot " + (i / LOT + 1) + " (" + lot.length + ") …");
  try {
    const recus = await collecterLot(lot);
    console.log("  " + recus.length + " avis reçus → " + ranger(recus) + " produits écrits");
  } catch (e) { console.log("  échec — " + e.message + " (lots suivants inchangés)"); }
}
console.log("\nterminé — " + fs.readdirSync(SORTIE).filter((x) => x.endsWith(".json")).length + " fichiers d'avis en base au total");
