import { redirect } from "next/navigation";
import { auth } from "@/features/auth";
import { RoutineScreen } from "@/components/screens/RoutineScreen";

// Paywall : la routine (protocole) exige un compte avec accès « à vie ». Sinon →
// checkout. La démo (?demo=1) contourne le gate pour les tests.
export default async function Page({ searchParams }: { searchParams: Promise<{ demo?: string }> }) {
  const { demo } = await searchParams;
  if (demo === undefined) {
    const session = await auth();
    if (!session?.user?.lifetimeAccess) redirect("/checkout");
  }
  return <RoutineScreen demo={demo !== undefined} />;
}
