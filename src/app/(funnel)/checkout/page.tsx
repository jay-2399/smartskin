import type { Viewport } from "next";
import { CheckoutScreen } from "@/components/screens/CheckoutScreen";
import { PaywallB } from "@/components/screens/PaywallB";

// Neutralise le theme-color SUR CE SEUL ÉCRAN : la teinte globale (#F1F3F6) peint
// la zone du notch et empêche la vidéo héro de remonter sous la status bar. En ne
// déclarant un theme-color QUE pour le mode sombre, le mode clair (cas réel iOS)
// n'a aucune teinte → iOS laisse passer la VRAIE vidéo plein bord sous le notch.
// viewportFit:"cover" reste hérité du layout racine.
export const viewport: Viewport = {
  themeColor: [{ media: "(prefers-color-scheme: dark)", color: "#15171b" }],
};

// A/B paywall : Variant A (clair glassmorphique) par défaut, Variant B (sombre immersif)
// via ?v=b. Override manuel pour visualiser chaque variante en dev ; le SPLIT réel sera
// piloté par PostHog (feature flag) une fois branché.
export default async function Page({ searchParams }: { searchParams: Promise<{ v?: string }> }) {
  const { v } = await searchParams;
  return v === "b" ? <PaywallB /> : <CheckoutScreen />;
}
