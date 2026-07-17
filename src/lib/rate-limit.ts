/** Limitation de débit en mémoire (process-local — OK sur Render : process Node persistant).
 *  Couche 1 de sécurité des routes IA (/api/analyze, /api/routine) contre le spam en boucle,
 *  en attendant l'auth (couche 2 = exiger un utilisateur connecté). Limites réglables par
 *  variables d'env : RATE_LIMIT_PER_IP_HOUR (déf. 30) et RATE_LIMIT_GLOBAL_DAY (déf. 600).
 *  Limite : compteur par instance et remis à zéro au déploiement → à migrer vers un store
 *  partagé (DB/Redis) si l'app passe en multi-instances. */

const buckets = new Map<string, number[]>();

export type RateLimitResult = { ok: boolean; retryAfterSec: number };

/** Fenêtre glissante : au plus `limit` requêtes par `windowMs` pour une `key`. */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now: number = Date.now()
): RateLimitResult {
  const hits = (buckets.get(key) ?? []).filter((t) => t > now - windowMs);
  if (hits.length >= limit) {
    buckets.set(key, hits);
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil((hits[0]! + windowMs - now) / 1000)) };
  }
  hits.push(now);
  buckets.set(key, hits);
  return { ok: true, retryAfterSec: 0 };
}

/** IP client (Render pose `x-forwarded-for`). */
export function clientIp(request: Request): string {
  const xff = request.headers.get("x-forwarded-for");
  return (xff ? xff.split(",")[0]?.trim() : request.headers.get("x-real-ip")) || "unknown";
}

const HOUR = 3_600_000;
const DAY = 86_400_000;
const PER_IP_HOUR = Number(process.env.RATE_LIMIT_PER_IP_HOUR ?? 30);
const GLOBAL_DAY = Number(process.env.RATE_LIMIT_GLOBAL_DAY ?? 600);

/** Garde partagée des routes IA : limite par IP (heure) puis fusible global (jour). */
export function aiRateLimit(request: Request, now: number = Date.now()): RateLimitResult {
  const perIp = rateLimit(`ip:${clientIp(request)}`, PER_IP_HOUR, HOUR, now);
  if (!perIp.ok) return perIp;
  return rateLimit("global:ai", GLOBAL_DAY, DAY, now);
}
