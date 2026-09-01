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
    // Un premium SANS bilan visage ne reçoit jamais une peau inventée : profil neutre,
    // pas de score perso, et `profilManquant` dit à l'écran quoi proposer.
    const r = premium ? await profilUtilisateur(uid) : null;
    const pr = r?.etat === "ok" ? r.profil : PROFIL_NEUTRE;
    const formule = scoreFormule(inci, categorie, filtresUV);
    const reponse: Record<string, unknown> = {
      disponible: moteurDisponible(), algoVersion: CONFIG.algoVersion,
      formule, ingredients: ficheIngredients(inci, dictionnaire(), pr),
    };
    if (r?.etat === "ok") reponse.perso = scorePerso(inci, pr, categorie, formule, filtresUV);
    else if (r) reponse.profilManquant = r.etat;
    return NextResponse.json(reponse);
  } catch {
    return NextResponse.json({ statut: "erreur" }, { status: 500 });
  }
}
