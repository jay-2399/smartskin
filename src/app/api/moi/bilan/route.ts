import { NextResponse } from "next/server";
import { auth } from "@/features/auth";
import { db } from "@/lib/db";
import { AnalysisResultSchema } from "@/features/analysis/schema";
import { topConcerns } from "@/features/routine/recommend";
import { ATTRIBUTE_BY_ID, LEVEL_TO_PERCENT } from "@/features/analysis/attributes";

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

  return NextResponse.json(
    {
      bilan: {
        score: dernier.score,
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
