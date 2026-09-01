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
  // Baseline immédiat selon le plan acheté. Pour weekly et annual, la date d'expiration
  // RÉELLE d'Apple est corrigée juste après par la synchro StoreKit (/api/iap/sync).
  //
  // LE PLAN DOIT ÊTRE EXPLICITE. Avant : `.catch(() => ({ plan: "lifetime" }))` puis un
  // `else` attrape-tout — donc un corps vide, ou un plan inconnu, accordait l'accès À VIE
  // et de façon irréversible. Les deux appels qui n'envoyaient rien étaient les
  // restaurations ; elles passent désormais par l'entitlement StoreKit réel, qui SAIT
  // quel produit a été acheté au lieu de le deviner.
  const { plan } = await request.json().catch(() => ({} as { plan?: unknown }));
  const jours = plan === "weekly" ? 7 : plan === "annual" ? 365 : 0;

  if (plan === "lifetime") {
    await db.user.update({ where: { id: session.user.id }, data: { lifetimeAccess: true } });
  } else if (jours) {
    await db.user.update({ where: { id: session.user.id }, data: { accessUntil: new Date(Date.now() + jours * 24 * 60 * 60 * 1000) } });
  } else {
    return NextResponse.json({ error: "plan_manquant" }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
