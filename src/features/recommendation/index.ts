import type { AnalysisResult } from "@/features/analysis/schema";
import type { Answers } from "@/features/funnel/types";
import type { RoutineData, RestockItem } from "@/features/routine/products";
import { loadCatalog, catalogByCategory, type CatalogProduct, type Category } from "./catalog";
import { buildEngineProfile, type EngineProfile } from "./profile";
import { buildConstraints, type Constraints } from "./medical-guard";
import { hardFilter, shortlist, planCategories, nightActiveCategories, splitCreams, reconcile, type Swap, type Totals } from "./engine";
import { openaiConfigured, pickAndExplain } from "./llm-choice";
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
  if (options.useLlm !== false && openaiConfigured()) {
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
  const [soinPref, bonusPref] = nightActiveCategories(profile);
  const FALLBACK = ["traitement", "exfoliant", "soin_cible"];
  const pickActive = (prefer: string, exclude: string | null): string | null => {
    for (const c of [prefer, ...FALLBACK]) if (c !== exclude && has(c)) return c;
    return null;
  };
  const soinKey = pickActive(soinPref, null);
  const bonusKey = pickActive(bonusPref, soinKey);

  const dayKeys = ["nettoyant", "serum", "hydratant_jour", "spf"].filter(has);
  const nightKeys = ["démaquillant", soinKey, bonusKey, "hydratant_nuit", "masque"]
    .filter((k): k is string => !!k && has(k));
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
