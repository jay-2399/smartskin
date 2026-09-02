import { NextResponse } from "next/server";
import { auth } from "@/features/auth";
import { db } from "@/lib/db";
import { writeRateLimit } from "@/lib/rate-limit";

// Product ids App Store (doivent correspondre à Store.swift côté iOS).
// PLUS VENDU depuis le 01/09, mais RECONNU POUR TOUJOURS : c'est par ici que « Restore
// purchases » rend son accès à quelqu'un qui l'a acheté. Retirer cette ligne priverait
// d'accès un client payant qui réinstalle — et la restauration d'un achat passé est une
// exigence App Store, pas une option.
const LIFETIME_ID = "1234";
const WEEKLY_ID = "5678";
const ANNUAL_ID = "231999"; // « SmartSkin + (Yearly) », 39,99 $/an, essai 7 j (groupe SmartSkin Sub)

// Synchronise l'accès en base à partir de l'entitlement StoreKit RÉEL rapporté par l'app.
// Appelé (1) juste après l'achat (AppleSaveScreen) et (2) à chaque ouverture de l'app.
//   - lifetime entitled → lifetimeAccess = true (permanent)
//   - weekly entitled   → accessUntil = date d'expiration RÉELLE d'Apple (prolongée au renouvellement)
//   - rien d'entitled   → on ne touche à rien : l'`accessUntil` déjà en base gère l'expiration.
// ⚠️ v1 PRAGMATIQUE : on fait confiance à l'app (l'entitlement est déjà vérifié cryptographiquement
//    on-device par StoreKit 2). À DURCIR avant grande échelle : vérifier le JWS de la transaction
//    côté serveur (App Store Server API) pour empêcher un client modifié de s'auto-accorder l'accès.
export async function POST(request: Request) {
  const rl = writeRateLimit(request, "iap-sync", 30);
  if (!rl.ok) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } });
  }
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const { productId, expiresAt } = await request.json().catch(() => ({} as { productId?: string; expiresAt?: number }));

  if (productId === LIFETIME_ID) {
    await db.user.update({ where: { id: session.user.id }, data: { lifetimeAccess: true } });
  } else if ((productId === WEEKLY_ID || productId === ANNUAL_ID) && typeof expiresAt === "number") {
    await db.user.update({ where: { id: session.user.id }, data: { accessUntil: new Date(expiresAt) } });
  }
  // productId absent/inconnu → aucun changement (l'accessUntil déjà en base gère l'expiration).

  return NextResponse.json({ ok: true });
}
