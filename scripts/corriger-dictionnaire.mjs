// CORRECTIFS DES DONNÉES DU SCAN — les décisions de l'audit du 7 septembre, en clair.
// (docs/audit/moteur-notation-2026-09-07/rapport-final-v2.md, annexe G1)
//
// Le dictionnaire est un JSON d'une seule ligne, édité à la main : `git diff` n'y montre rien.
// Chaque correctif est donc déclaré ici avec son motif, sa cible et ce qu'il change, et le
// script imprime un rapport lisible, une ligne par changement. Il est IDEMPOTENT : relancé après
// application, il n'a plus rien à faire. Il ne touche JAMAIS au champ `fonctions`, qui appartient
// à `src/lib/scan/fonctions.mjs` (règles par le nom) — à relancer après ce script.
//
// Usage : node scripts/corriger-dictionnaire.mjs                    → simulation + rapport
//         node scripts/corriger-dictionnaire.mjs --appliquer        → écrit les trois fichiers (sauvegardes *.avant-correctifs.json)
//         node scripts/corriger-dictionnaire.mjs --verifier         → sort en erreur s'il reste quelque chose à faire
//         node scripts/corriger-dictionnaire.mjs --lister-fragrance → les fiches « parfum » qui ne sont ni allergène UE ni huile essentielle
import fs from "node:fs";
import path from "node:path";

const D = path.join(process.cwd(), "data", "scan") + path.sep;

// ── Références réglementaires des ingrédients bannis (portée « tous » = rincé compris) ──
const BANS = {
  "BUTYLPHENYL METHYLPROPIONAL": { portee: "tous", ref: "Règl. (UE) 2021/1902 — interdit dans tous les cosmétiques depuis le 1er mars 2022 (CMR 1B)" },
  "HYDROXYISOHEXYL 3-CYCLOHEXENE CARBOXALDEHYDE": { portee: "tous", ref: "Règl. (UE) 2017/1410 — interdit (2021)" },
  "HYDROQUINONE": { portee: "tous", ref: "Règl. (CE) 1223/2009 annexe II — interdit" },
  "METHYLISOTHIAZOLINONE": { portee: "pose", ref: "Règl. (UE) 2016/1198 — interdit en produit non rincé (2017) ; Règl. (UE) 2017/1224 — rincé ≤ 15 ppm (2018)" },
};

