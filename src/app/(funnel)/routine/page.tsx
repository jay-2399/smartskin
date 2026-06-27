import { RoutineScreen } from "@/components/screens/RoutineScreen";

// ⚠️ TEMPORAIRE : paywall DÉSACTIVÉ → la routine est accessible sans paiement ni login.
// Pour le RÉACTIVER, remettre l'import { redirect } / { auth } et le bloc gate :
//   const { demo } = await searchParams;
//   if (demo === undefined) {
//     const session = await auth();
//     if (!session?.user?.lifetimeAccess) redirect("/checkout");
//   }
export default async function Page({ searchParams }: { searchParams: Promise<{ demo?: string }> }) {
  const { demo } = await searchParams;
  return <RoutineScreen demo={demo !== undefined} />;
}
