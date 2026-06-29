"use client";
import { useEffect, useRef } from "react";
import { paintFaceMesh } from "@/features/analysis/paintFaceMesh";

/* Photo analysée : entrée floue→nette + maillage facial qui se dessine puis s'estompe.
   Port du <script> de reference/User_flow_screens/11-prop_1-resultats.html (l.758-823).
   Le maillage MediaPipe est partagé via paintFaceMesh (cf. /analyse + intro routine). */
export function ResultPhotoMesh({ src }: { src: string | null }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!src) return;
    if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;

    let cancelled = false;
    (async () => {
      const img = imgRef.current, canvas = canvasRef.current, wrap = wrapRef.current;
      if (!img || !canvas || !wrap) return;
      const ok = await paintFaceMesh(img, canvas, wrap, { objectPositionY: 0.20 });
      if (ok && !cancelled) canvas.classList.add("on");
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
