// Décide si un texte est VRAIMENT une liste d'ingrédients réglementaire.
//
// Le seuil de reconnaissance du dictionnaire ne suffit pas sur les sites de marque : leur
// argumentaire est lui-même bourré de noms d'ingrédients (« Niacinamide, Tranexamic Acid,
// Hyaluronic Acid… » en tête de rubrique), et franchit la barre sans être une INCI.
//
// Ce qui sépare vraiment les deux :
//   — la PROSE. Une INCI ne contient ni verbe conjugué, ni glose (« Cellulose : Eliminates
//     impurities »), ni puce, ni mode d'emploi. C'est une énumération nue.
//   — la QUEUE. Une vraie formule traîne ses ingrédients ingrats — conservateurs, gélifiants,
//     chélateurs, émulsifiants. Une liste d'actifs vedettes n'en a aucun. C'est le signe le plus
//     fiable dont on dispose : personne ne met du phénoxyéthanol dans un argumentaire.
import { tauxReconnu } from "./normaliser-inci.mjs";

const RENVOI = /\b(refer to|see (the )?(product )?packaging|see (the )?label|for (a )?complete)\b/i;
// Le MOBILIER de page — menu, bandeau de livraison, boutons, fragments de balises — n'a rien à
// faire dans un INCI et se reconnaît sans ambiguïté. C'est ce qui s'était glissé dans le
// catalogue : « Index Beauty Reviews Trending Beauty Close FREE US Shipping $50+ ».
const MOBILIER = /class=|href=|#toggle|<[a-z]|\bshipping\b|\breviews?\b|\$\d|add to (bag|cart)|trending|show highlights|side-by-side|auto-replenishment|sign in|subscribe|how to use|non-comedogenic\b.*\buse\b/i;
const VERBES = /\b(unclogs?|treats?|hydrates?|soothes?|smooths?|brightens?|exfoliates?|protects?|reduces?|helps?|improves?|nourishes?|firms?|calms?|boosts?|delivers?|targets?|eliminates?|dissolves?|removes?|balances?|refines?|wet|rinse|apply|massage|pump|avoid)\b/i;
const GLOSE  = /[A-Za-z]\s*:\s*[A-Z]?[a-z]+\s+[a-z]+/;      // « Cellulose : Eliminates impurities »
const PUCES  = /(^|\s)([-•*]|&bull;)\s*[A-Za-z0-9]/;
const ETUDE  = /\b(clinical test|improved by|\d+\s?% of (users|participants)|weeks?\b.*\bstudy)\b/i;
const POURCENT_VANTE = /\b\d+\s?%\s+(purity|of|improvement)/i;

// ingrédients « de fond » : ce qu'une formule finie contient toujours et qu'aucun argumentaire
// ne cite jamais
const EXCIPIENTS = /\b(PHENOXYETHANOL|ETHYLHEXYLGLYCERIN|CHLORPHENESIN|BENZYL ALCOHOL|SODIUM BENZOATE|POTASSIUM SORBATE|DEHYDROACETIC ACID|CAPRYLYL GLYCOL|1,2-HEXANEDIOL|XANTHAN GUM|CARBOMER|ACRYLATES|DISODIUM EDTA|TETRASODIUM EDTA|TROMETHAMINE|SODIUM HYDROXIDE|CITRIC ACID|CETEARYL ALCOHOL|GLYCERYL STEARATE|POLYSORBATE|PEG-\d|DIMETHICONE|BUTYLENE GLYCOL|DIPROPYLENE GLYCOL|PROPANEDIOL|SODIUM CHLORIDE|TOCOPHEROL|PARFUM|FRAGRANCE)\b/i;

// Une page ne s'arrête pas à la fin de la liste : elle enchaîne sur le mode d'emploi, les avis,
// le pied de page. Rejeter toute la chaîne parce qu'un mot parasite traîne à la fin jetterait de
// vraies compositions — c'est ce qui arrivait au scrub Codex Labs et au sérum medicube. On COUPE
// au premier signe de texte étranger, puis on juge ce qui précède.
// Si le parasite est en TÊTE, il ne reste rien à juger, et la fiche tombe d'elle-même.
const SALISSURES = [MOBILIER, RENVOI, ETUDE, POURCENT_VANTE, GLOSE, PUCES, VERBES];

export function couperALaSalissure(t) {
  let fin = t.length;
  for (const re of SALISSURES) {
    const m = t.match(new RegExp(re.source, re.flags.includes("i") ? "i" : ""));
    if (m && m.index != null && m.index < fin) fin = m.index;
  }
  // on ne coupe pas au milieu d'un ingrédient : on remonte à la virgule précédente
  const tete = t.slice(0, fin);
  const v = tete.lastIndexOf(",");
  return { tete: (v > 20 ? tete.slice(0, v) : tete).trim().replace(/[,\s]+$/, ""), coupe: fin < t.length };
}

export function validerInci(texte, { minIngredients = 8 } = {}) {
  const brut = String(texte || "").trim();
  if (!brut) return { ok: false, motif: "vide" };

  const { tete, coupe } = couperALaSalissure(brut);
  if (!tete) return { ok: false, motif: "texte de page, pas une liste" };
  const t = tete;

  const items = t.split(",").map((s) => s.trim()).filter(Boolean);
  const reconnu = tauxReconnu(t);
  if (items.length < minIngredients) return { ok: false, motif: "trop courte (" + items.length + ")", n: items.length, reconnu };
  // Les patchs et pansements font chuter ce taux sans rien avoir de suspect : leurs polymères
  // adhésifs (styrène/isoprène, indène) ne sont pas dans un dictionnaire de soins. 45 % laisse
  // passer ces formules-là tout en écartant le texte libre.
  if (reconnu < 0.45) return { ok: false, motif: "peu reconnue (" + Math.round(reconnu * 100) + "%)", n: items.length, reconnu };

  // Une longue liste SANS aucun ingrédient de fond n'est pas une formule mais une sélection
  // d'actifs vedettes. Le seuil est haut (20) : un patch entier tient en une douzaine d'entrées
  // sans conservateur, et c'est normal — il n'y a pas d'eau à protéger.
  if (items.length >= 20 && !EXCIPIENTS.test(t))
    return { ok: false, motif: "aucun excipient — liste d'actifs, pas une formule", n: items.length, reconnu };

  return { ok: true, n: items.length, reconnu: Math.round(reconnu * 100) / 100, inci: t, coupe };
}
