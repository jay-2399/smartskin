# Plan 3 — Capture photo avec validation temps réel — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Écran capture qui valide la photo en direct (MediaPipe Face Mesh + analyses pixel), bouton déclencheur **désactivé tant que les 6 critères bloquants ne sont pas verts**, photo finale en mémoire (JPEG 92 %) jamais uploadée avant `/api/analyze`.

**Architecture :** Toute la **logique de métriques est en fonctions pures** (`metrics/*`) testées en TDD sur des matrices de pixels et des landmarks simulés. La couche caméra/MediaPipe (effets de bord navigateur) est isolée dans `camera.ts`/`faceMesh.ts`/`validationLoop.ts` et **non testée unitairement** (vérif manuelle). L'état de validation alimente le gate du bouton.

**Tech Stack :** `@mediapipe/tasks-vision` (Face Landmarker), Canvas 2D, requestAnimationFrame, Vitest.

**Pré-requis :** Plans 1 & 2 terminés.

**Spec de référence :** `docs/specs/live-analysis.md` (source de vérité — 6 critères, seuils, messages). Critère **netteté (Laplacien)** ajouté ; **centrage = soft** (non bloquant).

---

## Structure de fichiers visée

```
src/features/capture/
├─ config.ts                 ← VALIDATION_CONFIG (seuils + hystérésis)
├─ types.ts                  ← CriterionStatus, ValidationState, FaceFrame
├─ metrics/
│  ├─ faceSize.ts            ← ratio + projection (BLOQUANT)
│  ├─ luminance.ts           ← mean/stddev/lateralDelta sur 64×64 (BLOQUANT)
│  ├─ orientation.ts         ← seuils yaw/pitch/roll (BLOQUANT)
│  ├─ stability.ts           ← delta inter-frames + timer 500ms (BLOQUANT)
│  ├─ sharpness.ts           ← variance Laplacien (BLOQUANT)  ← nouveau
│  └─ centering.ts           ← offset (SOFT)
├─ evaluate.ts               ← agrège les 6 → ValidationState + canCapture + message prioritaire
├─ camera.ts                 ← getUserMedia, capture JPEG 92% (effets de bord)
├─ faceMesh.ts               ← chargement MediaPipe + extraction FaceFrame
└─ validationLoop.ts         ← boucle rAF 15-20 fps
src/components/screens/CaptureScreen.tsx
src/app/(funnel)/capture/page.tsx   ← remplace le placeholder du Plan 2
```

---

## Task 1 : Config des seuils + types

**Files:**
- Create: `src/features/capture/config.ts`, `src/features/capture/types.ts`

- [ ] **Step 1 : Types**

Create `src/features/capture/types.ts` :
```ts
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
  luminance: { mean: number; stddev: number; lateralDelta: number };
  pose: { yaw: number; pitch: number; roll: number };
  sharpness: number;       // variance Laplacien
  centerOffset: { x: number; y: number }; // fraction 0..1
  movementDelta: number;   // fraction de largeur vs frame précédente
};
```

- [ ] **Step 2 : Config seuils (depuis live-analysis.md)**

Create `src/features/capture/config.ts` :
```ts
export const VALIDATION_CONFIG = {
  faceSize: { minProjected: 800, ratioMin: 0.6, ratioMax: 0.9 },
  luminance: { meanMin: 100, meanMax: 200, stddevMax: 50, lateralDeltaMax: 30 },
  orientation: { yaw: 15, pitch: 10, roll: 20 },
  stability: { maxDeltaFrac: 0.015, holdMs: 500 },
  sharpness: { minVariance: 60 }, // à calibrer (Phase 1.5)
  centering: { maxOffset: 0.15 },
  hysteresis: 0.1, // marge relative pour éviter le clignotement
} as const;
```

- [ ] **Step 3 : Commit**
```bash
git add -A && git commit -m "feat(capture): config seuils + types de validation"
```

---

## Task 2 : Métrique luminance (pure, TDD)

**Files:**
- Create: `src/features/capture/metrics/luminance.ts`
- Create: `src/features/capture/metrics/__tests__/luminance.test.ts`

- [ ] **Step 1 : Test (échoue)**

Create `src/features/capture/metrics/__tests__/luminance.test.ts` :
```ts
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
```

- [ ] **Step 2 : Lancer, vérifier l'échec**
Run: `npm test src/features/capture/metrics/__tests__/luminance.test.ts`
Expected : FAIL — module introuvable.

- [ ] **Step 3 : Implémenter**

