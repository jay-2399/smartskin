// Groupe (espace) = pages PROTÉGÉES (compte requis).
//
// ⚠️ TEMPORAIRE (demande utilisateur 2026-06-26) : le mur de connexion est DÉSACTIVÉ
//    pour voir /dashboard directement sans se connecter. À RÉACTIVER avant la mise en
//    ligne — décommenter le bloc ci-dessous (et l'import) :
//
// import { redirect } from "next/navigation";
// import { auth } from "@/features/auth";
// const session = await auth();
// if (!session?.user?.id) redirect("/login");
export default function EspaceLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
