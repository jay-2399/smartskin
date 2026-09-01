import type { AnalysisResult } from "@/features/analysis/schema";
import type { Answers } from "@/features/funnel/types";
import { IMPORTANCE } from "@/features/routine/recommend";
import { buildEngineProfile } from "@/features/recommendation/profile";

/* TRADUCTION bilan visage → profil du moteur de notation produit.
   Module PUR : aucun import serveur (pas de `db`, pas de `fs`), donc testable seul et
   incapable de faire planter une route. L'I/O vit dans profil-utilisateur.ts.

   Pourquoi une traduction et pas un simple branchement : le scan mesure 16 attributs,
   le moteur matche sur 7 familles de bénéfice (les seules qui existent dans le
   dictionnaire), et un seul nom est commun aux deux (`redness`). Brancher tel quel
   donnerait un score perso qui ne voit qu'un seizième de ce que la photo a mesuré.

   Cf. docs/specs/profil-branchement-plan.md */

export const FAMILLES = [
  "blemishes", "oiliness", "dehydration", "barrier", "redness", "aging", "spots",
] as const;
export type Famille = (typeof FAMILLES)[number];

/** Ce qu'on PRODUIT : strict, complet, toujours cohérent. */
export type ProfilPeau = {
  skinType: "oily" | "combination" | "dry" | "normal";  // TEXTURE seule, jamais "sensitive"
  sensitivity: 0 | 1 | 2 | 3;
  strengthCeiling: number;                              // 1-4, tel quel depuis EngineProfile
  concerns: Partial<Record<Famille, number>>;           // au plus 3 clés, Σ ≤ 4
  libelles: Partial<Record<Famille, string>>;           // le mot à AFFICHER par famille
  besoinSolaire: 0 | 1 | 2;                             // 2 = ne se protège jamais
  pregnancy: boolean;
  allergies: string[];                                  // TOUJOURS [] en v1 — voir plus bas
};

/** Ce que les consommateurs ACCEPTENT : tout optionnel, `skinType` en chaîne libre.
 *  C'est le type anonyme qui vivait dans moteur.ts, déplacé ici — une seule définition,
 *  dans le fichier qui la produit. PROFIL_NEUTRE le satisfait sans être modifié. */
export type ProfilLu = {
  skinType?: string;
  sensitivity?: number;
  strengthCeiling?: number;
  pregnancy?: boolean;
  concerns?: Record<string, number>;
  libelles?: Record<string, string>;
  allergies?: string[];
  besoinSolaire?: number;
};

/* ───────────── Les tables de correspondance ───────────── */

/* Les 7 familles sont les seules fichées dans data/scan/dictionnaire.json :
   aging 547 actifs, dehydration 453, redness 353, barrier 213, spots 132,
   blemishes 118, oiliness 72. Un attribut sans famille ne peut rien matcher. */
const ATTRIBUT_FAMILLES: Record<string, Famille[]> = {
  acne: ["blemishes"],
  comedones: ["blemishes"],
  pores: ["blemishes", "oiliness"],      // SALICYLIC ACID → blemishes ; NIACINAMIDE → blemishes, oiliness
  shine: ["oiliness"],
  flaking: ["dehydration", "barrier"],   // UREA, PANTHENOL portent les deux
  texture: ["aging"],                    // les AHA portent ["aging","spots","blemishes"] : ici `aging`
  radiance: ["aging"],                   //   est la famille du RENOUVELLEMENT, pas des seules rides
  tone_evenness: ["spots"],
  dark_spots: ["spots"],
  post_acne_marks: ["spots"],            // hyperpigmentation post-inflammatoire
  redness: ["redness"],
  visible_vessels: ["redness"],
  fine_lines: ["aging"],
  wrinkles: ["aging"],
  under_eye_circles: [],                 // orphelins irréductibles : aucune famille ne les couvre,
  under_eye_puffiness: [],               //   et CAFFEINE est fiché benefits:["redness"]
};

/* Priorités déclarées (q1) → familles. Table DISTINCTE de Q1_CONCERNS (recommend.ts),
   volontairement : Q1_CONCERNS.blemishes se déplie en acne + comedones + post_acne_marks,
   ce qui créerait une préoccupation « taches » chez quelqu'un qui n'a coché que « acné »
   et dont la photo ne montre aucune marque. */
