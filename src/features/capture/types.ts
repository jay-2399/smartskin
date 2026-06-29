export type Status = "ok" | "warning" | "error";

export type Criterion = {
  status: Status;
  message: string | null;
};

export type ValidationState = {
  faceSize: Criterion;
  luminance: Criterion;
  faceCount: Criterion;
  orientation: Criterion;
  stability: Criterion;
  sharpness: Criterion;
  centering: Criterion; // soft
  canCapture: boolean;
  topMessage: string | null;
};

/** Données extraites d'une frame par MediaPipe (ou simulées en test). */
export type FaceFrame = {
  faceCount: number;
  projectedHeight: number; // px sur l'image finale
  ratio: number;           // faceHeight / ovalHeight
  luminance: { mean: number; stddev: number; lateralDelta: number; shadowRange: number };
  pose: { yaw: number; pitch: number; roll: number };
  sharpness: number;       // variance Laplacien
  centerOffset: { x: number; y: number }; // fraction 0..1
  movementDelta: number;   // fraction de largeur vs frame précédente
};