// Un correctif : { id, motif, cible (nom | RegExp | liste), si?(fiche), avant?, patch | creer | supprimer }.
// `avant` = valeurs attendues AVANT correction : si la fiche porte autre chose (ni `avant`, ni la
// valeur cible), c'est une DÉRIVE — quelqu'un a modifié la fiche entre-temps — et on s'arrête.
// `patch` : chemins pointés (« risks.irritant ») ou fonction (fiche, nom) → objet.
export const CORRECTIFS = [
  // — B2 · « parfum » ne veut pas dire conservateur ———————————————————————
  { id: "B2-conservateurs", motif: "conservateurs et anti-irritant comptés comme parfum (90 produits sans parfum pénalisés)",
    cible: ["BENZYL ALCOHOL", "PHENETHYL ALCOHOL", "PHENYLPROPANOL", "4-T-BUTYLCYCLOHEXANOL", "BENZOIC ACID"],
    avant: { fragrance: true }, patch: { fragrance: false } },

  // — B3 · fiches qui faussent la mécanique ————————————————————————————
  { id: "B3-propylene-glycol", motif: "PG : CIR safe as used ; ACDS Allergen of the Year 2018 = sensibilisant 2, pas irritant 2 (267 produits)",
    cible: "PROPYLENE GLYCOL", avant: { "risks.irritant": 2, "risks.sensibilisant": 1 }, patch: { "risks.irritant": 1, "risks.sensibilisant": 2 } },
  { id: "B3-triclosan", motif: "triclosan : antimicrobien restreint à 0,3 % (résistance, endocrinologie), pas un irritant fort",
    cible: "TRICLOSAN", avant: { "risks.irritant": 3 }, patch: { "risks.irritant": 1, restreintUE: "0,3%" } },
  { id: "B3-adapalene-lowDose", motif: "adapalène dosé 0,1 % : efficace sous la barre des 1 %",
    cible: "ADAPALENE", patch: { lowDose: true } },
  { id: "B3-menthol", motif: "menthol : irritant sensoriel actif sous 1 % (lowDose), pas une « force » d'actif",
    cible: "MENTHOL", avant: { strength: 1 }, patch: { strength: 0, lowDose: true } },
  { id: "B3-hyaluronates-lowDose", motif: "hyaluronates efficaces < 1 % : comptés à plein quelle que soit la position",
    cible: /HYALURON/, si: (f) => f.role === "active", patch: { lowDose: true } },
  { id: "B3-niacinamide", motif: "RCT pigmentation (Hakozaki 2002), barrière (Tanno 2000), rougeurs (Draelos 2005)",
    cible: "NIACINAMIDE", patch: { benefits: ["blemishes", "oiliness", "aging", "spots", "redness", "barrier"] } },
  { id: "B3-azelaique", motif: "acide azélaïque : AMM rosacée (15 %) → rougeurs",
    cible: "AZELAIC ACID", patch: (f) => ({ benefits: [...new Set([...(f.benefits || []), "redness"])] }) },
  { id: "B3-hamamelis", motif: "hamamélis : anti-érythème modeste (Hughes-Formella 1998), tanins irritants → power 1, irritant 1, bénéfices conservés",
    cible: /HAMAMELIS|WITCH HAZEL/, patch: { benefitPower: 1, "risks.irritant": 1 } },
  { id: "B3-glycerine-vegetale", motif: "même molécule que GLYCERIN (power 2) : une graphie ne vaut pas un point de preuve",
    cible: /^GLYCERIN \(VEGETABLE/, patch: { benefitPower: 2, benefits: ["dehydration"] } },
  { id: "B3-propanediols", motif: "rôle « humectant » hors vocabulaire (active / support / filler) ; la fonction humectant vient de fonctions.mjs",
    cible: ["1,3-PROPANEDIOL", "1,2-HEPTANEDIOL"], patch: { role: "support" } },
  { id: "B3-entree-inversee", motif: "graphie inversée de SODIUM HYALURONATE, power 3 : fiche fantôme",
    cible: "ETANORULAYH MUIDOS", supprimer: true },

  // — B1 · filtres solaires absents du dictionnaire (les fonctions sont posées par fonctions.mjs) ——
  { id: "B1-uvinul-a-plus", motif: "Uvinul A Plus, filtre UVA présent dans 16 INCI, absent du dictionnaire",
    cible: "DIETHYLAMINO HYDROXYBENZOYL HEXYL BENZOATE",
    creer: { role: "support", benefits: [], benefitPower: 0, risks: { irritant: 0, comedogenic: 0, sensibilisant: 0 }, strength: 0, essentialOil: false, fragrance: false, safetyReview: "safe", src: "SCCS/1624/19 (Uvinul A Plus) — filtre UVA", fonctions: [] } },
  { id: "B1-iscotrizinol", motif: "Iscotrizinol (Uvasorb HEB), filtre UVB photostable présent dans 5 INCI, absent du dictionnaire",
    cible: "DIETHYLHEXYL BUTAMIDO TRIAZONE",
    creer: { role: "support", benefits: [], benefitPower: 0, risks: { irritant: 0, comedogenic: 0, sensibilisant: 0 }, strength: 0, essentialOil: false, fragrance: false, safetyReview: "safe", src: "Règl. (CE) 1223/2009 annexe VI — filtre UVB", fonctions: [] } },

  // — B9 · portée des interdictions UE ————————————————————————————————
  { id: "B9-bans-portee", motif: "Lilial, Lyral, hydroquinone interdits rincés compris ; la méthylisothiazolinone reste légale en rincé (15 ppm)",
    cible: Object.keys(BANS), si: (f) => !!f.banniUE,
    patch: (f, nom) => ({ banniUEPortee: BANS[nom].portee, banniUERef: BANS[nom].ref }) },
];

// ── Alias (data/scan/ingredients-canon.json, clé `alias`) ————————————————
export const ALIAS = {
  "OCTISALATE": "ETHYLHEXYL SALICYLATE",            // nom US du filtre, 115 INCI de solaires
  "OCTINOXATE": "ETHYLHEXYL METHOXYCINNAMATE",
  "ZINC OXIDE (CI 77947)": "ZINC OXIDE",
  "CERAMIDE 3": "CERAMIDE NP",                       // même molécule, deux noms : comptée deux fois
  "VITAMIN E": "TOCOPHEROL",
  "ETHANOL": "ALCOHOL",
  "PURE PLANT-DERIVED SQUALANE": "SQUALANE",
  "AVENE AQUA": "WATER",
};

// ── Catalogue (data/scan/catalog.json) : fiches à réparer, ciblées par nom exact ————————
// { nom, source?, motif, avant: RegExp sur l'INCI actuel, inci: nouvelle valeur (null = fiche corrompue, hors notation) }
const WELEDA_JOUR = "Water (Aqua), Helianthus Annuus (Sunflower) Seed Oil, Glycerin, Isoamyl Laurate, Butyrospermum Parkii (Shea) Butter, Pentylene Glycol, Betaine, Alcohol, Glyceryl Stearate Citrate, Behenyl Alcohol, Squalane, Rhus Verniciflua Peel Wax, Viola Tricolor Extract, Olea Europaea (Olive) Leaf Extract, Rosmarinus Officinalis (Rosemary) Leaf Extract, Chamomilla Recutita (Matricaria) Flower Extract, Calendula Officinalis Flower Extract, Hectorite, Acacia Senegal Gum, Xanthan Gum, Tocopherol, Lactic Acid, Glyceryl Caprylate, Fragrance (Parfum), Limonene, Linalool, Benzyl Benzoate, Citral";
export const CATALOGUE = [
  // Même produit sous deux fiches : la FR s'arrêtait avant le parfum et ses allergènes (76 au lieu
  // de 53), la US portait deux fautes de lecture (« Cilycerin », « lsoamyl »). Les 23 premiers
  // ingrédients des deux listes sont identiques : la queue vient de la fiche US.
  { nom: "Weleda Skin Food Crème de Jour nourrissante", source: "amazon-fr", motif: "INCI sans parfum ni allergènes déclarés (fiche US du même produit : Fragrance, Limonene, Linalool, Benzyl Benzoate, Citral)",
    avant: /^Water \(Aqua\), Helianthus Annuus \(Sunflower\) Seed Oil, Glycerin, Isoamyl Laurate/, inci: WELEDA_JOUR },
  { nom: "Weleda Skin Food Face Care Nourishing Day Cream", source: "amazon-fr", motif: "fautes de lecture « Cilycerin », « lsoamyl Laurate », astérisque de Citral",
    avant: /^Water \(Aqua\), Helianthus Annuus \(Sunflower\) Seed Oil, Cilycerin, lsoamyl Laurate/, inci: WELEDA_JOUR },
  { nom: "Weleda Skin Food Travel Size Clear 40 Count", source: "amazon-fr", motif: "liste corrompue (jetons « 1 », « Sunflower Seed Oil Wool Wax Sweet Almond Oil », alcool remonté) : hors notation",
    avant: /Wool Wax Sweet Almond Oil/, inci: null },
];

// ── mécanique ————————————————————————————————————————————————————————
const lire = (o, chemin) => chemin.split(".").reduce((x, k) => (x == null ? undefined : x[k]), o);
function ecrire(o, chemin, val) {
  const ks = chemin.split("."); let x = o;
  for (const k of ks.slice(0, -1)) { if (x[k] == null || typeof x[k] !== "object") x[k] = {}; x = x[k]; }
  if (val === undefined) delete x[ks.at(-1)]; else x[ks.at(-1)] = val;
}
const egal = (a, b) => JSON.stringify(a) === JSON.stringify(b);

/** Applique les correctifs sans effet de bord. Renvoie le dictionnaire corrigé, le rapport
 *  (une entrée par champ modifié) et les dérives (fiche absente ou valeur inattendue). */
export function appliquerCorrectifs(dico, correctifs) {
  const out = structuredClone(dico);
  const rapport = [], derives = [];
  for (const c of correctifs) {
    const noms = c.cible instanceof RegExp ? Object.keys(out).filter((n) => c.cible.test(n))
               : Array.isArray(c.cible) ? c.cible : [c.cible];
    for (const nom of noms) {
      if (c.supprimer) { if (out[nom]) { delete out[nom]; rapport.push({ id: c.id, cible: nom, champ: "(fiche)", avant: "présente", apres: "supprimée" }); } continue; }
      if (c.creer) { if (!out[nom]) { out[nom] = structuredClone(c.creer); rapport.push({ id: c.id, cible: nom, champ: "(fiche)", avant: "absente", apres: "créée" }); } continue; }
      const f = out[nom];
      if (!f) { derives.push({ id: c.id, cible: nom, champ: "(fiche)", actuel: "absente" }); continue; }
      if (c.si && !c.si(f)) continue;
      const patch = typeof c.patch === "function" ? c.patch(f, nom) : c.patch;
      for (const [chemin, val] of Object.entries(patch)) {
        if (chemin === "fonctions" || chemin.startsWith("fonctions.")) throw new Error(c.id + " : le champ fonctions appartient à fonctions.mjs");
        const actuel = lire(f, chemin);
        if (egal(actuel, val)) continue;
        if (c.avant && chemin in c.avant && !egal(actuel, c.avant[chemin])) { derives.push({ id: c.id, cible: nom, champ: chemin, actuel, attendu: c.avant[chemin] }); continue; }
        ecrire(f, chemin, val);
        rapport.push({ id: c.id, cible: nom, champ: chemin, avant: actuel, apres: val });
      }
    }
  }
  return { dico: out, rapport, derives };
}

/** Alias : ajoute ou corrige, sans toucher aux autres entrées. */
export function appliquerAlias(canon, alias) {
  const out = structuredClone(canon); out.alias = out.alias || {};
  const rapport = [];
  for (const [k, v] of Object.entries(alias)) if (out.alias[k] !== v) { rapport.push({ id: "ALIAS", cible: k, champ: "alias", avant: out.alias[k], apres: v }); out.alias[k] = v; }
  return { canon: out, rapport };
}

/** Catalogue : répare des INCI ciblées par nom exact, en vérifiant l'état attendu. */
export function appliquerCatalogue(catalogue, correctifs) {
  const out = structuredClone(catalogue);
  const rapport = [], derives = [];
  for (const c of correctifs) {
    const cibles = out.filter((p) => p.name === c.nom && (!c.source || p.source === c.source));
    if (!cibles.length) { derives.push({ id: "CAT", cible: c.nom, champ: "(fiche)", actuel: "absente" }); continue; }
    for (const p of cibles) {
      if (egal(p.inci ?? null, c.inci)) continue;
      if (c.avant && !c.avant.test(p.inci || "")) { derives.push({ id: "CAT", cible: c.nom, champ: "inci", actuel: String(p.inci).slice(0, 60), attendu: String(c.avant) }); continue; }
      rapport.push({ id: "CAT", cible: c.nom, champ: "inci", avant: String(p.inci).slice(0, 50) + "…", apres: c.inci === null ? "null (hors notation)" : c.inci.slice(0, 50) + "…" });
      p.inci = c.inci;
    }
  }
  return { catalogue: out, rapport, derives };
}

// ── CLI ————————————————————————————————————————————————————————————
if (process.argv[1]?.endsWith("corriger-dictionnaire.mjs")) {
  const args = process.argv.slice(2);
  const dico = JSON.parse(fs.readFileSync(D + "dictionnaire.json", "utf8"));
  if (args.includes("--lister-fragrance")) {
    const l = Object.entries(dico).filter(([, f]) => f.fragrance && !f.euFragranceAllergen && !f.essentialOil);
    console.log(l.length + " fiches fragrance:true ni allergène UE ni huile essentielle :");
    for (const [n, f] of l) console.log("  " + n.padEnd(46) + " sens=" + (f.risks?.sensibilisant ?? 0) + " src=" + String(f.src).slice(0, 50));
    process.exit(0);
  }
  const canon = JSON.parse(fs.readFileSync(D + "ingredients-canon.json", "utf8"));
  const cat = JSON.parse(fs.readFileSync(D + "catalog.json", "utf8"));
  const r1 = appliquerCorrectifs(dico, CORRECTIFS), r2 = appliquerAlias(canon, ALIAS), r3 = appliquerCatalogue(cat, CATALOGUE);
  const rapport = [...r1.rapport, ...r2.rapport, ...r3.rapport], derives = [...r1.derives, ...r3.derives];
  const fmt = (v) => v === undefined ? "∅" : JSON.stringify(v);
  for (const l of rapport) console.log(`[${l.id}] ${l.cible}  ${l.champ} ${fmt(l.avant)} → ${fmt(l.apres)}`);
  for (const d of derives) console.log(`⚠️  DÉRIVE [${d.id}] ${d.cible} ${d.champ} : ${fmt(d.actuel)}` + (d.attendu !== undefined ? ` (attendu ${fmt(d.attendu)})` : ""));
  console.log(`\n${rapport.length} modification(s), ${derives.length} dérive(s)`);
  if (args.includes("--verifier")) process.exit(rapport.length || derives.length ? 1 : 0);
  if (derives.length) { console.log("→ rien n'est écrit tant qu'une dérive n'est pas résolue"); process.exit(1); }
  if (args.includes("--appliquer")) {
    for (const f of ["dictionnaire", "ingredients-canon", "catalog"]) fs.copyFileSync(D + f + ".json", D + f + ".avant-correctifs.json");
    fs.writeFileSync(D + "dictionnaire.json", JSON.stringify(r1.dico));             // une ligne, comme fonctions.mjs
    fs.writeFileSync(D + "ingredients-canon.json", JSON.stringify(r2.canon, null, 1)); // format du fichier : 1 espace
    fs.writeFileSync(D + "catalog.json", JSON.stringify(r3.catalogue));              // une ligne, ids = index, jamais réordonné
    console.log("✅ APPLIQUÉ (sauvegardes *.avant-correctifs.json) — relancer maintenant : node src/lib/scan/fonctions.mjs --appliquer");
  } else console.log("(simulation — relancer avec --appliquer)");
}
