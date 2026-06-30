import type { AnalysisResult } from "@/features/analysis/schema";
import type { Answers } from "@/features/funnel/types";
import type { RoutineData, RestockItem } from "@/features/routine/products";
import { loadCatalog, catalogByCategory, type CatalogProduct, type Category } from "./catalog";
import { buildEngineProfile, type EngineProfile } from "./profile";
import { buildConstraints, type Constraints } from "./medical-guard";
import { hardFilter, shortlist, planCategories, splitCreams, reconcile, type Swap, type Totals } from "./engine";
import { llmConfigured, pickAndExplain } from "./llm-choice";
import { toRoutineData, CAT_ICON } from "./to-routine-data";

/* Orchestrateur du moteur de reco (contrat §7bis). Enchaîne :
   profil → garde médicale → filtre/score/shortlist par catégorie → choix+pourquoi
   LLM (repli déterministe) → réconciliation budget → placement → adaptateur UI.
   Fonctionne ENTIÈREMENT sans clé OpenAI (socle déterministe). */

export interface RecommendationResult {
  routine: RoutineData;
  totaux: Totals;
  swaps: Swap[];
  avertissements: string[];
  restock: RestockItem[]; // produits choisis (consommables) → restock réel côté dashboard
}

// Actifs sûrs grossesse qu'on peut « emprunter » pour remplir le créneau traitement
// (structurellement maigre pour une enceinte). Règle moteur, pas un manque de data (§5.1).
const PREGNANCY_SAFE_ACTIVES = ["azelaic", "azélaïque", "azelaique", "niacinamide", "benzoyl", "peroxyde", "peroxide"];

function withPregnancyTopUp(
  pool: CatalogProduct[],
  byCat: Record<Category, CatalogProduct[]>,
  profile: EngineProfile,
  usedNums: Set<number>
): CatalogProduct[] {
  if (!profile.pregnant && !profile.breastfeeding) return pool;
  const seen = new Set(pool.map((p) => p.num));
  const borrowed = [...(byCat.serum ?? []), ...(byCat.soin_cible ?? []), ...(byCat.exfoliant ?? [])]
    .filter((p) => !p.unsafePregnancy && !usedNums.has(p.num) && !seen.has(p.num))
    .filter((p) => PREGNANCY_SAFE_ACTIVES.some((a) => (p.keyActives || "").toLowerCase().includes(a)));
  return [...pool, ...borrowed];
}

