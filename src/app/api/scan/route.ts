import { NextResponse } from "next/server";
import { auth } from "@/features/auth";
import { db } from "@/lib/db";

// Persiste un scan (bilan daté) sous le compte connecté. Appelé à l'inscription
// (rattache le 1ᵉ scan gratuit) puis à chaque re-scan. PAS de photo (jamais stockée).
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { result, answers } = await request.json().catch(() => ({}));
  if (typeof result?.score !== "number") {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  await db.analysis.create({
    data: {
      userId: session.user.id,
      score: result.score,
      skinAge: typeof result.skinAge === "number" ? result.skinAge : null,
      skinType: result.profile?.skinType ?? "?",
      answers: answers ?? {},
      result,
    },
  });
  return NextResponse.json({ ok: true });
}
