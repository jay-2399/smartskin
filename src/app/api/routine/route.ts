import { NextResponse } from "next/server";
import { AnalysisResultSchema } from "@/features/analysis/schema";
import { buildRecommendedRoutine } from "@/features/recommendation";
import { aiRateLimit } from "@/lib/rate-limit";

// Construit la routine produit personnalisée à partir du bilan + des réponses.
// Catalogue chargé côté serveur (jamais expédié au navigateur). Pas d'auth/DB
// pour l'instant (comme /api/analyze) : le résultat vit en mémoire côté client.
export async function POST(request: Request) {
  const limit = aiRateLimit(request);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } }
    );
  }

  const { result, answers } = await request.json();
  if (!result || !answers) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const parsed = AnalysisResultSchema.safeParse(result);
  if (!parsed.success) {
    return NextResponse.json({ error: "bad_result" }, { status: 422 });
  }

  const reco = await buildRecommendedRoutine(parsed.data, answers);
  return NextResponse.json(reco);
}
