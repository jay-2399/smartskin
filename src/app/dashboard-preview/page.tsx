import { buildRecommendedRoutine } from "@/features/recommendation";
import { SAMPLE_RESULT } from "@/features/analysis/sample";
import { EMPTY_ANSWERS, type Answers } from "@/features/funnel/types";
import { topConcerns, levelOf, derivePhase } from "@/features/routine/recommend";
import { ATTRIBUTE_BY_ID, LEVEL_TO_PERCENT } from "@/features/analysis/attributes";
import { DashboardScreen } from "@/components/screens/DashboardScreen";

// Preview LOCALE du dashboard (hors mur d'auth, sans DB) — pour le consulter sans
// passer par tout le tunnel. Données d'exemple : 4 scans factices (courbe) + une
// évolution simulée des 3 priorités. Route jetable, à supprimer ensuite.
export default async function Page() {
  const result = SAMPLE_RESULT;
  const answers = EMPTY_ANSWERS as Answers;
  const day = 86_400_000;
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const scans = [
    { d: now - 21 * day, score: 58 },
    { d: now - 14 * day, score: 66 },
    { d: now - 7 * day, score: 73 },
    { d: now - 1 * day, score: 78 },
  ];
  const history = scans.map((s) => ({ date: new Date(s.d).toISOString(), score: s.score }));

  // 3 priorités dynamiques (top-3 du bilan), avec un « avant » simulé à 1 niveau au-dessus
  // (= amélioration) pour montrer l'évolution.
  const priorities = topConcerns(result).slice(0, 3).map((id) => {
    const def = ATTRIBUTE_BY_ID[id];
    const cur = result.attributes.find((a) => a.id === id);
    const lvl = levelOf(result, id);
    return {
      name: def?.label ?? id,
      low: def?.low ?? "",
      high: def?.high ?? "",
      now: LEVEL_TO_PERCENT[lvl],
      was: LEVEL_TO_PERCENT[Math.min(4, lvl + 1)],
      tip: cur?.tip ?? "",
      prevTip: null,
    };
  });

  const reco = await buildRecommendedRoutine(result, answers, { useLlm: false });
  const phase = derivePhase(answers);
  const fmtShort = (ms: number) => new Date(ms).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  const nextMs = scans[scans.length - 1].d + 7 * day;
  const nextRaw = new Date(nextMs).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });

  return (
    <DashboardScreen
      name="toi"
      score={scans[scans.length - 1].score}
      routine={reco.routine}
      startedDaysAgo={1}
      loggedIn={true}
      history={history}
      priorities={priorities}
      lastAnswers={answers}
      firstDateLabel={fmtShort(scans[0].d)}
      nextDateLabel={fmtShort(nextMs)}
      nextDateFull={nextRaw.charAt(0).toUpperCase() + nextRaw.slice(1)}
      phase={phase}
    />
  );
}
