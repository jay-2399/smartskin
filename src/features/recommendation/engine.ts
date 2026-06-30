import type { CatalogProduct, Category } from "./catalog";
import type { EngineProfile } from "./profile";
import type { Constraints } from "./medical-guard";

/* Cœur DÉTERMINISTE du moteur (aucun LLM ici) — Étapes 2 à 4, 6, 7.
   Cf. docs/moteur-reco-implementation.md §4 / §5. Tout est pur et testable. */

/* ───────────── Étape 2 — Filtres durs, par catégorie ───────────── */

/** Un produit passe-t-il les filtres durs pour ce profil ? (sécurité — plus de budget prix). */
export function passesFilters(
  p: CatalogProduct,
  profile: EngineProfile,
  constraints: Constraints
): boolean {
  if (constraints.excludePregnancyUnsafe && p.unsafePregnancy) return false;
  if (constraints.excludeSensitiveUnsafe && p.unsafeSensitive) return false;
  if (p.irritationCost > constraints.maxIrritationPerProduct) return false;
  const ka = (p.keyActives || "").toLowerCase();
  if (constraints.excludeActives.some((a) => ka.includes(a))) return false;
  // byProfile == negative pour la peau du user → on élimine (règle d'or §2.4).
  if (p.couche3?.byProfile?.[profile.skinType] === "negative") return false;
  return true;
}

export function hardFilter(
  products: CatalogProduct[],
  profile: EngineProfile,
  constraints: Constraints
): CatalogProduct[] {
  return products.filter((p) => passesFilters(p, profile, constraints));
}

/* ───────────── Étape 3 — Scoring déterministe ───────────── */

const BP_SCORE: Record<string, number> = { positive: 1, unknown: 0, caution: -0.7, negative: 0 };

/** Score de pertinence/qualité d'un produit pour le profil (cf. §4.3, tunable). */
export function scoreProduct(p: CatalogProduct, profile: EngineProfile): number {
  const c3 = p.couche3;
  const bp = c3?.byProfile?.[profile.skinType] ?? "unknown";

  // 1) PERTINENCE — combien de besoins traités, pondéré par la priorité.
  let match = 0;
  profile.concerns.forEach((concern, i) => {
    if (p.targets.includes(concern)) match += 1 / (i + 1);
  });

  const bpScore = BP_SCORE[bp] ?? 0;
  const evidence = ((p.evidenceLevel ?? 1) - 1) / 4; // 1..5 → 0..1
  const sentiment = c3?.sentiment ?? 0.5; // neutre si couche3 absente
  const social = (p.rating / 5) * Math.min(Math.log10(Math.max(p.reviews, 1)) / 5, 1);
  const sensFactor = profile.sensitive ? 1.6 : 1;
  const irritationPen = (p.irritationCost / 5) * sensFactor;
  const ffBonus = profile.sensitive && p.fragranceFree === true ? 0.3 : 0;
  const bsrBonus = p.bsr ? Math.max(0, 1 - Math.log10(p.bsr) / 6) * 0.5 : 0;

  return (
    4 * match +
    2 * bpScore +
    1.5 * evidence +
    2 * sentiment +
    1.5 * social -
    1.5 * irritationPen +
    ffBonus +
    bsrBonus
  );
}

/* ───────────── Étape 4 — Shortlist top-N (diversité de marque) ───────────── */

/** Classe les survivants et garde les N meilleurs, en préférant la diversité de
 *  marque (évite 2 quasi-doublons d'une même marque), sans descendre sous N si
 *  le catalogue le permet. options[0] = meilleur score = recommandé par défaut. */
export function shortlist(products: CatalogProduct[], profile: EngineProfile, n = 3): CatalogProduct[] {
  const ranked = [...products].sort((a, b) => scoreProduct(b, profile) - scoreProduct(a, profile));
  const out: CatalogProduct[] = [];
  const brands = new Set<string>();
  for (const p of ranked) {
    if (out.length >= n) break;
    if (brands.has(p.brand)) continue; // diversité de marque d'abord
    out.push(p);
    brands.add(p.brand);
  }
  // Complète si la diversité nous a laissés sous N (et qu'il reste des candidats).
  for (const p of ranked) {
    if (out.length >= n) break;
    if (!out.includes(p)) out.push(p);
  }
  return out;
}

