// SmartSkin Score v1 — moteur de notation (spec : smartskin.app/docs/specs/scan-scoring.md v1.1)
// Deux notes calculées, ZÉRO IA dans les chiffres :
//   scoreFormule(inci)            → qualité intrinsèque de la composition (0-100)
//   scorePerso(inci, profil)      → la même composition relue pour UNE peau (0-100) + facts[]
// Le dictionnaire (dictionnaire.json) est la seule source de vérité sur les ingrédients ;
// ingrédient inconnu = 0 point, jamais un malus. Sans dictionnaire → moteur indisponible.
import fs from "node:fs";
import path from "node:path";

// Les données vivent dans data/scan/ à la racine du dépôt. `process.cwd()` est cette racine
// aussi bien en `next dev` qu'en `next start` sur Render — pas de chemin absolu en dur.
const D = path.join(process.cwd(), "data", "scan") + path.sep;

// ── POIDS (calibrables sans toucher au code — chaque valeur sera revue en calibration) ──
export const CONFIG = {
  algoVersion: "2.0.0-metier",
  base: 50,
  // pondération par position INCI (proxy concentration, fiable > 1 % seulement)
  wPos: [
    { maxPos: 5, w: 1.0 },
    { maxPos: 10, w: 0.6 },
    { maxPos: Infinity, w: 0.3 },
  ],
  wSous1pct: 0.3,             // au-delà de la barre des 1 %, ordre légalement libre
  // score FORMULE
  bonusActif: 3.5,            // × benefitPower (1-3) — calibré 2026-08-26 : une formule parfaite atteint 100
  maxActifsParFamille: 2,
  plafondBonus: 55,
  malusRisque: 2,             // × gravité (1-3)
  malusParfumFixe: 4,         // actif même à faible dose → malus fixe (pas de w(pos))
  malusHEFixe: 5,
  malusAlcoolTop5: 6,
  plafondMalusParfum: 12,     // le complexe parfumant entier, pas N fois le même risque
  malusFormuleCreuse: 8,      // < 2 actifs
  // plafonds NON COMPENSATOIRES (recherche structure, reco n°1)
  capRisque3Top5: 49,         // gravité 3 en positions 1-5 → jamais vert
  capRisque3Ailleurs: 69,     // gravité 3 plus loin → jamais « excellent »
  // score PERSO
  bonusMatch: 3.5,            // × sévérité (1-3) × w(pos) — aligné sur le tarif formule (v1.2)
  maxMatchParIngredient: 10,
  plafondMatchs: 30,
  // ALLERGIE ≠ IRRITATION (scission du 27/08). L'irritation abîme la barrière de tout le monde et
  // reste dans la note FORMULE ; la sensibilisation ne touche que les personnes concernées et ne
  // pèse donc que sur la note PERSO, proportionnellement à la réactivité déclarée. Un profil à
  // sensibilité 0 ne paie rien pour un allergène — sinon on pénalise le decyl glucoside, l'agent
  // lavant le plus doux du marché, pour quelqu'un qui n'y est pas allergique.
  malusSensibilisant: 3,      // × niveau (1-3) × (sensibilité/3) × w(pos)
  malusParfumSensible: 4,     // × sensibilité (0-3) — affiché en UNE ligne avec le malus formule
  malusComedoGras: 3,         // comédogène ≥3 × peau grasse/mixte, × w(pos)
  malusAlcoolSeche: 6,
  malusHEReactive: 8,
  malusForceParCran: 5,       // force produit − plafond de tolérance
  // PROTECTION SOLAIRE, côté PERSO. Le côté formule valorise déjà les filtres UV pour
  // tout le monde (grille "sunscreen", + bonusFiltresUVHorsSolaire). Ce bonus-ci est
  // l'autre moitié : protéger vaut PLUS à qui ne se protège pas, et à qui a des taches
  // — les UV en sont le facteur aggravant n°1, et le solaire leur premier traitement.
  // Même tarif qu'un actif (bonusMatch), plafonné comme lui : c'est un actif contre
  // les taches, pas un cas à part.
  bonusSolairePerso: 3.5,
  // ── ADÉQUATION CATÉGORIE × PEAU (v1.2) ──
  // On ne juge plus sur un libellé de catégorie (qui ne dit rien de la texture) : on DÉDUIT
  // la nature du produit de sa composition, puis on la confronte au type de peau.
  richesse: {                 // malus/bonus selon richesse déduite × type de peau
    riche:  { oily: -12, combination: -7, normal: 0, dry: 6 },
    legere: { oily: 5, combination: 3, normal: 0, dry: -7 },
  },
  seuilRiche: 8,              // score de richesse au-delà duquel un produit est « riche »
  seuilLegere: 2,             // en dessous : « léger »
  sulfates: { dry: -8, sensible: -8, combination: -3, oily: 0, normal: -2 },
  exfoliantFort: { sensible: -10 },   // exfoliant puissant sur peau réactive
  filtreMineralBonus: 4,      // solaire minéral sur peau sensible


  // ── ANCIEN SYSTÈME (v1.3-1.4), CONSERVÉ POUR RÉFÉRENCE, PLUS UTILISÉ PAR scoreFormule ──
  // Il atténuait les critères (× rince, × exigeActifs) puis recalait chaque famille par un
  // OFFSET forfaitaire. Deux défauts mesurés le 27/08 : (1) baisser à la fois ce qui récompense
  // et ce qui punit écrasait les nettoyants et démaquillants — leur meilleur produit plafonnait
  // à 72 et 66, incapables d'être verts ; (2) l'offset (28 pts d'amplitude) écrasait le jugement
  // métier (16 pts) ET dépendait de la médiane de NOTRE catalogue, un scrape non représentatif.
  // Remplacé par RUBRIQUES : chaque métier gagne ses points sur SES critères, sans offset.
  categoriesLegacy: {
    cleanser:        { rince: 0.4, exigeActifs: 0.4, douceurCritique: 1.6, label: "cleanser", offset: 7 },
    "makeup-remover":{ rince: 0.3, exigeActifs: 0.2, douceurCritique: 1.4, label: "makeup remover", offset: 10 },
    mask:            { rince: 0.6, exigeActifs: 0.8, douceurCritique: 1.0, label: "mask", offset: -4 },
    exfoliant:       { rince: 0.8, exigeActifs: 1.0, douceurCritique: 1.3, label: "exfoliant", offset: -3 },
    toner:           { rince: 1.0, exigeActifs: 0.8, douceurCritique: 1.2, label: "toner", offset: -2 },
    serum:           { rince: 1.0, exigeActifs: 1.3, douceurCritique: 1.0, label: "serum", offset: -18 },
    moisturizer:     { rince: 1.0, exigeActifs: 1.0, douceurCritique: 1.0, label: "moisturizer", offset: -8 },
    "eye-cream":     { rince: 1.0, exigeActifs: 0.9, douceurCritique: 1.8, label: "eye cream", offset: -7 },
    // offset relevé de −21 à −16 le 27/08 : l'ancien compensait le double comptage des filtres UV
    // (étiquette « actif anti-âge » EN PLUS du bonus +22). Le double comptage corrigé, la médiane
    // des solaires retombe sur 60 comme celle des autres familles.
    sunscreen:       { rince: 1.0, exigeActifs: 0.7, douceurCritique: 1.1, label: "sunscreen", offset: -16 },
    treatment:       { rince: 1.0, exigeActifs: 1.2, douceurCritique: 1.0, label: "treatment", offset: -13 },
    indetermine:     { rince: 1.0, exigeActifs: 1.0, douceurCritique: 1.0, label: "product", offset: 1 },
  },
  // le métier d'un solaire, c'est PROTÉGER : ses filtres SONT son bénéfice
  bonusFiltresUV: 22,
  bonusFiltresUVHorsSolaire: 8,   // crème de jour avec SPF : un vrai plus, mais pas son métier
  // un nettoyant/exfoliant sans aucun actif n'est pas « creux » : ce n'est pas son métier
  creuseExempt: ["cleanser", "makeup-remover", "toner", "mask"],
  // règles absolues (court-circuit — registre SÉCURITÉ, modèle SkinSAFE)
  capGrossesse: 15,
  capAllergie: 10,
  borne: [5, 100],           // 100 ATTEIGNABLE : réservé au sans-faute (0 malus + actifs prouvés)
  bandes: { vert: 75, orange: 45 },  // relevés avec l'échelle : 70 ne veut plus dire « bon » quand 100 existe
  // badge « analyse partielle » : couverture dictionnaire des positions 1-10 sous ce seuil
  seuilCouverture: 0.7,
  // marqueurs de la barre des 1 % (plafond légal ou usage traceur)
  marqueurs1pct: ["PHENOXYETHANOL", "XANTHAN GUM", "CARBOMER", "DISODIUM EDTA", "SODIUM BENZOATE", "POTASSIUM SORBATE"],

  // ══ GRILLES MÉTIER (v2.0) ═══════════════════════════════════════════════════
  // Principe : « à quel point ce produit réussit CE QU'IL PRÉTEND FAIRE ».
  // Chaque famille dispose du MÊME budget de points gagnables (~42), mais les gagne sur des
  // critères différents. Un nettoyant gagne sur sa douceur, un sérum sur ses actifs, une crème
  // sur la complétude de son hydratation. Conséquence voulue : chaque famille peut atteindre
  // 90 dans son métier ou tomber à 20 — sans aucun recalage sur le catalogue.
  //
  //   merites/penalites : { quoi, pts, plafond?, maxPos?, pondere?, parType?, dit }
  //     quoi     — une fonction ("humectant"), une liste, ou un prédicat "@xxx" (voir PREDICATS)
  //     pts      — points par élément trouvé
  //     plafond  — total maximal pour cette ligne (anti-empilement)
  //     maxPos   — ne compte que dans les N premières positions INCI (proxy de dose)
  //     pondere  — multiplie par le poids de position w(pos)
  //     parType  — compte les TYPES distincts trouvés, pas les occurrences
  //     dit      — libellé affiché à l'utilisateur dans le « Why »
  // Ce que vaut une exécution PARFAITE de son métier, en points au-dessus du neutre.
  // Chaque grille est normalisée par SON PROPRE maximum théorique (somme de ses plafonds), donc
  // « remplir 100 % de la grille nettoyant » vaut exactement autant que « remplir 100 % de la
  // grille sérum ». C'est l'équité PAR CONSTRUCTION — et elle ne dépend d'aucun catalogue,
  // contrairement aux offsets qu'elle remplace.
  budgetMetier: 42,
  RUBRIQUES: {
    // Chaque grille ne récompense que des critères MESURÉS comme discriminants dans sa famille
    // (25-75 % des produits les remplissent — relevé du 27/08). Ce que 90 % remplissent est
    // passé en `prerequis` : son absence coûte, sa présence ne rapporte rien.
    cleanser: {
      label: "cleanser", metier: "clean without stripping the barrier", severite: 1.0, exposition: 0.55,
      prerequis: [{ id: "douceur", quoi: "@tensioDoux", pts: 12, dit: "no gentle cleansing agent" }],
      merites: [
        { id: "sansParfum", quoi: "@sansParfum", pts: 12, dit: "no fragrance" },        // 48 %
        { id: "profondeur", quoi: "tensioactif-doux", maxPos: 12, pts: 5, plafond: 12, pondere: true, dit: "gentle surfactants throughout" },
        { id: "soutien", quoi: ["emollient", "lipide-barriere"], parType: true, pondere: true, pts: 8, plafond: 16, dit: "leaves the barrier intact" },
        { id: "actifs", quoi: "@actifs", pts: 2, plafond: 10, pondere: true, dit: "useful actives" },
      ],
      penalites: [
        { id: "sulfate", quoi: "tensioactif-agressif", maxPos: 12, pts: 9, pondere: true, dit: "harsh sulfate" },
        { id: "savon", quoi: "@savon", pts: 10, dit: "high-pH soap base" },
      ],
    },
    "makeup-remover": {
      label: "makeup remover", metier: "dissolve makeup and rinse clean", severite: 1.2, exposition: 0.5,
      prerequis: [{ id: "dissout", quoi: ["emollient", "occlusif", "tensioactif-doux"], pts: 12, dit: "nothing here dissolves makeup" }],
      merites: [
        { id: "sansParfum", quoi: "@sansParfum", pts: 14, dit: "no fragrance — it works near the eyes" },
        { id: "rincable", quoi: "emulsifiant", pts: 10, plafond: 10, dit: "rinses off cleanly" },
        { id: "soutien", quoi: ["humectant", "lipide-barriere"], parType: true, pondere: true, pts: 8, plafond: 16, dit: "leaves the barrier intact" },
        { id: "actifs", quoi: "@actifs", pts: 2, plafond: 8, pondere: true, dit: "useful actives" },
      ],
      penalites: [{ id: "sulfate", quoi: "tensioactif-agressif", maxPos: 10, pts: 9, pondere: true, dit: "harsh sulfate" }],
    },
    serum: {
      label: "serum", metier: "deliver active ingredients", severite: 1.0,
      prerequis: [{ id: "actifs", quoi: "@troisActifs", pts: 12, dit: "too few actives for a serum" }],
      merites: [
        { id: "concentre", quoi: "@actifTop5", pts: 16, dit: "a well-evidenced active high in the list" },  // 39 %
        { id: "sansParfum", quoi: "@sansParfum", pts: 12, dit: "no fragrance" },                            // 63 %
        { id: "richesse", quoi: "@actifs", pts: 2.2, plafond: 16, pondere: true, dit: "a deep active list" },
        { id: "antiox", quoi: "antioxydant", pts: 6, plafond: 6, dit: "antioxidant support" },
        { id: "lipides", quoi: "lipide-barriere", pts: 8, plafond: 8, dit: "barrier lipids" },              // 37 %
      ],
      penalites: [],
    },
    treatment: {
      label: "targeted treatment", metier: "correct one specific concern", severite: 1.0,
      prerequis: [{ id: "actifs", quoi: "@troisActifs", pts: 10, dit: "too few actives to treat anything" }],
      merites: [
        { id: "concentre", quoi: "@actifTop5", pts: 18, dit: "a well-evidenced active high in the list" },
        { id: "sansParfum", quoi: "@sansParfum", pts: 12, dit: "no fragrance" },
        { id: "richesse", quoi: "@actifs", pts: 2.2, plafond: 16, pondere: true, dit: "a deep active list" },
        { id: "lipides", quoi: "lipide-barriere", pts: 8, plafond: 8, dit: "barrier lipids to offset the actives" },
      ],
      penalites: [],
    },
    moisturizer: {
      label: "moisturiser", metier: "hydrate and rebuild the barrier", severite: 1.0,
      prerequis: [{ id: "humectant", quoi: "@humectant", pts: 12, dit: "nothing here draws in water" }],
      merites: [
        { id: "lipides", quoi: "lipide-barriere", pondere: true, pts: 16, plafond: 16, dit: "barrier lipids — rebuilds, not just coats" },  // 47 %
        { id: "sansParfum", quoi: "@sansParfum", pts: 12, dit: "no fragrance" },                            // 65 %
        { id: "occlusif", quoi: "occlusif", pondere: true, pts: 10, plafond: 10, dit: "seals the water in" }, // 74 %
        { id: "antiox", quoi: "antioxydant", pts: 6, plafond: 6, dit: "antioxidant support" },
        { id: "actifs", quoi: "@actifs", pts: 2, plafond: 10, pondere: true, dit: "useful actives" },
      ],
      penalites: [],
    },
    "eye-cream": {
      label: "eye cream", metier: "hydrate thin, reactive skin without irritating", severite: 1.8,
      prerequis: [{ id: "humectant", quoi: "@humectant", pts: 12, dit: "nothing here draws in water" }],
      merites: [
        { id: "sansParfum", quoi: "@sansParfum", pts: 18, dit: "no fragrance — essential this close to the eye" },
        { id: "lipides", quoi: "lipide-barriere", pondere: true, pts: 14, plafond: 14, dit: "barrier lipids" },
        { id: "occlusif", quoi: "occlusif", pondere: true, pts: 8, plafond: 8, dit: "seals the water in" },
        { id: "actifs", quoi: "@actifs", pts: 2, plafond: 10, pondere: true, dit: "gentle actives" },
      ],
      penalites: [],
    },
    sunscreen: {
      label: "sunscreen", metier: "protect from UV", severite: 1.0,
      prerequis: [
        { id: "filtres", quoi: "@filtresUV", pts: 25, dit: "no UV filter at all" },
        { id: "photostable", quoi: "@photostable", pts: 10, dit: "avobenzone with nothing to stabilise it" },
      ],
      merites: [
        { id: "spectre", quoi: "@spectreLarge", pts: 18, dit: "broad spectrum — UVA and UVB" },   // 75 %
        { id: "sansParfum", quoi: "@sansParfum", pts: 12, dit: "no fragrance" },                  // 60 %
        { id: "traite", quoi: "@actifTop5", pts: 10, dit: "it treats the skin as well as shields it" },
        { id: "lipides", quoi: "lipide-barriere", pts: 8, plafond: 8, dit: "barrier lipids" },    // 30 %
        { id: "actifs", quoi: "@actifs", pts: 1.5, plafond: 8, pondere: true, dit: "skincare actives" },
      ],
      penalites: [],
    },
    exfoliant: {
      label: "exfoliant", metier: "resurface without damaging", severite: 1.3, exposition: 0.85,
      prerequis: [{ id: "acide", quoi: ["acide-aha", "acide-bha", "acide-pha"], pts: 14, dit: "no exfoliating acid" }],
      merites: [
        { id: "sansParfum", quoi: "@sansParfum", pts: 14, dit: "no fragrance on freshly exfoliated skin" },
        { id: "tampon", quoi: ["humectant", "lipide-barriere"], parType: true, pondere: true, pts: 9, plafond: 18, dit: "buffered — limits the sting" },
        { id: "dose", quoi: ["acide-aha", "acide-bha", "acide-pha"], maxPos: 8, pts: 10, plafond: 10, pondere: true, dit: "the acid is high in the list" },
        { id: "actifs", quoi: "@actifs", pts: 2, plafond: 8, pondere: true, dit: "useful actives" },
      ],
      penalites: [],
    },
    toner: {
      label: "toner", metier: "hydrate and prep the skin", severite: 1.2,
      prerequis: [{ id: "humectant", quoi: "@humectant", pts: 10, dit: "nothing here hydrates" }],
      merites: [
        { id: "sansParfum", quoi: "@sansParfum", pts: 14, dit: "no fragrance" },                  // 54 %
        { id: "concentre", quoi: "@actifTop5", pts: 12, dit: "a well-evidenced active high in the list" },  // 34 %
        { id: "lipides", quoi: "lipide-barriere", pts: 8, plafond: 8, dit: "barrier lipids" },    // 33 %
        { id: "antiox", quoi: "antioxydant", pts: 8, plafond: 8, dit: "antioxidant support" },    // 44 %
        { id: "actifs", quoi: "@actifs", pts: 2, plafond: 10, pondere: true, dit: "useful actives" },
      ],
      penalites: [],
    },
    mask: {
      label: "mask", metier: "deliver a concentrated treatment in one session", severite: 1.0, exposition: 0.7,
      prerequis: [{ id: "actifs", quoi: "@troisActifs", pts: 10, dit: "too few actives for a treatment mask" }],
      merites: [
        { id: "concentre", quoi: "@actifTop5", pts: 14, dit: "a well-evidenced active high in the list" },
        { id: "sansParfum", quoi: "@sansParfum", pts: 12, dit: "no fragrance" },
        { id: "richesse", quoi: "@actifs", pts: 2, plafond: 14, pondere: true, dit: "concentrated actives" },
        { id: "confort", quoi: ["humectant", "lipide-barriere"], parType: true, pondere: true, pts: 7, plafond: 14, dit: "comfortable to leave on" },
      ],
      penalites: [],
    },
    indetermine: {
      label: "product", metier: "care for the skin", severite: 1.0,
      prerequis: [],
      merites: [
        { id: "actifs", quoi: "@actifs", pts: 2.5, plafond: 20, pondere: true, dit: "proven actives" },
        { id: "sansParfum", quoi: "@sansParfum", pts: 12, dit: "no fragrance" },
        { id: "soutien", quoi: ["humectant", "emollient", "occlusif", "lipide-barriere"], parType: true, pondere: true, pts: 5, plafond: 16, dit: "well-rounded base" },
      ],
      penalites: [],
    },
  },
};

