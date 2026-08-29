// Écrit dans le catalogue les INCI récupérés par recuperer-inci-manquants.mjs / -amazon.mjs.
//
// Ne touche QUE le champ `inci`, et seulement sur des fiches où il valait `null`. Refuse d'écrire
// si une fiche visée a acquis un INCI entre-temps : mieux vaut s'arrêter que d'écraser.
//
//   node scripts/fusionner-inci-recuperes.mjs --verifier   → dit ce qu'il ferait, n'écrit rien
//   node scripts/fusionner-inci-recuperes.mjs              → écrit, après sauvegarde
import fs from "node:fs";
import path from "node:path";
import { validerInci } from "./valider-inci.mjs";
import { apparieDepuisPage, distinctifs } from "./verifier-appariement.mjs";

const RACINE = path.resolve(import.meta.dirname, "..");
const CATALOGUE = path.join(RACINE, "data/scan/catalog.json");
// deux récoltes : la lecture directe des pages Ulta/Amazon, puis la recherche web pour ce
// qu'aucune des deux sources ne publiait
// On n'écarte QUE ce qui ne porte aucune donnée, ou ce qu'un contrôle a délibérément refusé.
// Surtout pas sur l'étiquette posée par le collecteur : elle a été calculée avec les règles du
// jour où la récolte a eu lieu, et un pré-filtre périmé court-circuitait la validation réelle —
// c'est ainsi que « Water » (eau thermale Vichy) ou « Hydrocolloid » (une vingtaine de patchs)
// restaient dehors alors que leur composition est exacte. Le juge, c'est validerInci, et lui seul.
const SANS_SUITE = new Set(["absent", "introuvable", "rien", "erreur", "pas-de-site",
                            "aucune-page", "aucun-lien", "mauvais-produit", "collision"]);
const exploitable = (e) => Boolean(e && e.inci && !SANS_SUITE.has(e.type));
const RECOLTES = [path.join(RACINE, "data/scan/inci-recuperes.json"),
                  path.join(RACINE, "data/scan/inci-web.json"),
                  path.join(RACINE, "data/scan/inci-marque.json")];
const SAUVEGARDE = path.join(RACINE, "data/scan/catalog.avant-inci.json");

const seulementVerifier = process.argv.includes("--verifier");
const brut = fs.readFileSync(CATALOGUE, "utf8");
const cat = JSON.parse(brut);
const produits = Array.isArray(cat) ? cat : (cat.produits || cat.products || Object.values(cat).find(Array.isArray));
const recolte = {};
for (const f of RECOLTES) {
  if (!fs.existsSync(f)) continue;
  for (const [nom, v] of Object.entries(JSON.parse(fs.readFileSync(f, "utf8")))) {
    if (!recolte[nom] || (!exploitable(recolte[nom]) && exploitable(v)))
      recolte[nom] = { ...v, fichier: path.basename(f) };
  }
}

const parNom = new Map();
for (const x of produits) parNom.set(x.name, x);

const aEcrire = [], refuses = [];
for (let [nom, v] of Object.entries(recolte)) {
  if (SANS_SUITE.has(v.type)) continue;
  const x = parNom.get(nom);
  if (!x) { refuses.push([nom, "introuvable dans le catalogue"]); continue; }
  if (x.inci) { refuses.push([nom, "a DÉJÀ un inci — on n'écrase pas"]); continue; }
  if (!v.inci) { refuses.push([nom, "inci vide"]); continue; }
  // Le tri est ICI, à l'écriture, et pas seulement à la récolte. Une passe précédente avait
  // fusionné du mobilier de page — le menu d'un site, des fragments de HTML — parce que le tri
  // vivait dans le collecteur et que chaque collecteur avait le sien. Un seul point de contrôle,
  // traversé par tout ce qui entre dans le catalogue.
  // Le seuil de longueur est bas (2) : une eau thermale, c'est « Water » ; un patch,
  // « Hydrocolloid ». Ce qui disqualifie n'est pas la brièveté mais la prose et le mobilier.
  // Deuxième contrôle au même point de passage : la page lue parle-t-elle bien de CE produit ?
  // Il vit aussi dans les collecteurs, mais une récolte faite avant que la règle existe ne l'a
  // jamais subi — c'est ainsi que le Rice Polish « Deep » revenait pour le « Daily ». Tout ce qui
  // entre dans le catalogue le repasse, quelle que soit la date de sa collecte.
  if (v.titre) {
    const n = apparieDepuisPage(nom, x.brand, v.titre, v.url || "");
    if (!n.ok) {
      refuses.push([nom, "mauvais produit — la page dit « " + String(v.titre).slice(0, 46) + " »" +
                         (n.marqueurs?.length ? " (variante « " + n.marqueurs.join(", ") + " »)" : "")]);
      continue;
    }
  }
  const j = validerInci(v.inci, { minIngredients: 2 });
  if (!j.ok) { refuses.push([nom, "écarté — " + j.motif]); continue; }
  // on écrit la liste NETTOYÉE, pas le texte brut : la queue de page est retirée
  v = { ...v, inci: j.inci, tronque: j.coupe };
  aEcrire.push([x, v]);
}

