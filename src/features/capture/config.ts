// Seuils de validation live — valeurs par défaut de docs/specs/live-analysis.md,
// à calibrer empiriquement en Phase 1.5 (logging CaptureMetric, Plan 6).
export const VALIDATION_CONFIG = {
  faceSize: { minProjected: 800, ratioMin: 0.6, ratioMax: 0.9 },
  luminance: { meanMin: 100, meanMax: 200, stddevMax: 50, lateralDeltaMax: 30 },
  orientation: { yaw: 15, pitch: 10, roll: 20 },
  stability: { maxDeltaFrac: 0.015, holdMs: 500 },
  sharpness: { minVariance: 60 }, // à calibrer (Phase 1.5)
  centering: { maxOffset: 0.15 },
} as const;