const Q1_FAMILLES: Record<string, Famille[]> = {
  hydration: ["dehydration", "barrier"],
  radiance: ["aging"],
  blemishes: ["blemishes"],
  pores: ["blemishes", "oiliness"],
  dark_spots: ["spots"],
  fine_lines: ["aging"],
  firmness: ["aging"],
  redness: ["redness"],
  oiliness: ["oiliness"],
  texture: ["aging"],
  eye_area: [],                          // aucune famille — voir les orphelins ci-dessus
  discover: [],                          // « je ne suis pas sûr » = aucune priorité déclarée
};

/* « Qu'est-ce qui a changé récemment ? » (q5). Donnée collectée et lue nulle part
   aujourd'hui : deriveBucket ne l'ouvre jamais. Elle tombe pourtant exactement sur
   des familles. */
const Q5_FAMILLE: Record<string, Famille> = {
  breakouts: "blemishes",
  dry: "dehydration",
  oily: "oiliness",
  redness: "redness",
  spots: "spots",
};

/* Le mot à AFFICHER pour chaque attribut source. Une famille peut être alimentée par
   des attributs très différents — `aging` par des rides ou par du grain — et une chaîne
   fixe serait fausse pour quelqu'un : « Glycolic acid targets your fine lines » chez
   une personne de 22 ans qui a coché « Texture ». Le libellé est donc calculé. */
const MOT: Record<string, string> = {
  acne: "breakouts",
  comedones: "blackheads",
  post_acne_marks: "post-acne marks",
  pores: "enlarged pores",
  texture: "skin texture",
  flaking: "flaking",
  tone_evenness: "uneven tone",
  radiance: "dullness",
  dark_spots: "dark spots",
  redness: "redness",
  shine: "oiliness",
  visible_vessels: "visible vessels",
  fine_lines: "fine lines",
  wrinkles: "wrinkles",
};

/** Repli quand une famille n'entre que par déclaration, sans attribut source mesuré. */
const MOT_FAMILLE: Record<Famille, string> = {
  blemishes: "breakouts",
  oiliness: "oiliness",
  dehydration: "dehydration",
  barrier: "a weakened barrier",
  redness: "redness",
  aging: "fine lines",
  spots: "dark spots",
};

/* ───────────── Les champs, un par un ───────────── */

const NIVEAUX = new Map<string, number>();

/** Niveau (1-4) d'un attribut du bilan. 1 = idéal/absent. Un bilan partiel est un cas
 *  NORMAL : le schéma n'impose aucune longueur minimale à `attributes`. */
function niveauDe(result: AnalysisResult, id: string): number {
  return result.attributes.find((a) => a.id === id)?.level ?? 1;
}

/** TEXTURE seule. `normalizeSkinType` rend une clé française qui mélange deux axes :
 *  `sensible` n'est pas une texture, c'est une texture MANQUANTE (le libellé de l'IA
 *  ne contenait aucun mot de texture). On la déduit alors des attributs.
 *
 *  Traduire est obligatoire : CONFIG.richesse n'a aucune entrée `sensitive`, donc lui
 *  passer "sensitive" retomberait sur `?? 0` SANS la moindre erreur — tout le jugement
 *  d'adéquation de texture disparaîtrait en silence. */
function textureDe(cle: string, result: AnalysisResult): ProfilPeau["skinType"] {
  if (cle === "grasse") return "oily";
  if (cle === "seche") return "dry";
  if (cle === "mixte") return "combination";
  if (cle === "normale") return "normal";
  // cle === "sensible" : on reconstruit la texture avec les signaux que le prompt
  // d'analyse utilise lui-même, plutôt que de perdre l'information.
  const shine = niveauDe(result, "shine");
  const flaking = niveauDe(result, "flaking");
  if (shine >= 3) return "oily";
  if (flaking >= 2 && shine <= 2) return "dry";
  if (shine === 2) return "combination";
  return "normal";
}

/** Réactivité (0-3), l'autre axe. Elle ne fait que RETIRER des points dans le moteur
 *  (parfum, HE, sensibilisants, sulfates, exfoliants forts) — jamais en ajouter. */
