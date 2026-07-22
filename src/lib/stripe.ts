import Stripe from "stripe";

// Client Stripe — clé secrète SERVEUR uniquement (jamais exposée au navigateur).
// Mode TEST tant que la clé est sk_test_… On laisse l'API version par défaut du SDK.
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? "");

// Prix de l'accès « à vie » (paiement unique), en centimes USD. Cf. CheckoutScreen.
export const PRICE_CENTS = 2995; // 29,95 $
// Prix de l'abonnement hebdomadaire, en centimes USD.
export const WEEKLY_PRICE_CENTS = 495; // 4,95 $ / semaine