let DICT = null;
try { DICT = JSON.parse(fs.readFileSync(D + "dictionnaire.json", "utf8")); } catch { DICT = null; }
let ALIAS = {};
try { ALIAS = JSON.parse(fs.readFileSync(D + "ingredients-canon.json", "utf8")).alias || {}; } catch {}

export const moteurDisponible = () => DICT !== null;

// Découpe une liste INCI en respectant les PARENTHÈSES. Une virgule à l'intérieur d'une
// parenthèse fait partie du nom : « Aqua (Water, Eau) » est UN ingrédient, pas deux, et
// « Iron Oxides (CI 77491, CI 77492, CI 77499) » en est un aussi. Le découpage naïf produisait
// des fragments orphelins (« EAU) », « AQUA (WATER ») qui polluaient le dictionnaire.
// Une virgule entre deux CHIFFRES appartient également au nom (1,2-Hexanediol).
export function decouperInci(texte) {
  const out = [];
  let cur = "", profondeur = 0;
  const s = String(texte || "");
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === "(" || ch === "[") profondeur++;
    else if (ch === ")" || ch === "]") profondeur = Math.max(0, profondeur - 1);
    const separateur = (ch === ";" || ch === "•" ||
      (ch === "," && profondeur === 0 && !(/\d/.test(s[i - 1] || "") && /\d/.test(s[i + 1] || ""))));
    if (separateur) { out.push(cur); cur = ""; } else cur += ch;
  }
  out.push(cur);
  return out;
}

