import { NextResponse } from "next/server";
import { auth } from "@/features/auth";
import { db } from "@/lib/db";
import { uploadScanPhoto } from "@/lib/storage";

// Persiste un scan (bilan daté + photo) sous le compte connecté. Appelé à l'inscription
// (rattache le 1ᵉ scan gratuit) puis à chaque re-scan. La photo (data URL) est uploadée
// dans Supabase Storage (bucket privé) ; seul son chemin est gardé en base.
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { result, answers, photo } = await request.json().catch(() => ({}));
  if (typeof result?.score !== "number") {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  const scan = await db.analysis.create({
    data: {
      userId: session.user.id,
      score: result.score,
      skinAge: typeof result.skinAge === "number" ? result.skinAge : null,
      skinType: result.profile?.skinType ?? "?",
      answers: answers ?? {},
      result,
    },
  });
  // Photo en best-effort : un upload raté ne casse pas la sauvegarde du bilan.
  if (typeof photo === "string" && photo.startsWith("data:")) {
    const photoPath = await uploadScanPhoto(session.user.id, scan.id, photo).catch(() => null);
    if (photoPath) await db.analysis.update({ where: { id: scan.id }, data: { photoPath } });
  }
  return NextResponse.json({ ok: true });
}
