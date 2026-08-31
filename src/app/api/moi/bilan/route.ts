import { NextResponse } from "next/server";
import { auth } from "@/features/auth";
import { db } from "@/lib/db";
import { AnalysisResultSchema } from "@/features/analysis/schema";
import { topConcerns } from "@/features/routine/recommend";
import { ATTRIBUTE_BY_ID, LEVEL_TO_PERCENT, SECTIONS, SECTION_LABELS } from "@/features/analysis/attributes";

// Le bilan visage du compte, pour l'écran 18-bilan et la jauge du dashboard V2 :
// dernière Analysis (score, curseurs les plus dégradés) + la courbe de TOUS les scans.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth().catch(() => null);
  const uid = session?.user?.id;
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const scans = await db.analysis.findMany({
    where: { userId: uid },
    orderBy: { createdAt: "asc" },
    select: { createdAt: true, score: true, skinType: true, skinAge: true, photoData: true, result: true },
  });
  const dernier = scans.at(-1);
  if (!dernier) {
    return NextResponse.json({ bilan: null }, { headers: { "Cache-Control": "no-store" } });
  }

  // Les 4 attributs les plus dégradés du dernier scan, classés comme le dashboard
  // (importance × sévérité — topConcerns). `niveau` reprend le mapping de jauge existant
  // (LEVEL_TO_PERCENT, 100 = pire) ; `libelle` = le mot-clé court de l'IA (tip).
  // Un result corrompu donne [] sans casser le bilan.
  const parsed = AnalysisResultSchema.safeParse(dernier.result);
  const curseurs = parsed.success
    ? topConcerns(parsed.data).slice(0, 4).map((id) => {
        const attr = parsed.data.attributes.find((a) => a.id === id);
        return {
          id,
          label: ATTRIBUTE_BY_ID[id]?.label ?? id,
          niveau: LEVEL_TO_PERCENT[attr?.level ?? 1] ?? 0,
          libelle: attr?.tip ?? "",
        };
      })
    : [];

  // Le moteur produit BIEN PLUS que 4 curseurs : une lecture de synthèse (verdict),
  // un profil de peau (teint, sous-ton, phototype) et les 16 attributs commentés.
  // Tout cela était parsé ci-dessus puis jeté — l'écran de bilan n'en montrait
  // qu'un dixième. On le transmet, en résolvant ici les libellés et les bornes
  // depuis le catalogue d'attributs pour que la page n'ait pas à les redéclarer.
  const r = parsed.success ? parsed.data : null;
  const parSection = r
    ? SECTIONS.map((sid) => ({
        id: sid,
        titre: SECTION_LABELS[sid],
        criteres: r.attributes
          .filter((a) => ATTRIBUTE_BY_ID[a.id]?.section === sid)
          .map((a) => {
            const def = ATTRIBUTE_BY_ID[a.id];
            return {
              id: a.id,
              label: def?.label ?? a.id,
              bas: def?.low ?? "",
              haut: def?.high ?? "",
              niveau: LEVEL_TO_PERCENT[a.level] ?? 0,
              libelle: a.tip,
              situation: a.situation,
            };
          }),
      })).filter((s) => s.criteres.length > 0)
    : [];

  return NextResponse.json(
    {
      bilan: {
        score: dernier.score,
        etat: r?.state ?? null,
        resume: r?.sub ?? null,
        typeDetail: r?.skinTypeBreakdown ?? null,
        // `verdict` est optionnel au schéma (une sortie IA malformée le masque sans
        // faire échouer le bilan) : la page doit savoir vivre sans.
        verdict: r?.verdict ?? null,
        profil: r?.profile ?? null,
        sections: parSection,
        // Marge de progression si les curseurs dégradés s'améliorent : +2 points par
        // curseur affiché (le contrat fixe le champ, pas la formule — simple et borné).
        potentiel: Math.min(100, dernier.score + 2 * curseurs.length),
        skinType: dernier.skinType,
        skinAge: dernier.skinAge,
        date: dernier.createdAt.toISOString(),
        photo: dernier.photoData,
        curseurs,
        evolution: scans.map((s) => ({ date: s.createdAt.toISOString().slice(0, 10), score: s.score })),
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
