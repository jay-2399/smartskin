import type { Viewport } from "next";
import { PaywallSwitch } from "@/components/screens/PaywallSwitch";

// Neutralise le theme-color SUR CE SEUL ÉCRAN : la teinte globale (#F1F3F6) peint
// la zone du notch et empêche la vidéo héro de remonter sous la status bar. En ne
// déclarant un theme-color QUE pour le mode sombre, le mode clair (cas réel iOS)
// n'a aucune teinte → iOS laisse passer la VRAIE vidéo plein bord sous le notch.
// viewportFit:"cover" reste hérité du layout racine.
export const viewport: Viewport = {
  themeColor: [{ media: "(prefers-color-scheme: dark)", color: "#15171b" }],
};

// A/B paywall : l'aiguillage A (clair) / B (sombre) est piloté par PostHog (feature
// flag), avec override manuel ?v=a|b. Cf. PaywallSwitch.
export default function Page() {
  return <PaywallSwitch />;
}
