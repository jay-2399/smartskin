import { VALIDATION_CONFIG as C } from "../config";
import type { Criterion } from "../types";

export function orientationStatus(p: { yaw: number; pitch: number; roll: number }): Criterion {
  if (Math.abs(p.yaw) > C.orientation.yaw)
    return { status: "error", message: "Tourne ta tête bien en face" };
  if (Math.abs(p.pitch) > C.orientation.pitch)
    return { status: "error", message: "Garde la tête droite, ni trop haut ni trop bas" };
  if (Math.abs(p.roll) > C.orientation.roll)
    return { status: "error", message: "Redresse ta tête" };
  return { status: "ok", message: null };
}
