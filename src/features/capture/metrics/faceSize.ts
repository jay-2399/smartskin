import { VALIDATION_CONFIG as C } from "../config";
import type { Criterion } from "../types";

export function faceSizeStatus(f: { projectedHeight: number; ratio: number }): Criterion {
  if (f.ratio < C.faceSize.ratioMin) return { status: "error", message: "Move closer" };
  if (f.ratio > C.faceSize.ratioMax) return { status: "error", message: "Move back a little" };
  if (f.projectedHeight < C.faceSize.minProjected)
    return { status: "error", message: "Move closer" };
  return { status: "ok", message: null };
}
