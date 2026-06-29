import { VALIDATION_CONFIG as C } from "../config";
import type { Criterion } from "../types";

export function orientationStatus(p: { yaw: number; pitch: number; roll: number }): Criterion {
  if (Math.abs(p.yaw) > C.orientation.yaw)
    return { status: "error", message: "Turn your head straight to the camera" };
  if (Math.abs(p.pitch) > C.orientation.pitch)
    return { status: "error", message: "Keep your head level, not too high or low" };
  if (Math.abs(p.roll) > C.orientation.roll)
    return { status: "error", message: "Straighten your head" };
  return { status: "ok", message: null };
}
