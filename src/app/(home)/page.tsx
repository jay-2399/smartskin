import { HomeLanding } from "@/components/screens/HomeLanding";

// Page d'accueil marketing (Hero + Comment ça marche + Ingrédients + CTA),
// 1ʳᵉ page du scan. Isolée du layout funnel (pas de funnel.css) → voir home.css.
// Les CTA lancent le scan (/questions/age) ; le reste est décoratif.
export default function Page() {
  return <HomeLanding />;
}
