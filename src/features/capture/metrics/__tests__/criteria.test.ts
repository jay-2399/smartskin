import { describe, it, expect } from "vitest";
import { faceSizeStatus } from "@/features/capture/metrics/faceSize";
import { orientationStatus } from "@/features/capture/metrics/orientation";
import { centeringStatus } from "@/features/capture/metrics/centering";
import { StabilityTracker } from "@/features/capture/metrics/stability";

describe("faceSizeStatus", () => {
  it("trop loin → error 'Approche-toi'", () => {
    const r = faceSizeStatus({ projectedHeight: 900, ratio: 0.3 });
    expect(r.status).toBe("error");
    expect(r.message).toMatch(/closer/);
  });
  it("trop proche → error 'Recule'", () => {
    expect(faceSizeStatus({ projectedHeight: 900, ratio: 0.98 }).message).toMatch(/back/);
  });
  it("projection insuffisante → error", () => {
    expect(faceSizeStatus({ projectedHeight: 300, ratio: 0.75 }).status).toBe("error");
  });
  it("ok", () => {
    expect(faceSizeStatus({ projectedHeight: 900, ratio: 0.75 }).status).toBe("ok");
  });
});

describe("orientationStatus", () => {
  it("yaw excessif → error", () => {
    expect(orientationStatus({ yaw: 25, pitch: 0, roll: 0 }).status).toBe("error");
  });
  it("dans les seuils → ok", () => {
    expect(orientationStatus({ yaw: 5, pitch: -3, roll: 10 }).status).toBe("ok");
  });
});

describe("centeringStatus (soft)", () => {
  it("décentré → warning, jamais error", () => {
    expect(centeringStatus({ x: 0.3, y: 0 }).status).toBe("warning");
  });
  it("centré → ok", () => {
    expect(centeringStatus({ x: 0.05, y: 0.05 }).status).toBe("ok");
  });
});

describe("StabilityTracker", () => {
  it("immobile pendant holdMs → ok", () => {
    const t = new StabilityTracker();
    expect(t.update(0.001, 0).status).toBe("warning");   // t=0
    expect(t.update(0.001, 600).status).toBe("ok");      // 600ms immobile
  });
  it("mouvement → reset", () => {
    const t = new StabilityTracker();
    t.update(0.001, 0);
    expect(t.update(0.05, 600).status).toBe("error");    // bouge
  });
});
