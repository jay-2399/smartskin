import type { AnalysisResult } from "@/features/analysis/schema";
import type { Answers } from "@/features/funnel/types";
import type { RoutineData, RestockItem } from "@/features/routine/products";
import { loadCatalog, catalogByCategory, type CatalogProduct, type Category } from "./catalog";
import { buildEngineProfile, type EngineProfile } from "./profile";
import { buildConstraints, type Constraints } from "./medical-guard";
import { hardFilter, shortlist, planCategories, splitCreams, reconcile, type Swap, type Totals } from "./engine";
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
  // Le SOCLE + l'ENTRETIEN (nettoyant, sérum, crèmes, SPF, démaquillant, EXFOLIANT,
  // MASQUE) sont là pour TOUT LE MONDE — ce sont de bons gestes quelle que soit la peau.
  // SEUL le soin CIBLÉ (traitement anti-acné / soin_cible anti-taches…) est conditionnel :
  // on ne l'ajoute que si un concern appelle un VRAI traitement (pas pores/grain, gérés par
  // l'exfoliant) ET que le produit retenu vise réellement un concern (sinon on l'omet →
  // fini le patch anti-acné collé sur une peau sèche ou un gel acné sur une peau nette).
  // Seuls ces concerns appellent un VRAI soin ciblé. Pores/grain/brillance = gérés par
  // l'exfoliant (déjà là) ; sécheresse = gérée par l'hydratation du socle (sérum + crèmes).
  const TREAT_CAT: Record<string, "traitement" | "soin_cible"> = {
    acne: "traitement", comedones: "traitement", fine_lines: "traitement", wrinkles: "traitement",
    post_acne_marks: "soin_cible", dark_spots: "soin_cible", tone_evenness: "soin_cible", redness: "soin_cible",
  };
  const treatConcern = profile.concerns.find((c) => c in TREAT_CAT);
  let soinKey: string | null = treatConcern && has(TREAT_CAT[treatConcern]) ? TREAT_CAT[treatConcern] : null;
  if (soinKey) {
    // Garde-fou pertinence : on PROMEUT le 1er produit de la shortlist qui vise vraiment un
    // concern ; si AUCUN ne matche, on n'ajoute pas de soin ciblé (mieux que coller un
    // produit hors-sujet, ex. patch anti-acné sur une autre peau).
    const opts = reconciled[soinKey] ?? [];
    const idx = opts.findIndex((p) => p.targets.some((t) => profile.concerns.includes(t)));
    if (idx === -1) soinKey = null;
    else if (idx > 0) reconciled[soinKey] = [opts[idx], ...opts.slice(0, idx), ...opts.slice(idx + 1)];
  }

  const dayKeys = ["nettoyant", "serum", "hydratant_jour", "spf"].filter(has);
  const nightKeys = ["démaquillant", soinKey, "exfoliant", "hydratant_nuit", "masque"]
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
