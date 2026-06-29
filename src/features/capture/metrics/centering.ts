import { VALIDATION_CONFIG as C } from "../config";
import type { Criterion } from "../types";

export function centeringStatus(o: { x: number; y: number }): Criterion {
  if (o.x > C.centering.maxOffset || o.y > C.centering.maxOffset)
    return { status: "warning", message: "Center your face in the oval" };
  return { status: "ok", message: null };
}
