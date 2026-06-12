// Seuils de validation live — valeurs de docs/specs/live-analysis.md,
// recalibrées après test caméra réelle (2026-06-13) :
// - minProjected 800→400 : une webcam 720p ne peut jamais projeter 800px.
// - ratio 0.60-0.90 → 0.45-0.95 : « Bonne distance » trop capricieux.
// - pitch ±10°→±20°, yaw ±15°→±20° : webcam de laptop = légère contre-plongée.
// Calibrage fin via logging CaptureMetric en Phase 1.5 (Plan 6).
export const VALIDATION_CONFIG = {
  faceSize: { minProjected: 400, ratioMin: 0.45, ratioMax: 0.95 },
  luminance: { meanMin: 100, meanMax: 200, stddevMax: 50, lateralDeltaMax: 30 },
  orientation: { yaw: 20, pitch: 20, roll: 25 },
  stability: { maxDeltaFrac: 0.015, holdMs: 500 },
  sharpness: { minVariance: 60 }, // à calibrer (Phase 1.5)
  centering: { maxOffset: 0.15 },
  autoCapture: { holdMs: 3000 }, // capture auto 3 s après tout-vert (décision produit)
} as const;
