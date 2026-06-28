import { auth } from "@/features/auth";
import { db } from "@/lib/db";
import { buildRecommendedRoutine } from "@/features/recommendation";
import { AnalysisResultSchema } from "@/features/analysis/schema";
import { SAMPLE_RESULT } from "@/features/analysis/sample";
import { EMPTY_ANSWERS, type Answers } from "@/features/funnel/types";
import { topConcerns, levelOf } from "@/features/routine/recommend";
import { ATTRIBUTE_BY_ID, LEVEL_TO_PERCENT } from "@/features/analysis/attributes";
import { DashboardScreen } from "@/components/screens/DashboardScreen";

// Dashboard = espace de suivi. Données RÉELLES : TOUT l'historique des scans du compte
// → la courbe (un point par scan) + l'évolution des 3 priorités (dernier vs précédent)
// + la routine/restock du dernier scan. Le gate (espace) garantit un compte connecté.
export default async function Page() {
  const session = await auth();
  const userId = session?.user?.id;

  // Tous les scans du compte, du plus ANCIEN au plus RÉCENT (ordre de la courbe).
  const scans = userId
    ? await db.analysis.findMany({ where: { userId }, orderBy: { createdAt: "asc" } })
    : [];

  // Bilans parsés (on écarte un scan corrompu sans casser le reste). flatMap évite le
  // prédicat de type : un scan invalide donne [] (filtré), un valide donne [objet].
  const parsed = scans.flatMap((s) => {
    const r = AnalysisResultSchema.safeParse(s.result);
    return r.success ? [{ date: s.createdAt, score: s.score, result: r.data, answers: s.answers }] : [];
  });

  const latest = parsed.at(-1) ?? null;
  const prev = parsed.at(-2)?.result ?? null;

  // Sans aucun scan (compte tout neuf) → bilan d'exemple, le temps du 1ᵉ scan.
  const result = latest?.result ?? SAMPLE_RESULT;
  const answers = (latest?.answers as Answers) ?? EMPTY_ANSWERS;
  const score = latest?.score ?? SAMPLE_RESULT.score;

  // Courbe : un point { date ISO, score } par scan réel.
  const history = parsed.map((p) => ({ date: p.date.toISOString(), score: p.score }));

  // 3 priorités DYNAMIQUES : top-3 préoccupations du dernier scan, avec le niveau
  // courant (`now`) et celui du scan précédent (`was`, null si 1ᵉ scan) → évolution.
  const priorities = topConcerns(result).slice(0, 3).map((id) => {
    const def = ATTRIBUTE_BY_ID[id];
    const wasLevel = prev ? levelOf(prev, id) : null;
    const cur = result.attributes.find((a) => a.id === id);
    const pre = prev?.attributes.find((a) => a.id === id);
    return {
      name: def?.label ?? id,
      low: def?.low ?? "",
      high: def?.high ?? "",
      now: LEVEL_TO_PERCENT[levelOf(result, id)],
      was: wasLevel ? LEVEL_TO_PERCENT[wasLevel] : null,
      tip: cur?.tip ?? "",
      prevTip: pre?.tip ?? null,
    };
  });

  // Vraie routine (mêmes produits que /routine) construite côté serveur, sans IA
  // (le dashboard n'affiche pas les « pourquoi » → rendu ~1 s au lieu de ~40 s).
  const reco = await buildRecommendedRoutine(result, answers, { useLlm: false });
  const name = session?.user?.name?.split(" ")[0] ?? session?.user?.email?.split("@")[0] ?? "toi";

  // « Depuis quand tu utilises tes produits » = jours écoulés depuis le DERNIER scan.
  // Server Component rendu une fois par requête → lire l'heure courante est légitime.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const startedDaysAgo = latest
    ? Math.max(0, Math.floor((now - latest.date.getTime()) / 86_400_000))
    : 0;

  // Dates FR (côté serveur → pas de mismatch d'hydratation). Prochain scan = dernier
  // scan + cadence (7 j) ; « Aujourd'hui » = état du dernier scan ; 1ᵉ scan = repère gauche.
  const nextMs = (latest ? latest.date.getTime() : now) + 7 * 86_400_000;
  const fmtShort = (ms: number) => new Date(ms).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  const firstDateLabel = parsed.length >= 2 ? fmtShort(parsed[0].date.getTime()) : null;
  const nextDateLabel = fmtShort(nextMs);
  const nextDateRaw = new Date(nextMs).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
  const nextDateFull = nextDateRaw.charAt(0).toUpperCase() + nextDateRaw.slice(1);

  return (
    <DashboardScreen
      name={name}
      score={score}
      routine={reco.routine}
      restock={reco.restock}
      startedDaysAgo={startedDaysAgo}
      loggedIn={!!userId}
      history={history}
      priorities={priorities}
      lastAnswers={answers}
      firstDateLabel={firstDateLabel}
      nextDateLabel={nextDateLabel}
      nextDateFull={nextDateFull}
    />
  );
}
