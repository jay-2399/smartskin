import { NextResponse } from "next/server";
import { z } from "zod";

// Formulaire de contact (widget concierge). Envoie un email via l'API HTTP Resend
// (déjà utilisé pour les liens magiques) → aucune dépendance ajoutée. Le message part
// FROM EMAIL_FROM, TO CONTACT_EMAIL (ta boîte), avec reply_to = l'email du visiteur
// pour que tu répondes directement au client.
const schema = z.object({
  name: z.string().trim().min(1, "Name required").max(120),
  email: z.string().trim().email("Enter a valid email").max(200),
  message: z.string().trim().min(5, "Message too short").max(4000),
  // Honeypot anti-spam : un champ invisible que seuls les bots remplissent.
  company: z.string().max(0).optional(),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid", issues: parsed.error.flatten().fieldErrors }, { status: 400 });
  }
  const { name, email, message, company } = parsed.data;
  if (company) return NextResponse.json({ ok: true }); // bot → on fait comme si (silencieux)

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? "onboarding@resend.dev";
  const to = process.env.CONTACT_EMAIL ?? from;
  if (!apiKey) return NextResponse.json({ error: "not_configured" }, { status: 500 });

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: `SmartSkin Contact <${from}>`,
      to: [to],
      reply_to: email,
      subject: `New message from ${name}`,
      text: `From: ${name} <${email}>\n\n${message}`,
    }),
  }).catch(() => null);

  if (!res || !res.ok) {
    return NextResponse.json({ error: "send_failed" }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
