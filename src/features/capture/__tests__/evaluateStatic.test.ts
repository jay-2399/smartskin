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
    expect(r.message).toMatch(/face/i);
  });

  it("trop floue → refus", () => {
    const r = evaluateStaticImage({ ...good, sharpness: 1 });
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/blurry/i);
  });

  it("la stabilité n'entre PAS en compte (movementDelta ignoré)", () => {
    expect(evaluateStaticImage({ ...good, movementDelta: 999 }).ok).toBe(true);
  });

  it("le centrage (soft) ne bloque pas", () => {
    expect(evaluateStaticImage({ ...good, centerOffset: { x: 0.4, y: 0 } }).ok).toBe(true);
  });

  it("un selfie au visage plus petit que l'ovale du live → OK (seuils upload assouplis)", () => {
    // ratio 0.30 échouerait au live (ratioMin 0.45) mais convient à une photo importée
    expect(evaluateStaticImage({ ...good, ratio: 0.3, projectedHeight: 500 }).ok).toBe(true);
  });

  it("un léger 3/4 (yaw 28°) → OK pour un upload", () => {
    expect(evaluateStaticImage({ ...good, pose: { yaw: 28, pitch: 5, roll: 4 } }).ok).toBe(true);
  });

  it("visage minuscule (ratio 0.10) → refus", () => {
    const r = evaluateStaticImage({ ...good, ratio: 0.1, projectedHeight: 150 });
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/larger/i);
  });

  it("photo très sombre → refus", () => {
    const r = evaluateStaticImage({ ...good, luminance: { mean: 30, stddev: 20, lateralDelta: 5 } });
    expect(r.ok).toBe(false);
    expect(r.message).toMatch(/dark/i);
  });
});
