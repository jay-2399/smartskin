import { NextResponse } from "next/server";
import { auth } from "@/features/auth";
import { db } from "@/lib/db";
import { stripe } from "@/lib/stripe";

// Rattache l'accès « à vie » au compte CONNECTÉ sur PREUVE d'une session Stripe payée.
// Découple l'accès de l'email : peu importe que l'email Google ≠ l'email du paiement.
// Une session payée ne débloque qu'UN compte (contrainte unique sur paymentSessionId) →
// impossible de partager un session_id pour ouvrir l'accès à plusieurs comptes.
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { sessionId } = await request.json().catch(() => ({}));
  if (typeof sessionId !== "string" || !sessionId || !process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }
  // Vérifie que la session existe ET qu'elle est bien PAYÉE (source de vérité = Stripe).
  const cs = await stripe.checkout.sessions.retrieve(sessionId).catch(() => null);
  if (!cs || cs.payment_status !== "paid") {
    return NextResponse.json({ error: "not_paid" }, { status: 402 });
  }
  // Déjà réclamée par un AUTRE compte → refus (1 paiement = 1 compte).
  const owner = await db.user.findUnique({ where: { paymentSessionId: sessionId }, select: { id: true } });
  if (owner && owner.id !== session.user.id) {
    return NextResponse.json({ error: "already_claimed" }, { status: 409 });
  }
  await db.user.update({
    where: { id: session.user.id },
    data: { lifetimeAccess: true, paymentSessionId: sessionId },
  });
  return NextResponse.json({ ok: true });
}