function sensibiliteDe(
  bucket: string,
  sensitive: boolean,
  answers: Answers
): ProfilPeau["sensitivity"] {
  let s: ProfilPeau["sensitivity"] = 0;
  if (bucket === "fragile") s = 3;
  else if (sensitive) s = 2;
  else if (answers.q2.some((v) => v !== "none")) s = 1;
  // Plancher q5 : « Rougeurs / sensibilité : nouvelles réactions » est aujourd'hui un
  // signal déclaré qui n'atteint AUCUN calcul — deriveBucket n'ouvre jamais q5.
  if (answers.q5.symptoms.includes("redness") && s < 2) s = 2;
  return s;
}

type Candidate = {
  famille: Famille;
  sev: number;
  mesure: boolean;            // vu par la photo (vs seulement déclaré)
  poids: number;              // IMPORTANCE × niveau, pour départager
  sources: { id: string; sev: number }[];
};

/** Les préoccupations : sélection, échelle, budget.
 *
 *  Échelle : sev = niveau − 1 (CONFIG.bonusMatch documente « × sévérité (1-3) », les
 *  échelles coïncident). Sévérité d'une famille = MAX de ses attributs, jamais une
 *  somme : deux signaux moyens ne font pas un problème grave.
 *
 *  Budget : Σ sev plafonné à 4. C'est exactement le budget de data/scan/profil.json
 *  ({blemishes:2, oiliness:2}), le seul profil sur lequel le score perso ait jamais
 *  tourné — il traverse donc le plafond inchangé. Sans ce plafond, un vrai bilan
 *  (5 à 7 familles) sature le score : mesuré à 12 % du catalogue à 100/100. */
function concernsDe(result: AnalysisResult, answers: Answers) {
  const parFamille = new Map<Famille, Candidate>();

  const pousse = (
    famille: Famille,
    sev: number,
    mesure: boolean,
    poids: number,
    source?: { id: string; sev: number }
  ) => {
    const c = parFamille.get(famille);
    if (!c) {
      parFamille.set(famille, {
        famille, sev, mesure, poids, sources: source ? [source] : [],
      });
      return;
    }
    c.sev = Math.max(c.sev, sev);          // MAX, pas somme
    c.mesure = c.mesure || mesure;
    c.poids = Math.max(c.poids, poids);
    if (source) c.sources.push(source);
  };

  // 1. Le MESURÉ — ce que la photo voit.
  for (const attr of result.attributes) {
    const sev = attr.level - 1;
    if (sev <= 0) continue;                // niveau 1 = idéal/absent
    for (const f of ATTRIBUT_FAMILLES[attr.id] ?? []) {
      pousse(f, sev, true, (IMPORTANCE[attr.id] ?? 1) * attr.level, { id: attr.id, sev });
    }
  }

  // 2. Le DÉCLARÉ — q1 et les symptômes q5. Plancher de sévérité 2 : en dessous, une
  //    priorité cochée ne ferait rien dès que la personne a le moindre attribut à
  //    niveau 2, c'est-à-dire presque tout le monde.
  const declarees: Famille[] = [];
  for (const v of answers.q1) for (const f of Q1_FAMILLES[v] ?? []) declarees.push(f);
  for (const v of answers.q5.symptoms) {
    const f = Q5_FAMILLE[v];
    if (f) declarees.push(f);
  }
  for (const f of declarees) pousse(f, 2, false, 0);

  // 3. Tri : sévérité, puis le MESURÉ devant le DÉCLARÉ, puis IMPORTANCE × niveau.
  //    On garde 3 — déjà la doctrine maison partout (q1.maxSelect, topConcerns(3),
  //    verdict.plan). Le mesuré grave n'est JAMAIS évincé par une déclaration :
  //    c'est ce qui faisait tomber la première version de cette règle.
  const retenues = [...parFamille.values()]
    .sort((a, b) =>
      b.sev - a.sev ||
      Number(b.mesure) - Number(a.mesure) ||
      b.poids - a.poids ||
      a.famille.localeCompare(b.famille))       // déterministe jusqu'au bout
    .slice(0, 3);

  // 4. Budget : renormalisation au prorata SI, et seulement si, Σ dépasse 4. Une
  //    renormalisation systématique écraserait la sévérité absolue — {blemishes:1}
  //    (acné légère) et {blemishes:3} (acné sévère) deviendraient identiques.
  const somme = retenues.reduce((n, c) => n + c.sev, 0);
  const facteur = somme > 4 ? 4 / somme : 1;

  const concerns: Partial<Record<Famille, number>> = {};
  const libelles: Partial<Record<Famille, string>> = {};
  for (const c of retenues) {
    concerns[c.famille] = Math.min(3, Math.round(c.sev * facteur * 1000) / 1000);
    libelles[c.famille] = libelleDe(c);
  }
  return { concerns, libelles };
}

