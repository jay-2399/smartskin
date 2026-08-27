import { NextResponse } from "next/server";
import { catalogue, marqueDe } from "@/lib/scan/moteur";

// Recherche par nom : la porte de secours quand la reconnaissance photo échoue,
// et le moyen de tester le prototype sans caméra.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

export async function GET(request: Request) {
  try {
    const q = new URL(request.url).searchParams.get("q") || "";
    if (q.trim().length < 2) return NextResponse.json({ resultats: [] });
    // tous les mots doivent être présents : « cerave mousse » ne doit pas ramener tout CeraVe
    const mots = norm(q).split(/\s+/).filter(Boolean);
    const resultats = catalogue()
      .filter((p) => p.category !== "hors-perimetre" && p.inci)
      .filter((p) => { const n = norm(p.name); return mots.every((m) => n.includes(m)); })
      .slice(0, 25)
      .map((p) => ({ nom: p.name, marque: marqueDe(p), image: p.image, categorie: p.category }));
    return NextResponse.json({ resultats });
  } catch {
    return NextResponse.json({ resultats: [] }, { status: 500 });
  }
}
