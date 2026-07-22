import { redirect } from "next/navigation";
import { auth } from "@/features/auth";
import { userHasAccess } from "@/features/checkout/access";
import { WelcomeScreen } from "@/components/screens/WelcomeScreen";

// Écran d'entrée de l'app (l'app iOS pointe ici). Point d'entrée intelligent :
// un utilisateur DÉJÀ connecté ET avec un accès ACTIF (lifetime OU abo encore valable —
// lu FRAIS en base pour respecter l'expiration) n'a pas à refaire le tunnel → dashboard direct.
// Tous les autres voient l'accueil (scan / sign-in).
export default async function Page() {
  const session = await auth();
  if (session?.user?.id && (await userHasAccess(session.user.id))) redirect("/dashboard");
  return <WelcomeScreen />;
}