/** Le libellé d'une famille, construit depuis les attributs qui l'ont alimentée —
 *  les deux plus graves au maximum. Vrai pour cette personne-là, ce qu'aucune
 *  constante ne peut être. */
function libelleDe(c: Candidate): string {
  const mots = [...c.sources]
    .sort((a, b) => b.sev - a.sev)
    .map((s) => MOT[s.id])
    .filter((m): m is string => Boolean(m));
  const uniques = [...new Set(mots)].slice(0, 2);
  return uniques.length ? uniques.join(" & ") : MOT_FAMILLE[c.famille];
}

/* ALLERGIES DÉCLARÉES (q7) → la liste des INCI concernés.
   Le moteur plafonne la note à 10 dès qu'un ingrédient correspond : c'est brutal et
   c'est juste, pour une VRAIE allergie. D'où trois précautions.

   Une liste fermée, jamais du texte libre : le moteur matche par sous-chaîne, et
   quelqu'un qui taperait « huile » plafonnerait presque tout le catalogue.

   Le profil transporte les NOMS D'INGRÉDIENTS, pas le mot « parfum » : le dépliage se
   fait ici, sur le dictionnaire, une fois — pas à chaque produit noté.

   Et q7 n'est pas q2. q2 demande ce qui IRRITE et donne un malus gradué ; ici on parle
   d'une allergie diagnostiquée, et le libellé de la question le dit. */
type Predicat = (nom: string, fiche: { euFragranceAllergen?: boolean; essentialOil?: boolean }) => boolean;

const GROUPES_ALLERGENES: Record<string, Predicat> = {
  // Le parfum est l'allergène de contact le plus fréquent. On prend les 2 noms génériques
  // plus les 137 allergènes que l'UE oblige à déclarer nommément — soit 33 % du catalogue.
  "allergy-fragrance": (n, f) => n === "FRAGRANCE" || n === "PARFUM" || !!f.euFragranceAllergen,
  "allergy-eo": (_n, f) => !!f.essentialOil,
  // Isothiazolinones (allergène de l'année 2013) et libérateurs de formaldéhyde.
  "allergy-preservative": (n) =>
    /ISOTHIAZOLINONE/.test(n) ||
    /^(DMDM HYDANTOIN|IMIDAZOLIDINYL UREA|DIAZOLIDINYL UREA|QUATERNIUM-15|BRONOPOL)$/.test(n),
};

/* Le moteur matche par SOUS-CHAÎNE, ce qui rend service : « LIMONENE » attrape aussi
   « D-LIMONENE », la même substance. Vérifié sur tout le dictionnaire, ce débordement
   est juste dans dix cas sur onze — variantes de FRAGRANCE, ETHYL LINALOOL, 4-TERPINEOL.

   Le onzième ne l'est pas : « CAMPHOR » attrape TEREPHTHALYLIDENE DICAMPHOR SULFONIC
   ACID, le Mexoryl SX, qui est un filtre solaire — rien à voir avec un parfum. Et une
   API de sous-chaîne ne sait pas dire « CAMPHOR mais pas DICAMPHOR ».

   Alors on tranche à la mesure. Retirer CAMPHOR change 17 produits : 12 cessent d'être
   plafonnés à tort (Mexoryl), 5 cessent de l'être à raison (lotions asséchantes au
   camphre). 12 contre 5 : on le retire. Les huiles de camphre restent couvertes par
   l'allergie aux huiles essentielles, pour qui la déclare. */
const EXCLUS = new Set(["CAMPHOR"]);

