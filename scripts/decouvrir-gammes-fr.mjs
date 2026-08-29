// Découverte des gammes de parapharmacie française sur Amazon (.fr et .com).
//
// Le jeu de données Amazon.fr ne sait pas chercher par mot-clé (et sa collecte dédiée est
// cassée) : la découverte passe donc par un moteur de recherche restreint au marketplace,
// la voie qui a fait ses preuves pour retrouver les avis. Chaque requête est une GAMME
// (« SVR Sebiaclear », « Uriage Hyséac ») : c'est l'unité commerciale réelle — une marque
// se cherche mal, un produit précis se rate.
//
// Ce script ne PAIE aucune collecte : il dresse l'inventaire des candidats (asin, titre,
// marketplace), marque ce qui semble déjà en base, et s'arrête là. La collecte des fiches
// ne part qu'après relecture de l'inventaire.
//
//   node scripts/decouvrir-gammes-fr.mjs --max 6     → échantillon de gammes
//   node scripts/decouvrir-gammes-fr.mjs             → tout
import fs from "node:fs";
import path from "node:path";
import { distinctifs } from "./verifier-appariement.mjs";

const RACINE = path.resolve(import.meta.dirname, "..");
const SORTIE = path.join(RACINE, "data/scan/decouverte-fr.json");
const CLE = fs.readFileSync(path.join(RACINE, "bright_key.txt"), "utf8").trim();
const H = { Authorization: "Bearer " + CLE, "Content-Type": "application/json" };
const PARALLELE = 5;

// Les gammes VISAGE des marques retenues. Dercos (cheveux), Klorane capillaire, les gammes
// corps pures sont écartées d'office — le catalogue est un catalogue de soins du visage.
// CeraVe et Cetaphil sont absents : leurs gammes sont déjà en base côté US.
const GAMMES = {
  "La Roche-Posay": ["Effaclar", "Cicaplast", "Toleriane", "Anthelios", "Hyalu B5", "Retinol B3", "Mela B3", "Pure Vitamin C10"],
  "Avène": ["Cleanance", "Cicalfate", "Tolérance Control", "Hydrance", "Eau Thermale", "A-Oxitive", "PhysioLift", "Vitamin Activ Cg"],
  "Bioderma": ["Sensibio", "Sébium", "Hydrabio", "Photoderm", "Pigmentbio", "Cicabio"],
  "Vichy": ["Minéral 89", "Normaderm", "Liftactiv", "Capital Soleil", "Aqualia Thermal", "Neovadiol"],
  "Uriage": ["Hyséac", "Bariéderm Cica", "Eau Thermale", "Roséliane", "Age Lift", "Dépiderm"],
  "SVR": ["Sebiaclear", "Cicavit+", "Topialyse visage", "Sun Secure", "Clairial", "Biotic"],
  "Ducray": ["Keracnyl", "Ictyane visage", "Melascreen"],
  "A-Derma": ["Exomega Control", "Epitheliale A.H", "Phys-AC", "Biology"],
  "Eucerin": ["Hyaluron-Filler", "DermoPure", "Anti-Pigment", "Sun Oil Control", "AtopiControl visage", "Aquaphor"],
  "Nuxe": ["Huile Prodigieuse", "Rêve de Miel", "Merveillance Lift", "Nuxuriance Ultra", "Aquabella", "Very Rose"],
  "Caudalie": ["Vinoperfect", "Vinopure", "Premier Cru", "Resveratrol-Lift", "Vinergetic C+", "Beauty Elixir"],
  "Filorga": ["Time-Filler", "Hydra-Filler", "NCEF-Reverse", "Oxygen-Glow", "Global-Repair"],
  "Lierac": ["Lift Integral", "Hydragenist", "Cica-Filler", "Sunissime"],
  "Embryolisse": ["Lait-Crème Concentré"],
  "Topicrem": ["Hydra+ visage", "AC Compensating"],
  "Noreva": ["Exfoliac"],
  "Klorane": ["Bleuet démaquillant"],
  "Weleda": ["Skin Food"],
  "Bi-Oil": ["Huile de Soin"],
  "Isdin": ["Fotoprotector Fusion Water"],
  "Payot": ["Pâte Grise"],
  "Mixa": ["Sensitive Skin Expert visage"],
};

const args = process.argv.slice(2);
const MAX = args.includes("--max") ? parseInt(args[args.indexOf("--max") + 1], 10) : Infinity;

async function serp(q) {
  for (let n = 0; n < 2; n++) {
    try {
      const r = await fetch("https://api.brightdata.com/request", { method: "POST", headers: H,
        body: JSON.stringify({ zone: "mcp_unlocker", url: "https://www.google.com/search?q=" + encodeURIComponent(q) + "&brd_json=1", format: "raw" }),
        signal: AbortSignal.timeout(45000) });
      if (!r.ok) throw new Error("HTTP " + r.status);
      return (JSON.parse(await r.text()).organic || []);
    } catch (e) { if (n) throw e; }
  }
  return [];
}

