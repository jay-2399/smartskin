import { NextResponse } from "next/server";
import { catalogue, moteurDisponible, scoreFormule, scorePerso } from "@/lib/scan/moteur";
import { sessionPremium } from "@/lib/scan/acces";
import { profilUtilisateur } from "@/lib/scan/profil-utilisateur";

// RE-NOTATION d'une liste de produits déjà enregistrés (historique, routine, bilan).
//
// Pourquoi cette route existe : la note perso est RECOPIÉE à côté du produit au moment de
// l'ajout — dans `ss-historique` (localStorage) et dans `Protocol.products` (base, donc
// suivant la personne d'un appareil à l'autre). Tant que tout le monde partageait le même
// profil figé, ce chiffre restait valable indéfiniment. Depuis que la note dépend du bilan
// réel, il périme au scan suivant : quelqu'un dont la peau s'améliore verrait sa routine
// afficher pour toujours la note de sa peau d'avant.
//
// On ne masque donc pas les chiffres périmés, on les recalcule : noter 50 produits coûte
// ~16 ms. Le `perso` stocké devient un simple repli d'affichage hors ligne.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { produits } = await request.json().catch(() => ({ produits: [] }));
    if (!Array.isArray(produits) || !produits.length) return NextResponse.json({ scores: {} });
    if (!moteurDisponible()) return NextResponse.json({ scores: {} });

    // Même règle que les autres routes produit : pas de perso sans premium ET sans bilan.
    const { uid, premium } = await sessionPremium();
    const r = premium ? await profilUtilisateur(uid) : null;

    // Index par nom : c'est la clé sous laquelle l'historique et le shelf enregistrent.
    const parNom = new Map<string, ReturnType<typeof catalogue>[number]>();
    for (const p of catalogue()) if (p.inci) parNom.set(p.name.toLowerCase(), p);

    const scores: Record<string, { formule: number; perso?: number }> = {};
    for (const nom of produits.slice(0, 60)) {
      if (typeof nom !== "string") continue;
      const p = parNom.get(nom.toLowerCase());
      if (!p) continue;
      const f = scoreFormule(p.inci!, p.category, p.filtresUV);
      const ligne: { formule: number; perso?: number } = { formule: f.score };
      if (r?.etat === "ok") {
        ligne.perso = scorePerso(p.inci!, r.profil, p.category, f, p.filtresUV).score;
      }
      scores[nom] = ligne;
    }
    return NextResponse.json({ scores });
  } catch {
    // L'écran garde ses chiffres enregistrés : une panne ici ne doit rien effacer.
    return NextResponse.json({ scores: {} }, { status: 500 });
  }
}
