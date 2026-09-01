import { NextResponse } from "next/server";
import { auth } from "@/features/auth";
import { userHasAccess } from "@/features/checkout/access";
import { premiumDeTest } from "@/lib/scan/acces";

// « Qui suis-je pour l'app ? » — l'unique source de vérité du front (SS.moi()).
// `premium` est relu FRAIS en base à chaque appel : un abonnement expiré tombe ici,
// sans reconnexion. Jamais de cache serveur (le front a le sien, TTL 60 s).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth().catch(() => null);
  const uid = session?.user?.id || null;
  return NextResponse.json(
    {
      connecte: !!uid,
      // Le même interrupteur de test que sessionPremium : les deux DOIVENT répondre
      // pareil, sinon l'écran laisse passer et le serveur sert quand même du gratuit.
      premium: uid ? (premiumDeTest() ? true : await userHasAccess(uid)) : false,
      prenom: (uid && session?.user?.name?.split(" ")[0]) || null,
      email: (uid && session?.user?.email) || null,
      // Config PUBLIQUE d'analytics, greffée ici plutôt que dans une route à part :
      // le proto V2 est du HTML statique, il ne peut pas lire process.env, et cette
      // route est déjà appelée par presque tous ses écrans. Clé publique par nature
      // (NEXT_PUBLIC_), donc rien de sensible ne sort. Absente en local → no-op.
      posthog: process.env.NEXT_PUBLIC_POSTHOG_KEY
        ? { key: process.env.NEXT_PUBLIC_POSTHOG_KEY,
            host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://eu.i.posthog.com" }
        : null,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
