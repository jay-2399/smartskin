import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1), // PG (prod) ou « file:… » SQLite (dev) → pas .url()
  AUTH_SECRET: z.string().min(32),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  RESEND_API_KEY: z.string().min(1),
  GOOGLE_CLOUD_PROJECT: z.string().min(1),
  GOOGLE_CLOUD_LOCATION: z.string().min(1),
});

export type Env = z.infer<typeof envSchema>;

/** Valide un objet d'environnement. Lève si invalide. */
export function parseEnv(source: Record<string, unknown>): Env {
  return envSchema.parse(source);
}

/** Environnement validé du process (serveur uniquement).
 *  En contexte de test (Vitest), on NE valide PAS process.env :
 *  les tests appellent parseEnv() avec leurs propres objets. */
export const env: Env =
  process.env.VITEST || process.env.NODE_ENV === "test"
    ? ({} as Env)
    : parseEnv(process.env as Record<string, unknown>);
