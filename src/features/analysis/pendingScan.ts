import type { AnalysisResult } from "./schema";
import type { Answers } from "@/features/funnel/types";

/* Le bilan à mettre de côté AVANT le départ vers Stripe (le paiement + la connexion
   Google quittent le site → la mémoire est vidée). On le réhydrate au retour sur /routine.
   La photo est une donnée sensible et n'est JAMAIS envoyée au serveur ni mise en base :
   ici elle transite seulement par le sessionStorage du navigateur (même onglet, effacé
   juste après affichage). Le bilan (léger) est écrit EN PREMIER et de façon fiable ; la
   photo (lourde) est ajoutée en best-effort → si elle dépasse le quota, le bilan survit. */

const KEY = "smartskin-pending-scan";

type Stored = { result: AnalysisResult; answers: Answers; photo?: string | null };

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(blob);
  });
}

function dataUrlToBlob(dataUrl: string): Blob | null {
  try {
    const [meta, b64] = dataUrl.split(",");
    const mime = meta.match(/data:(.*?);base64/)?.[1] ?? "image/jpeg";
    const bin = atob(b64);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return new Blob([arr], { type: mime });
  } catch {
    return null;
  }
}

export async function stashPendingScan(result: AnalysisResult, answers: Answers, photo: Blob | null): Promise<void> {
  // 1) Le bilan seul, fiable (petit) → garantit la réhydratation même sans photo.
  try {
    sessionStorage.setItem(KEY, JSON.stringify({ result, answers } satisfies Stored));
  } catch {
    return; // sessionStorage indispo → tant pis
  }
  // 2) On tente d'y ajouter la photo. Si le quota explose, le KEY garde la version sans photo.
  if (!photo) return;
  try {
    const photoDataUrl = await blobToDataUrl(photo);
    sessionStorage.setItem(KEY, JSON.stringify({ result, answers, photo: photoDataUrl } satisfies Stored));
  } catch {
    /* photo trop lourde / lecture échouée → on garde le bilan sans photo (médaillon générique) */
  }
}

export function readPendingScan(): {
  result: AnalysisResult;
  answers: Answers;
  photo: Blob | null; // pour le médaillon (URL.createObjectURL)
  photoDataUrl: string | null; // pour l'upload vers /api/scan (Supabase Storage)
} | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const { result, answers, photo } = JSON.parse(raw) as Stored;
    if (!result) return null;
    const photoDataUrl = typeof photo === "string" ? photo : null;
    return { result, answers, photo: photoDataUrl ? dataUrlToBlob(photoDataUrl) : null, photoDataUrl };
  } catch {
    return null;
  }
}

export function clearPendingScan(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* rien à faire */
  }
}
