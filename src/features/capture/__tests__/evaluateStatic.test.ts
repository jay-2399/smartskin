import { describe, it, expect } from "vitest";
import { evaluateStaticImage } from "@/features/capture/evaluate";
import type { FaceFrame } from "@/features/capture/types";

const good: FaceFrame = {
  faceCount: 1,
  projectedHeight: 900, ratio: 0.75,
  luminance: { mean: 150, stddev: 20, lateralDelta: 5 },
  pose: { yaw: 2, pitch: 1, roll: 3 },
  sharpness: 200,
  centerOffset: { x: 0.05, y: 0.05 },
  movementDelta: 1, // ignoré pour une image statique
};

describe("evaluateStaticImage", () => {
  it("image conforme → ok", () => {
    expect(evaluateStaticImage(good)).toEqual({ ok: true, message: null });
  });

  it("pas de visage → refus avec message", () => {
    const r = evaluateStaticImage({ ...good, faceCount: 0 });
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/visage/i);
  });

  it("trop floue → refus", () => {
    const r = evaluateStaticImage({ ...good, sharpness: 1 });
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/floue/i);
  });

  it("la stabilité n'entre PAS en compte (movementDelta ignoré)", () => {
    expect(evaluateStaticImage({ ...good, movementDelta: 999 }).ok).toBe(true);
  });

  it("le centrage (soft) ne bloque pas", () => {
    expect(evaluateStaticImage({ ...good, centerOffset: { x: 0.4, y: 0 } }).ok).toBe(true);
  });
});
