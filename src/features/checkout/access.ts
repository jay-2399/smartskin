import { db } from "@/lib/db";

/* Source de vérité « a-t-il un accès actif ? » :
   - `lifetimeAccess` = achat à vie (lifetime) → permanent.
   - `accessUntil`    = abonnement (weekly) → valable tant que la date est dans le futur.
   L'expiration est donc gérée par une simple comparaison de date, sans webhook :
   quand la date passe, l'accès tombe tout seul (la synchro StoreKit prolonge la date au
   renouvellement — cf. /api/iap/sync). */

export function computeHasAccess(u: { lifetimeAccess: boolean; accessUntil: Date | null }): boolean {
  return u.lifetimeAccess || (u.accessUntil != null && u.accessUntil.getTime() > Date.now());
}

/** Lit l'accès FRAIS en base (pas le token de session en cache) pour un utilisateur. */
export async function userHasAccess(userId: string): Promise<boolean> {
  const u = await db.user.findUnique({
    where: { id: userId },
    select: { lifetimeAccess: true, accessUntil: true },
  });
  return u ? computeHasAccess(u) : false;
}
