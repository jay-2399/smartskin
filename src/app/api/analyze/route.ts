import { NextResponse } from "next/server";
import { analyzePhoto } from "@/features/analysis/analyze";

// Analyse la photo + les réponses et renvoie le bilan.
// Pas d'auth ni de sauvegarde pour l'instant (mode test sans compte) :
// le compte + l'historique viendront avec le Plan 4. Cette route n'écrit rien : la photo
// n'est stockée qu'à la sauvegarde du scan (/api/scan → Supabase Storage).
export async function POST(request: Request) {
  const { answers, image } = await request.json();
  if (!answers || !image) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const jpeg = Buffer.from(image, "base64");
  const result = await analyzePhoto(jpeg, answers);

  if (!result.photoQuality.ok) {
    return NextResponse.json(
      { error: "photo_quality", issue: result.photoQuality.issue },
      { status: 422 }
    );
  }

  return NextResponse.json(result);
  // jpeg sort de portée ici → jamais stocké
}
