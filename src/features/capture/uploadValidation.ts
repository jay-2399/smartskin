import { loadFaceMeshImage, extractFrameFromImage } from "./faceMesh";
import { evaluateStaticImage } from "./evaluate";

export type UploadCheck = { ok: boolean; message: string | null; blob: Blob | null };

const MAX_SIDE = 1280; // borne la résolution (payload raisonnable pour l'IA)

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/** Ré-encode l'image en JPEG 92 %, bornée à MAX_SIDE. Pas de miroir (déjà bien orientée). */
function toJpeg(img: HTMLImageElement): Promise<Blob> {
  const scale = Math.min(1, MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.round(img.naturalWidth * scale);
  const h = Math.round(img.naturalHeight * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
  return new Promise((resolve) => canvas.toBlob((b) => resolve(b!), "image/jpeg", 0.92));
}

/**
 * Valide une image uploadée selon les mêmes critères que la capture live
 * (sauf la stabilité). Si conforme, renvoie un JPEG prêt pour l'analyse.
 */
export async function validateAndPrepareUpload(file: File): Promise<UploadCheck> {
  if (!file.type.startsWith("image/")) {
    return { ok: false, message: "Choisis un fichier image.", blob: null };
  }
  const url = URL.createObjectURL(file);
  try {
    const img = await loadImage(url);
    const landmarker = await loadFaceMeshImage();
    let frame;
    try {
      frame = extractFrameFromImage(landmarker, img).frame;
    } finally {
      landmarker.close();
    }
    const verdict = evaluateStaticImage(frame);
    if (!verdict.ok) return { ok: false, message: verdict.message, blob: null };
    return { ok: true, message: null, blob: await toJpeg(img) };
  } catch {
    return { ok: false, message: "Impossible d'analyser cette image, réessaie.", blob: null };
  } finally {
    URL.revokeObjectURL(url);
  }
}