Create `src/features/capture/metrics/luminance.ts` :
```ts
/** Luminance Rec.601 par pixel, stats sur une image RGBA carrée déjà réduite (ex. 64×64). */
export function luminanceStats(rgba: Uint8ClampedArray, size: number) {
  const lum = (i: number) =>
    0.299 * rgba[i] + 0.587 * rgba[i + 1] + 0.114 * rgba[i + 2];

  let sum = 0, sumSq = 0, sumLeft = 0, sumRight = 0;
  const half = size / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const l = lum((y * size + x) * 4);
      sum += l; sumSq += l * l;
      if (x < half) sumLeft += l; else sumRight += l;
    }
  }
  const n = size * size;
  const mean = sum / n;
  const variance = Math.max(0, sumSq / n - mean * mean);
  const meanLeft = sumLeft / (n / 2);
  const meanRight = sumRight / (n / 2);
  return {
    mean,
    stddev: Math.sqrt(variance),
    lateralDelta: Math.abs(meanLeft - meanRight),
  };
}
```

- [ ] **Step 4 : Lancer, vérifier le succès**
Run: `npm test src/features/capture/metrics/__tests__/luminance.test.ts`
Expected : PASS.

- [ ] **Step 5 : Commit**
```bash
git add -A && git commit -m "feat(capture): métrique luminance (mean/stddev/lateralDelta) en TDD"
```

---

## Task 3 : Métrique netteté — variance Laplacien (pure, TDD)

**Files:**
- Create: `src/features/capture/metrics/sharpness.ts`
- Create: `src/features/capture/metrics/__tests__/sharpness.test.ts`

- [ ] **Step 1 : Test (échoue)**

Create `src/features/capture/metrics/__tests__/sharpness.test.ts` :
```ts
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
```

- [ ] **Step 2 : Lancer, vérifier l'échec**
Run: `npm test src/features/capture/metrics/__tests__/sharpness.test.ts`
Expected : FAIL.

- [ ] **Step 3 : Implémenter**

Create `src/features/capture/metrics/sharpness.ts` :
```ts
/** Variance du Laplacien (noyau 4-voisins) sur une image RGBA carrée en niveaux de gris.
 *  Mesure standard de netteté : faible = flou, élevé = net. */
export function laplacianVariance(rgba: Uint8ClampedArray, size: number): number {
  const g = (x: number, y: number) => rgba[(y * size + x) * 4]; // canal R (gris)
  const vals: number[] = [];
  for (let y = 1; y < size - 1; y++) {
    for (let x = 1; x < size - 1; x++) {
      const lap = g(x - 1, y) + g(x + 1, y) + g(x, y - 1) + g(x, y + 1) - 4 * g(x, y);
      vals.push(lap);
    }
  }
  const mean = vals.reduce((s, v) => s + v, 0) / vals.length;
  const variance = vals.reduce((s, v) => s + (v - mean) ** 2, 0) / vals.length;
  return variance;
}
```

- [ ] **Step 4 : Lancer, vérifier le succès**
Run: `npm test src/features/capture/metrics/__tests__/sharpness.test.ts`
Expected : PASS.

- [ ] **Step 5 : Commit**
```bash
git add -A && git commit -m "feat(capture): métrique netteté (variance Laplacien) en TDD"
```

---

## Task 4 : Métriques faceSize / orientation / centering / stability (pures, TDD)

**Files:**
- Create: `src/features/capture/metrics/{faceSize,orientation,centering,stability}.ts`
- Create: `src/features/capture/metrics/__tests__/criteria.test.ts`

- [ ] **Step 1 : Test (échoue)**

Create `src/features/capture/metrics/__tests__/criteria.test.ts` :
```ts
import { describe, it, expect } from "vitest";
import { faceSizeStatus } from "@/features/capture/metrics/faceSize";
import { orientationStatus } from "@/features/capture/metrics/orientation";
import { centeringStatus } from "@/features/capture/metrics/centering";
import { StabilityTracker } from "@/features/capture/metrics/stability";

describe("faceSizeStatus", () => {
  it("trop loin → error 'Approche-toi'", () => {
    const r = faceSizeStatus({ projectedHeight: 900, ratio: 0.5 });
    expect(r.status).toBe("error");
    expect(r.message).toMatch(/Approche/);
  });
  it("trop proche → error 'Recule'", () => {
    expect(faceSizeStatus({ projectedHeight: 900, ratio: 0.95 }).message).toMatch(/Recule/);
  });
  it("projection insuffisante → error", () => {
    expect(faceSizeStatus({ projectedHeight: 700, ratio: 0.75 }).status).toBe("error");
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
    expect(t.update(0.001, 600).status).toBe("ok");        // 600ms immobile
  });
  it("mouvement → reset", () => {
    const t = new StabilityTracker();
    t.update(0.001, 0);
    expect(t.update(0.05, 600).status).toBe("error");      // bouge
  });
});
```

