// CLASSIFICATION FONCTIONNELLE des ingrédients — la brique qui manquait pour juger un produit
// sur SON MÉTIER. Le dictionnaire disait « actif / support / filler » : assez pour compter des
// actifs, pas pour dire « ce nettoyant utilise des tensioactifs doux » ou « cette crème a les
// trois étages d'une vraie hydratation ».
//
// 100 % MÉCANIQUE, par la nomenclature INCI — qui est systématique, c'est tout son intérêt :
// tout ce qui finit en -GLUCOSIDE est un tensioactif doux, tout ce qui contient CERAMIDE est un
// lipide de barrière. Aucune IA, donc reproductible et auditable.
//
// Usage :  node fonctions.mjs             → couverture et exemples
//          node fonctions.mjs --appliquer → écrit le champ `fonctions` dans dictionnaire.json
import fs from "node:fs";
import path from "node:path";

const D = path.join(process.cwd(), "data", "scan") + path.sep;

// ── Les règles. Ordre important : la PREMIÈRE qui matche gagne (du plus spécifique au plus large).
// Un ingrédient peut porter plusieurs fonctions (« marqueurs » cumulables listés à part).
export const REGLES = [
  // — TENSIOACTIFS —————————————————————————————————————————————
  // agressifs : sulfates. Le repère historique du décapage (Löffler 2003).
  ["tensioactif-agressif", /\w*(YL|ETH|ETH-\d+)[ -]?SULFATE\b|COCO.?SULFATE|OLEFIN SULFONATE/],
  // doux : glucosides (sucre), isethionates, taurates, sarcosinates, glutamates, amphotères
  ["tensioactif-doux", /\bGLUCOSIDE|ISETHIONATE|\bTAURATE|SARCOSINATE|GLUTAMATE\b|SULFOSUCCINATE|AMPHOACETATE|AMPHODIACETATE|COCAMIDOPROPYL BETAINE|COCOYL GLYCINATE|LAUROYL GLYCINATE|COCOYL APPLE|BETAINE\b(?=.*COCAMIDO)/],
  // savon : acide gras saponifié (pH élevé). Détection fine au niveau PRODUIT (acide gras + base).
  ["tensioactif-savon", /^(POTASSIUM|SODIUM) (COCOATE|PALMATE|PALM KERNELATE|MYRISTATE|LAURATE|STEARATE|OLEATE)$/],
  ["base-saponifiante", /^(POTASSIUM|SODIUM) HYDROXIDE$|TRIETHANOLAMINE/],
  ["acide-gras-libre", /^(MYRISTIC|LAURIC|PALMITIC|STEARIC) ACID$/],

  // — FILTRES UV, par spectre (un solaire doit couvrir UVA *et* UVB) ——————————
  ["filtre-uva", /AVOBENZONE|BUTYL METHOXYDIBENZOYLMETHANE|ZINC OXIDE|DIETHYLAMINO HYDROXYBENZOYL|TEREPHTHALYLIDENE DICAMPHOR|DROMETRIZOLE|BEMOTRIZINOL|BIS-ETHYLHEXYLOXYPHENOL|BENZOPHENONE-3|OXYBENZONE|TINOSORB/],
  ["filtre-uvb", /HOMOSALATE|OCTISALATE|ETHYLHEXYL SALICYLATE|OCTINOXATE|ETHYLHEXYL METHOXYCINNAMATE|ETHYLHEXYL TRIAZONE|OCTOCRYLENE|ENSULIZOLE|PHENYLBENZIMIDAZOLE|TITANIUM DIOXIDE|POLYSILICONE-15|BENZOPHENONE-4|SULISOBENZONE/],

  // — ACIDES EXFOLIANTS, par famille ——————————————————————————————
  ["acide-bha", /^SALICYLIC ACID$|CAPRYLOYL SALICYLIC|BETAINE SALICYLATE/],
  // CITRIC ACID est volontairement ABSENT : dans 866 produits du catalogue il sert de
  // correcteur de pH, pas d'exfoliant. Le classer AHA ferait passer des crèmes pour des peelings.
  ["acide-aha", /^(GLYCOLIC|LACTIC|MANDELIC|MALIC|TARTARIC) ACID$|AMMONIUM GLYCOLATE|SODIUM LACTATE/],
  ["acide-pha", /GLUCONOLACTONE|LACTOBIONIC|GALACTOSE/],

  // — LIPIDES DE BARRIÈRE : ce qui reconstruit le ciment intercellulaire ——————
  ["lipide-barriere", /CERAMIDE|CHOLESTEROL|PHYTOSPHINGOSINE|SPHINGOSINE|\bLECITHIN|LINOLEIC ACID|LINOLENIC ACID|OCTADECANEDIOL/],

  // — OCCLUSIFS : ce qui freine la perte en eau ————————————————————————
  ["occlusif", /BUTTER\b|PETROLATUM|PARAFFIN|MINERAL OIL|BEESWAX|^CERA |LANOLIN|DIMETHICONE|CYCLOPENTASILOXANE|CANDELILLA|CARNAUBA|MICROCRYSTALLINE WAX|POLYISOBUTENE/],

  // — HUMECTANTS : ce qui appelle et retient l'eau ——————————————————————
  ["humectant", /^GLYCERIN|HYALURON|\bUREA\b|^BETAINE$|SODIUM PCA|PANTHENOL|TREHALOSE|SORBITOL|GLYCERETH|^(BUTYLENE|PROPYLENE|PENTYLENE|DIPROPYLENE|HEXYLENE|CAPRYLYL|ETHYLHEXYL) GLYCOL$|^PROPANEDIOL$|^1,2-HEXANEDIOL$|^1,2-HEPTANEDIOL$|HONEY|GLYCOGEN|POLYGLUTAMIC/],

  // — ÉMOLLIENTS : ce qui assouplit et lisse ————————————————————————
  ["emollient", /SQUALANE|TRIGLYCERIDE|\bOIL$|\bSEED OIL|\bFRUIT OIL|ESTER|YL (PALMITATE|MYRISTATE|STEARATE|OLEATE|LAURATE|ISOSTEARATE|BENZOATE|ISONONANOATE|CAPRYLATE)\b|JOJOBA|SHEA|ISOPROPYL MYRISTATE|COCO-CAPRYLATE|DICAPRYLYL/],
];

