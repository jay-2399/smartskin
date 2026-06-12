import { describe, it, expect } from "vitest";
import { evaluateFrame } from "@/features/capture/evaluate";
import { StabilityTracker } from "@/features/capture/metrics/stability";
import type { FaceFrame } from "@/features/capture/types";

const goodFrame: FaceFrame = {
  faceCount: 1,
  projectedHeight: 900, ratio: 0.75,
  luminance: { mean: 150, stddev: 20, lateralDelta: 5 },
  pose: { yaw: 2, pitch: 1, roll: 3 },
  sharpness: 200,
  centerOffset: { x: 0.05, y: 0.05 },
  movementDelta: 0.001,
};

describe("evaluateFrame", () => {
  it("frame parfaite + stable → canCapture true", () => {
    const tracker = new StabilityTracker();
    evaluateFrame(goodFrame, tracker, 0);
    const s = evaluateFrame(goodFrame, tracker, 600);
    expect(s.canCapture).toBe(true);
  });

  it("2 visages → canCapture false + message présence", () => {
    const s = evaluateFrame({ ...goodFrame, faceCount: 2 }, new StabilityTracker(), 600);
    expect(s.canCapture).toBe(false);
    expect(s.faceCount.status).toBe("error");
  });

  it("centrage décalé ne bloque PAS (soft)", () => {
    const tracker = new StabilityTracker();
    evaluateFrame({ ...goodFrame, centerOffset: { x: 0.3, y: 0 } }, tracker, 0);
    const s = evaluateFrame({ ...goodFrame, centerOffset: { x: 0.3, y: 0 } }, tracker, 600);
    expect(s.centering.status).toBe("warning");
    expect(s.canCapture).toBe(true);
  });

  it("message prioritaire = premier critère bloquant en erreur", () => {
    const s = evaluateFrame({ ...goodFrame, faceCount: 0, sharpness: 1 }, new StabilityTracker(), 600);
    expect(s.topMessage).toMatch(/visage/i); // présence prioritaire sur netteté
  });
});
