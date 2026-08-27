// CATÉGORISATION PAR FAISCEAU DE PREUVES.
// Ni le nom ni la composition ne décident seuls : chacun VOTE avec un poids, et la catégorie
// qui rassemble le plus de preuves l'emporte. Quand deux catégories sont au coude-à-coude,
// on le dit (« incertain ») plutôt que de trancher au hasard.
// 100 % mécanique (aucune IA). Usage :
//   node categorise.mjs             → simulation
//   node categorise.mjs --appliquer → écrit catalog.json (+ catalog.bak2.json)
import fs from "node:fs";
import path from "node:path";
import { decouperInci } from "./scoring.mjs";

const D = path.join(process.cwd(), "data", "scan") + path.sep;
const APPLIQUER = process.argv.includes("--appliquer");


// ── HORS PÉRIMÈTRE : ce qui n'est manifestement pas du soin du VISAGE ──
const HORS_PERIMETRE = /shampoo|shampooing|conditioner|après-shampo|apres-shampo|hair (mask|oil|serum|cream)|cheveux|scalp|cuir chevelu|body (wash|lotion|cream|butter|oil|scrub|serum|milk)|corps\b|hand (cream|wash|lotion)|crème mains|\bfoot\b|pieds|lip (balm|scrub|mask|oil|treatment)|lèvres|baume à lèvres|mascara|foundation|fond de teint|lipstick|concealer|highlighter|deodorant|déodorant|toothpaste|dentifrice|shaving (cream|gel|foam)|crème à raser|mousse à raser|aftershave|après-rasage|supplement|complément alimentaire|\bkit\b|\bbundle\b|coffret|\bset\b(?! spray)|self ?tan|autobronzant/i;

const CATS = ["cleanser", "moisturizer", "serum", "sunscreen", "exfoliant",
              "eye-cream", "mask", "makeup-remover", "toner", "treatment"];

// ── PREUVES DU NOM ── [catégorie, motif, poids]
// 3 = le nom nomme la catégorie · 2 = fortement évocateur · 1 = indice faible
const NOM = [
  ["sunscreen", /\bspf\s*\d|sunscreen|sun screen|écran solaire|\bfps\s*\d/i, 3],
  ["sunscreen", /solaire|\buva?\/?uvb?\b|sun (fluid|milk|lotion|stick|cream)/i, 2],
  ["makeup-remover", /make ?up remover|démaquillant|demaquillant|micellar|eau micellaire/i, 3],
  ["makeup-remover", /cleansing (oil|balm|water|milk)|huile démaquillante|baume démaquillant/i, 2],
  ["eye-cream", /\beye (cream|serum|gel|balm|patch|treatment)\b|contour des yeux|crème yeux/i, 3],
  ["eye-cream", /\beye\b|yeux/i, 1],
  ["exfoliant", /exfoliant|exfoliat|\bpeel\b|peeling|scrub|gommage|resurfacing|microderm/i, 3],
  ["exfoliant", /\baha\b|\bbha\b|\bpha\b|glycolic|salicylic|lactic acid|enzyme/i, 1],
  ["mask", /\bmask\b|masque|sheet mask|masque tissu/i, 3],
  ["mask", /\bpatch(es)?\b/i, 1],
  ["cleanser", /cleanser|nettoyant|face wash|\bwash\b|mousse nettoyante|gel moussant|pain nettoyant/i, 3],
  ["cleanser", /cleansing (gel|foam|cream|balm|milk)|foaming|purifying gel/i, 2],
  ["toner", /\btoner\b|lotion tonique|astringent/i, 3],
  ["toner", /\bessence\b|\bmist\b|brume|tonique/i, 2],
  ["serum", /\bserum\b|sérum|ampoule|\bbooster\b|concentré actif/i, 3],
  ["serum", /concentrate|concentré|\belixir\b/i, 1],
  ["moisturizer", /moisturi[sz]er|hydratant|hydratante|\bcrème\b|face cream|day cream|night cream|soin de jour|soin de nuit|fluide/i, 3],
  ["moisturizer", /\bcream\b|\blotion\b|\bfluid\b|\bbalm\b|émulsion|emulsion|\bgel\b|hydrat/i, 1],
  ["treatment", /\btreatment\b|spot treatment|acne treatment|\bsoin\b|corrector/i, 2],
  ["treatment", /anti-?(age|aging|wrinkle|ride)|repair|\bcure\b/i, 1],
];

