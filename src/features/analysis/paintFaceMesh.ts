/* Maillage facial MediaPipe partagé (le « vrai » mesh du reveal).
   Détecte les landmarks sur une image STATIQUE puis dessine la tessellation +
   les traits saillants sur un <canvas> calé sur la zone visible de la photo
   (object-fit: cover + object-position: center Y%). Échec silencieux → pas de mesh.
   Réutilisé par : ResultPhotoMesh (reveal), AnalyseScreen (/analyse), intro routine. */

export interface FaceMeshOpts {
  objectPositionY?: number; // fraction 0..1 de object-position (défaut 0.20)
  tessColor?: string;
  featColor?: string;
  tessWidth?: number;
  featWidth?: number;
}

/** Dessine le maillage de `img` dans `canvas` (positionné dans `wrap`).
 *  Renvoie true si un visage a été trouvé et dessiné. Ne lève jamais. */
export async function paintFaceMesh(
  img: HTMLImageElement,
  canvas: HTMLCanvasElement,
  wrap: HTMLElement,
  opts: FaceMeshOpts = {}
): Promise<boolean> {
  try {
    await img.decode().catch(() => {});

    // Import ESM natif depuis le CDN, via `new Function` pour que NI webpack NI
    // Turbopack ne transforment l'import (le pkg npm bundlé via `import("@mediapipe/
    // tasks-vision")` ne se résolvait jamais). JS + wasm + modèle pinnés sur la MÊME
    // version (0.10.35) pour éviter tout décalage.
    const CDN = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.35";
    const nativeImport = new Function("u", "return import(u)") as (u: string) => Promise<typeof import("@mediapipe/tasks-vision")>;
    const vision = await nativeImport(`${CDN}/vision_bundle.mjs`);
    const { FaceLandmarker, FilesetResolver, DrawingUtils } = vision;
    const fileset = await FilesetResolver.forVisionTasks(`${CDN}/wasm`);
    const landmarker = await FaceLandmarker.createFromOptions(fileset, {
      baseOptions: { modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task" },
      runningMode: "IMAGE",
      numFaces: 1,
    });
    const out = landmarker.detect(img);
    landmarker.close();
    const lms = out.faceLandmarks?.[0];
    if (!lms) return false;

    // mapping object-fit: cover + object-position center Y%
    const boxW = wrap.clientWidth, boxH = wrap.clientHeight;
    const natW = img.naturalWidth, natH = img.naturalHeight;
    const scale = Math.max(boxW / natW, boxH / natH);
    const dispW = natW * scale, dispH = natH * scale;
    const posY = opts.objectPositionY ?? 0.20;
    const offX = (boxW - dispW) / 2, offY = (boxH - dispH) * posY;
    const dpr = window.devicePixelRatio || 1;

    Object.assign(canvas.style, { left: `${offX}px`, top: `${offY}px`, width: `${dispW}px`, height: `${dispH}px` });
    canvas.width = Math.round(dispW * dpr);
    canvas.height = Math.round(dispH * dpr);

    const ctx = canvas.getContext("2d");
    if (!ctx) return false;
    const du = new DrawingUtils(ctx);
    du.drawConnectors(lms, FaceLandmarker.FACE_LANDMARKS_TESSELATION, {
      color: opts.tessColor ?? "rgba(255,255,255,0.18)", lineWidth: (opts.tessWidth ?? 0.4) * dpr,
    });
    const c = { color: opts.featColor ?? "rgba(255,255,255,0.4)", lineWidth: (opts.featWidth ?? 0.6) * dpr };
    du.drawConnectors(lms, FaceLandmarker.FACE_LANDMARKS_FACE_OVAL, c);
    du.drawConnectors(lms, FaceLandmarker.FACE_LANDMARKS_LEFT_EYE, c);
    du.drawConnectors(lms, FaceLandmarker.FACE_LANDMARKS_RIGHT_EYE, c);
    du.drawConnectors(lms, FaceLandmarker.FACE_LANDMARKS_LEFT_EYEBROW, c);
    du.drawConnectors(lms, FaceLandmarker.FACE_LANDMARKS_RIGHT_EYEBROW, c);
    du.drawConnectors(lms, FaceLandmarker.FACE_LANDMARKS_LIPS, c);
    return true;
  } catch {
    return false; // échec silencieux : photo intacte
  }
}
