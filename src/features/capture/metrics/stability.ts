import { VALIDATION_CONFIG as C } from "../config";
import type { Criterion } from "../types";

/** Suit la stabilité dans le temps : immobile pendant holdMs → ok. */
export class StabilityTracker {
  private stableSince: number | null = null;

  update(movementDelta: number, now: number): Criterion {
    if (movementDelta >= C.stability.maxDeltaFrac) {
      this.stableSince = null;
      return { status: "error", message: "Hold still…" };
    }
    if (this.stableSince === null) this.stableSince = now;
    if (now - this.stableSince >= C.stability.holdMs) return { status: "ok", message: null };
    return { status: "warning", message: "Hold still…" };
  }

  reset() { this.stableSince = null; }
}
