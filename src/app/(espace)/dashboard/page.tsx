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

  // Vraie routine (mêmes produits que /routine) construite côté serveur. Le dashboard
  // n'affiche PAS les textes « pourquoi » → on saute l'IA (rendu ~1 s au lieu de ~40 s).
  const reco = await buildRecommendedRoutine(result, answers, { useLlm: false });
  // Prénom Google si dispo, sinon début de l'email, sinon démo.
  const name = session?.user?.name?.split(" ")[0] ?? session?.user?.email?.split("@")[0] ?? "Sarah";

  // Restock RÉEL : produits réellement recommandés + jours écoulés depuis le scan
  // (proxy de « depuis quand tu utilises tes produits »). Sans scan (démo) → valeur
  // d'exemple pour illustrer la section.
  // Server Component rendu une fois par requête → lire l'heure courante est légitime.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();
  const startedDaysAgo = latest
    ? Math.max(1, Math.floor((now - new Date(latest.createdAt).getTime()) / 86_400_000))
    : 36; // démo (pas de scan) : ~5 semaines écoulées, pour illustrer la section restock

  return (
    <DashboardScreen
      name={name}
      score={score}
      routine={reco.routine}
      restock={reco.restock}
      startedDaysAgo={startedDaysAgo}
    />
  );
}
