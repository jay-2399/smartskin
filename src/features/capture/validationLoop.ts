import type { FaceLandmarker } from "@mediapipe/tasks-vision";
import type { ValidationState } from "./types";
import { extractFrame } from "./faceMesh";
import { evaluateFrame } from "./evaluate";
import { StabilityTracker } from "./metrics/stability";

const LOOP_INTERVAL_MS = 55; // ~18 fps (spec : cap 15-20 fps, économie batterie)
const UI_INTERVAL_MS = 120;  // mises à jour UI ~8 fps (évite les sauts nerveux)

/** Boucle rAF : extractFrame → evaluateFrame → onState (throttlé). Retourne stop(). */
export function startValidationLoop(
  video: HTMLVideoElement,
  landmarker: FaceLandmarker,
  onState: (s: ValidationState) => void
): () => void {
  const tracker = new StabilityTracker();
  let prevCenter: { x: number; y: number } | null = null;
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
    const state = evaluateFrame(frame, tracker, now);

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
