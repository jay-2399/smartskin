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
  // une référence : ASIN Amazon (10 caractères) ou identifiant Ulta (pimprod…, mkt…, xlsImpprod…)
  const ref = u.searchParams.get("ref") || u.searchParams.get("asin");
  if (!ref || !/^[A-Za-z]{0,12}[A-Z0-9]{6,20}$/i.test(ref)) {
    return NextResponse.json({ statut: "reference_invalide" }, { status: 400 });
  }
  const tout = tousLesAvis(ref);
  if (!tout) return NextResponse.json({ statut: "inconnu" }, { status: 404 });

  const depuis = Math.max(0, Number(u.searchParams.get("depuis")) || 0);
  return NextResponse.json({
    note: tout.note, nbAvis: tout.nbAvis, distribution: tout.distribution, source: tout.source,
    total: tout.avis.length,
    avis: tout.avis.slice(depuis, depuis + PAR_PAGE),
    suivant: depuis + PAR_PAGE < tout.avis.length ? depuis + PAR_PAGE : null,
  });
}
