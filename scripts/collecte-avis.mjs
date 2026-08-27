// COLLECTE DES AVIS AMAZON — via le jeu de données dédié de Bright Data.
//
// Première tentative (abandonnée) : scraper la page produit en markdown et la parser. Ça marchait
// mais ne rendait qu'une douzaine d'avis par produit, et pas le bloc « Customers say » d'Amazon,
// chargé en JavaScript. Le jeu de données « Amazon Reviews - collect by URL » rend ~280 avis par
// produit, structurés, avec la note globale, sa distribution en étoiles, la date, l'achat vérifié
// et les votes utiles. Aucun parsing, aucune fragilité au changement de balisage.
//
// Fonctionnement : on déclenche une collecte pour toutes les URL d'un coup, on interroge son
// avancement, puis on télécharge et on range par ASIN.
//
// Usage : node scripts/collecte-avis.mjs              → déclenche et attend
//         node scripts/collecte-avis.mjs --reprendre <snapshot_id>  → reprend un lot en cours
//         node scripts/collecte-avis.mjs --fichier <chemin.json>    → re-range un lot déjà téléchargé
//           (pour changer les champs retenus sans re-scraper — la collecte est le seul coût réel)
import fs from "node:fs";
import path from "node:path";

const RACINE = process.cwd();
const SORTIE = path.join(RACINE, "data", "avis-bruts");
const CLE = fs.readFileSync(path.join(RACINE, "bright_key.txt"), "utf8").trim();
const JEU = "gd_le8e811kzy4ggddlq";          // « Amazon Reviews - collect by URL »
const ENTETES = { authorization: "Bearer " + CLE, "content-type": "application/json" };

fs.mkdirSync(SORTIE, { recursive: true });
const attendre = (ms) => new Promise((r) => setTimeout(r, ms));

async function declencher(urls) {
  const r = await fetch(`https://api.brightdata.com/datasets/v3/trigger?dataset_id=${JEU}&format=json`,
    { method: "POST", headers: ENTETES, body: JSON.stringify(urls.map((url) => ({ url }))) });
  if (!r.ok) throw new Error(`trigger ${r.status}: ${(await r.text()).slice(0, 140)}`);
  const { snapshot_id } = await r.json();
  if (!snapshot_id) throw new Error("pas de snapshot_id renvoyé");
  return snapshot_id;
}

async function attendrePret(id, maxMinutes = 180) {
  const fin = Date.now() + maxMinutes * 60000;
  let dernier = "";
  while (Date.now() < fin) {
    const r = await fetch(`https://api.brightdata.com/datasets/v3/progress/${id}`,
      { headers: ENTETES }).catch(() => null);
    const j = r && r.ok ? await r.json() : null;
    if (j) {
      const ligne = `${j.status} · ${j.records ?? 0} avis · ${j.errors ?? 0} erreurs`;
      if (ligne !== dernier) { console.log("  " + ligne); dernier = ligne; }
      if (j.status === "ready") return j;
      if (j.status === "failed") throw new Error("collecte en échec");
    }
    await attendre(20000);
  }
  throw new Error("délai dépassé");
}

async function telecharger(id) {
  const r = await fetch(`https://api.brightdata.com/datasets/v3/snapshot/${id}?format=json`, { headers: ENTETES });
  if (!r.ok) throw new Error(`download ${r.status}`);
  return r.json();
}

/** Range les avis par produit et ne garde que ce qui sert. */
function ranger(lignes, parAsin) {
  const groupes = {};
  for (const l of lignes) {
    const a = l.asin;
    if (!a) continue;
    (groupes[a] = groupes[a] || []).push(l);
  }
  let ecrits = 0;
  for (const [asin, avis] of Object.entries(groupes)) {
    const p = parAsin[asin];
    const t = avis[0] || {};
    // ON GARDE TOUT. Le plafond de 40 était un chiffre posé sans mesure : sur les produits qui
    // ont de la matière, lire 40 avis au lieu de tout ne rend que 76 % des types de peau déclarés
    // et 89 % des problèmes — et 91 % des avis n'ont AUCUN vote « utile », donc trier par votes
    // ne sélectionnait pas les meilleurs, il coupait au hasard. Le tri ne sert plus qu'à mettre
    // en tête les rares avis réellement plébiscités.
    const tries = avis
      .filter((r) => typeof r.review_text === "string" && r.review_text.trim().length > 60)
      .sort((x, y) => (Number(y.helpful_count) || 0) - (Number(x.helpful_count) || 0))
      .map((r) => ({
        note: Number(r.rating) || null,
        // le pseudo affiché publiquement par Amazon, et rien d'autre : author_id et author_link
        // pointent vers le profil de la personne et ne servent à rien ici.
        auteur: String(r.author_name || "").slice(0, 40),
        titre: String(r.review_header || "").slice(0, 120),
        texte: String(r.review_text).replace(/\s+/g, " ").trim().slice(0, 1500),
        date: String(r.review_posted_date || "").slice(0, 24),
        verifie: r.is_verified === true,
        utiles: Number(r.helpful_count) || 0,
      }));
    fs.writeFileSync(path.join(SORTIE, asin + ".json"), JSON.stringify({
      asin, nom: p?.name || t.product_name || "", categorie: p?.category || "",
      note: Number(t.product_rating) || null,
      nbAvis: Number(t.product_rating_count) || null,
      distribution: t.product_rating_object || null,
      avis: tries,
    }, null, 1));
    ecrits++;
  }
  return ecrits;
}

// ── déroulé ──────────────────────────────────────────────────────────────────
const cat = JSON.parse(fs.readFileSync(path.join(RACINE, "data", "scan", "catalog.json"), "utf8"))
  .filter((p) => p.asin && p.category !== "hors-perimetre");
const parAsin = Object.fromEntries(cat.map((p) => [p.asin, p]));

const iFic = process.argv.indexOf("--fichier");
if (iFic > 0) {
  const lignes = JSON.parse(fs.readFileSync(process.argv[iFic + 1], "utf8"));
  console.log(`${ranger(lignes, parAsin)} produits réécrits depuis ${process.argv[iFic + 1]}`);
  process.exit(0);
}

const iRep = process.argv.indexOf("--reprendre");
let snapshot = iRep > 0 ? process.argv[iRep + 1] : null;

if (!snapshot) {
  const restants = cat.filter((p) => !fs.existsSync(path.join(SORTIE, p.asin + ".json")));
  console.log(`${restants.length} produits à collecter (sur ${cat.length})`);
  if (!restants.length) { console.log("tout est déjà collecté."); process.exit(0); }
  snapshot = await declencher(restants.map((p) => `https://www.amazon.com/dp/${p.asin}`));
  console.log(`collecte lancée : ${snapshot}`);
  console.log(`(en cas de coupure : node scripts/collecte-avis.mjs --reprendre ${snapshot})\n`);
}

const bilan = await attendrePret(snapshot);
console.log(`\n${bilan.records} avis récupérés, ${bilan.errors} erreurs — téléchargement…`);
const lignes = await telecharger(snapshot);
const n = ranger(Array.isArray(lignes) ? lignes : [], parAsin);
console.log(`${n} produits écrits dans data/avis-bruts/`);
console.log(`total en base : ${fs.readdirSync(SORTIE).filter((f) => f.endsWith(".json")).length} / ${cat.length}`);