// Marqueurs cumulables, indépendants de la règle principale.
export const MARQUEURS = [
  ["antioxydant", /TOCOPHER|ASCORB|FERULIC|RESVERATROL|UBIQUINONE|GREEN TEA|CAMELLIA SINENSIS|POLYPHENOL/],
  ["emulsifiant", /^PEG-\d+|POLYSORBATE|CETEARYL ALCOHOL|GLYCERYL STEARATE|SORBITAN|LAURETH-\d|STEARETH-\d/],
];

export function fonctionsDe(nom) {
  const out = [];
  for (const [f, rx] of REGLES) if (rx.test(nom)) { out.push(f); break; }
  for (const [m, rx] of MARQUEURS) if (rx.test(nom)) out.push(m);
  return out;
}

// ── application + rapport ─────────────────────────────────────────────────────
if (process.argv[1]?.endsWith("fonctions.mjs")) {
  const dico = JSON.parse(fs.readFileSync(D + "dictionnaire.json", "utf8"));
  const { parseInci } = await import("./scoring.mjs");
  const cat = JSON.parse(fs.readFileSync(D + "catalog.json", "utf8"));

  const freq = {};
  for (const p of cat) if (p.category !== "hors-perimetre" && p.inci)
    for (const it of parseInci(p.inci)) freq[it.name] = (freq[it.name] || 0) + 1;

  const compte = {};
  let classes = 0;
  for (const nom of Object.keys(dico)) {
    const f = fonctionsDe(nom);
    dico[nom].fonctions = f;
    if (f.length) { classes++; for (const x of f) compte[x] = (compte[x] || 0) + 1; }
  }

  console.log("━━━ CLASSIFICATION FONCTIONNELLE ━━━");
  console.log("  fiches portant au moins une fonction : " + classes + " / " + Object.keys(dico).length);
  console.log("\n  répartition :");
  Object.entries(compte).sort((a, b) => b[1] - a[1])
    .forEach(([k, n]) => console.log("   " + k.padEnd(22) + String(n).padStart(5)));

  // ce qui compte vraiment : la couverture PONDÉRÉE par la fréquence réelle
  const top = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 150);
  const couverts = top.filter(([k]) => dico[k]?.fonctions?.length);
  console.log("\n  parmi les 150 ingrédients les plus fréquents : " + couverts.length + " classés");
  console.log("\n  NON classés parmi les plus fréquents (à vérifier — normal pour les");
  console.log("  conservateurs, chélateurs, régulateurs de pH et gélifiants) :");
  top.filter(([k]) => !dico[k]?.fonctions?.length).slice(0, 24)
    .forEach(([k, n]) => console.log("   " + String(n).padStart(5) + " × " + k.slice(0, 44)));

  if (process.argv.includes("--appliquer")) {
    fs.writeFileSync(D + "dictionnaire.avant-fonctions.json", fs.readFileSync(D + "dictionnaire.json"));
    fs.writeFileSync(D + "dictionnaire.json", JSON.stringify(dico));
    console.log("\n✅ APPLIQUÉ (sauvegarde : dictionnaire.avant-fonctions.json)");
  } else console.log("\n(simulation — relancer avec --appliquer)");
}
