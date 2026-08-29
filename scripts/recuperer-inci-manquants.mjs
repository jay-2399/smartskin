// Va rechercher l'INCI des fiches où il manque, en lisant le champ « ingredients » de la page
// au lieu de deviner sa position.
//
// Pourquoi ce script existe : le premier collecteur (smartskin-scan-proto/ulta-scrape.mjs)
// repérait l'INCI en cherchant la fenêtre de 900 caractères la plus dense en virgules, et
// abandonnait sous 10 virgules. Il ratait donc TOUT ce qui ne ressemble pas à une longue liste
// virgulée — un solaire américain écrit « Active: Avobenzone 3% … Inactive: Water Dimethicone »,
// un patch dont l'unique ingrédient est « Hydrocolloid », une huile à 100 %. 233 fiches en sont
// reparties avec `inci: null`, et le moteur les note quand même (48/100, calculé sur rien).
//
// Ici on lit la donnée là où elle est : la page Ulta embarque son payload JSON, dont le champ
// "ingredients". On ne compte plus rien, on ne devine plus rien.
//
//   node scripts/recuperer-inci-manquants.mjs           → tout ce qui manque
//   node scripts/recuperer-inci-manquants.mjs --max 10  → un échantillon, pour vérifier
//
// N'ÉCRIT PAS dans le catalogue : la moisson va dans data/scan/inci-recuperes.json, à relire
// avant toute fusion.
import fs from "node:fs";
import path from "node:path";
import { normaliserInci, tauxReconnu } from "./normaliser-inci.mjs";

const RACINE = path.resolve(import.meta.dirname, "..");
const CATALOGUE = path.join(RACINE, "data/scan/catalog.json");
const SORTIE = path.join(RACINE, "data/scan/inci-recuperes.json");
const CLE = fs.readFileSync(path.join(RACINE, "bright_key.txt"), "utf8").trim();

const args = process.argv.slice(2);
const MAX = args.includes("--max") ? parseInt(args[args.indexOf("--max") + 1], 10) : Infinity;
const PARALLELE = 5;

// ————— récupération d'une page (même garde-fou que bd.mjs : jamais de blocage infini) —————
async function aspirer(url, { essais = 2, delaiMs = 60000 } = {}) {
  for (let n = 0; ; n++) {
    const ctrl = new AbortController();
    const minuteur = setTimeout(() => ctrl.abort(), delaiMs);
    try {
      const r = await fetch("https://api.brightdata.com/request", {
        method: "POST",
        headers: { Authorization: "Bearer " + CLE, "Content-Type": "application/json" },
        body: JSON.stringify({ zone: "mcp_unlocker", url, format: "raw" }),
        signal: ctrl.signal,
      });
      if (!r.ok) throw new Error("HTTP " + r.status);
      const t = await r.text();
      if (t.length < 15000 && n < essais) throw new Error("réponse courte (" + t.length + ")");
      return t;
    } catch (e) {
      if (n >= essais) throw e;
    } finally {
      clearTimeout(minuteur);
    }
  }
}

// le payload JSON échappe les slashes en / et les guillemets en \" — on rend le texte lisible
function desechapper(s) {
  return s
    .replace(/\\u002F/gi, "/")
    .replace(/\\u0026/gi, "&")
    .replace(/\\n/g, " ")
    .replace(/\\"/g, '"')
    .replace(/\\\\/g, "\\")
    .replace(/\s+/g, " ")
    .trim();
}

function extraireUlta(html) {
  // "ingredients":"…" quelque part dans le payload du module ProductDetail
  const m = html.match(/"ingredients"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  if (m) return desechapper(m[1]);
  if (/"ingredients"\s*:\s*null/.test(html)) return null; // Ulta n'a pas la donnée
  return undefined; // champ introuvable → page inattendue
}

function extraireAmazon(html) {
  // Amazon range l'INCI dans une section « Ingredients » du bloc description produit
  const zones = [
    /Ingredients?\s*:?\s*<\/[^>]+>\s*<[^>]*>([^<]{40,4000})</i,
    /<h[1-6][^>]*>\s*Ingredients?\s*<\/h[1-6]>\s*(?:<[^>]+>\s*)*([^<]{40,4000})</i,
    /"ingredients"\s*:\s*"((?:[^"\\]|\\.){40,4000})"/i,
  ];
  for (const re of zones) {
    const m = html.match(re);
    if (m) return desechapper(m[1]);
  }
  return undefined;
}

