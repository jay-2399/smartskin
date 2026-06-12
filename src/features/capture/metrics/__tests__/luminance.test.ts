import { describe, it, expect } from "vitest";
import { luminanceStats } from "@/features/capture/metrics/luminance";

/** Construit une image RGBA unie de size×size. */
function solid(size: number, v: number): Uint8ClampedArray {
  const a = new Uint8ClampedArray(size * size * 4);
  for (let i = 0; i < size * size; i++) { a[i*4]=v; a[i*4+1]=v; a[i*4+2]=v; a[i*4+3]=255; }
  return a;
}

describe("luminanceStats (64×64)", () => {
  it("image unie → mean = valeur, stddev ≈ 0, lateralDelta ≈ 0", () => {
    const s = luminanceStats(solid(64, 150), 64);
    expect(Math.round(s.mean)).toBe(150);
    expect(s.stddev).toBeLessThan(1);
    expect(s.lateralDelta).toBeLessThan(1);
  });

  it("moitié gauche sombre / droite claire → lateralDelta élevé", () => {
    const size = 64;
    const a = new Uint8ClampedArray(size * size * 4);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const v = x < size / 2 ? 40 : 200;
      const i = (y * size + x) * 4;
      a[i]=v; a[i+1]=v; a[i+2]=v; a[i+3]=255;
    }
    const s = luminanceStats(a, size);
    expect(s.lateralDelta).toBeGreaterThan(100);
  });
});
