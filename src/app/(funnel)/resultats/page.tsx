import { ResultsScreen } from "@/components/screens/ResultsScreen";
// ⚠️ TEMPORAIRE : code viral (CodeGate) désactivé pour parcourir le funnel librement.
// Réactiver : décommenter l'import + <CodeGate /> ci-dessous.
// import { CodeGate } from "@/components/ui/CodeGate";

// `demo` lu côté serveur (évite une erreur d'hydratation côté écran).
export default async function Page({ searchParams }: { searchParams: Promise<{ demo?: string }> }) {
  const { demo } = await searchParams;
  return (
    <>
      <ResultsScreen demo={demo !== undefined} />
      {/* <CodeGate /> */}
    </>
  );
}