// ————— à quoi ressemble ce qu'on a récupéré —————
// On ne se contente pas de stocker : on normalise (les pages écrivent l'INCI en virgules, en
// points ou en espaces — cf. normaliser-inci.mjs) puis on qualifie, pour ne jamais remplacer un
// trou par une fausse certitude. Le juge de paix est le taux d'ingrédients reconnus par le
// dictionnaire : une vraie liste tourne au-dessus de 60 %, une phrase marketing s'effondre.
function qualifier(brut) {
  const r = normaliserInci(brut);
  if (!r.inci) return { ...r, type: "absent", reconnu: 0 };
  const reconnu = tauxReconnu(r.inci);
  let type;
  if (r.n >= 8 && reconnu >= 0.5) type = "inci";              // liste franche
  else if (r.n >= 8) type = "inci-douteux";                   // longue mais peu reconnue
  else if (r.n >= 2 && reconnu >= 0.6) type = "court-vrai";   // mono/bi-ingrédient légitime
  else type = "phrase";                                       // résumé marketing
  return { ...r, type, reconnu: Math.round(reconnu * 100) / 100 };
}

// ————— la moisson —————
const cat = JSON.parse(fs.readFileSync(CATALOGUE, "utf8"));
const produits = Array.isArray(cat) ? cat : (cat.produits || cat.products || Object.values(cat).find(Array.isArray));
const cibles = produits.filter((x) => !x.inci && x.url).slice(0, MAX);

// reprise : on ne repaie jamais deux fois la même page
let acquis = {};
if (fs.existsSync(SORTIE)) {
  acquis = JSON.parse(fs.readFileSync(SORTIE, "utf8"));
  console.log("reprise — " + Object.keys(acquis).length + " fiches déjà récupérées");
}
// une fiche déjà aspirée mais pas encore qualifiée (classement changé entre deux passes) se
// reclasse sur le texte gardé — on ne repaie pas la page pour ça
let reclasses = 0;
for (const [nom, v] of Object.entries(acquis)) {
  if (v.brut !== undefined && !v.type) {
    const q = qualifier(v.brut);
    Object.assign(v, { inci: q.inci, type: v.brut === null ? "absent" : q.type,
                       forme: q.forme, n: q.n, reconnu: q.reconnu });
    reclasses++;
  }
}
if (reclasses) console.log(reclasses + " fiches reclassées sans nouvelle requête");

const aFaire = cibles.filter((x) => !(x.name in acquis));
console.log(aFaire.length + " fiches à aspirer (" + PARALLELE + " en parallèle)\n");

let faits = 0;
function sauver() {
  fs.writeFileSync(SORTIE, JSON.stringify(acquis, null, 2), "utf8");
}

async function traiter(x) {
  let res;
  try {
    const html = await aspirer(x.url);
    const brut = x.source === "amazon" ? extraireAmazon(html) : extraireUlta(html);
    if (brut === undefined) {
      res = { source: x.source, url: x.url, brut: null, inci: null, type: "introuvable", n: 0 };
    } else {
      const q = qualifier(brut);
      res = { source: x.source, url: x.url, brut, inci: q.inci, type: q.type,
              forme: q.forme, n: q.n, reconnu: q.reconnu };
    }
  } catch (e) {
    res = { source: x.source, url: x.url, brut: null, inci: null, type: "erreur", erreur: String(e.message) };
  }
  acquis[x.name] = res;
  faits++;
  const tag = { inci: "✓", "court-vrai": "·", "inci-douteux": "?", phrase: "~", absent: "∅", introuvable: "∅", erreur: "!" }[res.type] || "?";
  process.stdout.write(tag);
  if (faits % 20 === 0) { sauver(); process.stdout.write(" " + faits + "/" + aFaire.length + "\n"); }
}

const file = aFaire.slice();
await Promise.all(Array.from({ length: PARALLELE }, async () => {
  while (file.length) await traiter(file.shift());
}));
sauver();

// ————— compte rendu —————
const parType = {};
for (const v of Object.values(acquis)) parType[v.type] = (parType[v.type] || 0) + 1;
console.log("\n\n— récolte —");
for (const [t, n] of Object.entries(parType).sort((a, b) => b[1] - a[1])) console.log("  " + t.padEnd(12) + n);
const exploitables = Object.values(acquis).filter((v) => v.type === "inci" || v.type === "court-vrai").length;
console.log("\nINCI exploitables : " + exploitables + " / " + Object.keys(acquis).length);
console.log("écrit dans " + path.relative(RACINE, SORTIE) + " — RIEN n'a été fusionné dans le catalogue.");