// ── découpe l'INCI brut en positions canoniques ──
export function parseInci(inci) {
  const out = [];
  let pos = 0;
  // Une virgule ENTRE DEUX CHIFFRES appartient au nom (1,2-Hexanediol,
  // 2-Oleamido-1,3-Octadecanediol) : la couper inventait des positions fantômes.
  for (const tok of decouperInci(inci)) {
    let t = tok.trim().replace(/\s+/g, " ").replace(/^[\d.]+%\s*/, "").replace(/\s*\([\d.,]+\s*%\)$/, "")
      .toUpperCase().replace(/\s*\/\s*/g, "/").replace(/^[.*\-\s]+|[.*\-\s]+$/g, "");
    if (t.length < 2 || t.length > 80) continue;
    // toutes les graphies de l'eau se ramènent à WATER, y compris les formes parenthésées
    // multilingues (« AQUA (WATER, EAU) », « WATER/AQUA/EAU »…) que le catalogue mélange.
    if (/^(AQUA|EAU|WATER)\b/.test(t) && /^[A-Z/() ,.]+$/.test(t) &&
        !/[A-Z]{4,}/.test(t.replace(/AQUA|WATER|EAU|PURIFIED|DEIONIZED|DISTILLED/g, ""))) t = "WATER";
    if (["PARFUM", "PARFUM (FRAGRANCE)", "FRAGRANCE (PARFUM)"].includes(t)) t = "FRAGRANCE";
    t = ALIAS[t] || t;
    pos += 1;
    out.push({ name: t, pos, fiche: DICT?.[t] ?? null });
  }
  return out;
}