// ── troisième contrôle : deux produits différents ne peuvent pas avoir la MÊME formule ──
// Quand plusieurs fiches ressortent avec un INCI identique au caractère près, c'est presque
// toujours qu'on a lu une page commune — un menu de filtres par ingrédient, une rubrique. Quatre
// produits Good Molecules ont ainsi reçu « Niacinamide, Tranexamic Acid, Hyaluronic Acid… », qui
// est la liste des filtres de leur boutique.
// L'exception légitime : le même produit sous deux contenances. On la reconnaît à ce que les noms
// ne diffèrent QUE par un mot de format.
const FORMAT = new Set(`travel mini jumbo size pack count ct refill deluxe sample duo twin value
  oz ml g gram fl edition`.split(/\s+/).filter(Boolean));
const empreinte = (t) => String(t).toLowerCase().replace(/[^a-z0-9]/g, "");
const parInci = {};
for (const [x, v] of aEcrire) (parInci[empreinte(v.inci)] ||= []).push([x, v]);
const bloques = new Set();
for (const groupe of Object.values(parInci)) {
  if (groupe.length < 2) continue;
  // Une composition d'UN SEUL matériau est légitimement partagée : vingt-quatre patchs
  // hydrocolloïdes ont tous « Hydrocolloid » pour formule, et trois sprays « Hypochlorous Acid ».
  // La collision ne trahit une page commune que sur une liste longue, qu'aucun hasard ne
  // reproduit à l'identique.
  if (groupe[0][1].inci.split(",").length <= 3) continue;
  const jeux = groupe.map(([x]) => new Set(distinctifs(x.name, x.brand)));
  const memeMarque = new Set(groupe.map(([x]) => String(x.brand).toLowerCase())).size === 1;
  // tout ce qui distingue une fiche des autres du groupe
  let ecarts = new Set();
  for (const a of jeux) for (const b of jeux) for (const m of a) if (!b.has(m)) ecarts.add(m);
  const seulementFormat = [...ecarts].every((m) => FORMAT.has(m));
  if (memeMarque && seulementFormat) continue;          // variantes de contenance : légitime
  for (const [x, v] of groupe) {
    bloques.add(x);
    refuses.push([x.name, "même formule que " + (groupe.length - 1) + " autre(s) fiche(s) — page commune probable"]);
  }
}
if (bloques.size) {
  for (let i = aEcrire.length - 1; i >= 0; i--) if (bloques.has(aEcrire[i][0])) aEcrire.splice(i, 1);
}

console.log(aEcrire.length + " fiches à compléter" + (refuses.length ? ", " + refuses.length + " écartées" : ""));
for (const [nom, r] of refuses) console.log("   ⨯ " + nom.slice(0, 50) + " — " + r);
if (seulementVerifier) { console.log("\n(--verifier : rien n'a été écrit)"); process.exit(0); }
if (!aEcrire.length) { console.log("rien à faire"); process.exit(0); }

fs.writeFileSync(SAUVEGARDE, brut, "utf8");
console.log("sauvegarde → " + path.relative(RACINE, SAUVEGARDE));

for (const [x, v] of aEcrire) {
  x.inci = v.inci;
  // on garde d'où vient la composition : lecture directe de la fiche marchande, collecteur Amazon,
  // ou page tierce trouvée par recherche — auquel cas on note l'adresse exacte, pour que la
  // provenance reste vérifiable.
  x.inciSource = { "inci-web.json": "web", "inci-marque.json": "marque" }[v.fichier]
                 || "recupere-" + (v.via || "page");
  if (v.url && v.fichier !== "inci-recuperes.json") x.inciUrl = v.url;
}
// on réécrit avec l'indentation d'origine (1 espace) : sinon le fichier entier est reformaté et
// le diff noie 78 changements réels dans 40 000 lignes de bruit.
const finLigne = brut.endsWith("\n") ? "\n" : "";
fs.writeFileSync(CATALOGUE, JSON.stringify(cat, null, 1) + finLigne, "utf8");

const restants = produits.filter((x) => !x.inci).length;
console.log("écrit — " + aEcrire.length + " INCI ajoutés ; il reste " + restants + " fiches sans composition (avant : " + (restants + aEcrire.length) + ")");
