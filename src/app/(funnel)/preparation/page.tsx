import { RoutinePrepScreen } from "@/components/screens/RoutinePrepScreen";

// /preparation — construit la routine (vrai calcul) derrière un écran de « montée de
// tension », PUIS enchaîne sur le paywall. Flux : reveal → preparation → checkout → routine.
export default async function Page({ searchParams }: { searchParams: Promise<{ demo?: string }> }) {
  const { demo } = await searchParams;
  return <RoutinePrepScreen demo={demo !== undefined} />;
}