/* ───────────── Étape 7 (partie 1) — Structure de routine FIXE ─────────────
   Même taille pour TOUS (9 étapes), seuls les PRODUITS s'adaptent au profil.
     Matin (4) : nettoyant · serum · crème jour · spf
     Soir  (5) : démaquillant · soin traitant · bonus · crème nuit · masque
   Seuls les 2 slots actifs du soir (soin traitant + bonus) varient selon la peau ;
   le reste est identique pour tout le monde. */

// Catégories toujours sourcées : socle + les 3 familles d'actifs (pour pouvoir
// remplir les 2 slots du soir, avec repli si l'une est vide après les filtres).
const SOURCED: Category[] = [
  "nettoyant", "serum", "hydratant", "spf", "démaquillant", "masque",
  "traitement", "exfoliant", "soin_cible",
];

/** Catégorie de soin (hors sérum) la plus adaptée à une préoccupation. */
export function treatmentCategoryFor(concern: string | undefined): Category {
  switch (concern) {
    case "acne": case "comedones": case "fine_lines": case "wrinkles": return "traitement";
    case "dark_spots": case "tone_evenness": case "post_acne_marks": case "redness": case "flaking": return "soin_cible";
    default: return "exfoliant"; // pores / shine / texture / radiance + entretien
  }
}

/** Les 2 slots actifs du soir : [soin traitant (concern n°1), bonus (exfoliant ou concern n°2)]. */
export function nightActiveCategories(profile: EngineProfile): [Category, Category] {
  const soin = treatmentCategoryFor(profile.concerns[0]);
  const oily = profile.concerns.length === 0 ||
    profile.concerns.some((c) => ["acne", "comedones", "pores", "shine", "texture"].includes(c));
  let bonus: Category;
  if (oily && soin !== "exfoliant") {
    bonus = "exfoliant"; // peau grasse / texture (ou entretien) → un exfoliant en bonus
  } else {
    bonus = treatmentCategoryFor(profile.concerns[1]); // sinon, la préoccupation n°2
    if (bonus === soin) bonus = soin === "exfoliant" ? "soin_cible" : "exfoliant";
  }
  return [soin, bonus];
}

/** Catégories à sourcer — FIXE (la sélection des 2 slots actifs se fait à l'assemblage). */
export function planCategories(): Category[] {
  return [...SOURCED];
}

/* ───────────── Crème jour (légère) vs nuit (riche) ───────────── */

const LIGHT_RE = /\b(gel|water|aqua|lotion|fluid|hydro|oil[-\s]?free)\b/i;
const RICH_RE = /\b(cream|crème|baume|balm|repair|whipped|nourriss|rich|butter|skin\s?food|ultra)\b/i;

/** Sépare les hydratants en pool JOUR (utilisable le matin) et NUIT (crème de nuit
 *  dédiée), d'après les champs catalogue `moment`/`night` — repli sur la regex de nom
 *  uniquement si la donnée manque. Les « both » vont au jour, les « pm »/`night:true`
 *  à la nuit : pools DISJOINTS → crème jour ≠ crème nuit par construction. */
export function splitCreams(creams: CatalogProduct[]): { day: CatalogProduct[]; night: CatalogProduct[] } {
  const txt = (p: CatalogProduct) => `${p.name} ${p.keyActives}`.toLowerCase();
  const isNight = (p: CatalogProduct) =>
    p.night === true ||
    p.moment === "pm" ||
    (p.night == null && p.moment == null && RICH_RE.test(txt(p)) && !LIGHT_RE.test(txt(p)));
  let day = creams.filter((p) => !isNight(p));
  let night = creams.filter((p) => isNight(p));
  if (!day.length) day = creams; // repli : aucune crème jour-utilisable
  if (!night.length) night = creams; // repli : aucune crème de nuit dédiée
  return { day, night };
}

/* ───────────── Étape 6 — Réconciliation panier (IRRITATION uniquement) ─────────────
   Le budget PRIX a été retiré du produit (plus de question budget) → ici on ne réconcilie
   plus que la charge d'irritation cumulée de la routine (sécurité). */