- [ ] **Step 2 : Lancer, vérifier l'échec**
Run: `npm test src/features/capture/metrics/__tests__/criteria.test.ts`
Expected : FAIL.

- [ ] **Step 3 : Implémenter les 4 métriques**

Create `src/features/capture/metrics/faceSize.ts` :
```ts
import { VALIDATION_CONFIG as C } from "../config";
import type { Criterion } from "../types";

export function faceSizeStatus(f: { projectedHeight: number; ratio: number }): Criterion {
  if (f.ratio < C.faceSize.ratioMin) return { status: "error", message: "Approche-toi" };
  if (f.ratio > C.faceSize.ratioMax) return { status: "error", message: "Recule un peu" };
  if (f.projectedHeight < C.faceSize.minProjected)
    return { status: "error", message: "Approche-toi" };
  return { status: "ok", message: null };
}
```

Create `src/features/capture/metrics/orientation.ts` :
```ts
import { VALIDATION_CONFIG as C } from "../config";
import type { Criterion } from "../types";

export function orientationStatus(p: { yaw: number; pitch: number; roll: number }): Criterion {
  if (Math.abs(p.yaw) > C.orientation.yaw)
    return { status: "error", message: "Tourne ta tête bien en face" };
  if (Math.abs(p.pitch) > C.orientation.pitch)
    return { status: "error", message: "Garde la tête droite" };
  if (Math.abs(p.roll) > C.orientation.roll)
    return { status: "error", message: "Redresse ta tête" };
  return { status: "ok", message: null };
}
```

Create `src/features/capture/metrics/centering.ts` :
```ts
import { VALIDATION_CONFIG as C } from "../config";
import type { Criterion } from "../types";

export function centeringStatus(o: { x: number; y: number }): Criterion {
  if (o.x > C.centering.maxOffset || o.y > C.centering.maxOffset)
    return { status: "warning", message: "Centre ton visage dans l'ovale" };
  return { status: "ok", message: null };
}
```

Create `src/features/capture/metrics/stability.ts` :
```ts
import { VALIDATION_CONFIG as C } from "../config";
import type { Criterion } from "../types";

/** Suit la stabilité dans le temps : immobile pendant holdMs → ok. */
export class StabilityTracker {
  private stableSince: number | null = null;

  update(movementDelta: number, now: number): Criterion {
    if (movementDelta >= C.stability.maxDeltaFrac) {
      this.stableSince = null;
      return { status: "error", message: "Tiens-toi stable…" };
    }
    if (this.stableSince === null) this.stableSince = now;
    if (now - this.stableSince >= C.stability.holdMs) return { status: "ok", message: null };
    return { status: "warning", message: "Tiens-toi stable…" };
  }

  reset() { this.stableSince = null; }
}
```

- [ ] **Step 4 : Lancer, vérifier le succès**
Run: `npm test src/features/capture/metrics/__tests__/criteria.test.ts`
Expected : PASS.

- [ ] **Step 5 : Commit**
```bash
git add -A && git commit -m "feat(capture): métriques faceSize/orientation/centering/stability en TDD"
```

---

## Task 5 : Agrégation → ValidationState + gate (pure, TDD)

**Files:**
- Create: `src/features/capture/evaluate.ts`
- Create: `src/features/capture/__tests__/evaluate.test.ts`

- [ ] **Step 1 : Test (échoue)**

Create `src/features/capture/__tests__/evaluate.test.ts` :
```ts
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
```

- [ ] **Step 2 : Lancer, vérifier l'échec**
Run: `npm test src/features/capture/__tests__/evaluate.test.ts`
Expected : FAIL.

- [ ] **Step 3 : Implémenter `evaluate.ts`**

