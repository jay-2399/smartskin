// Groupe (espace) = pages normalement PROTÉGÉES (compte requis).
//
// TEMP(test 2026-07-20) : mur de connexion DÉSACTIVÉ pour tester le funnel jusqu'au
// dashboard SANS login ni compte. ⚠️ Un invité n'a aucun scan enregistré → le dashboard
// affiche des données d'EXEMPLE (pas ton scan réel : la sauvegarde exige un compte).
// RÉACTIVER = restaurer la version protégée ci-dessous :
//   import { redirect } from "next/navigation";
//   import { auth } from "@/features/auth";
//   export default async function EspaceLayout({ children }: { children: React.ReactNode }) {
//     const session = await auth();
//     if (!session?.user?.id) redirect("/login");
//     return <>{children}</>;
//   }
export default function EspaceLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
