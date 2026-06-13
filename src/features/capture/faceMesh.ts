import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import type { FaceFrame } from "./types";
import { luminanceStats } from "./metrics/luminance";
import { laplacianVariance } from "./metrics/sharpness";

/** Géométrie de l'ovale guide, en fractions du viewfinder (cf. SVG de la maquette 03-capture :
 *  viewBox 386×418, ellipse cx=193 cy=206 rx=118 ry=150). */
export const OVAL = {
  cx: 193 / 386,
  cy: 206 / 418,
  rxFrac: 118 / 386,
  ryFrac: 150 / 418,
} as const;

export async function loadFaceMesh(): Promise<FaceLandmarker> {
  const fileset = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm"
  );
  return FaceLandmarker.createFromOptions(fileset, {
    baseOptions: {
      modelAssetPath:
        "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
    },
    runningMode: "VIDEO",
    numFaces: 2,
    outputFacialTransformationMatrixes: true,
  });
}

const SAMPLE = 64; // zone visage réduite à 64×64 pour luminance + netteté (spec §Performance)
let sampleCanvas: HTMLCanvasElement | null = null;
function sampleCtx(): CanvasRenderingContext2D {
  if (!sampleCanvas) {
    sampleCanvas = document.createElement("canvas");
    sampleCanvas.width = SAMPLE;
    sampleCanvas.height = SAMPLE;
  }
  return sampleCanvas.getContext("2d", { willReadFrequently: true })!;
}

/** Angles d'Euler (degrés) depuis la matrice faciale 4×4 column-major de MediaPipe.
 *  Décomposition R = Ry(yaw)·Rx(pitch)·Rz(roll). */
function eulerFromMatrix(m: number[]): { yaw: number; pitch: number; roll: number } {
  const deg = (r: number) => (r * 180) / Math.PI;
  return {
    yaw: deg(Math.atan2(m[8], m[10])),
    pitch: deg(Math.asin(Math.max(-1, Math.min(1, -m[9])))),
    roll: deg(Math.atan2(m[1], m[5])),
  };
}

export type ExtractResult = {
  frame: FaceFrame;
  center: { x: number; y: number } | null; // centre normalisé, à repasser à la frame suivante
};

const NO_FACE: Omit<FaceFrame, "faceCount"> = {
  projectedHeight: 0, ratio: 0,
  luminance: { mean: 0, stddev: 0, lateralDelta: 0 },
  pose: { yaw: 0, pitch: 0, roll: 0 },
  sharpness: 0,
  centerOffset: { x: 1, y: 1 },
  movementDelta: 1,
};

type Pt = { x: number; y: number };

/** Construit une FaceFrame à partir de landmarks + d'une source dessinable
 *  (vidéo OU image). Cœur commun à l'analyse live et à l'upload. */
function buildFrame(
  faces: Pt[][],
  matrixData: number[] | undefined,
  srcW: number,
  srcH: number,
  source: CanvasImageSource,
  prevCenter: Pt | null
): ExtractResult {
  if (faces.length !== 1) {
    return { frame: { faceCount: faces.length, ...NO_FACE }, center: null };
  }

  // Bounding box normalisée (0..1) du visage
  let minX = 1, maxX = 0, minY = 1, maxY = 0;
  for (const p of faces[0]) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  const bboxH = maxY - minY;
  const center = { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };

  const ratio = bboxH / (2 * OVAL.ryFrac);
  const projectedHeight = bboxH * srcH;
  const pose = matrixData ? eulerFromMatrix(matrixData) : { yaw: 0, pitch: 0, roll: 0 };
  const centerOffset = {
    x: Math.abs(center.x - OVAL.cx) / (2 * OVAL.rxFrac),
    y: Math.abs(center.y - OVAL.cy) / (2 * OVAL.ryFrac),
  };
  const movementDelta = prevCenter
    ? Math.hypot(center.x - prevCenter.x, center.y - prevCenter.y)
    : 0;

  // Luminance + netteté sur la zone visage réduite à 64×64
  const ctx = sampleCtx();
  ctx.drawImage(source, minX * srcW, minY * srcH, (maxX - minX) * srcW, bboxH * srcH, 0, 0, SAMPLE, SAMPLE);
  const rgba = ctx.getImageData(0, 0, SAMPLE, SAMPLE).data;

  return {
    frame: {
      faceCount: 1, projectedHeight, ratio,
      luminance: luminanceStats(rgba, SAMPLE),
      pose,
      sharpness: laplacianVariance(rgba, SAMPLE),
      centerOffset, movementDelta,
    },
    center,
  };
}

/** Extrait une FaceFrame d'une frame vidéo (live-analysis.md §3-4). */
export function extractFrame(
  landmarker: FaceLandmarker,
  video: HTMLVideoElement,
  prevCenter: Pt | null,
  nowMs: number
): ExtractResult {
  const res = landmarker.detectForVideo(video, nowMs);
  return buildFrame(
    res.faceLandmarks ?? [],
    res.facialTransformationMatrixes?.[0]?.data ? Array.from(res.facialTransformationMatrixes[0].data) : undefined,
    video.videoWidth, video.videoHeight, video, prevCenter
  );
}

/** Charge un FaceLandmarker en mode IMAGE (pour valider une photo uploadée). */
export async function loadFaceMeshImage(): Promise<FaceLandmarker> {
  const fileset = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm"
  );
  return FaceLandmarker.createFromOptions(fileset, {
    baseOptions: {
      modelAssetPath:
        "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
    },
    runningMode: "IMAGE",
    numFaces: 2,
    outputFacialTransformationMatrixes: true,
  });
}

/** Extrait une FaceFrame d'une image statique (upload). movementDelta = 0. */
export function extractFrameFromImage(
  landmarker: FaceLandmarker,
  img: HTMLImageElement
): ExtractResult {
  const res = landmarker.detect(img);
  return buildFrame(
    res.faceLandmarks ?? [],
    res.facialTransformationMatrixes?.[0]?.data ? Array.from(res.facialTransformationMatrixes[0].data) : undefined,
    img.naturalWidth, img.naturalHeight, img, null
  );
}
