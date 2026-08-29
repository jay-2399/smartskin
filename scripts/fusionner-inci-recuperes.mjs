// Écrit dans le catalogue les INCI récupérés par recuperer-inci-manquants.mjs / -amazon.mjs.
//
// Ne touche QUE le champ `inci`, et seulement sur des fiches où il valait `null`. Refuse d'écrire
// si une fiche visée a acquis un INCI entre-temps : mieux vaut s'arrêter que d'écraser.
//
//   node scripts/fusionner-inci-recuperes.mjs --verifier   → dit ce qu'il ferait, n'écrit rien
//   node scripts/fusionner-inci-recuperes.mjs              → écrit, après sauvegarde
import fs from "node:fs";
import path from "node:path";
import { tauxReconnu } from "./normaliser-inci.mjs";

const RACINE = path.resolve(import.meta.dirname, "..");
const CATALOGUE = path.join(RACINE, "data/scan/catalog.json");
// deux récoltes : la lecture directe des pages Ulta/Amazon, puis la recherche web pour ce
// qu'aucune des deux sources ne publiait
const RETENUS = ["inci", "inci-court", "mono"];   // ce qu'on juge exploitable ; le reste est écarté
const RECOLTES = [path.join(RACINE, "data/scan/inci-recuperes.json"),
                  path.join(RACINE, "data/scan/inci-web.json")];
const SAUVEGARDE = path.join(RACINE, "data/scan/catalog.avant-inci.json");

const seulementVerifier = process.argv.includes("--verifier");
const brut = fs.readFileSync(CATALOGUE, "utf8");
const cat = JSON.parse(brut);
const produits = Array.isArray(cat) ? cat : (cat.produits || cat.products || Object.values(cat).find(Array.isArray));
// On préfère toujours l'entrée EXPLOITABLE. Une entrée « marketing » porte un texte non vide
// (l'argumentaire, normalisé) : la départager sur la seule présence d'un `inci` ferait gagner
// l'argumentaire contre une vraie liste trouvée ensuite sur le web.
const exploitable = (e) => Boolean(e && e.inci && RETENUS.includes(e.type));
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
for (const [nom, v] of Object.entries(recolte)) {
  if (!RETENUS.includes(v.type)) continue;
  const x = parNom.get(nom);
  if (!x) { refuses.push([nom, "introuvable dans le catalogue"]); continue; }
  if (x.inci) { refuses.push([nom, "a DÉJÀ un inci — on n'écrase pas"]); continue; }
  // Un INCI très court n'est pas suspect en soi : une eau thermale, c'est « Water » ; un patch,
  // « Hydrocolloid ». Ce qui compte n'est pas la longueur mais le fait que ce soient de vrais noms
  // d'ingrédients — donc on laisse passer le court à condition que le dictionnaire le reconnaisse.
  if (!v.inci) { refuses.push([nom, "inci vide"]); continue; }
  if (v.inci.length < 8 && tauxReconnu(v.inci) < 1) {
    refuses.push([nom, "trop court ET non reconnu — « " + v.inci + " »"]); continue;
  }
  aEcrire.push([x, v]);
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
  x.inciSource = v.fichier === "inci-web.json" ? "web" : "recupere-" + (v.via || "page");
  if (v.url && v.fichier === "inci-web.json") x.inciUrl = v.url;
}
// on réécrit avec l'indentation d'origine (1 espace) : sinon le fichier entier est reformaté et
// le diff noie 78 changements réels dans 40 000 lignes de bruit.
const finLigne = brut.endsWith("\n") ? "\n" : "";
fs.writeFileSync(CATALOGUE, JSON.stringify(cat, null, 1) + finLigne, "utf8");

const restants = produits.filter((x) => !x.inci).length;
console.log("écrit — " + aEcrire.length + " INCI ajoutés ; il reste " + restants + " fiches sans composition (avant : " + (restants + aEcrire.length) + ")");
