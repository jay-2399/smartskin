import { VALIDATION_CONFIG as C } from "../config";
import type { Criterion } from "../types";

export function centeringStatus(o: { x: number; y: number }): Criterion {
  if (o.x > C.centering.maxOffset || o.y > C.centering.maxOffset)
    return { status: "warning", message: "Centre ton visage dans l'ovale" };
  return { status: "ok", message: null };
}