// position de la barre des 1 % : premier marqueur rencontré (sinon Infinity)
function barre1pct(list) {
  for (const it of list) if (CONFIG.marqueurs1pct.includes(it.name)) return it.pos;
  return Infinity;
}

function wPos(it, barre) {
  if (it.fiche?.lowDose) return 1.0;                 // efficaces < 1 % : poids plein (exception)
  if (it.pos >= barre) return CONFIG.wSous1pct;      // sous la barre : ordre non significatif
  for (const { maxPos, w } of CONFIG.wPos) if (it.pos <= maxPos) return w;
  return CONFIG.wSous1pct;
}


// ── NATURE DU PRODUIT, déduite de la composition (pas du libellé de catégorie) ──
// « moisturizer » ne dit pas si la crème est riche ou légère : on le lit dans l'INCI.
const MOTS_RICHE = ["BUTTER", "OIL", "WAX", "PETROLATUM", "LANOLIN", "SHEA", "SQUALANE", "TRIGLYCERIDE", "STEARATE", "PALMITATE", "MYRISTATE", "CERA "];
const MOTS_LEGER = ["WATER", "GLYCERIN", "PROPANEDIOL", "BUTYLENE GLYCOL", "PENTYLENE GLYCOL", "HYALURONATE", "AQUA"];
const FILTRES_MINERAUX = ["ZINC OXIDE", "TITANIUM DIOXIDE"];

