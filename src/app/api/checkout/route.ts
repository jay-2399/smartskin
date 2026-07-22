import { NextResponse } from "next/server";
import { stripe, PRICE_CENTS, WEEKLY_PRICE_CENTS } from "@/lib/stripe";

const FEATURES =
  "✓ Your morning & evening routine\n" +
  "✓ Exact doses & order, like a prescription\n" +
  "✓ Your full skin report\n" +
  "✓ Progress tracking & re-scans";

// Crée une session Stripe Checkout et renvoie l'URL de la page de paiement hébergée
// par Stripe. Deux plans (cf. CheckoutScreen) : « lifetime » (paiement unique, défaut)
// ou « weekly » (abonnement hebdomadaire). Le prix est défini ici (inline), pas besoin
// de produit pré-créé dans le dashboard. Le webhook (checkout.session.completed,
// payment_status=paid) accorde l'accès dans les deux modes.
export async function POST(request: Request) {
  if (!process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "stripe_not_configured" }, { status: 503 });
  }
  // Body optionnel ({ plan }) — les appels historiques sans body restent « lifetime ».
  const { plan } = await request.json().catch(() => ({ plan: "lifetime" }));
  const weekly = plan === "weekly";
  // Derrière le proxy Render, request.url = host interne (localhost:10000) → on
  // préfère l'URL publique canonique (AUTH_URL) pour les redirections Stripe.
  const origin = process.env.AUTH_URL ?? new URL(request.url).origin;
  try {
    const session = await stripe.checkout.sessions.create({
      mode: weekly ? "subscription" : "payment",
      line_items: [
        {
          quantity: 1,
          price_data: weekly
            ? {
                currency: "usd",
                unit_amount: WEEKLY_PRICE_CENTS,
                recurring: { interval: "week" },
                product_data: { name: "SmartSkin — Weekly access", description: FEATURES },
              }
            : {
                currency: "usd",
                unit_amount: PRICE_CENTS,
                product_data: { name: "SmartSkin — Lifetime access", description: FEATURES },
              },
        },
      ],
      // L'email est collecté par Stripe → réutilisé ensuite pour lier le compte.
      success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/checkout`,
    });
    return NextResponse.json({ url: session.url });
  } catch {
    return NextResponse.json({ error: "checkout_failed" }, { status: 500 });
  }
}