Create `src/features/capture/evaluate.ts` :
```ts
import { VALIDATION_CONFIG as C } from "./config";
import type { Criterion, FaceFrame, ValidationState } from "./types";
import { faceSizeStatus } from "./metrics/faceSize";
import { orientationStatus } from "./metrics/orientation";
import { centeringStatus } from "./metrics/centering";
import { StabilityTracker } from "./metrics/stability";

function faceCountStatus(n: number): Criterion {
  if (n === 0) return { status: "error", message: "Place ton visage dans le cadre" };
  if (n > 1) return { status: "error", message: "Une seule personne dans le cadre" };
  return { status: "ok", message: null };
}

function luminanceStatus(l: FaceFrame["luminance"]): Criterion {
  if (l.mean < C.luminance.meanMin) return { status: "error", message: "Pas assez de lumière" };
  if (l.mean > C.luminance.meanMax) return { status: "error", message: "Trop de lumière directe" };
  if (l.stddev >= C.luminance.stddevMax)
    return { status: "error", message: "Tu es à contre-jour, tourne-toi face à la lumière" };
  if (l.lateralDelta >= C.luminance.lateralDeltaMax)
    return { status: "error", message: "Lumière trop forte d'un côté" };
  return { status: "ok", message: null };
}

function sharpnessStatus(v: number): Criterion {
  if (v < C.sharpness.minVariance) return { status: "error", message: "Image floue, attends la mise au point" };
  return { status: "ok", message: null };
}

/** Ordre de priorité des messages = importance des critères (live-analysis.md). */
const ORDER = ["faceCount", "faceSize", "luminance", "orientation", "stability", "sharpness"] as const;

export function evaluateFrame(
  f: FaceFrame,
  tracker: StabilityTracker,
  now: number
): ValidationState {
  const crit = {
    faceCount: faceCountStatus(f.faceCount),
    faceSize: faceSizeStatus(f),
    luminance: luminanceStatus(f.luminance),
    orientation: orientationStatus(f.pose),
    stability: tracker.update(f.movementDelta, now),
    sharpness: sharpnessStatus(f.sharpness),
    centering: centeringStatus(f.centerOffset), // SOFT
  };

  const blocking = ORDER.map((k) => crit[k]);
  const canCapture = blocking.every((c) => c.status === "ok");
  const firstError = ORDER.map((k) => crit[k]).find((c) => c.status !== "ok");

  return { ...crit, canCapture, topMessage: firstError?.message ?? null };
}
```

- [ ] **Step 4 : Lancer, vérifier le succès**
Run: `npm test src/features/capture/__tests__/evaluate.test.ts`
Expected : PASS.

- [ ] **Step 5 : Commit**
```bash
git add -A && git commit -m "feat(capture): agrégation des 6 critères bloquants + centrage soft + gate (TDD)"
```

---

## Task 6 : Couche caméra + MediaPipe (effets de bord, vérif manuelle)

**Files:**
- Create: `src/features/capture/camera.ts`, `faceMesh.ts`, `validationLoop.ts`
- Modify: `package.json` (dep `@mediapipe/tasks-vision`)

> ⚠️ Couche non testée unitairement (APIs navigateur). Vérification = manuelle au Task 7.

- [ ] **Step 1 : Installer MediaPipe**
Run: `cd /Users/jayenbellili/Documents/smartskin-app && npm i @mediapipe/tasks-vision`

- [ ] **Step 2 : `camera.ts`** (flux + capture JPEG 92 %, dé-mirroring)

Create `src/features/capture/camera.ts` :
```ts
export async function startCamera(video: HTMLVideoElement): Promise<MediaStream> {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 1280 } },
    audio: false,
  });
  video.srcObject = stream;
  await video.play();
  return stream;
}

export function stopCamera(stream: MediaStream | null) {
  stream?.getTracks().forEach((t) => t.stop());
}

/** Capture la frame courante en JPEG 92 %, dé-mirroring (caméra frontale). */
export function captureJpeg(video: HTMLVideoElement): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext("2d")!;
  ctx.translate(canvas.width, 0);
  ctx.scale(-1, 1); // dé-mirror
  ctx.drawImage(video, 0, 0);
  return new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b!), "image/jpeg", 0.92)
  );
}
```