export function natureProduit(list) {
  let richesse = 0, sulfate = false, mineral = false, forceMax = 0;
  for (const it of list) {
    const p = it.pos;
    const poids = p <= 3 ? 4 : p <= 6 ? 2.5 : p <= 10 ? 1 : 0.3;
    if (MOTS_RICHE.some((w) => it.name.includes(w)) && !MOTS_LEGER.some((w) => it.name === w)) richesse += poids;
    // UNE SEULE lecture de la composition (27/08) : le côté perso lisait « SULFATE|SULFONATE|
    // SARCOSINATE » par motif de nom, et pénalisait donc les SARCOSINATES — que la note formule
    // récompense au contraire comme tensioactifs DOUX. Même ingrédient, deux verdicts opposés
    // dans la même fiche (60 produits, dont le CeraVe Foaming). On lit désormais la classification
    // fonctionnelle, partagée avec le score formule.
    if ((it.fiche?.fonctions || []).includes("tensioactif-agressif") && p <= 8) sulfate = true;
    if (FILTRES_MINERAUX.some((w) => it.name.includes(w))) mineral = true;
    if (it.fiche?.strength) forceMax = Math.max(forceMax, it.fiche.strength);
  }
  return { richesse, riche: richesse >= CONFIG.seuilRiche, legere: richesse <= CONFIG.seuilLegere,
           sulfate, mineral, forceMax };
}

const clamp = (x) => Math.round(Math.min(CONFIG.borne[1], Math.max(CONFIG.borne[0], x)));
export const bande = (s) => (s >= CONFIG.bandes.vert ? "good" : s >= CONFIG.bandes.orange ? "mid" : "bad");

// ── SCORE FORMULE ──────────────────────────────────────────────────────────────
// ── ÉVALUATEUR DE GRILLE MÉTIER ────────────────────────────────────────────────
// Prédicats : les critères qui ne se lisent pas sur UN ingrédient mais sur la formule entière.
const PREDICATS = {
  "@sansParfum": (ctx) => (ctx.list.every((it) => !it.fiche?.fragrance && !it.fiche?.essentialOil) ? 1 : 0),
  // savon = acide gras libre + base forte : saponification in situ, pH 9-10 (décape la barrière)
  "@savon": (ctx) => (ctx.aFonction("acide-gras-libre") && ctx.aFonction("base-saponifiante")) ||
                     ctx.aFonction("tensioactif-savon") ? 1 : 0,
  "@spectreLarge": (ctx) => (ctx.aFonction("filtre-uva") && ctx.aFonction("filtre-uvb")) ? 1 : 0,
  // actif à PREUVES FORTES haut dans la liste = le vrai signal de concentration (39 % des sérums)
  "@actifTop5": (ctx) => ctx.list.some((it) => it.pos <= 5 && it.fiche?.role === "active" &&
                                               (it.fiche.benefitPower || 0) >= 3) ? 1 : 0,
  // l'avobenzone se dégrade au soleil si rien ne la stabilise : défaut de formulation réel
  "@photostable": (ctx) => (!ctx.list.some((it) => /AVOBENZONE|METHOXYDIBENZOYLMETHANE/.test(it.name))
    || ctx.list.some((it) => /OCTOCRYLENE|TINOSORB|BEMOTRIZINOL|BISOCTRIZOLE|POLYSILICONE-15|DIETHYLHEXYL/.test(it.name))) ? 1 : 0,
  "@filtresUV": (ctx) => (ctx.aFonction("filtre-uva") || ctx.aFonction("filtre-uvb")) ? 1 : 0,
  "@troisActifs": (ctx) => ctx.list.filter((it) => it.fiche?.role === "active" && it.fiche.benefits?.length).length >= 3 ? 1 : 0,
  "@humectant": (ctx) => ctx.aFonction("humectant") ? 1 : 0,
  "@tensioDoux": (ctx) => ctx.aFonction("tensioactif-doux") ? 1 : 0,
  "@apaisants": (ctx) => ctx.list.filter((it) => (it.fiche?.benefits || []).includes("redness")).length,
};

// Une ligne de grille → { pts, n }. Les actifs sont le seul cas pondéré par la force de preuve.
function evalueLigne(l, ctx) {
  if (typeof l.quoi === "string" && l.quoi.startsWith("@")) {
    if (l.quoi === "@actifs") {
      let total = 0, n = 0;
      const parFamille = {};
      for (const it of ctx.list) {
        const f = it.fiche;
        if (!f || f.role !== "active" || !f.benefits?.length) continue;
        const fam = f.benefits[0];
        parFamille[fam] = (parFamille[fam] || 0) + 1;
        if (parFamille[fam] > CONFIG.maxActifsParFamille) continue;   // 5 humectants ≠ 5 bonus
        n += 1;
        total += l.pts * (f.benefitPower || 1) * (l.pondere ? ctx.w(it) : 1);
      }
      return { pts: Math.min(total, l.plafond ?? Infinity), n };
    }
    const n = PREDICATS[l.quoi](ctx);
    return { pts: Math.min(n * l.pts, l.plafond ?? Infinity), n };
  }
  const cherchees = Array.isArray(l.quoi) ? l.quoi : [l.quoi];
  const vus = new Set();
  let total = 0, n = 0;
  for (const it of ctx.list) {
    if (l.maxPos && it.pos > l.maxPos) continue;
    const fns = it.fiche?.fonctions || [];
    const match = cherchees.filter((c) => fns.includes(c));
    if (!match.length) continue;
    if (l.parType) {
      // on retient la MEILLEURE position à laquelle chaque type apparaît : la présence en fin de
      // liste (traceur) ne vaut pas la présence en tête. Sans ça, toute crème a « les trois étages ».
      for (const m of match) if (!vus.has(m)) { vus.add(m); n += 1; total += l.pts * (l.pondere ? ctx.w(it) : 1); }
    }
    else { n += 1; total += l.pts * (l.pondere ? ctx.w(it) : 1); }
  }
  return { pts: Math.min(total, l.plafond ?? Infinity), n };
}

