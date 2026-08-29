import { NextResponse } from "next/server";
import { profil } from "@/lib/scan/moteur";
import { overviewPour } from "@/lib/scan/overview";

// Synthèse des avis pour UNE fiche, appelée par l'écran après l'affichage de la carte.
//
// Elle est séparée de /api/produit/fiche à dessein : la fiche ne sort jamais sur le réseau et
// répond instantanément. Faire l'appel modèle dedans ferait attendre le score, la composition et
// la photo pour un paragraphe qui arrive en bas de carte.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const ref = new URL(request.url).searchParams.get("ref");
  if (!ref) return NextResponse.json({ statut: "requete_vide" }, { status: 400 });
  const o = await overviewPour(ref, profil());
  // `null` — pas d'avis bruts, pas de clé, ou l'appel a échoué. 200 quand même : l'absence
  // d'overview n'est pas une erreur pour l'écran, c'est un cas normal.
  return NextResponse.json({ overview: o });
}