- [ ] **Step 3 : `faceMesh.ts`** (chargement + extraction d'une `FaceFrame`)

Create `src/features/capture/faceMesh.ts` : charger `FaceLandmarker` (`@mediapipe/tasks-vision`), exposer `loadFaceMesh()` (gère `isModelLoading`) et `extractFrame(landmarker, video, prevCenter): FaceFrame`. L'extraction calcule : `faceCount` (nb de faces), bounding box → `ratio`/`projectedHeight`, pose (yaw/pitch/roll depuis la matrice faciale), `centerOffset`, `movementDelta` (vs `prevCenter`), et appelle `luminanceStats`/`laplacianVariance` sur la zone visage réduite à 64×64 via un canvas masqué.

```ts
import { FaceLandmarker, FilesetResolver } from "@mediapipe/tasks-vision";
import type { FaceFrame } from "./types";
import { luminanceStats } from "./metrics/luminance";
import { laplacianVariance } from "./metrics/sharpness";

export async function loadFaceMesh(): Promise<FaceLandmarker> {
  const fileset = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm"
  );
  return FaceLandmarker.createFromOptions(fileset, {
    baseOptions: {
      modelAssetPath:
        "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
    },
    runningMode: "VIDEO",
    numFaces: 2,
    outputFacialTransformationMatrixes: true,
  });
}

// extractFrame : voir live-analysis.md §3-4 pour les formules exactes (ratio, pose, luminance 64×64,
// Laplacien, movementDelta). Retourne une FaceFrame consommée par evaluateFrame().
export function extractFrame(/* landmarker, video, ovalBox, prevCenter */): FaceFrame {
  throw new Error("À implémenter selon live-analysis.md §3-4 (extraction landmarks → FaceFrame)");
}
```

> Implémenter `extractFrame` au branchement réel (Task 7), en suivant les formules de `live-analysis.md`. Les fonctions pures qu'il appelle (`luminanceStats`, `laplacianVariance`) sont déjà testées.

- [ ] **Step 4 : `validationLoop.ts`** (boucle rAF 15-20 fps + hystérésis)

Create `src/features/capture/validationLoop.ts` : boucle `requestAnimationFrame` cappée à ~18 fps qui appelle `extractFrame` → `evaluateFrame` → callback de mise à jour UI (throttlée 5-10 fps). Détails de cap/throttle selon `live-analysis.md` §Performance.

- [ ] **Step 5 : Build (type-check)**
Run: `npm run build`
Expected : compile (les effets de bord ne sont pas exécutés au build).

- [ ] **Step 6 : Commit**
```bash
git add -A && git commit -m "feat(capture): couche caméra + chargement MediaPipe + squelette boucle de validation"
```

---

## Task 7 : Écran capture + branchement complet

**Files:**
- Create: `src/components/screens/CaptureScreen.tsx`
- Modify: `src/app/(funnel)/capture/page.tsx` (remplace le placeholder du Plan 2)
- Modify: `src/components/screens/QuestionScreen.tsx` (q1 → `/capture`)

- [ ] **Step 1 : `CaptureScreen`** — `<video>` + overlay ovale, indicateurs des 6 critères (✓/✗/⏳), un seul `topMessage`, overlay « Initialisation de l'IA… » tant que `isModelLoading`, bouton **désactivé** si `!canCapture`. Au déclenchement : `captureJpeg(video)` → `useFunnel.getState().setPhoto(blob)` → `router.push("/questions/q2")`. Implémenter `extractFrame` (Task 6 Step 3) ici en suivant `live-analysis.md`.

- [ ] **Step 2 : Brancher la route capture**

Overwrite `src/app/(funnel)/capture/page.tsx` :
```tsx
import { CaptureScreen } from "@/components/screens/CaptureScreen";
export default function Page() { return <CaptureScreen />; }
```

- [ ] **Step 3 : Rerouter q1 → capture**

Modify `src/components/screens/QuestionScreen.tsx` — dans `next()`, après q1 aller à `/capture` :
```ts
const next = () => {
  if (step === "q1") { router.push("/capture"); return; }
  const i = STEP_ORDER.indexOf(step);
  if (i < STEP_ORDER.length - 1) router.push(`/questions/${STEP_ORDER[i + 1]}`);
  else router.push("/compte");
};
```

- [ ] **Step 4 : Vérif manuelle (caméra réelle)**
Run: `npm run dev` (HTTPS requis pour getUserMedia : utiliser `localhost` qui est autorisé) → `/capture`.
Expected : overlay d'init, puis flux caméra ; le bouton reste grisé tant que les 6 critères ne sont pas verts ; messages d'aide cohérents ; déclenchement possible une fois tout vert → photo stockée → q2.

- [ ] **Step 5 : Suite de tests + build**
Run: `npm test && npm run build`
Expected : tous les tests purs passent, build OK.

- [ ] **Step 6 : Commit**
```bash
git add -A && git commit -m "feat(capture): écran capture + gate strict + branchement q1→capture→q2"
```

---

## Definition of Done (Plan 3)
- Métriques (luminance, netteté, faceSize, orientation, stability, centering) **pures et testées**.
- `evaluateFrame` agrège 6 bloquants + centrage soft → `canCapture` + message prioritaire (testé).
- Écran capture : bouton désactivé tant que tout n'est pas vert ; overlay d'init MediaPipe ; photo JPEG 92 % stockée en mémoire (jamais uploadée).
- Flux q1 → capture → q2 fonctionnel.

## Hors périmètre
- Logging `CaptureMetric` / calibrage seuils → **Plan 6 (Phase 1.5)**.
- `/compte`, auth → **Plan 4**.
