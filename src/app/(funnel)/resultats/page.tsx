import { ResultsScreen } from "@/components/screens/ResultsScreen";
import { CodeGate } from "@/components/ui/CodeGate";

// `demo` lu côté serveur (évite une erreur d'hydratation côté écran).
export default async function Page({ searchParams }: { searchParams: Promise<{ demo?: string }> }) {
  const { demo } = await searchParams;
  return (
    <>
      <ResultsScreen demo={demo !== undefined} />
      <CodeGate />
    </>
  );
}
