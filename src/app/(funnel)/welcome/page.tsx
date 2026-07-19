import { redirect } from "next/navigation";
// import { WelcomeScreen } from "@/components/screens/WelcomeScreen";

// TEMP(test 2026-07-20) : landing (welcome App Store) DÉSACTIVÉE pour tester le funnel
// sans login/compte → on file direct à l'accueil du funnel (/). L'app iOS pointe encore
// sur /welcome, donc ce redirect suffit (pas besoin de rebuild).
// RÉACTIVER : décommenter l'import + `return <WelcomeScreen />` et retirer le redirect.
export default function Page() {
  redirect("/");
}
