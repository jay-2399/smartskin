// Catégorise les fiches de la campagne française — mots-clés d'abord, arbitrage humain ensuite.
//
// La devinette par mots-clés ne tranche que ce qui est sans ambiguïté ; tout le reste sort en
// « incertain » et se décide à la main — la mécanique fait le volume, le jugement les cas limites.
// Écrit dans data/scan/categories-fr.json, JAMAIS dans fiches-fr-brut.json (la chasse aux INCI
// y écrit en ce moment même).
import fs from "node:fs";
import path from "node:path";

const RACINE = path.resolve(import.meta.dirname, "..");
const FICHES = path.join(RACINE, "data/scan/fiches-fr-brut.json");
const SORTIE = path.join(RACINE, "data/scan/categories-fr.json");
const sansAccents = (x) => String(x).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// ordre = priorité : la première règle qui mord gagne
const REGLES = [
  ["hors-perimetre", /\b(corps|body|mains?|hands?|pieds?|foot|cheveux|hair|capillaire|shampo|deodorant|dentifrice|levres|lips?|baby|bebe|enfants?|kids|pediatrics)\b/],
  ["makeup-remover", /\b(demaquillant|makeup remov|micellaire|micellar|biphase|cleansing oil|huile nettoyante)\b/],
  ["cleanser", /\b(nettoyant|cleanser|gel moussant|mousse nettoyante|foaming (gel|wash|cream)|face wash|wash|savon|pain dermatologique|syndet)\b/],
  ["exfoliant", /\b(exfoliant|exfoliating|gommage|scrub|peeling|micro-?peel)\b/],
  ["mask", /\b(masque|mask)\b/],
  ["eye-cream", /\b(yeux|eyes?|contour|cernes|circles)\b/],
  ["sunscreen", /\b(spf ?\d|solaire|sunscreen|uv[- ]?(mune|air)|photoderm|anthelios|capital soleil|fotoprotector|sunissime|ecran)\b/],
  ["toner", /\b(toner|tonique|essence|eau thermale|thermal (spring )?water|brumisateur|mist)\b/],
  ["serum", /\b(serum|ampoules?|booster)\b/],
  ["treatment", /\b(anti-?imperfections?|anti-?taches?|anti-?acne|blemish|retinol|retinal|glycolic|salicylic|depigment)\b/],
  ["moisturizer", /\b(creme|cream|hydratant|moisturi[sz]er|baume|balm|emulsion|fluide|gel-creme|lait|soin (de )?(jour|nuit)|night cream|day cream)\b/],
];

const fiches = JSON.parse(fs.readFileSync(FICHES, "utf8"));
const resultat = fs.existsSync(SORTIE) ? JSON.parse(fs.readFileSync(SORTIE, "utf8")) : {};
let surs = 0; const incertains = [];
for (const f of Object.values(fiches)) {
  if (f.erreur || !f.asin || resultat[f.asin]) continue;
  const t = sansAccents((f.titre || "") + " " + (f.gamme || ""));
  const touches = [...new Set(REGLES.filter(([, re]) => re.test(t)).map(([c]) => c))];
  if (touches.length === 1 || (touches.length >= 1 && touches[0] === "hors-perimetre")) {
    resultat[f.asin] = { categorie: touches[0], via: "regle" };
    surs++;
  } else incertains.push({ asin: f.asin, titre: f.titre, pistes: touches });
}
fs.writeFileSync(SORTIE, JSON.stringify(resultat, null, 1), "utf8");
console.log(surs + " catégorisés par règle · " + incertains.length + " incertains\n");
for (const i of incertains) console.log(i.asin + " | " + (i.pistes.join(",") || "∅") + " | " + String(i.titre).slice(0, 88));
