import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { hashPassword } from "@/features/auth/password";
import { writeRateLimit } from "@/lib/rate-limit";

// Inscription email + mot de passe (Auth.js ne gère pas la création de compte).
//
// UN COMPTE NEUF N'A JAMAIS L'ACCÈS. Seul un achat le pose, par /api/iap/grant (plan
// explicite) ou /api/iap/sync (entitlement StoreKit réel).
//
// Avant : `lifetimeAccess: !sansAcces` — un drapeau envoyé par le CLIENT. L'écran V2
// postait bien `sansAcces: true`, mais rien ne l'imposait : une requête qui l'omettait
// créait un compte premium à vie. C'était un vestige de l'ère Stripe, où l'inscription
// suivait un paiement web ; Stripe a été retiré le 30/07 et le paiement est 100 % StoreKit.
// Le drapeau est toujours envoyé par `SS.auth.signup` — zod l'ignore désormais.
const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "8 caractères minimum"),
  name: z.string().trim().min(1).max(120).optional(), // nom repris de Sign in with Apple → dashboard
});

export async function POST(request: Request) {
  const rl = writeRateLimit(request, "register", 10);
  if (!rl.ok) {
    return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: { "Retry-After": String(rl.retryAfterSec) } });
  }

  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid", issues: parsed.error.flatten().fieldErrors }, { status: 400 });
  }
  const email = parsed.data.email.toLowerCase().trim();

  if (await db.user.findUnique({ where: { email } })) {
    return NextResponse.json({ error: "exists" }, { status: 409 });
  }

  const passwordHash = await hashPassword(parsed.data.password);
  await db.user.create({ data: { email, passwordHash, lifetimeAccess: false, name: parsed.data.name ?? null } });
  return NextResponse.json({ ok: true });
}