// ── PREUVES DE LA COMPOSITION ──
const TENSIOACTIFS = ["SULFATE", "SULFONATE", "SARCOSINATE", "ISETHIONATE", "TAURATE",
  "SODIUM COCOYL", "COCAMIDOPROPYL BETAINE", "COCO-GLUCOSIDE", "LAURYL GLUCOSIDE",
  "DECYL GLUCOSIDE", "POTASSIUM COCOATE", "SODIUM LAUROYL", "POTASSIUM MYRISTATE"];
const FILTRES_ORGA = ["AVOBENZONE", "OCTOCRYLENE", "HOMOSALATE", "OCTINOXATE", "ETHYLHEXYL METHOXYCINNAMATE",
  "ETHYLHEXYL SALICYLATE", "OCTISALATE", "BEMOTRIZINOL", "BISOCTRIZOLE", "TINOSORB", "UVINUL",
  "DIETHYLAMINO HYDROXYBENZOYL", "BIS-ETHYLHEXYLOXYPHENOL", "OCTYL SALICYLATE", "ENSULIZOLE",
  "BENZOPHENONE-3", "POLYSILICONE-15"];
const FILTRES_MIN = ["ZINC OXIDE", "TITANIUM DIOXIDE"];
const ACIDES_EXFO = ["GLYCOLIC ACID", "LACTIC ACID", "SALICYLIC ACID", "MANDELIC ACID",
  "MALIC ACID", "TARTARIC ACID", "GLUCONOLACTONE", "TRICHLOROACETIC"];
const ARGILES = ["KAOLIN", "BENTONITE", "MONTMORILLONITE", "ILLITE", "SOLUM DIATOMEAE", "CHARCOAL", "CARBO ACTIVATUS"];
const HUILES = ["MINERAL OIL", "PARAFFINUM", "ETHYLHEXYL PALMITATE", "CAPRYLIC/CAPRIC TRIGLYCERIDE",
  "ISOPROPYL MYRISTATE", "PENTAERYTHRITYL", "HYDROGENATED POLY"];
const OCCLUSIFS = ["BUTTER", "PETROLATUM", "CERA ", "BEESWAX", "LANOLIN", "DIMETHICONE", "SHEA"];

function tokens(inci) {
  return decouperInci(inci).map((t, i) => ({
    n: t.trim().toUpperCase().replace(/\s+/g, " ").replace(/\s*\([^)]*\)\s*/g, " ").trim(), pos: i + 1,
  })).filter((t) => t.n.length > 1);
}
const trouve = (L, mots, maxPos = 99) => L.some((t) => t.pos <= maxPos && mots.some((m) => t.n.includes(m)));

function preuvesComposition(L) {
  if (!L.length) return [];
  const v = [];
  const eauEnTete = L[0].n.includes("WATER") || L[0].n.includes("AQUA");
  if (trouve(L, FILTRES_ORGA, 14)) v.push(["sunscreen", 3]);      // aucun autre usage possible
  else if (trouve(L, FILTRES_MIN, 8)) v.push(["sunscreen", 1]);   // aussi pigment/opacifiant → faible
  if (trouve(L, TENSIOACTIFS, 6)) v.push(["cleanser", 3]);
  else if (trouve(L, TENSIOACTIFS, 12)) v.push(["cleanser", 1]);
  if (trouve(L, ARGILES, 8)) v.push(["mask", 2]);
  if (trouve(L, ACIDES_EXFO, 6)) v.push(["exfoliant", 2]);
  else if (trouve(L, ACIDES_EXFO, 12)) v.push(["exfoliant", 1]);
  if (!eauEnTete && trouve(L, HUILES, 4)) v.push(["makeup-remover", 2]);
  if (eauEnTete && trouve(L, OCCLUSIFS, 8)) v.push(["moisturizer", 2]);   // émulsion riche = crème
  if (eauEnTete && !trouve(L, OCCLUSIFS, 10) && !trouve(L, TENSIOACTIFS, 10)) {
    v.push(["serum", 1]); v.push(["toner", 1]);                            // aqueux léger : les deux
  }
  return v;
}

