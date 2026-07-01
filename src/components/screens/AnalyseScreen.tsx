"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useFunnel } from "@/features/funnel/store";
import { useResult } from "@/features/analysis/resultStore";
import { paintFaceMesh } from "@/features/analysis/paintFaceMesh";
import type { AnalysisResult } from "@/features/analysis/schema";

/* Port de reference/User_flow_screens/10-analyse.html.
   La barre de progression est calée sur la durée réelle de l'analyse :
   elle avance jusqu'à ~90 % pendant l'attente (messages par étape), puis
   termine à 100 % dès que le résultat arrive. */

// Étapes affichées selon l'avancement (%). Tirées du déroulé d'une analyse.
const STAGES: { at: number; msg: string }[] = [
  { at: 0, msg: "Detecting your face…" },
  { at: 14, msg: "Reading your skin texture…" },
  { at: 30, msg: "Analyzing pores and oil…" },
  { at: 48, msg: "Mapping tone and radiance…" },
  { at: 65, msg: "Assessing sensitive areas…" },
  { at: 82, msg: "Compiling your diagnosis…" },
];
// Constante de temps du remplissage : la barre avance EN CONTINU (creep asymptotique)
// vers ~97 % sans jamais se figer, même si l'IA met plus longtemps que prévu (~40 s).
// Elle ne saute à 100 % que lorsque le résultat arrive réellement.
const FILL_TAU_MS = 14000;

function stageFor(pct: number): string {
  let m = STAGES[0].msg;
  for (const s of STAGES) if (pct >= s.at) m = s.msg;
  return m;
}

async function blobToBase64(blob: Blob): Promise<string> {
  const buf = await blob.arrayBuffer();
  let bin = "";
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

export function AnalyseScreen() {
  const router = useRouter();
  const photo = useFunnel((s) => s.photo);
  const photoUrl = useMemo(() => (photo ? URL.createObjectURL(photo) : null), [photo]);
  const [pct, setPct] = useState(0);
  const [msg, setMsg] = useState(STAGES[0].msg);
  const [error, setError] = useState(false);
  const scanRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const meshRef = useRef<HTMLCanvasElement>(null);

  // État de l'appel, partagé entre les (re)montages StrictMode : l'appel ne part
  // qu'une fois, mais la boucle d'animation, elle, est relancée à chaque montage.
  const work = useRef<{
    started: boolean; t0: number;
    result: AnalysisResult | null; doneAt: number | null; failed: boolean;
  }>({ started: false, t0: 0, result: null, doneAt: null, failed: false });

  useEffect(() => {
    if (!photo) router.replace("/capture");
  }, [photo, router]);

  useEffect(() => () => { if (photoUrl) URL.revokeObjectURL(photoUrl); }, [photoUrl]);

  // Maillage facial réel (MediaPipe), identique au reveal, dessiné sur la photo scannée.
  useEffect(() => {
    if (!photoUrl) return;
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    let cancelled = false;
    (async () => {
      const img = imgRef.current, canvas = meshRef.current, wrap = scanRef.current;
      if (!img || !canvas || !wrap) return;
      const ok = await paintFaceMesh(img, canvas, wrap, { objectPositionY: 0.22 });
      if (ok && !cancelled) canvas.classList.add("on");
    })();
    return () => { cancelled = true; };
  }, [photoUrl]);

  useEffect(() => {
    if (!photo) return;
    const w = work.current;

    // 1) appel réel — une seule fois
    if (!w.started) {
      w.started = true;
      w.t0 = performance.now();
      const answers = useFunnel.getState().answers;
      (async () => {
        try {
          const res = await fetch("/api/analyze", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ answers, image: await blobToBase64(photo) }),
          });
          if (res.status === 422) { router.replace("/capture"); return; }
          if (!res.ok) { w.failed = true; return; }
          w.result = await res.json();
          w.doneAt = performance.now();
        } catch {
          w.failed = true;
        }
      })();
    }

    // 2) boucle d'animation — (re)démarrée à chaque montage
    let raf = 0;
    let pctAtDone: number | null = null;
    let finishedAt: number | null = null;
    let last = 0;

    const tick = (ts: number) => {
      if (w.failed) { setError(true); return; }

      let value: number;
      if (w.doneAt !== null) {
        if (pctAtDone === null) pctAtDone = last;
        const k = Math.min((ts - w.doneAt) / 700, 1); // remontée vers 100 sur 700 ms
        value = pctAtDone + (100 - pctAtDone) * k;
      } else {
        // Creep continu : 97·(1−e^(−t/τ)). Toujours croissant → jamais figé, et plafonne
        // doucement sous 100 tant que l'IA n'a pas répondu (le 100 vient via w.doneAt).
        value = 97 * (1 - Math.exp(-(ts - w.t0) / FILL_TAU_MS));
      }
      last = value;

      if (value >= 99.5) {
        setPct(100);
        setMsg("Diagnosis ready");
        if (finishedAt === null) finishedAt = ts;
        if (ts - finishedAt >= 600) { // petit temps fort « prêt »
          const res = w.result;
          if (res) useResult.getState().set(res, photo);
          if (res && useFunnel.getState().rescan) {
            // re-scan depuis le dashboard : enregistre le nouveau scan sous le compte
            // (déjà connecté) PUIS revient au dashboard (un nouveau point apparaît).
            const answers = useFunnel.getState().answers;
            useFunnel.getState().reset();
            void (async () => {
              await fetch("/api/scan", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ result: res, answers }) }).catch(() => {});
              router.replace("/dashboard");
            })();
          } else {
            router.replace("/resultats");
          }
          return;
        }
      } else {
        setPct(Math.round(value));
        setMsg(stageFor(value));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => cancelAnimationFrame(raf);
  }, [photo, router]);

  return (
    <div className="screen analyse">
      <div className="kicker"><span className="live" />AI analysis in progress</div>

      <div className="scan" ref={scanRef}>
        {/* eslint-disable-next-line @next/next/no-img-element -- blob en mémoire */}
        {photoUrl && <img ref={imgRef} src={photoUrl} alt="" />}
        <div className="scan-tint" />
        <canvas className="scan-mesh" ref={meshRef} aria-hidden />
        <svg className="scan-svg" viewBox="0 0 236 296" fill="none">
          <path className="scan-corner" d="M18 34 L18 18 L34 18" />
          <path className="scan-corner" d="M218 34 L218 18 L202 18" />
          <path className="scan-corner" d="M18 262 L18 278 L34 278" />
          <path className="scan-corner" d="M218 262 L218 278 L202 278" />
        </svg>
        <div className="scan-sweep" />
      </div>

      <div className="prog-wrap">
        <div className="prog-top">
          <span className="prog-label">{pct >= 100 ? "Done" : "Analyzing your skin"}</span>
          <span className="prog-pct">{pct}%</span>
        </div>
        <div className="prog-track"><div className="ana-fill" style={{ width: `${pct}%` }} /></div>
      </div>

      <div className="status">
        {error ? (
          <button type="button" className="retry" onClick={() => location.reload()}>
            Analysis failed. Retry
          </button>
        ) : (
          <>
            <div className="status-dots"><i /><i /><i /></div>
            <span className="status-msg">{msg}</span>
          </>
        )}
      </div>

      <div className="reassure-analyse">Your photo stays private to your account.</div>
    </div>
  );
}