// Maximum atteignable d'une grille = somme de ses plafonds. Sert à normaliser : une grille
// exigeante et une grille facile valent la même chose une fois remplies à 100 %.
const _maxCache = new Map();
function maxTheorique(R) {
  if (_maxCache.has(R.label)) return _maxCache.get(R.label);
  const m = R.merites.reduce((a, l) => a + (l.plafond ?? l.pts), 0);
  _maxCache.set(R.label, m);
  return m;
}

// ── SCORE FORMULE (v2.0 — grille métier, sans offset) ──────────────────────────
// « À quel point ce produit réussit CE QU'IL PRÉTEND FAIRE. »
// La note ne dépend PLUS du catalogue : un produit garde sa note même si on ajoute 500 références.
export function scoreFormule(inci, categorie, filtresUV) {
  const R = CONFIG.RUBRIQUES[categorie] || CONFIG.RUBRIQUES.indetermine;
  const list = parseInci(inci);
  const barre = barre1pct(list);
  let score = CONFIG.base;
  let cap = Infinity, malusParfumCumule = 0;
  const parfumLignes = [], details = [];

  const ctx = {
    list, barre, w: (it) => wPos(it, barre),
    aFonction: (f) => list.some((it) => (it.fiche?.fonctions || []).includes(f)),
  };

  // ── 1. CE QUE LE MÉTIER RÉCOMPENSE ──────────────────────────────────────────
  let brut = 0;
  const lignes = [];
  for (const l of R.merites) {
    const { pts, n } = evalueLigne(l, ctx);
    if (pts > 0) { brut += pts; lignes.push({ l, pts, n }); }
  }
  // Normalisation par le maximum de CETTE grille : la note dit « quelle part de son métier
  // ce produit accomplit », pas « combien de points il a ramassés ».
  const part = Math.min(1, brut / maxTheorique(R));
  const merite = part * CONFIG.budgetMetier;
  for (const { l, pts, n } of lignes)
    details.push({ type: "merite", id: l.id, pts: +(pts / Math.max(brut, 1e-9) * merite).toFixed(1), n, dit: l.dit });
  score += merite;

  // ── 1bis. LES PRÉREQUIS DU MÉTIER ───────────────────────────────────────────
  // Règle apprise le 27/08 : un critère que 90 % de la famille remplit n'est PAS un critère,
  // c'est un ticket d'entrée. Le récompenser revenait à donner des points au permis de conduire
  // pour être venu avec une voiture. Ici on ne paie plus la présence : on sanctionne l'absence.
  for (const l of R.prerequis || []) {
    const { pts } = evalueLigne({ ...l, pts: 1, plafond: 1 }, ctx);
    if (pts <= 0) { score -= l.pts; details.push({ type: "manque", id: l.id, pts: -l.pts, dit: l.dit }); }
  }

  // ── 2. CE QUE LE MÉTIER SANCTIONNE (propre à la famille) ────────────────────
  // Règle « un ingrédient = une ligne » : ce qu'une pénalité métier facture déjà ne doit pas
  // reprendre en plus le malus de risque générique (le sulfate était compté deux fois : −18 par
  // la faute métier PUIS −4 par ingrédient). Même erreur que le double comptage des filtres UV.
  const dejaFactures = new Set();
  for (const l of R.penalites || []) {
    const { pts, n } = evalueLigne(l, ctx);
    if (pts > 0) {
      score -= pts;
      details.push({ type: "faute", id: l.id, pts: -+pts.toFixed(1), n, dit: l.dit });
      const cherchees = Array.isArray(l.quoi) ? l.quoi : [l.quoi];
      for (const it of list)
        if ((it.fiche?.fonctions || []).some((f) => cherchees.includes(f))) dejaFactures.add(it.name);
    }
  }

  // ── 3. LES RISQUES, communs à tous mais pesés selon la fragilité de la zone ──
  // Un même ingrédient listé deux fois (doublon de la liste source, ou sous-liste) ne doit être
  // facturé qu'UNE fois, à sa position la plus haute — sinon un doublon de saisie coûte double.
  const vusRisque = new Set();
  for (const it of list) {
    const f = it.fiche;
    if (!f) continue;
    if (vusRisque.has(it.name)) continue;
    vusRisque.add(it.name);
    const grav = Math.max(f.risks?.irritant || 0, Math.ceil((f.risks?.comedogenic || 0) / 2));
    // spec §5.2 : le niveau 1 ne pèse QUE sur une peau très sensible → hors score formule.
    // Un ingrédient qui prend déjà un malus FIXE ne prend pas en plus le malus générique.
    const aMalusFixe = f.fragrance || f.essentialOil || (f.dryingAlcohol && it.pos <= 5);
    if (grav >= 2 && !aMalusFixe && !dejaFactures.has(it.name)) {
      // EXPOSITION : un produit qui part au rinçage en 30 s n'expose pas la peau comme une crème
      // laissée 8 h. C'est le même argument que la pondération par position — la DOSE compte —
      // et c'est précisément ce qu'on reproche à Yuka de ne pas faire.
      const pts = -CONFIG.malusRisque * grav * wPos(it, barre) * R.severite * (R.exposition ?? 1);
      score += pts;
      details.push({ type: "risque", inci: it.name, pos: it.pos, pts: +pts.toFixed(1), grav });
      if (grav >= 3) cap = Math.min(cap, it.pos <= 5 ? CONFIG.capRisque3Top5 : CONFIG.capRisque3Ailleurs);
    }
    let fixe = 0, typeFixe = null;
    if (f.fragrance && CONFIG.malusParfumFixe > fixe) { fixe = CONFIG.malusParfumFixe; typeFixe = "parfum"; }
    if (f.essentialOil && CONFIG.malusHEFixe > fixe) { fixe = CONFIG.malusHEFixe; typeFixe = "HE"; }
    if (f.dryingAlcohol && it.pos <= 5 && CONFIG.malusAlcoolTop5 > fixe) { fixe = CONFIG.malusAlcoolTop5; typeFixe = "alcool"; }
    if (fixe > 0) {
      fixe = fixe * R.severite * (R.exposition ?? 1);
      if (typeFixe === "parfum" || typeFixe === "HE") { malusParfumCumule += fixe; parfumLignes.push({ type: typeFixe, inci: it.name, pos: it.pos, pts: -fixe }); }
      else { score -= fixe; details.push({ type: typeFixe, inci: it.name, pos: it.pos, pts: -+fixe.toFixed(1) }); }
    }
  }

  // le système parfumant compte comme UNE caractéristique, pas comme N ingrédients :
  // sinon une marque qui déclare ses 12 allergènes (obligation UE) est punie 12 fois quand
  // une marque opaque qui écrit « Parfum » ne l'est qu'une. Prime à l'opacité = inacceptable.
  if (malusParfumCumule > 0) {
    const applique = Math.min(malusParfumCumule, CONFIG.plafondMalusParfum * R.severite * (R.exposition ?? 1));
    score -= applique;
    details.push({ type: "complexe-parfumant", pts: -+applique.toFixed(1), nComposants: parfumLignes.length,
      composants: parfumLignes.map((x) => x.inci) });
  }

  // Filtres UV dans un NON-solaire (crème de jour avec SPF) : vrai plus, mais pas son métier.
  // Dans un solaire, ils sont déjà payés par la grille « spectre / filtres » — pas deux fois.
  if (filtresUV && categorie !== "sunscreen") {
    score += CONFIG.bonusFiltresUVHorsSolaire;
    details.push({ type: "filtres-uv", pts: CONFIG.bonusFiltresUVHorsSolaire, note: "protection UV en bonus" });
  }
  score = Math.min(score, cap);

  const tete = list.slice(0, 10);
  const couverture = tete.length ? tete.filter((x) => x.fiche).length / tete.length : 0;

  return { score: clamp(score), bande: bande(clamp(score)), details, couverture, metier: R.metier,
           analysePartielle: couverture < CONFIG.seuilCouverture, nIngredients: list.length,
           algoVersion: CONFIG.algoVersion };
}

