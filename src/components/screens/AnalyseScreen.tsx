"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useFunnel } from "@/features/funnel/store";
import { useResult } from "@/features/analysis/resultStore";
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
const EXPECTED_MS = 26000; // latence typique gpt-5.5 (la barre s'y cale, sans jamais coller à 100)

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
        const p = Math.min((ts - w.t0) / EXPECTED_MS, 1);
        value = (1 - Math.pow(1 - p, 2.4)) * 90; // ease-out plafonné à 90 % tant que l'IA répond
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

      <div className="scan">
        {/* eslint-disable-next-line @next/next/no-img-element -- blob en mémoire */}
        {photoUrl && <img src={photoUrl} alt="" />}
        <div className="scan-tint" />
        <svg className="scan-svg" viewBox="0 0 236 296" fill="none">
          <g className="ml" fill="none">
            <path d="M118 70 L88 96 M118 70 L148 96" />
            <path d="M88 96 L82 116 L108 116 M148 96 L154 116 L128 116" />
            <path d="M82 116 L72 150 L118 158 L164 150 L154 116" />
            <path d="M72 150 L92 178 L118 210 L144 178 L164 150" />
            <path d="M118 158 L92 178 M118 158 L144 178" />
          </g>
          <g fill="#A6C3D6">
            {[
              [118, 70, 2.3, 0], [88, 96, 2.1, 0.15], [148, 96, 2.1, 0.15],
              [82, 116, 2, 0.3], [108, 116, 2, 0.3], [128, 116, 2, 0.3], [154, 116, 2, 0.3],
              [72, 150, 2.1, 0.5], [164, 150, 2.1, 0.5], [118, 158, 2.5, 0.65],
              [92, 178, 2, 0.8], [144, 178, 2, 0.8], [118, 210, 2.2, 0.95],
            ].map(([cx, cy, r, d], i) => (
              <circle key={i} className="mp" cx={cx} cy={cy} r={r} style={{ animationDelay: `${d}s` }} />
            ))}
          </g>
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
        <div className="prog-track"><div className="prog-fill" style={{ width: `${pct}%` }} /></div>
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

      <div className="reassure-analyse">Your photo is analyzed then deleted — never stored.</div>
    </div>
  );
}
