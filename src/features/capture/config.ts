// Seuils de validation live — valeurs de docs/specs/live-analysis.md,
// recalibrées après test caméra réelle (2026-06-13) :
// - minProjected 800→400 : une webcam 720p ne peut jamais projeter 800px.
// - ratio 0.60-0.90 → 0.45-0.95 : « Bonne distance » trop capricieux.
// - pitch ±10°→±20°, yaw ±15°→±20° : webcam de laptop = légère contre-plongée.
// Calibrage fin via logging CaptureMetric en Phase 1.5 (Plan 6).
export const VALIDATION_CONFIG = {
  // Distance resserrée « un peu » (ratioMin 0.45→0.52, minProjected 400→470) :
  // visage un peu plus grand dans le cadre → texture/pores mieux visibles.
  faceSize: { minProjected: 470, ratioMin: 0.52, ratioMax: 0.95 },
  // shadowRangeMax : écart max toléré entre la case la plus sombre et la plus claire
  // de la grille 3×3 du visage (réglage MODÉRÉ — ne bloque qu'une ombre marquée ;
  // à calibrer finement via CaptureMetric en Phase 1.5).
  // meanMin remonté progressivement (100→120→132) : exige une lumière un peu plus franche.
  luminance: { meanMin: 132, meanMax: 200, stddevMax: 50, lateralDeltaMax: 30, shadowRangeMax: 65 },
  orientation: { yaw: 20, pitch: 20, roll: 25 },
  stability: { maxDeltaFrac: 0.015, holdMs: 500 },
  sharpness: { minVariance: 60 }, // à calibrer (Phase 1.5)
  centering: { maxOffset: 0.15 },
  autoCapture: { holdMs: 3000 }, // capture auto 3 s après tout-vert (décision produit)
  // Seuils ASSOUPLIS pour une photo IMPORTÉE : pas de cadrage ovale imposé.
  // Un selfie normal a un visage bien plus petit que l'ovale du live (ratio ~0.2-0.4)
  // et souvent un léger 3/4 — on ne valide donc que l'essentiel pour l'analyse :
  // un seul visage, assez grand et net, à peu près de face, ni trop sombre ni cramé.
  upload: {
    ratioMin: 0.18, // visage ≥ ~18 % du cadre (rejette un visage minuscule dans une photo large)
    minProjected: 220, // au moins ~220 px de haut pour voir la peau
    yaw: 32, pitch: 32, roll: 35, // 3/4 léger toléré
    meanMin: 55, meanMax: 235, // ni trop sombre ni surexposé
    shadowRangeMax: 80, // ombre marquée sur le visage (un peu plus tolérant qu'en live)
    minVariance: 35, // netteté (photos compressées un peu plus tolérées)
  },
} as const;
