// Inscrit dans le catalogue la référence Amazon trouvée pour les produits SANS avis.
//
// Le champ s'appelle `asinAvis` et non `asin`, à dessein : `asin` sert aussi au lien d'achat
// (affiliateUrl) et au bouton « Restock » du tableau de bord. Y écrire une référence Amazon sur
// un produit listé chez Ulta enverrait l'utilisatrice acheter ailleurs que là où on l'a trouvé —
// une décision commerciale, pas une conséquence d'une collecte d'avis.
//
//   node scripts/lier-asin-avis.mjs --verifier
//   node scripts/lier-asin-avis.mjs
import fs from "node:fs";
import path from "node:path";

const RACINE = path.resolve(import.meta.dirname, "..");
const CATALOGUE = path.join(RACINE, "data/scan/catalog.json");
const TROUVES = path.join(RACINE, "data/scan/avis-asin-trouves.json");
const seulementVerifier = process.argv.includes("--verifier");

const brut = fs.readFileSync(CATALOGUE, "utf8");
const produits = JSON.parse(brut);
const trouves = JSON.parse(fs.readFileSync(TROUVES, "utf8"));
const parNom = new Map(produits.map((p) => [p.name, p]));

const aEcrire = [], refuses = [];
for (const [nom, v] of Object.entries(trouves)) {
  if (!v.trouve || !v.asin) continue;
  const p = parNom.get(nom);
  if (!p) { refuses.push([nom, "introuvable dans le catalogue"]); continue; }
  if (p.asin) { refuses.push([nom, "a déjà un asin propre — on n'écrase pas"]); continue; }
  aEcrire.push([p, v]);
}

console.log(aEcrire.length + " fiches à lier" + (refuses.length ? ", " + refuses.length + " écartées" : ""));
for (const [n, r] of refuses) console.log("   ⨯ " + n.slice(0, 52) + " — " + r);
if (seulementVerifier) { console.log("\n(--verifier : rien n'a été écrit)"); process.exit(0); }

for (const [p, v] of aEcrire) {
  p.asinAvis = v.asin;
  p.asinAvisTitre = v.titre;   // ce que porte la fiche Amazon : rend l'appariement relisible
}
const finLigne = brut.endsWith("\n") ? "\n" : "";
fs.writeFileSync(CATALOGUE, JSON.stringify(produits, null, 1) + finLigne, "utf8");
console.log("écrit — " + aEcrire.length + " références d'avis liées");
