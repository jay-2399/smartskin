import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/features/auth";
import { db } from "@/lib/db";

// Le shelf (produits de la routine V2) d'un compte. Le CLIENT est la source de vérité :
// PUT remplace tout. Stockage : le modèle Protocol existant (items dans `products` Json),
// AUCUNE migration — un shelf par user (findFirst → update/create).
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ShelfItemSchema = z.object({
  nom: z.string().min(1),
  marque: z.string().optional(),
  image: z.string().optional(),
  categorie: z.string().optional(),
  formule: z.number().nullable().optional(),
  perso: z.number().nullable().optional(),
  ajoute: z.string(), // date ISO d'ajout
});
const BodySchema = z.object({ items: z.array(ShelfItemSchema).max(60) });

export async function GET() {
  const session = await auth().catch(() => null);
  const uid = session?.user?.id;
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const proto = await db.protocol.findFirst({ where: { userId: uid } });
  // Une ligne Protocol V1 (produits jour/nuit) ne parse pas en ShelfItem → shelf vide,
  // sans erreur : le premier PUT la remplacera.
  const items = z.array(ShelfItemSchema).safeParse(proto?.products);
  return NextResponse.json({ items: items.success ? items.data : [] });
}

export async function PUT(request: Request) {
  const session = await auth().catch(() => null);
  const uid = session?.user?.id;
  if (!uid) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const parsed = BodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid", issues: parsed.error.flatten().fieldErrors }, { status: 400 });
  }

  const proto = await db.protocol.findFirst({ where: { userId: uid } });
  if (proto) {
    await db.protocol.update({ where: { id: proto.id }, data: { products: parsed.data.items } });
  } else {
    await db.protocol.create({ data: { userId: uid, products: parsed.data.items } });
  }
  return NextResponse.json({ ok: true });
}
