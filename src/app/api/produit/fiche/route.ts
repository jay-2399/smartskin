import { NextResponse } from "next/server";
import {
  catalogue, dictionnaire, profil, moteurDisponible,
  scoreFormule, scorePerso, ficheIngredients, type Produit,
} from "@/lib/scan/moteur";
import { avisPour } from "@/lib/scan/avis";

// Fiche d'un produit du CATALOGUE : identité + les deux notes + le détail des ingrédients.
// Lecture seule, aucune écriture en base, aucun appel réseau — donc rien qui puisse traîner.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").trim();

export async function GET(request: Request) {
  try {
    const q = new URL(request.url).searchParams.get("q");
    if (!q) return NextResponse.json({ statut: "requete_vide" }, { status: 400 });

    const cible = norm(q);
    const cat = catalogue();
    const p: Produit | undefined =
      cat.find((x) => norm(x.name) === cible) ||
      cat.find((x) => norm(x.name).includes(cible)) ||
      cat.find((x) => cible.includes(norm(x.name)));
    if (!p) return NextResponse.json({ statut: "inconnu" }, { status: 404 });

    if (p.category === "hors-perimetre") {
      return NextResponse.json({
        produit: { nom: p.name, marque: p.brand, image: p.image, categorie: p.category },
        score: { disponible: false, raison: "hors périmètre : ce n'est pas un soin du visage" },
      });
    }

    const pr = profil();
    const f = scoreFormule(p.inci || "", p.category, p.filtresUV);
    const pe = scorePerso(p.inci || "", pr, p.category, f, p.filtresUV);
    return NextResponse.json({
      produit: { nom: p.name, marque: p.brand, image: p.image, categorie: p.category, inci: p.inci, asin: p.asin },
      score: { disponible: moteurDisponible(), formule: f, perso: pe },
      ingredients: ficheIngredients(p.inci || "", dictionnaire(), pr),
      // `null` quand on n'a rien à dire À ELLE sur ce produit : l'écran n'affiche alors rien
      // plutôt que d'inventer. Les avis passent par le MÊME profil que le score perso — on ne
      // montre que le segment de sa peau et les problèmes qu'elle a déclarés.
      avis: avisPour(p, pr),
    });
  } catch {
    return NextResponse.json({ statut: "erreur" }, { status: 500 });
  }
}
