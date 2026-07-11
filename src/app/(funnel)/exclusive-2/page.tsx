import { ResultsScreen } from "@/components/screens/ResultsScreen";
import { EXCLUSIVE2_RESULT } from "@/features/analysis/exclusive2";

// Page reveal EXCLUSIVE 2, hors funnel officiel : app.smart-skin.ai/exclusive-2
// → bilan + photo fixés (showcase), et le CTA enchaîne sur la routine (/exclusive-2/routine).
export const metadata = { title: "SmartSkin — Exclusive analysis" };

export default function Page() {
  return (
    <ResultsScreen
      presetResult={EXCLUSIVE2_RESULT}
      presetPhotoUrl="/exclusive2-face.jpg"
      presetCtaHref="/exclusive-2/routine"
    />
  );
}
