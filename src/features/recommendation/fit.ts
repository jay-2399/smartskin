import { IMPORTANCE } from "@/features/routine/recommend";
import type { CatalogProduct } from "./catalog";
import type { EngineProfile } from "./profile";

/* ADÉQUATION (« fit ») — le NOUVEAU cœur du classement.
   Principe (validé produit) : on choisit d'abord le produit le plus ADAPTÉ à la peau,
   INDÉPENDAMMENT de sa popularité. Les avis ne servent qu'à DÉPARTAGER des produits
   d'adéquation équivalente (top-3). Le filtre de sécurité reste en amont (engine.ts).

   fitScore n'utilise AUCUN signal de popularité (ni rating, ni nombre d'avis, ni BSR).
   Il combine, dans l'ordre d'importance :
     1. COUVERTURE des besoins, pondérée par gravité × importance (terme dominant) ;
     2. INTENSITÉ bien dosée : la force du produit doit coller à la sévérité du besoin,
        plafonnée par la tolérance de la peau (un actif trop fort est lourdement pénalisé) ;
     3. adéquation au TYPE DE PEAU (byProfile) ;
     4. PREUVE scientifique (evidenceLevel) — qualité, pas popularité. */

const BP_FIT: Record<string, number> = { positive: 1, unknown: 0, caution: -1, negative: -3 };

export function fitScore(p: CatalogProduct, profile: EngineProfile): number {
  // 1) COUVERTURE — somme (importance × niveau) des besoins que le produit traite.
  let coverage = 0;
  let topNeed = 0; // sévérité du besoin le PLUS sévère couvert par ce produit
  for (const id of p.targets) {
    const level = profile.needs[id];
    if (level) {
      coverage += (IMPORTANCE[id] ?? 1) * level;
      if (level > topNeed) topNeed = level;
    }
  }

  // 2) INTENSITÉ — force visée = sévérité du besoin couvert, plafonnée par la tolérance ;
  //    sans besoin couvert (produit d'entretien) → force visée 1 (doux).
  const strength = p.activeStrength ?? 1;
  const desired = topNeed > 0 ? Math.min(topNeed, profile.strengthCeiling) : 1;
  const mismatch = -Math.abs(strength - desired);
  // Garde-fou douceur : tout dépassement du plafond de tolérance est lourdement pénalisé.
  const overCeiling = strength > profile.strengthCeiling ? -(strength - profile.strengthCeiling) * 3 : 0;

  // 3) TYPE DE PEAU — fort : le produit est-il fait POUR ce type de peau (champ skinTypes) ?
  //    Quand skinTypes est resserré (ex. crèmes : 1 seul type), ça départage vraiment —
  //    un gel pour peau grasse ne remonte plus sur une peau sèche. Bonus appuyé (3) pour
  //    passer DEVANT la popularité ; complété par byProfile (nuance positive/caution).
  const typeMatch = (p.skinTypes ?? []).includes(profile.skinType) ? 1 : 0;
  const skinFit = BP_FIT[p.couche3?.byProfile?.[profile.skinType] ?? "unknown"] ?? 0;
  // 4) PREUVE (qualité, pas popularité).
  const evidence = (p.evidenceLevel ?? 1) / 5; // 0.2 → 1

  return 5 * coverage + 1.5 * mismatch + overCeiling + 3 * typeMatch + skinFit + evidence;
}

/** Popularité (avis × volume), NORMALISÉE 0-1. Sert UNIQUEMENT de départage. */
function popularity(p: CatalogProduct): number {
  return (p.rating / 5) * Math.min(Math.log10(Math.max(p.reviews, 1)) / 4, 1);
}

/** Sélection top-N : l'ADÉQUATION décide (paliers de fit) ; la POPULARITÉ ne départage
 *  que des produits à fit équivalent. Diversité de marque, comme avant.
 *  options[0] = le plus adapté = recommandé par défaut. */
export function selectByFit(products: CatalogProduct[], profile: EngineProfile, n = 3): CatalogProduct[] {
  const scored = products
    .map((p) => ({ p, fit: Math.round(fitScore(p, profile) * 2) / 2 })) // palier 0.5 → fits proches = égalité
    .sort((a, b) => (b.fit !== a.fit ? b.fit - a.fit : popularity(b.p) - popularity(a.p)));

  const out: CatalogProduct[] = [];
  const brands = new Set<string>();
  for (const { p } of scored) {
    if (out.length >= n) break;
    if (brands.has(p.brand)) continue; // diversité de marque d'abord
    out.push(p);
    brands.add(p.brand);
  }
  for (const { p } of scored) {
    if (out.length >= n) break;
    if (!out.includes(p)) out.push(p);
  }
  return out;
}
