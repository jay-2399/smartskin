import { NextResponse } from "next/server";

/** Compare le code saisi au code de campagne attendu (insensible à la casse et aux
 *  espaces). `expected` absent/vide → tout code NON vide passe (gate ouvert en dev). */
export function codeMatches(input: string, expected: string | undefined): boolean {
  const norm = (s: string) => s.trim().toUpperCase().replace(/\s+/g, "");
  const want = expected ? norm(expected) : "";
  const got = norm(input);
  if (!want) return got.length > 0; // pas de code configuré → ne bloque pas le dev
  return got === want;
}

// Valide le code « de campagne TikTok » CÔTÉ SERVEUR : le code n'est ainsi jamais
// expédié au navigateur (sinon inutile de passer par TikTok pour l'obtenir). Le code
// est public (épinglé sous la vidéo), ce n'est pas un secret de sécurité.
export async function POST(request: Request) {
  const { code } = await request.json().catch(() => ({ code: "" }));
  const ok = typeof code === "string" && codeMatches(code, process.env.REVEAL_GATE_CODE);
  return NextResponse.json({ ok });
}
