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

/** INTERRUPTEUR DE TEST — accorde le premium à tout compte connecté, SANS paiement.
 *  Existe pour dérouler le parcours premium de bout en bout sans passer par l'achat.
 *  Piloté par la variable d'environnement SCAN_TEST_PREMIUM : absente, rien ne change.
 *  On l'ÉTEINT en supprimant la variable sur Render — aucun déploiement de code requis.
 *  Il exige d'être connecté : un visiteur anonyme n'a pas de profil de peau, et les
 *  routes perso lui serviraient du vide en croyant le servir. */
export const premiumDeTest = () => process.env.SCAN_TEST_PREMIUM === "1";

export async function sessionPremium(): Promise<{ uid: string | null; premium: boolean }> {
  const session = await auth().catch(() => null);
  const uid = session?.user?.id || null;
  if (!uid) return { uid, premium: false };
  return { uid, premium: premiumDeTest() ? true : await userHasAccess(uid) };
}
