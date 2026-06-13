import { NextResponse } from "next/server";
import { analyzeWithGemini } from "@/features/analysis/gemini";

// Analyse la photo + les réponses et renvoie le bilan.
// Pas d'auth ni de sauvegarde pour l'instant (mode test sans compte) :
// le compte + l'historique viendront avec le Plan 4. La photo n'est jamais stockée.
export async function POST(request: Request) {
  const { answers, image } = await request.json();
  if (!answers || !image) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const jpeg = Buffer.from(image, "base64");
  const result = await analyzeWithGemini(jpeg, answers);

  if (!result.photoQuality.ok) {
    return NextResponse.json(
      { error: "photo_quality", issue: result.photoQuality.issue },
      { status: 422 }
    );
  }

  return NextResponse.json(result);
  // jpeg sort de portée ici → jamais stocké
}
