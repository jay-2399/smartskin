import { NextResponse } from "next/server";
import {
  dictionnaire, moteurDisponible, scoreFormule, scorePerso,
  ficheIngredients, CONFIG,
} from "@/lib/scan/moteur";
import { sessionPremium, PROFIL_NEUTRE } from "@/lib/scan/acces";
import { profilUtilisateur } from "@/lib/scan/profil-utilisateur";

// Noter une liste INCI fournie directement. Sert à RE-NOTER quand l'utilisateur corrige la
// catégorie devinée d'une étiquette photographiée : le métier décide de toute la grille, donc
// changer la catégorie change la note. Même charge utile que les deux autres chemins.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { inci, categorie, filtresUV } = await request.json().catch(() => ({}));
    if (typeof inci !== "string" || inci.trim().length < 10) {
      return NextResponse.json({ statut: "inci_absent" }, { status: 400 });
    }
    // Gating : gratuit = formule + ingrédients NEUTRES, sans perso (même règle que fiche).
    const { uid, premium } = await sessionPremium();
    const pr = premium ? await profilUtilisateur(uid) : PROFIL_NEUTRE;
    const formule = scoreFormule(inci, categorie, filtresUV);
    const reponse: Record<string, unknown> = {
      disponible: moteurDisponible(), algoVersion: CONFIG.algoVersion,
      formule, ingredients: ficheIngredients(inci, dictionnaire(), pr),
    };
    if (premium) reponse.perso = scorePerso(inci, pr, categorie, formule, filtresUV);
    return NextResponse.json(reponse);
  } catch {
    return NextResponse.json({ statut: "erreur" }, { status: 500 });
  }
}
