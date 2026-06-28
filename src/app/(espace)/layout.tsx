// Groupe (espace) = pages PROTÉGÉES (compte requis). Mur de connexion réactivé :
// sans session valide, on renvoie vers /login. (Protection via layout serveur — pas
// de middleware Edge, car Prisma 7 + bcrypt ne tournent pas sur l'Edge runtime.)
import { redirect } from "next/navigation";
import { auth } from "@/features/auth";

export default async function EspaceLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return <>{children}</>;
}
