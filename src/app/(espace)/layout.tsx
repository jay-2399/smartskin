// Groupe (espace) = pages PROTÉGÉES (compte requis). Sans session valide → /login.
// (Protection via layout serveur — pas de middleware Edge : Prisma 7 ne tourne pas sur Edge.)
import { redirect } from "next/navigation";
import { auth } from "@/features/auth";

export default async function EspaceLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return <>{children}</>;
}