export async function buildRecommendedRoutine(result: AnalysisResult, answers: Answers, options: { useLlm?: boolean } = {}): Promise<RecommendationResult> {
  const profile = buildEngineProfile(result, answers);
  const constraints: Constraints = buildConstraints(profile);
  const byCat = catalogByCategory(loadCatalog());

  const cats = planCategories();
  const perProductCap = profile.budget === "no_limit" ? Infinity : profile.budget;

  // ── Étapes 2-4 : par catégorie, filtre dur → score → shortlist top-3. ──
  //    L'hydratant est traité à part juste après (2 crèmes distinctes jour/nuit).
  const picks: Record<string, CatalogProduct[]> = {};
  const usedNums = new Set<number>();
  for (const cat of cats) {
    if (cat === "hydratant") continue;
    let pool = byCat[cat] ?? [];
    if (cat === "traitement") pool = withPregnancyTopUp(pool, byCat, profile, usedNums);
    const survivors = hardFilter(pool, profile, constraints, perProductCap);
    const sl = shortlist(survivors, profile, 3);
    if (sl.length) {
      picks[cat] = sl;
      usedNums.add(sl[0].num);
    }
  }

  // ── Crème : 2 produits DISTINCTS, shortlistés SÉPARÉMENT depuis TOUT le vivier
  //    hydratant (et non une shortlist commune de 3) → 3 options garanties de chaque
  //    côté. Partition jour/nuit par `moment`/`night` (donnée catalogue). ──
  {
    const survivors = hardFilter(byCat.hydratant ?? [], profile, constraints, perProductCap);
    const { day, night } = splitCreams(survivors);
    const jour = shortlist(day, profile, 3);
    const dayNum = jour[0]?.num;
    const nuit = shortlist(night.filter((p) => p.num !== dayNum), profile, 3); // nuit ≠ jour
    if (jour.length) { picks.hydratant_jour = jour; usedNums.add(jour[0].num); }
    if (nuit.length) { picks.hydratant_nuit = nuit; usedNums.add(nuit[0].num); }
  }

  // ── Étape 5 : choix + « pourquoi » LLM (sur shortlists), sinon repli déterministe. ──
  //    `useLlm:false` (dashboard) → on saute l'IA : rendu instantané (le dashboard
  //    n'affiche pas les textes « pourquoi », inutile d'attendre ~40 s). ──
  const llmWhy = new Map<number, string>();
  if (options.useLlm !== false && llmConfigured()) {
    try {
      const choices = await pickAndExplain(picks, profile);
      for (const [cat, choice] of choices) {
        const opts = picks[cat];
        if (!opts) continue;
        const idx = opts.findIndex((p) => p.num === choice.num);
        if (idx > 0) picks[cat] = [opts[idx], ...opts.slice(0, idx), ...opts.slice(idx + 1)]; // promeut le choix en [0]
        llmWhy.set(choice.num, choice.pourquoi);
      }
    } catch (e) {
      // L'IA est un bonus : en cas d'échec, on garde le top-score déterministe.
      // On LOGGE quand même (un échec silencieux avait masqué un bug temperature gpt-5.x).
      console.error("[routine LLM] pickAndExplain a échoué, repli déterministe :", e);
    }
  }

  // ── Étape 6 : réconciliation budget + irritation (swaps). ──
  const { picks: reconciled, swaps, totals } = reconcile(picks, profile);

  // ── Étape 7 : structure FIXE — Matin: nettoyant·sérum·crème jour·spf /
  //    Soir: démaquillant·soin traitant·bonus·crème nuit·masque. Les 2 slots actifs
  //    du soir suivent le profil, avec repli si la catégorie visée est vide. ──
  const has = (k: string) => (reconciled[k]?.length ?? 0) > 0;
  // Le SOCLE + l'ENTRETIEN (nettoyant, sérum, crèmes, SPF, démaquillant, EXFOLIANT,
  // MASQUE) sont là pour TOUT LE MONDE — ce sont de bons gestes quelle que soit la peau.
  // SEUL le soin CIBLÉ (traitement anti-acné / soin_cible anti-taches…) est conditionnel :
  // on ne l'ajoute que si un concern appelle un VRAI traitement (pas pores/grain, gérés par
  // l'exfoliant) ET que le produit retenu vise réellement un concern (sinon on l'omet →
  // fini le patch anti-acné collé sur une peau sèche ou un gel acné sur une peau nette).
  // Concerns qui appellent un VRAI soin ciblé. Pores/grain/brillance = gérés par l'exfoliant
  // (déjà là) ; sécheresse = par l'hydratation du socle. Tous pointent vers « traitement » :
  // c'est là que vivent les correcteurs (rétinoïdes pour acné/âge, azélaïque/Murad/Mela B3
  // pour taches/rougeurs). « soin_cible » (= patchs anti-acné) n'est plus utilisé en routine.
  const TREATABLE = new Set([
    "acne", "comedones", "fine_lines", "wrinkles",
    "post_acne_marks", "dark_spots", "tone_evenness", "redness",
  ]);
  const treatConcern = profile.concerns.find((c) => TREATABLE.has(c));
  let soinKey: string | null = treatConcern && has("traitement") ? "traitement" : null;
  if (soinKey) {
    // Garde-fou pertinence : on PROMEUT le 1er produit de la shortlist qui vise vraiment un
    // concern ; si AUCUN ne matche, on n'ajoute pas de soin ciblé (mieux que coller un
    // produit hors-sujet, ex. un rétinoïde générique sur une peau qui veut juste les taches).
    const opts = reconciled.traitement ?? [];
    const idx = opts.findIndex((p) => p.targets.some((t) => profile.concerns.includes(t)));
    if (idx === -1) soinKey = null;
    else if (idx > 0) reconciled.traitement = [opts[idx], ...opts.slice(0, idx), ...opts.slice(idx + 1)];
  }

  const dayKeys = ["nettoyant", "serum", "hydratant_jour", "spf"].filter(has);
  const nightKeys = ["démaquillant", soinKey, "exfoliant", "hydratant_nuit", "masque"]
    .filter((k): k is string => !!k && has(k));

  // ── Plafond d'ACTIFS FORTS (irritation ≥ 2) : max 2 par routine. Un derm n'empile
  //    pas 3-4 acides (azélaïque + salicylique + AHA/BHA + peel) sur une même peau —
  //    surtout marquée → sur-exfoliation = irritation. On adoucit les surplus en
  //    promouvant l'option la plus douce de leur shortlist. Ordre de protection :
  //    traitement > exfoliant > sérum > masque (donc on adoucit le masque en 1er). ──
  const STRONG_CAP = 2;
  const irrOf = (k: string) => reconciled[k]?.[0]?.irritationCost ?? 0;
  const SOFTEN_CAT: Record<string, Category> = { masque: "masque", serum: "serum", exfoliant: "exfoliant" };
  if (soinKey) SOFTEN_CAT[soinKey] = "traitement";
  let strongCount = [...dayKeys, ...nightKeys].filter((k) => irrOf(k) >= 2).length;
  for (const k of ["masque", "serum", "exfoliant", soinKey ?? ""]) {
    if (strongCount <= STRONG_CAP) break;
    if (!k || irrOf(k) < 2) continue;
    const opts = reconciled[k] ?? [];
    // 1) une option douce dans la shortlist ? sinon 2) le meilleur produit DOUX de TOUTE
    //    la catégorie (les masques/exfoliants doux n'entrent pas dans le top-3 « concern »).
    const inSl = opts.findIndex((p) => (p.irritationCost ?? 0) < 2);
    if (inSl > 0) {
      reconciled[k] = [opts[inSl], ...opts.slice(0, inSl), ...opts.slice(inSl + 1)];
      strongCount--;
    } else if (inSl === -1) {
      const cat = SOFTEN_CAT[k];
      const gentlePool = hardFilter(byCat[cat] ?? [], profile, constraints, perProductCap)
        .filter((p) => (p.irritationCost ?? 0) < 2 && !usedNums.has(p.num));
      const best = shortlist(gentlePool, profile, 1)[0];
      if (best) {
        reconciled[k] = [best, ...opts].slice(0, 3); // garde ≤3 options/étape
        usedNums.add(best.num);
        strongCount--;
      }
    }
  }

  const routine = toRoutineData({ dayKeys, nightKeys, picks: reconciled, profile, llmWhy });

  // Restock : pour chaque étape, le produit choisi (option[0]) avec sa contenance et
  // sa fréquence → le dashboard estime « fini dans ~X jours » à partir de la date du
  // scan. On écarte les produits sans contenance connue (size_ml absent).
  const restock: RestockItem[] = [...dayKeys, ...nightKeys]
    .map((k): RestockItem | null => {
      const p = reconciled[k]?.[0];
      if (!p || !p.size_ml) return null;
      return { name: p.name, asin: p.asin, icon: CAT_ICON[p.category] ?? "bottle", category: p.category, frequency: p.frequency, moment: p.moment, size_ml: p.size_ml };
    })
    .filter((x): x is RestockItem => x !== null);

  const avertissements = constraints.adviseDoctor ? [constraints.adviseDoctor] : [];
  return { routine, totaux: totals, swaps, avertissements, restock };
}
