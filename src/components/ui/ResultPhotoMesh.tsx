"use client";
import { useEffect, useRef } from "react";

/* Photo analysée : entrée floue→nette + maillage facial qui se dessine puis s'estompe.
   Port du <script> de reference/User_flow_screens/11-prop_1-resultats.html (l.758-823).
   MediaPipe chargé en mode IMAGE, après le paint, en échec silencieux. */
export function ResultPhotoMesh({ src }: { src: string | null }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!src) return;
    if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    let cancelled = false;
    (async () => {
      try {
        const img = imgRef.current, canvas = canvasRef.current, wrap = wrapRef.current;
        if (!img || !canvas || !wrap) return;
        await img.decode().catch(() => {});
        if (cancelled) return;

        const vision = await import("@mediapipe/tasks-vision");
        const { FaceLandmarker, FilesetResolver, DrawingUtils } = vision;
        const fileset = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/wasm"
        );
        const landmarker = await FaceLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task" },
          runningMode: "IMAGE",
          numFaces: 1,
        });
        if (cancelled) { landmarker.close(); return; }

        const out = landmarker.detect(img);
        landmarker.close();
        const lms = out.faceLandmarks?.[0];
        if (!lms || cancelled) return;

        // mapping object-fit: cover + object-position center 20%
        const boxW = wrap.clientWidth, boxH = wrap.clientHeight;
        const natW = img.naturalWidth, natH = img.naturalHeight;
        const scale = Math.max(boxW / natW, boxH / natH);
        const dispW = natW * scale, dispH = natH * scale;
        const offX = (boxW - dispW) / 2, offY = (boxH - dispH) * 0.20;
        const dpr = window.devicePixelRatio || 1;

        Object.assign(canvas.style, { left: `${offX}px`, top: `${offY}px`, width: `${dispW}px`, height: `${dispH}px` });
        canvas.width = Math.round(dispW * dpr);
        canvas.height = Math.round(dispH * dpr);

        const ctx = canvas.getContext("2d")!;
        const du = new DrawingUtils(ctx);
        du.drawConnectors(lms, FaceLandmarker.FACE_LANDMARKS_TESSELATION, { color: "rgba(255,255,255,0.18)", lineWidth: 0.4 * dpr });
        const c = { color: "rgba(255,255,255,0.4)", lineWidth: 0.6 * dpr };
        du.drawConnectors(lms, FaceLandmarker.FACE_LANDMARKS_FACE_OVAL, c);
        du.drawConnectors(lms, FaceLandmarker.FACE_LANDMARKS_LEFT_EYE, c);
        du.drawConnectors(lms, FaceLandmarker.FACE_LANDMARKS_RIGHT_EYE, c);
        du.drawConnectors(lms, FaceLandmarker.FACE_LANDMARKS_LEFT_EYEBROW, c);
        du.drawConnectors(lms, FaceLandmarker.FACE_LANDMARKS_RIGHT_EYEBROW, c);
        du.drawConnectors(lms, FaceLandmarker.FACE_LANDMARKS_LIPS, c);

        canvas.classList.add("on");
      } catch {
        // échec silencieux : photo intacte
      }
    })();

    return () => { cancelled = true; };
  }, [src]);

  return (
    <div className="hero-photo-big" ref={wrapRef}>
      {src && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element -- blob en mémoire */}
          <img ref={imgRef} className="rpm-img" src={src} alt="Visage analysé" />
          <canvas ref={canvasRef} className="rpm-mesh" aria-hidden />
        </>
      )}
      <div className="frame-corners"><span className="fc-tl" /><span className="fc-tr" /><span className="fc-bl" /><span className="fc-br" /></div>
    </div>
  );
}
