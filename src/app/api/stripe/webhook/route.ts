import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { db } from "@/lib/db";

// Webhook Stripe : seule SOURCE DE VÉRITÉ du paiement. À `checkout.session.completed`,
// on accorde l'accès « à vie » au compte de l'email payé (créé s'il n'existe pas encore).
// La signature est vérifiée → personne ne peut forger un « paiement réussi ».
export async function POST(request: Request) {
  const sig = request.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !secret) {
    return NextResponse.json({ error: "webhook_not_configured" }, { status: 400 });
  }

  const body = await request.text(); // corps BRUT requis pour vérifier la signature
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret);
  } catch {
    return NextResponse.json({ error: "bad_signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const email = session.customer_details?.email?.toLowerCase().trim();
    if (session.payment_status === "paid" && email) {
      await db.user.upsert({
        where: { email },
        update: { lifetimeAccess: true },
        create: { email, lifetimeAccess: true },
      });
    }
  }

  return NextResponse.json({ received: true });
}
