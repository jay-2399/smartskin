import { NextResponse } from "next/server";
import { auth } from "@/features/auth";
import { db } from "@/lib/db";
import { oublierProfil } from "@/lib/scan/profil-utilisateur";
import { writeRateLimit } from "@/lib/rate-limit";
import { peutScanner, prochainScan } from "@/lib/scan/cadence";

// Persiste un scan (bilan daté + photo) sous le compte connecté. Appelé à l'inscription
// (rattache le 1ᵉ scan gratuit) puis à chaque re-scan. La photo (data URL base64) est
// gardée directement dans la colonne `photoData` → affichée en avatar du dashboard.
export async function POST(request: Request) {
  const rl = writeRateLimit(request, "scan", 30);
  if (!rl.ok) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { result, answers, photo } = await request.json().catch(() => ({}));
  if (typeof result?.score !== "number") {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  // Un bilan tous les 7 jours (règle produit, cf. lib/scan/cadence). Le tableau de bord
  // grise le bouton, mais un écran peut être périmé : c'est ici que la règle tient.
  const dernier = await db.analysis.findFirst({
    where: { userId: session.user.id }, orderBy: { createdAt: "desc" }, select: { createdAt: true },
  });
  if (dernier && !peutScanner(dernier.createdAt)) {
    return NextResponse.json(
      { error: "trop_tot", prochainScan: prochainScan(dernier.createdAt).toISOString() },
      { status: 409 },
    );
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
  // Le profil de peau vient de changer : le mémo de profil-utilisateur doit l'oublier,
  // sinon la note perso des fiches produit resterait celle de l'ancien bilan pendant 5 min.
  oublierProfil(session.user.id);
  return NextResponse.json({ ok: true });
}
