import { createRemoteJWKSet, jwtVerify } from "jose";

/* Vérification du jeton d'identité « Sign in with Apple ».
   Le jeton est émis par Apple pour l'app iOS native → on vérifie sa signature
   (clés publiques Apple / JWKS), l'émetteur et l'audience (= bundle id de l'app).
   Pas de client secret ni Services ID nécessaires : on ne fait que VÉRIFIER le
   jeton d'identité (aucun échange de code d'autorisation). */

const APPLE_ISSUER = "https://appleid.apple.com";
const APPLE_JWKS = createRemoteJWKSet(new URL("https://appleid.apple.com/auth/keys"));
// Audience = bundle id de l'app iOS (émetteur du jeton natif). Réglable par env.
const APPLE_AUDIENCE = process.env.APPLE_BUNDLE_ID ?? "com.davincidigitale.smartskin";

export type AppleIdentity = { sub: string; email: string };

/** Vérifie le jeton Apple et renvoie { sub, email }. Lève si invalide/expiré. */
export async function verifyAppleIdToken(idToken: string): Promise<AppleIdentity> {
  const { payload } = await jwtVerify(idToken, APPLE_JWKS, {
    issuer: APPLE_ISSUER,
    audience: APPLE_AUDIENCE,
  });
  const sub = typeof payload.sub === "string" ? payload.sub : "";
  const email = typeof payload.email === "string" ? payload.email.toLowerCase().trim() : "";
  if (!sub || !email) throw new Error("apple_token_missing_claims");
  return { sub, email };
}
