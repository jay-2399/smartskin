import { auth } from "@/features/auth";
import { userHasAccess } from "@/features/checkout/access";

// Qui appelle, et a-t-il payé ? Les routes produit décident du gating avec CES deux réponses,
// et rien d'autre. L'accès est relu FRAIS en base (userHasAccess) — jamais le token en cache :
// un abonnement expiré tombe à la requête suivante, sans reconnexion.

/** Profil « personne » : ce que voient les gratuits — le score formule reste juste,
 *  mais AUCUNE personnalisation (pas de flags perso, pas d'actifs « utiles pour toi »). */
export const PROFIL_NEUTRE = {
  skinType: "", sensitivity: 0, concerns: {}, avoid: [], pregnancy: false, allergies: [],
};

export async function sessionPremium(): Promise<{ uid: string | null; premium: boolean }> {
  const session = await auth().catch(() => null);
  const uid = session?.user?.id || null;
  return { uid, premium: uid ? await userHasAccess(uid) : false };
}