// le catalogue existant, pour marquer ce qui y est déjà — par marque, pour ne comparer
// que ce qui peut se confondre
const catalogue = JSON.parse(fs.readFileSync(path.join(RACINE, "data/scan/catalog.json"), "utf8"));
const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
const parMarque = {};
for (const p of catalogue) (parMarque[norm(p.brand)] ||= []).push(p);
const asinsConnus = new Set(catalogue.flatMap((p) => [p.asin, p.asinAvis]).filter(Boolean));

// Le marquage « déjà en base » se doit d'être STRICT dans les deux sens. Trop lâche, il cache de
// vrais nouveaux : notre fiche « Anthelios » toute nue absorbait UVMune 400, Age Correct et
// l'Anti-Shine, et « Toleriane Double Repair » absorbait le Dermallergo. Trop strict, il crée des
// doublons — mais ceux-là, le dédoublonnage par INCI identique les rattrape en aval. On exige donc
// une quasi-égalité des mots distinctifs (Jaccard ≥ 0,75), et on laisse l'INCI trancher le reste.
function dejaEnBase(marque, titre, asin) {
  if (asinsConnus.has(asin)) return "asin déjà en base";
  const sT = new Set(distinctifs(titre, marque));
  for (const p of parMarque[norm(marque)] || []) {
    const sN = new Set(distinctifs(p.name, marque));
    if (!sN.size || !sT.size) continue;
    let inter = 0; for (const m of sN) if (sT.has(m)) inter++;
    if (inter / (sN.size + sT.size - inter) >= 0.75) return "≈ " + p.name.slice(0, 48);
  }
  return null;
}

// exclusions franches : coffrets, lots recomposés, recharges seules, produits capillaires/corps
const HORS = /\b(coffret|kit|routine|set|lot de \d+ diff|shampo|cheveux|capillaire|gel douche|d[ée]odorant|dentifrice|crayon|mascara|lipstick|rouge [àa] l[èe]vres|vernis)\b/i;

const paires = Object.entries(GAMMES).flatMap(([m, gs]) => gs.map((g) => [m, g])).slice(0, MAX);
const acquis = fs.existsSync(SORTIE) ? JSON.parse(fs.readFileSync(SORTIE, "utf8")) : {};
const aFaire = paires.filter(([m, g]) => !((m + "|" + g) in acquis));
console.log(paires.length + " gammes — " + aFaire.length + " à chercher (2 marketplaces chacune)\n");

let faits = 0;
const sauver = () => fs.writeFileSync(SORTIE, JSON.stringify(acquis, null, 2), "utf8");

async function traiter([marque, gamme]) {
  const cle = marque + "|" + gamme;
  const candidats = {};
  for (const [mp, site] of [["fr", "amazon.fr"], ["com", "amazon.com"]]) {
    try {
      const org = await serp(`site:${site} "${gamme}" ${marque}`);
      for (const o of org) {
        const asin = (String(o.link || o.url || "").match(/\/dp\/([A-Z0-9]{10})/) || [])[1];
        if (!asin || candidats[asin]) continue;
        const titre = String(o.title || "").trim();
        if (!titre) continue;
        const sansAccents = (x) => String(x).normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        const nTitre = norm(sansAccents(titre));
        // la marque doit être dans le titre — même règle que partout
        const tete = norm(sansAccents(marque.split(/\s+/)[0]));
        if (!nTitre.includes(norm(sansAccents(marque))) && !(tete.length >= 4 && nTitre.includes(tete))) continue;
        // et la GAMME aussi : la recherche ramène parfois un produit voisin de la même marque
        // (un crayon yeux Toleriane est sorti sous la requête Effaclar)
        const gTete = norm(sansAccents(gamme.split(/\s+/)[0]));
        if (gTete.length >= 4 && !nTitre.includes(gTete)) continue;
        if (HORS.test(titre)) continue;
        candidats[asin] = { asin, titre, marketplace: mp, deja: dejaEnBase(marque, titre, asin) };
      }
    } catch { /* marketplace suivant */ }
  }
  acquis[cle] = { marque, gamme, candidats: Object.values(candidats) };
  faits++;
  const n = Object.values(candidats).length, d = Object.values(candidats).filter((c) => c.deja).length;
  process.stdout.write((n ? "✓" : "·"));
  if (faits % 20 === 0) { sauver(); process.stdout.write(" " + faits + "/" + aFaire.length + "\n"); }
}

const file = aFaire.slice();
await Promise.all(Array.from({ length: PARALLELE }, async () => { while (file.length) await traiter(file.shift()); }));
sauver();

let tot = 0, deja = 0;
const parM = {};
for (const v of Object.values(acquis)) for (const c of v.candidats) {
  tot++; if (c.deja) deja++;
  parM[v.marque] = (parM[v.marque] || 0) + (c.deja ? 0 : 1);
}
console.log("\n\n— découverte —");
console.log("  " + tot + " candidats, dont " + deja + " déjà en base → " + (tot - deja) + " NOUVEAUX");
for (const [m, n] of Object.entries(parM).sort((a, b) => b[1] - a[1])) console.log("  " + String(n).padStart(4) + "  " + m);
console.log("\nécrit dans " + path.relative(RACINE, SORTIE) + " — aucune collecte payée.");
