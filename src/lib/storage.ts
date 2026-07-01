import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/* Stockage des photos de scan dans Supabase Storage (bucket PRIVÉ `scan-photos`).
   La photo est une donnée sensible : le bucket est privé et on ne sert que des URL
   SIGNÉES à durée courte (jamais d'URL publique). Le client utilise la service_role
   key (serveur uniquement, JAMAIS exposée au navigateur).

   Dégradation gracieuse : si les variables d'env ne sont pas encore posées, tout
   renvoie null au lieu de crasher → l'app tourne, l'avatar retombe sur l'initiale. */

const BUCKET = "scan-photos";
const SIGNED_URL_TTL = 60 * 60; // 1 h

let client: SupabaseClient | null | undefined;

function getClient(): SupabaseClient | null {
  if (client !== undefined) return client;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  client = url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;
  return client;
}

/** Décode une data URL (`data:image/jpeg;base64,…`) en { buffer, contentType }. */
function decodeDataUrl(dataUrl: string): { buffer: Buffer; contentType: string } | null {
  const m = dataUrl.match(/^data:(.+?);base64,(.*)$/);
  if (!m) return null;
  return { contentType: m[1], buffer: Buffer.from(m[2], "base64") };
}

/** Uploade la photo du scan. Renvoie le chemin stocké (à mettre en base) ou null. */
export async function uploadScanPhoto(userId: string, scanId: string, dataUrl: string): Promise<string | null> {
  const supabase = getClient();
  if (!supabase) return null;
  const decoded = decodeDataUrl(dataUrl);
  if (!decoded) return null;
  const ext = decoded.contentType.split("/")[1]?.replace("jpeg", "jpg") ?? "jpg";
  const path = `${userId}/${scanId}.${ext}`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, decoded.buffer, { contentType: decoded.contentType, upsert: true });
  return error ? null : path;
}

/** URL signée (courte durée) pour afficher une photo privée, ou null. */
export async function signedPhotoUrl(path: string): Promise<string | null> {
  const supabase = getClient();
  if (!supabase) return null;
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_TTL);
  return error ? null : (data?.signedUrl ?? null);
}
