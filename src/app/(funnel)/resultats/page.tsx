import { ResultsScreen } from "@/components/screens/ResultsScreen";
import { CodeGate } from "@/components/ui/CodeGate";

// `demo` lu côté serveur (évite une erreur d'hydratation côté écran).
// Le code-gate viral (code de la vidéo TikTok) s'affiche par-dessus le reveal :
// après l'analyse, le scan/score restent floutés tant que le code n'est pas saisi.
// Bypass : ?demo=1 (sauf ?gate=1 qui le force) ou déjà débloqué dans la session.
export default async function Page({ searchParams }: { searchParams: Promise<{ demo?: string }> }) {
  const { demo } = await searchParams;
  return (
    <>
      <ResultsScreen demo={demo !== undefined} />
      <CodeGate />
    </>
  );
}
