import { NextResponse } from "next/server";
import {
  catalogue, scoreFormule, scorePerso, marqueDe, type Produit,
} from "@/lib/scan/moteur";
import { sessionPremium } from "@/lib/scan/acces";
import { profilUtilisateur } from "@/lib/scan/profil-utilisateur";
import { cleProfil, type ProfilLu } from "@/lib/scan/profil-peau";

// LES TROIS MEILLEURS DE LA MÊME CATÉGORIE POUR CETTE PEAU.
// Proposées quand le produit scanné n'est pas au vert : l'app ne se contente pas de dire
// « moyen », elle montre ce qui ferait mieux, dans le même rayon.
// Le classement est calculé une fois par catégorie et gardé en mémoire — noter 445 sérums à
// chaque requête serait absurde, et le profil ne change pas d'une requête à l'autre.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Classe = { nom: string; marque: string; image?: string; formule: number; perso: number };
const cache = new Map<string, Classe[]>();
const MAX_CACHE = 200;      // plafond FIFO : une clé par profil DISTINCT, pas par compte
// La route en sert 6 au maximum, mais UNE PAR MARQUE : Paula's Choice a 203 fiches, et dans
// une catégorie qu'elle domine ses produits remplissaient les 20 premières places à eux
// seuls — l'écran montrait trois fois la même marque, dont deux fois le même tube. On garde
// donc une tranche assez profonde pour y trouver trois marques distinctes après filtrage.
const GARDE = 80;

/** Trois marques distinctes, les mieux notées pour cette peau : la meilleure fiche de
 *  chaque marque, dans l'ordre du classement. Le produit scanné est écarté AVANT le
 *  dédoublonnage — sinon sa marque disparaîtrait des suggestions alors que son second
 *  produit ferait peut-être mieux. */
function troisMarques(l: Classe[], exclure: string, minimum: number, combien: number): Classe[] {
  const vues = new Set<string>();
  const out: Classe[] = [];
  for (const x of l) {
    if (x.nom.toLowerCase() === exclure || x.perso <= minimum) continue;
    const m = x.marque.toLowerCase();
    if (vues.has(m)) continue;
    vues.add(m);
    out.push(x);
    if (out.length === combien) break;
  }
  return out;
}

// La clé inclut une empreinte du PROFIL : depuis le branchement du bilan réel, deux personnes
// n'obtiennent plus le même classement. `cleProfil` ne contient pas l'uid, donc deux peaux
// identiques partagent bien l'entrée.
function classement(categorie: string, pr: ProfilLu): Classe[] {
  const cle = categorie + "::" + cleProfil(pr);
  const enCache = cache.get(cle);
  if (enCache) return enCache;
  const l: Classe[] = catalogue()
    .filter((p: Produit) => p.category === categorie && p.inci)
    .map((p: Produit) => {
      const f = scoreFormule(p.inci, p.category, p.filtresUV);
      const pe = scorePerso(p.inci, pr, p.category, f, p.filtresUV);
      return { nom: p.name, marque: marqueDe(p), image: p.image, formule: f.score, perso: pe.score };
    })
    .sort((a, b) => b.perso - a.perso || b.formule - a.formule)
    .slice(0, GARDE);
  if (cache.size >= MAX_CACHE) {
    const premier = cache.keys().next();
    if (!premier.done) cache.delete(premier.value);
  }
  cache.set(cle, l);
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
    const r = await profilUtilisateur(uid);
    // Sans bilan, il n'y a pas de « mieux pour ta peau » à proposer.
    if (r.etat !== "ok") return NextResponse.json({ alternatives: [] });
    const alternatives = troisMarques(classement(categorie, r.profil), exclure, minimum, combien);
    return NextResponse.json({ categorie, alternatives });
  } catch {
    return NextResponse.json({ alternatives: [] }, { status: 500 });
  }
}
