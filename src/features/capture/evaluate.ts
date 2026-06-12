import { VALIDATION_CONFIG as C } from "./config";
import type { Criterion, FaceFrame, ValidationState } from "./types";
import { faceSizeStatus } from "./metrics/faceSize";
import { orientationStatus } from "./metrics/orientation";
import { centeringStatus } from "./metrics/centering";
import { StabilityTracker } from "./metrics/stability";

function faceCountStatus(n: number): Criterion {
  if (n === 0) return { status: "error", message: "Place ton visage dans le cadre" };
  if (n > 1) return { status: "error", message: "Une seule personne dans le cadre" };
  return { status: "ok", message: null };
}

function luminanceStatus(l: FaceFrame["luminance"]): Criterion {
  if (l.mean < C.luminance.meanMin) return { status: "error", message: "Pas assez de lumière" };
  if (l.mean > C.luminance.meanMax) return { status: "error", message: "Trop de lumière directe" };
  if (l.stddev >= C.luminance.stddevMax)
    return { status: "error", message: "Tu es à contre-jour, tourne-toi face à la lumière" };
  if (l.lateralDelta >= C.luminance.lateralDeltaMax)
    return { status: "error", message: "Lumière trop forte d'un côté, équilibre ton éclairage" };
  return { status: "ok", message: null };
}

function sharpnessStatus(v: number): Criterion {
  if (v < C.sharpness.minVariance)
    return { status: "error", message: "Image floue, attends la mise au point" };
  return { status: "ok", message: null };
}

/** Ordre de priorité des messages = importance des critères (live-analysis.md). */
const ORDER = ["faceCount", "faceSize", "luminance", "orientation", "stability", "sharpness"] as const;

export function evaluateFrame(
  f: FaceFrame,
  tracker: StabilityTracker,
  now: number
): ValidationState {
  const crit = {
    faceCount: faceCountStatus(f.faceCount),
    faceSize: faceSizeStatus(f),
    luminance: luminanceStatus(f.luminance),
    orientation: orientationStatus(f.pose),
    stability: tracker.update(f.movementDelta, now),
    sharpness: sharpnessStatus(f.sharpness),
    centering: centeringStatus(f.centerOffset), // SOFT
  };

  const blocking = ORDER.map((k) => crit[k]);
  const canCapture = blocking.every((c) => c.status === "ok");
  const firstError = blocking.find((c) => c.status !== "ok");

  return { ...crit, canCapture, topMessage: firstError?.message ?? null };
}
