import type { FaceLandmarker } from "@mediapipe/tasks-vision";
import type { FaceFrame, ValidationState } from "./types";
import { extractFrame } from "./faceMesh";
import { evaluateFrame } from "./evaluate";
import { StabilityTracker } from "./metrics/stability";

const LOOP_INTERVAL_MS = 55; // ~18 fps (spec : cap 15-20 fps, économie batterie)
const UI_INTERVAL_MS = 120;  // mises à jour UI ~8 fps (évite les sauts nerveux)
const SMOOTH_ALPHA = 0.35;   // lissage exponentiel des mesures (anti-clignotement aux seuils)

const ema = (prev: number, next: number) => prev + (next - prev) * SMOOTH_ALPHA;

/** Lisse les mesures continues d'une frame à l'autre (pose, taille, lumière, netteté).
 *  movementDelta et centerOffset restent bruts (la stabilité a déjà son timer). */
function smooth(prev: FaceFrame | null, f: FaceFrame): FaceFrame {
  if (!prev || f.faceCount !== 1 || prev.faceCount !== 1) return f;
  return {
    ...f,
    ratio: ema(prev.ratio, f.ratio),
    projectedHeight: ema(prev.projectedHeight, f.projectedHeight),
    sharpness: ema(prev.sharpness, f.sharpness),
    pose: {
      yaw: ema(prev.pose.yaw, f.pose.yaw),
      pitch: ema(prev.pose.pitch, f.pose.pitch),
      roll: ema(prev.pose.roll, f.pose.roll),
    },
    luminance: {
      mean: ema(prev.luminance.mean, f.luminance.mean),
      stddev: ema(prev.luminance.stddev, f.luminance.stddev),
      lateralDelta: ema(prev.luminance.lateralDelta, f.luminance.lateralDelta),
    },
  };
}

/** Boucle rAF : extractFrame → evaluateFrame → onState (throttlé). Retourne stop(). */
export function startValidationLoop(
  video: HTMLVideoElement,
  landmarker: FaceLandmarker,
  onState: (s: ValidationState) => void
): () => void {
  const tracker = new StabilityTracker();
  let prevCenter: { x: number; y: number } | null = null;
  let prevFrame: FaceFrame | null = null;
  let lastRun = 0;
  let lastUi = 0;
  let rafId = 0;
  let stopped = false;

  const tick = (now: number) => {
    if (stopped) return;
    rafId = requestAnimationFrame(tick);
    if (now - lastRun < LOOP_INTERVAL_MS || video.readyState < 2) return;
    lastRun = now;

    const { frame, center } = extractFrame(landmarker, video, prevCenter, now);
    prevCenter = center;
    const smoothed = smooth(prevFrame, frame);
    prevFrame = smoothed;
    const state = evaluateFrame(smoothed, tracker, now);

    if (now - lastUi >= UI_INTERVAL_MS) {
      lastUi = now;
      onState(state);
    }
  };

  rafId = requestAnimationFrame(tick);
  return () => {
    stopped = true;
    cancelAnimationFrame(rafId);
  };
}
