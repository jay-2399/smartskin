import { redirect } from "next/navigation";
import { auth } from "@/features/auth";
import { WelcomeScreen } from "@/components/screens/WelcomeScreen";

// Écran d'entrée de l'app (l'app iOS pointe ici). Point d'entrée intelligent :
// un utilisateur DÉJÀ connecté ET payé n'a pas à refaire le tunnel → on l'envoie
// directement à son dashboard. Tous les autres voient l'accueil (scan / sign-in).
export default async function Page() {
  const session = await auth();
  if (session?.user?.id && session.user.lifetimeAccess) redirect("/dashboard");
  return <WelcomeScreen />;
}
