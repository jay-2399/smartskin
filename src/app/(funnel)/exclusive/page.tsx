import { ResultsScreen } from "@/components/screens/ResultsScreen";
import { EXCLUSIVE_RESULT } from "@/features/analysis/exclusive";

// Page reveal EXCLUSIVE, hors funnel officiel : app.smart-skin.ai/exclusive
// → affiche un bilan + une photo fixés (showcase / partage), sans passer par le scan.
export const metadata = { title: "SmartSkin — Exclusive analysis" };

export default function Page() {
  return <ResultsScreen presetResult={EXCLUSIVE_RESULT} presetPhotoUrl="/exclusive-face.jpg" />;
}
