import { NextResponse } from "next/server";
import { auth } from "@/features/auth";
import { db } from "@/lib/db";
import { writeRateLimit } from "@/lib/rate-limit";

// Suppression de compte (RGPD + App Store 5.1.1(v)). Supprimer l'utilisateur efface EN
// CASCADE Account, Session, Analysis (photos du visage incluses), Protocol, RestockLog.
// Les VerificationToken sont clés par e-mail (pas userId) → purge séparée best-effort.
// ⚠️ Session JWT : le cookie survit à la suppression de la ligne → le client DOIT
// appeler signOut() juste après (voir DashboardScreen).
export async function POST(request: Request) {
  const rl = writeRateLimit(request, "account-delete", 10);
  if (!rl.ok) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } });
  }

  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    await db.user.delete({ where: { id: session.user.id } });
  } catch (e) {
    // P2025 = déjà supprimé (double-clic) → on considère OK ; sinon vraie erreur.
    if (!(e && typeof e === "object" && "code" in e && (e as { code?: string }).code === "P2025")) {
      return NextResponse.json({ error: "delete_failed" }, { status: 500 });
    }
  }
  if (session.user.email) {
    await db.verificationToken.deleteMany({ where: { identifier: session.user.email } }).catch(() => {});
  }
  return NextResponse.json({ ok: true });
}
