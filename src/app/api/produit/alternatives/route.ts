import { NextResponse } from "next/server";
import {
  catalogue, scoreFormule, scorePerso, marqueDe, type Produit,
} from "@/lib/scan/moteur";
import { sessionPremium } from "@/lib/scan/acces";
import { profilUtilisateur } from "@/lib/scan/profil-utilisateur";

// LES TROIS MEILLEURS DE LA MÊME CATÉGORIE POUR CETTE PEAU.
// Proposées quand le produit scanné n'est pas au vert : l'app ne se contente pas de dire
// « moyen », elle montre ce qui ferait mieux, dans le même rayon.
// Le classement est calculé une fois par catégorie et gardé en mémoire — noter 445 sérums à
// chaque requête serait absurde, et le profil ne change pas d'une requête à l'autre.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Classe = { nom: string; marque: string; image?: string; formule: number; perso: number };
const cache = new Map<string, Classe[]>();

// ⚠️ cache par catégorie seule : correct tant que profilUtilisateur sert le MÊME profil à
// tous (v1). Le jour du profil par compte, la clé de cache devra inclure l'utilisateur.
function classement(categorie: string, pr: Record<string, unknown>): Classe[] {
  const enCache = cache.get(categorie);
  if (enCache) return enCache;
  const l: Classe[] = catalogue()
    .filter((p: Produit) => p.category === categorie && p.inci)
    .map((p: Produit) => {
      const f = scoreFormule(p.inci, p.category, p.filtresUV);
      const pe = scorePerso(p.inci, pr, p.category, f, p.filtresUV);
      return { nom: p.name, marque: marqueDe(p), image: p.image, formule: f.score, perso: pe.score };
    })
    .sort((a, b) => b.perso - a.perso || b.formule - a.formule);
  cache.set(categorie, l);
  return l;
}

export async function GET(request: Request) {
  try {
    // Gating : les alternatives sont un conseil personnalisé → premium uniquement.
    const { uid, premium } = await sessionPremium();
    if (!premium) return NextResponse.json({ alternatives: [] });

    const p = new URL(request.url).searchParams;
    const categorie = p.get("categorie");
    const exclure = (p.get("exclure") || "").toLowerCase();
    const combien = Math.min(6, Math.max(1, Number(p.get("n")) || 3));
    if (!categorie) return NextResponse.json({ alternatives: [] });

    // On ne propose que ce qui fait VRAIMENT mieux : au vert, et mieux noté que le produit
    // scanné. Sinon on suggérerait un remplaçant qui n'en est pas un.
    const minimum = Number(p.get("min")) || 0;
    const alternatives = classement(categorie, await profilUtilisateur(uid))
      .filter((x) => x.nom.toLowerCase() !== exclure && x.perso > minimum)
      .slice(0, combien);
    return NextResponse.json({ categorie, alternatives });
  } catch {
    return NextResponse.json({ alternatives: [] }, { status: 500 });
  }
}