// ── SCORE PERSO ────────────────────────────────────────────────────────────────
export function scorePerso(inci, profil, categorie, formule, filtresUV) {
  const F = formule ?? scoreFormule(inci, categorie, filtresUV);
  const list = parseInci(inci);
  const barre = barre1pct(list);
  let score = F.score;
  const facts = [];
  let matchTotal = 0, capAbsolu = Infinity, strengthMax = 0;
  const matchParFamille = {};

  for (const it of list) {
    const f = it.fiche;
    if (!f) continue;
    const w = wPos(it, barre);
    strengthMax = Math.max(strengthMax, f.strength || 0);

    // règles absolues — sécurité (modèle validé : exclusion binaire)
    if (profil.pregnancy && f.pregnancyFlag) {
      capAbsolu = Math.min(capAbsolu, CONFIG.capGrossesse);
      facts.push({ label: `${titre(it.name)} — not recommended during pregnancy`, points: null, absolu: true, inci: it.name });
    }
    if (profil.allergies?.some((a) => it.name.includes(a.toUpperCase()))) {
      capAbsolu = Math.min(capAbsolu, CONFIG.capAllergie);
      facts.push({ label: `${titre(it.name)} — declared allergy`, points: null, absolu: true, inci: it.name });
    }

    // matches : actif × préoccupation du profil
    if (f.role === "active" && f.benefits?.length) {
      for (const b of f.benefits) {
        const sev = profil.concerns?.[b];
        if (!sev) continue;
        const fam = b;
        matchParFamille[fam] = (matchParFamille[fam] || 0) + 1;
        if (matchParFamille[fam] > CONFIG.maxActifsParFamille) continue;
        const pts = Math.min(CONFIG.bonusMatch * sev * w, CONFIG.maxMatchParIngredient);
        matchTotal += pts;
        // Le mot vient du PROFIL quand il en porte un : la famille `aging` couvre les rides,
        // le grain ET le teint terne (mêmes actifs), donc un mot fixe serait faux pour
        // quelqu'un. Repli sur le libellé de famille si le profil n'en a pas.
        const mot = profil.libelles?.[b] ?? libelle(b);
        facts.push({ label: `${titre(it.name)} targets your ${mot}`, points: +pts.toFixed(1), inci: it.name, pos: it.pos });
        break;
      }
    }
    // ALLERGÈNE DE CONTACT : ne compte que pour une peau déclarée réactive. Le parfum et les
    // huiles essentielles ont déjà leur propre ligne juste en dessous — pas de double comptage.
    const sensi = f.risks?.sensibilisant || 0;
    if (sensi > 0 && (profil.sensitivity || 0) > 0 && !f.fragrance && !f.essentialOil) {
      const pts = -CONFIG.malusSensibilisant * sensi * ((profil.sensitivity || 0) / 3) * w;
      score += pts;
      facts.push({ label: `${titre(it.name)} — a known contact allergen, and your skin reacts easily`,
                   points: +pts.toFixed(1), inci: it.name, pos: it.pos });
    }
    // flags perso (le malus parfum formule+perso s'affiche en UNE ligne : on fusionne ici)
    if (f.fragrance && (profil.sensitivity || 0) > 0) {
      const pts = -CONFIG.malusParfumSensible * profil.sensitivity;
      score += pts;
      facts.push({ label: `Fragrance — poorly suited to your reactive skin`, points: pts, inci: it.name, fusionFormule: true });
    }
    if ((f.risks?.comedogenic || 0) >= 3 && ["oily", "combination"].includes(profil.skinType)) {
      const pts = -CONFIG.malusComedoGras * w;
      score += pts;
      facts.push({ label: `${titre(it.name)} — pore-clogging risk for your ${profil.skinType} skin`, points: +pts.toFixed(1), inci: it.name });
    }
    if (f.dryingAlcohol && ["dry"].includes(profil.skinType)) {
      score -= CONFIG.malusAlcoolSeche;
      facts.push({ label: `Drying alcohol — hard on your dry skin`, points: -CONFIG.malusAlcoolSeche, inci: it.name });
    }
    if (f.essentialOil && (profil.sensitivity || 0) >= 2) {
      score -= CONFIG.malusHEReactive;
      facts.push({ label: `Essential oils — risky on reactive skin`, points: -CONFIG.malusHEReactive, inci: it.name });
    }
  }

  score += Math.min(matchTotal, CONFIG.plafondMatchs);

  // force vs tolérance
  const depassement = Math.max(0, strengthMax - (profil.strengthCeiling ?? 2));
  if (depassement > 0) {
    const pts = -CONFIG.malusForceParCran * depassement;
    score += pts;
    facts.push({ label: `Stronger than your skin's comfort zone`, points: pts });
  }
  // ── ADÉQUATION : ce produit, en tant que ce qu'il EST, convient-il à cette peau ? ──
  const nat = natureProduit(list);
  const peau = profil.skinType || "normal";
  const sensible = (profil.sensitivity || 0) >= 2;

  if (nat.riche) {
    const pts = CONFIG.richesse.riche[peau] ?? 0;
    if (pts) { score += pts; facts.push({ label: pts > 0 ? `Rich, nourishing texture — right for your ${libPeau(peau)} skin`
      : `Rich, oily texture — heavy for your ${libPeau(peau)} skin`, points: pts, adequacy: true }); }
  } else if (nat.legere) {
    const pts = CONFIG.richesse.legere[peau] ?? 0;
    if (pts) { score += pts; facts.push({ label: pts > 0 ? `Light, water-based texture — right for your ${libPeau(peau)} skin`
      : `Light texture — not nourishing enough for your ${libPeau(peau)} skin`, points: pts, adequacy: true }); }
  }
  if (nat.sulfate) {
    const pts = sensible ? CONFIG.sulfates.sensible : (CONFIG.sulfates[peau] ?? 0);
    if (pts) { score += pts; facts.push({ label: `Sulfate cleansing agents — harsh for your ${sensible ? "reactive" : libPeau(peau)} skin`, points: pts, adequacy: true }); }
  }

  // ── PROTECTION SOLAIRE : ce que ce produit vaut POUR ELLE ──
  // Deux signaux, tous deux déclarés ou mesurés, jamais l'apparence : elle ne se protège
  // pas (q4), et elle a de la pigmentation. Réservé à ce qui RESTE sur la peau — un
  // nettoyant avec filtre UV ne protège de rien, il part au rinçage.
  // `exposition` est le champ des grilles ACTIVES (< 1 = part au rinçage : cleanser 0.55,
  // makeup-remover 0.5, mask 0.7, exfoliant 0.85 ; absent donc 1 sur tout ce qui reste posé).
  // Ce test lisait `grille.rince`, qui n'existe QUE dans `categoriesLegacy` — le bloc marqué
  // « PLUS UTILISÉ ». Il valait donc toujours undefined, `?? 1` le remontait à 1, et la
  // condition était TOUJOURS vraie : des masques à l'argile et des baumes à lèvres
  // recevaient un bonus de protection solaire, avec la phrase qui va avec.
  const grille = CONFIG.RUBRIQUES[categorie] || CONFIG.RUBRIQUES.indetermine;
  if (filtresUV && (grille.exposition ?? 1) >= 1) {
    const pigmentation = (profil.concerns?.spots || 0) > 0 ? 1 : 0;
    const besoin = Math.min(3, (profil.besoinSolaire || 0) + pigmentation);
    if (besoin > 0) {
      const pts = Math.min(CONFIG.bonusSolairePerso * besoin, CONFIG.maxMatchParIngredient);
      score += pts;
      const dit = (profil.besoinSolaire || 0) >= 2 ? "you say you skip sunscreen"
                : (profil.besoinSolaire || 0) === 1 ? "you only wear it sometimes"
                : `it protects your ${profil.libelles?.spots ?? "dark spots"}`;
      facts.push({ label: `UV filters — ${dit}`, points: +pts.toFixed(1), adequacy: true });
    }
  }
  if (sensible && nat.forceMax >= 2 && ["exfoliant", "treatment", "toner"].includes(categorie)) {
    score += CONFIG.exfoliantFort.sensible;
    facts.push({ label: `Strong exfoliating actives — risky on reactive skin`, points: CONFIG.exfoliantFort.sensible, adequacy: true });
  }
  if (categorie === "sunscreen" && nat.mineral && sensible) {
    score += CONFIG.filtreMineralBonus;
    facts.push({ label: `Mineral UV filters — gentler on reactive skin`, points: CONFIG.filtreMineralBonus, adequacy: true });
  }

  score = Math.min(score, capAbsolu);
  const final = clamp(score);
  facts.sort((a, b) => Math.abs(b.points ?? 99) - Math.abs(a.points ?? 99));

  return { score: final, bande: bande(final), facts,
           factsAffiches: facts.filter((f) => f.absolu || Math.abs(f.points ?? 0) >= 3).slice(0, 5),
           scoreFormule: F.score, bandeFormule: F.bande,
           analysePartielle: F.analysePartielle, algoVersion: CONFIG.algoVersion };
}

const titre = (s) => s.charAt(0) + s.slice(1).toLowerCase();
const libelle = (b) => ({ blemishes: "breakouts", oiliness: "oily T-zone", dehydration: "dehydration", redness: "redness", aging: "fine lines", spots: "dark spots", barrier: "skin barrier" }[b] || b);
const libPeau = (p) => ({ oily: "oily", combination: "combination", dry: "dry", normal: "normal" }[p] || p);
const libCat = (c) => ({ moisturizer_rich: "Rich cream", gel: "Gel texture", cleanser_foaming: "Foaming cleanser" }[c] || "This texture");
