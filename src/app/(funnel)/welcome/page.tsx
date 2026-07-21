import { redirect } from "next/navigation";
// import { WelcomeScreen } from "@/components/screens/WelcomeScreen";

// TEMP(test) : landing welcome (login Apple) DÉSACTIVÉE pour tester le funnel sans
// login → on file direct à l'accueil du funnel (/). L'app iOS pointe sur /welcome, donc
// ce redirect suffit (pas de rebuild). RÉACTIVER : décommenter l'import + `return
// <WelcomeScreen />` et retirer le redirect (cf. Sign in with Apple).
export default function Page() {
  redirect("/");
}
