import { describe, it, expect } from "vitest";
import { laplacianVariance } from "@/features/capture/metrics/sharpness";

function gray(size: number, fill: (x: number, y: number) => number): Uint8ClampedArray {
  const a = new Uint8ClampedArray(size * size * 4);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const v = fill(x, y); const i = (y * size + x) * 4;
    a[i]=v; a[i+1]=v; a[i+2]=v; a[i+3]=255;
  }
  return a;
}

describe("laplacianVariance", () => {
  it("image plate → variance ≈ 0 (floue)", () => {
    expect(laplacianVariance(gray(32, () => 128), 32)).toBeLessThan(1);
  });

  it("damier net → variance élevée", () => {
    const v = laplacianVariance(gray(32, (x, y) => ((x + y) % 2 ? 255 : 0)), 32);
    expect(v).toBeGreaterThan(100);
  });
});
