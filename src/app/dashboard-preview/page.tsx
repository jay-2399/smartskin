import { buildRecommendedRoutine } from "@/features/recommendation";
import { SAMPLE_RESULT } from "@/features/analysis/sample";
import { EMPTY_ANSWERS, type Answers } from "@/features/funnel/types";
import { derivePhase } from "@/features/routine/recommend";
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

  // 3 priorités d'exemple, en anglais (la preview ne dépend pas des libellés FR du data
  // layer). « was » > « now » = amélioration → pastille « Improving ».
  const priorities = [
    { name: "Blemishes", low: "none", high: "severe", now: 30, was: 53, tip: "mild", prevTip: "moderate" },
    { name: "Redness", low: "none", high: "widespread", now: 30, was: 53, tip: "localized", prevTip: "diffuse" },
    { name: "Blackheads", low: "none", high: "many", now: 30, was: 53, tip: "rare", prevTip: "frequent" },
  ];

  const reco = await buildRecommendedRoutine(result, answers, { useLlm: false });
  const phase = derivePhase(answers);
  const fmtShort = (ms: number) => new Date(ms).toLocaleDateString("en-US", { day: "numeric", month: "short" });
  const nextMs = scans[scans.length - 1].d + 7 * day;
  const nextRaw = new Date(nextMs).toLocaleDateString("en-US", { weekday: "short", day: "numeric", month: "short" });

  return (
    <DashboardScreen
      name="Sarah"
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
