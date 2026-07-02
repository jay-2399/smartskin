import { stripe } from "@/lib/stripe";
import { CheckoutSuccess } from "@/components/screens/CheckoutSuccess";

// Retour de Stripe après paiement. On récupère la session pour confirmer le paiement
// et l'email payé (réutilisé pour connecter au bon compte — flux « paiement puis compte »).
export default async function Page({ searchParams }: { searchParams: Promise<{ session_id?: string }> }) {
  const { session_id } = await searchParams;
  let email: string | null = null;
  let paid = false;
  if (session_id && process.env.STRIPE_SECRET_KEY) {
    try {
      const session = await stripe.checkout.sessions.retrieve(session_id);
      paid = session.payment_status === "paid";
      email = session.customer_details?.email ?? null;
    } catch {
      /* session invalide / introuvable → traité comme non payé */
    }
  }
  return <CheckoutSuccess email={email} paid={paid} sessionId={paid ? (session_id ?? null) : null} />;
}
