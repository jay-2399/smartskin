import { VALIDATION_CONFIG as C } from "./config";
import type { Criterion, FaceFrame, ValidationState } from "./types";
import { faceSizeStatus } from "./metrics/faceSize";
import { orientationStatus } from "./metrics/orientation";
import { centeringStatus } from "./metrics/centering";
import { StabilityTracker } from "./metrics/stability";

function faceCountStatus(n: number): Criterion {
  if (n === 0) return { status: "error", message: "Place your face in the frame" };
  if (n > 1) return { status: "error", message: "Only one person in the frame" };
  return { status: "ok", message: null };
}

function luminanceStatus(l: FaceFrame["luminance"]): Criterion {
  if (l.mean < C.luminance.meanMin) return { status: "error", message: "Not enough light" };
  if (l.mean > C.luminance.meanMax) return { status: "error", message: "Too much direct light" };
  if (l.stddev >= C.luminance.stddevMax)
    return { status: "error", message: "You are backlit, turn toward the light" };
  if (l.lateralDelta >= C.luminance.lateralDeltaMax)
    return { status: "error", message: "Light too strong on one side, balance your lighting" };
  if (l.shadowRange >= C.luminance.shadowRangeMax)
    return { status: "error", message: "Shadow on your face, even out the lighting" };
  return { status: "ok", message: null };
}

function sharpnessStatus(v: number): Criterion {
  if (v < C.sharpness.minVariance)
    return { status: "error", message: "Blurry image, wait for focus" };
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

/** Valide une image STATIQUE (photo importée) avec des seuils ASSOUPLIS
 *  (C.upload) : on n'impose PAS le cadrage ovale du live (une photo normale a un
 *  visage plus petit et parfois un léger 3/4). Pas de stabilité ni de centrage. */
export function evaluateStaticImage(f: FaceFrame): { ok: boolean; message: string | null } {
  const U = C.upload;
  const checks: Criterion[] = [
    faceCountStatus(f.faceCount),
    f.ratio < U.ratioMin || f.projectedHeight < U.minProjected
      ? { status: "error", message: "Your face must be larger in the photo" }
      : { status: "ok", message: null },
    f.luminance.mean < U.meanMin
      ? { status: "error", message: "Photo too dark" }
      : f.luminance.mean > U.meanMax
        ? { status: "error", message: "Photo too bright (overexposed)" }
        : { status: "ok", message: null },
    f.luminance.shadowRange >= U.shadowRangeMax
      ? { status: "error", message: "Too much shadow on the face, even out the lighting" }
      : { status: "ok", message: null },
    Math.abs(f.pose.yaw) > U.yaw || Math.abs(f.pose.pitch) > U.pitch || Math.abs(f.pose.roll) > U.roll
      ? { status: "error", message: "Your face must face the camera" }
      : { status: "ok", message: null },
    f.sharpness < U.minVariance
      ? { status: "error", message: "Photo too blurry" }
      : { status: "ok", message: null },
  ];
  const firstError = checks.find((c) => c.status !== "ok");
  return { ok: !firstError, message: firstError?.message ?? null };
}