export interface Swap {
  category: Category;
  from: string; // "Marque Nom"
  to: string;
  reason: "irritation";
}

export interface Totals {
  prix: number; // informatif (Σ prix de la routine)
  irritation: number;
}

/* Plafond d'irritation §4.6 — barème RECOPIÉ de recommend.ts (deriveBucket/derivePhase).
   ⚠️ Caveat granularité : là-bas on somme des ACTIFS (~3-5), ici des PRODUITS (~5-7,
   socle à coût 0) → mêmes unités 0-5 mais à recalibrer sur cas réels avant de figer. */
const BASE_CEILING: Record<EngineProfile["bucket"], number> = { fragile: 2, sensible: 6, normale: 12, tolerante: 16 };
const PHASE_FACTOR: Record<EngineProfile["phase"], number> = { 1: 0.5, 2: 0.75, 3: 1 };

/** Plafond Σ irritationCost de la routine = sensibilité (bucket) × expérience (phase). */
export function irritationTolerance(profile: EngineProfile): number {
  return Math.round(BASE_CEILING[profile.bucket] * PHASE_FACTOR[profile.phase]);
}

const label = (p: CatalogProduct) => `${p.brand} ${p.name}`;
const round2 = (n: number) => Math.round(n * 100) / 100;
const round1 = (n: number) => Math.round(n * 10) / 10;

/** Fréquence hebdo → nombre de doses par semaine. */
function weeklyTimes(frequency: string): number {
  if (frequency === "3x/sem") return 3;
  if (frequency === "1-2x/sem") return 1.5;
  return 7; // daily
}

/** Irritation MOYENNE PAR JOUR d'un produit = coût × (doses/sem) ÷ 7. Un produit
 *  non quotidien irrite moins sur la semaine : exfoliant 1-2×/sem ≈ ÷5 vs un soin
 *  quotidien de même coût ; masque 1×/sem ≈ ÷7. (Le socle quotidien est à coût 0.) */
export function dailyIrritation(p: CatalogProduct): number {
  return (p.irritationCost * weeklyTimes(p.frequency)) / 7;
}

/** Σ prix (informatif) / Σ irritation (pondérée par la fréquence) sur les produits choisis. */
export function totalsOf(picks: Record<string, CatalogProduct[]>): Totals {
  const chosen = Object.values(picks).map((o) => o[0]).filter(Boolean);
  const prix = round2(chosen.reduce((s, p) => s + p.price, 0));
  const irritation = round1(chosen.reduce((s, p) => s + dailyIrritation(p), 0));
  return { prix, irritation };
}

/** Échange glouton : si la charge d'IRRITATION cumulée dépasse la tolérance de la peau,
 *  on remplace le produit le plus irritant par le candidat suivant de SA shortlist,
 *  jusqu'à rentrer sous le plafond. (Plus aucun arbitrage prix : le budget a été retiré.) */
export function reconcile(
  picks: Record<string, CatalogProduct[]>,
  profile: EngineProfile
): { picks: Record<string, CatalogProduct[]>; swaps: Swap[]; totals: Totals } {
  const swaps: Swap[] = [];
  const tol = irritationTolerance(profile);

  for (let guard = 0; guard < 60; guard++) {
    if (totalsOf(picks).irritation <= tol) break;

    // Catégorie dont l'échange réduit le plus l'irritation.
    let best: { cat: string; gain: number } | null = null;
    for (const [cat, opts] of Object.entries(picks)) {
      if (opts.length < 2) continue;
      const gain = dailyIrritation(opts[0]) - dailyIrritation(opts[1]);
      if (gain > 0 && (!best || gain > best.gain)) best = { cat, gain };
    }
    // Taille de routine FIXE : on ne retire jamais d'étape. Si aucun swap n'aide plus,
    // on s'arrête (le filtre de sécurité par produit a déjà écarté les trop agressifs).
    if (!best) break;

    const opts = picks[best.cat];
    swaps.push({ category: best.cat as Category, from: label(opts[0]), to: label(opts[1]), reason: "irritation" });
    picks[best.cat] = [opts[1], opts[0], ...opts.slice(2)]; // promeut le n°2
  }

  return { picks, swaps, totals: totalsOf(picks) };
}
