import { NextResponse } from "next/server";
import { auth } from "@/features/auth";
import { db } from "@/lib/db";

// Persiste un scan (bilan daté + photo) sous le compte connecté. Appelé à l'inscription
// (rattache le 1ᵉ scan gratuit) puis à chaque re-scan. La photo (data URL base64) est
// gardée directement dans la colonne `photoData` → affichée en avatar du dashboard.
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { result, answers, photo } = await request.json().catch(() => ({}));
  if (typeof result?.score !== "number") {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  await db.analysis.create({
    data: {
      userId: session.user.id,
      score: result.score,
      skinAge: typeof result.skinAge === "number" ? result.skinAge : null,
      skinType: result.profile?.skinType ?? "?",
      photoData: typeof photo === "string" && photo.startsWith("data:") ? photo : null,
      answers: answers ?? {},
      result,
    },
  });
  return NextResponse.json({ ok: true });
}
