import { NextResponse } from "next/server";
import {
  dictionnaire, profil, moteurDisponible, scoreFormule, scorePerso,
  ficheIngredients, CONFIG,
} from "@/lib/scan/moteur";

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
    const pr = profil();
    const formule = scoreFormule(inci, categorie, filtresUV);
    const perso = scorePerso(inci, pr, categorie, formule, filtresUV);
    return NextResponse.json({
      disponible: moteurDisponible(), algoVersion: CONFIG.algoVersion,
      formule, perso, ingredients: ficheIngredients(inci, dictionnaire(), pr),
    });
  } catch {
    return NextResponse.json({ statut: "erreur" }, { status: 500 });
  }
}
