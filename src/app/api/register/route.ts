import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { hashPassword } from "@/features/auth/password";

// Inscription email + mot de passe (Auth.js ne gère pas la création de compte).
// Appelée au CHECKOUT (paywall) : le compte naît avec l'accès débloqué — paiement
// SIMULÉ pour l'instant (le vrai grant viendra du webhook Stripe). Cf. checkout README.
const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "8 caractères minimum"),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid", issues: parsed.error.flatten().fieldErrors }, { status: 400 });
  }
  const email = parsed.data.email.toLowerCase().trim();

  if (await db.user.findUnique({ where: { email } })) {
    return NextResponse.json({ error: "exists" }, { status: 409 });
  }

  const passwordHash = await hashPassword(parsed.data.password);
  await db.user.create({ data: { email, passwordHash, lifetimeAccess: true } });
  return NextResponse.json({ ok: true });
}