/** Déplie les allergies cochées en liste d'INCI. Sans dictionnaire → [], jamais une
 *  allergie qu'on ne saurait pas reconnaître. */
function allergiesDe(answers: Answers, dico?: Record<string, unknown>): string[] {
  if (!dico) return [];
  const actifs = answers.q7.filter((v) => GROUPES_ALLERGENES[v]);
  if (!actifs.length) return [];
  const out = new Set<string>();
  for (const [nom, fiche] of Object.entries(dico)) {
    if (EXCLUS.has(nom)) continue;
    for (const g of actifs) {
      if (GROUPES_ALLERGENES[g](nom, fiche as { euFragranceAllergen?: boolean; essentialOil?: boolean })) {
        out.add(nom);
        break;
      }
    }
  }
  return [...out];
}

/** Se protège-t-elle du soleil ? (q4, aujourd'hui collecté et lu par personne.)
 *
 *  On ne descend PAS jusqu'au phototype : la règle simple « plus la peau est claire,
 *  plus il faut de solaire » serait fausse pour la moitié des gens. Une peau claire
 *  brûle vite ; une peau foncée brûle beaucoup moins mais marque bien plus, et la
 *  protection solaire est justement le premier traitement de ces marques. Les deux
 *  extrêmes en ont besoin, pour des raisons opposées. Et noter des produits selon la
 *  couleur de peau demanderait une décision produit, pas un réglage de notation.
 *
 *  Réponse absente → 0 : on n'accorde pas un bonus qu'on ne peut pas justifier. */
function besoinSolaireDe(answers: Answers): ProfilPeau["besoinSolaire"] {
  if (answers.q4 === "never") return 2;
  if (answers.q4 === "sometimes") return 1;
  return 0;
}

/* ───────────── L'unique traduction ───────────── */

/** Bilan visage + questionnaire → profil du moteur. Déterministe, ne jette jamais.
 *
 *  On RÉUTILISE buildEngineProfile plutôt que de redériver la tolérance : deux
 *  dérivations parallèles finiraient par se contredire — « ta barrière est fragile,
 *  va doucement » côté routine, un rétinol à 92/100 côté produit. */
export function versProfilPeau(
  result: AnalysisResult,
  answers: Answers,
  dico?: Record<string, unknown>
): ProfilPeau {
  const eng = buildEngineProfile(result, answers);
  const { concerns, libelles } = concernsDe(result, answers);

  return {
    skinType: textureDe(eng.skinType, result),
    sensitivity: sensibiliteDe(eng.bucket, eng.sensitive, answers),
    strengthCeiling: eng.strengthCeiling,
    concerns,
    libelles,
    besoinSolaire: besoinSolaireDe(answers),
    pregnancy: eng.pregnant,
    // Alimenté par q7 UNIQUEMENT, jamais par q2. q2 déclare une IRRITATION — chaque
    // item y a déjà son canal (parfum, HE, sulfates, alcool) et sa contribution est de
    // monter `sensitivity`. Le verser ici plafonnerait à 10/100 le tiers du catalogue
    // pour quelqu'un qui trouve juste que le parfum lui pique.
    allergies: allergiesDe(answers, dico),
  };
}

/** Empreinte de cache : tout ce que scorePerso lit, et rien d'autre. Ne contient PAS
 *  l'uid — deux personnes de même peau doivent partager l'entrée. Sévérités arrondies
 *  à 2 décimales, sinon la renormalisation (1.714…) rend chaque clé quasi unique et
 *  le partage annoncé ne se produit jamais. L'arrondi ne change aucune note. */
export function cleProfil(p: ProfilLu): string {
  const c = Object.entries(p.concerns ?? {})
    .filter(([, v]) => typeof v === "number" && v > 0)
    .map(([k, v]) => `${k}:${(v as number).toFixed(2)}`)
    .sort()
    .join(",");
  const a = [...(p.allergies ?? [])].sort().join(",");
  return [
    p.skinType ?? "",
    p.sensitivity ?? 0,
    p.strengthCeiling ?? "",
    p.besoinSolaire ?? 0,
    p.pregnancy ? 1 : 0,
    a,
    c,
  ].join("|");
}
