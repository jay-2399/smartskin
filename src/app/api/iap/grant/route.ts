import { NextResponse } from "next/server";
import { auth } from "@/features/auth";
import { db } from "@/lib/db";
import { writeRateLimit } from "@/lib/rate-limit";

// Débloque l'accès À VIE après un achat In-App Apple réussi. Appelé par le web (dans la
// WebView native, la session est présente) quand le natif signale un achat StoreKit vérifié.
// ⚠️ v1 : on fait confiance au signal natif (StoreKit 2 vérifie déjà la transaction
// on-device). PROD : vérifier le reçu/JWS côté serveur (App Store Server API) AVANT de poser.
export async function POST(request: Request) {
  const rl = writeRateLimit(request, "iap-grant", 20);
  if (!rl.ok) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } });
  }
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  // Baseline immédiat selon le plan acheté. Pour weekly, la date d'expiration RÉELLE d'Apple
  // est corrigée juste après par la synchro StoreKit (/api/iap/sync).
  const { plan } = await request.json().catch(() => ({ plan: "lifetime" }));
  if (plan === "weekly") {
    await db.user.update({ where: { id: session.user.id }, data: { accessUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) } });
  } else if (plan === "annual") {
    await db.user.update({ where: { id: session.user.id }, data: { accessUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) } });
  } else {
    await db.user.update({ where: { id: session.user.id }, data: { lifetimeAccess: true } });
  }
  return NextResponse.json({ ok: true });
}
