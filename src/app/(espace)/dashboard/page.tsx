import { auth } from "@/features/auth";
import { db } from "@/lib/db";
import { buildRecommendedRoutine } from "@/features/recommendation";
import { AnalysisResultSchema } from "@/features/analysis/schema";
import { SAMPLE_RESULT } from "@/features/analysis/sample";
import { EMPTY_ANSWERS, type Answers } from "@/features/funnel/types";
import { DashboardScreen } from "@/components/screens/DashboardScreen";

// Dashboard = espace de suivi post-achat. Données RÉELLES branchées : le score du
// dernier scan + la routine/produits réels (moteur de reco). Le reste (courbe,
// évolution, restock, check-in) reste en démo tant qu'il n'y a pas d'historique.
export default async function Page() {
  const session = await auth(); // optionnel : le gate (espace) est temporairement désactivé
  const userId = session?.user?.id;

  // Dernier scan enregistré sous le compte (alimente score + routine). Sans compte
  // connecté → pas de scan → on retombe sur le bilan d'exemple (démo).
  const latest = userId
    ? await db.analysis.findFirst({ where: { userId }, orderBy: { createdAt: "desc" } })
    : null;

  let result = SAMPLE_RESULT;
  let answers: Answers = EMPTY_ANSWERS;
  let score = SAMPLE_RESULT.score;
  if (latest) {
    const parsed = AnalysisResultSchema.safeParse(latest.result);
    if (parsed.success) result = parsed.data;
    answers = (latest.answers as Answers) ?? EMPTY_ANSWERS;
    score = latest.score;
  }

  // Vraie routine (mêmes produits que /routine) construite côté serveur.
  const reco = await buildRecommendedRoutine(result, answers);
  // Prénom Google si dispo, sinon début de l'email, sinon démo.
  const name = session?.user?.name?.split(" ")[0] ?? session?.user?.email?.split("@")[0] ?? "Sarah";

  return <DashboardScreen name={name} score={score} routine={reco.routine} />;
}