// ── VOTE RÉUTILISABLE ─────────────────────────────────────────────────────────
// Sert aussi au scan d'une liste INCI photographiée : sans identité catalogue, on n'a que
// le nom lu sur l'étiquette (parfois rien) et la composition. Le même faisceau de preuves
// répond, et dit son niveau de confiance.
export function categoriser(nom, inci) {
  if (HORS_PERIMETRE.test(nom || "")) return { categorie: "hors-perimetre", confiance: "sur", votes: [] };
  const L = tokens(inci);
  const votes = Object.fromEntries(CATS.map((c) => [c, 0]));
  for (const [c, rx, w] of NOM) if (rx.test(nom || "")) votes[c] += w;
  for (const [c, w] of preuvesComposition(L)) votes[c] += w;
  const classement = Object.entries(votes).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
  if (!classement.length) return { categorie: "indetermine", confiance: "aucune", votes: [] };
  const [c1, n1] = classement[0];
  const n2 = classement[1]?.[1] ?? 0;
  const confiance = (n1 >= 4 && n1 - n2 >= 2) ? "sur" : (n1 - n2 >= 2) ? "probable" : "incertain";
  return { categorie: c1, confiance, votes: classement.slice(0, 3).map(([c, n]) => ({ c, n })),
           filtresUV: trouve(L, FILTRES_ORGA, 14) || trouve(L, FILTRES_MIN, 8) };
}

if (!process.argv[1]?.endsWith("categorise.mjs")) { /* importé comme module : rien d'autre ne s'exécute */ }
else {

const cat = JSON.parse(fs.readFileSync(D + "catalog.json", "utf8"));
const stats = { sur: 0, probable: 0, incertain: 0, indetermine: 0, change: 0, inchange: 0 };
const conflits = [];

for (const p of cat) {
  const nom = p.name || "";
  const L = tokens(p.inci);
  if (HORS_PERIMETRE.test(nom)) { p._cat = "hors-perimetre"; p._conf = "sur"; p._uv = false;
    (p._cat === p.category ? stats.inchange++ : stats.change++); stats.sur++; continue; }
  const votes = Object.fromEntries(CATS.map((c) => [c, 0]));
  for (const [c, rx, w] of NOM) if (rx.test(nom)) votes[c] += w;
  for (const [c, w] of preuvesComposition(L)) votes[c] += w;

  const classement = Object.entries(votes).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
  let finale, confiance;
  if (!classement.length) { finale = "indetermine"; confiance = "aucune"; stats.indetermine++; }
  else {
    const [c1, n1] = classement[0];
    const n2 = classement[1]?.[1] ?? 0;
    finale = c1;
    if (n1 >= 4 && n1 - n2 >= 2) { confiance = "sur"; stats.sur++; }
    else if (n1 - n2 >= 2) { confiance = "probable"; stats.probable++; }
    else {
      confiance = "incertain"; stats.incertain++;
      if (conflits.length < 10) conflits.push({ nom: nom.slice(0, 44), votes: classement.slice(0, 3).map(([c, n]) => c + ":" + n).join(" ") });
    }
  }
  p._cat = finale; p._conf = confiance;
  p._uv = trouve(L, FILTRES_ORGA, 14) || trouve(L, FILTRES_MIN, 8);
  finale === p.category ? stats.inchange++ : stats.change++;
}

console.log("━━━ CATÉGORISATION PAR FAISCEAU DE PREUVES (" + cat.length + " produits) ━━━");
console.log("  sûr (preuve nette)         : " + stats.sur);
console.log("  probable                   : " + stats.probable);
console.log("  incertain (votes serrés)   : " + stats.incertain);
console.log("  indéterminé (aucun signal) : " + stats.indetermine);
console.log("  → inchangé " + stats.inchange + " | changé " + stats.change);

const avant = {}, apres = {};
for (const p of cat) { avant[p.category || "?"] = (avant[p.category || "?"] || 0) + 1; apres[p._cat] = (apres[p._cat] || 0) + 1; }
console.log("\n  catégorie          avant  →  après");
for (const k of [...new Set([...Object.keys(avant), ...Object.keys(apres)])].sort())
  console.log("  " + k.padEnd(18) + String(avant[k] || 0).padStart(5) + "  →  " + String(apres[k] || 0).padStart(5));

console.log("\n  exemples de votes serrés (marqués « incertain ») :");
for (const c of conflits) console.log("   « " + c.nom + " » → " + c.votes);
console.log("\n  produits contenant des filtres UV : " + cat.filter((p) => p._uv).length +
            " (dont " + cat.filter((p) => p._uv && p._cat !== "sunscreen").length + " non-solaires)");

if (APPLIQUER) {
  fs.writeFileSync(D + "catalog.bak2.json", JSON.stringify(cat));
  for (const p of cat) {
    p.categorieSource = p.categorieSource || p.category;
    p.category = p._cat; p.catConfiance = p._conf; if (p._uv) p.filtresUV = true;
    delete p._cat; delete p._conf; delete p._uv;
  }
  fs.writeFileSync(D + "catalog.json", JSON.stringify(cat, null, 1));
  console.log("\n✅ APPLIQUÉ (sauvegarde : catalog.bak2.json)");
} else console.log("\n(simulation — rien écrit ; relancer avec --appliquer)");
}
