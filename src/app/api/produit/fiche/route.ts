import { NextResponse } from "next/server";
import {
  catalogue, dictionnaire, profil, moteurDisponible,
  scoreFormule, scorePerso, ficheIngredients, type Produit,
} from "@/lib/scan/moteur";
import { avisPour, pidUlta, tousLesAvis } from "@/lib/scan/avis";

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
    const a = avisPour(p, pr);
    const brut = a ? null : tousLesAvis(p.asin || p.asinAvis || pidUlta(p.url) || "");
    const f = scoreFormule(p.inci || "", p.category, p.filtresUV);
    const pe = scorePerso(p.inci || "", pr, p.category, f, p.filtresUV);
    return NextResponse.json({
      produit: { nom: p.name, marque: p.brand, image: p.image, categorie: p.category, inci: p.inci, asin: p.asin, ref: p.asin || p.asinAvis || pidUlta(p.url) },
      score: { disponible: moteurDisponible(), formule: f, perso: pe },
      ingredients: ficheIngredients(p.inci || "", dictionnaire(), pr),
      // `null` quand on n'a rien à dire À ELLE sur ce produit : l'écran n'affiche alors rien
      // plutôt que d'inventer. Les avis passent par le MÊME profil que le score perso — on ne
      // montre que le segment de sa peau et les problèmes qu'elle a déclarés.
      avis: a,
      // Un produit peut avoir des avis BRUTS sans fiche enrichie : c'est le cas de tout ce qu'on
      // vient de collecter. L'écran le reconnaît à ceci et demande alors la synthèse à
      // /api/produit/overview. Les fiches déjà enrichies passent par `avis` et ne changent pas.
      avisBrut: a ? null : brut && brut.avis?.length
        ? { note: brut.note ?? null, nbAvis: brut.nbAvis ?? null, source: brut.source }
        : null,
    });
  } catch {
    return NextResponse.json({ statut: "erreur" }, { status: 500 });
  }
}
