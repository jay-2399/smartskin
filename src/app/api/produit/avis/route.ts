import { NextResponse } from "next/server";
import { tousLesAvis } from "@/lib/scan/avis";

// TOUS les avis d'un produit — ce que sert le « See all reviews » de la fiche.
// La fiche ne montre que ce qui concerne l'utilisatrice ; cette route, elle, ne filtre rien et
// ne trie sur aucune opinion : l'ordre est celui des votes « utile », du plus voté au moins.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PAR_PAGE = 20;

export async function GET(request: Request) {
  const u = new URL(request.url);
  const asin = u.searchParams.get("asin");
  if (!asin || !/^[A-Z0-9]{10}$/i.test(asin)) {
    return NextResponse.json({ statut: "asin_invalide" }, { status: 400 });
  }
  const tout = tousLesAvis(asin);
  if (!tout) return NextResponse.json({ statut: "inconnu" }, { status: 404 });

  const depuis = Math.max(0, Number(u.searchParams.get("depuis")) || 0);
  return NextResponse.json({
    note: tout.note, nbAvis: tout.nbAvis, distribution: tout.distribution,
    total: tout.avis.length,
    avis: tout.avis.slice(depuis, depuis + PAR_PAGE),
    suivant: depuis + PAR_PAGE < tout.avis.length ? depuis + PAR_PAGE : null,
  });
}
