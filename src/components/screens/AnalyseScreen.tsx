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
  { at: 0, msg: "Détection du visage…" },
  { at: 14, msg: "Lecture du grain de peau…" },
  { at: 30, msg: "Analyse des pores et du sébum…" },
  { at: 48, msg: "Cartographie du teint et de l'éclat…" },
  { at: 65, msg: "Évaluation des zones sensibles…" },
  { at: 82, msg: "Compilation de ton diagnostic…" },
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
  const started = useRef(false);

  useEffect(() => {
    if (!photo) router.replace("/capture");
  }, [photo, router]);

  useEffect(() => () => { if (photoUrl) URL.revokeObjectURL(photoUrl); }, [photoUrl]);

  useEffect(() => {
    if (started.current || !photo) return;
    started.current = true;

    let raf = 0;
    let result: AnalysisResult | null = null;
    let doneAt: number | null = null;   // moment où le résultat est arrivé
    let pctAtDone: number | null = null; // % au moment de l'arrivée (pour finir en douceur)
    let finishedAt: number | null = null;
    let failed = false;
    let navigated = false;
    let last = 0;
    const t0 = performance.now();

    // appel réel
    const answers = useFunnel.getState().answers;
    (async () => {
      try {
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ answers, image: await blobToBase64(photo) }),
        });
        if (res.status === 422) { navigated = true; router.replace("/capture"); return; }
        if (!res.ok) { failed = true; return; }
        result = await res.json();
        doneAt = performance.now();
      } catch {
        failed = true;
      }
    })();

    // barre calée sur la durée réelle : avance vers ~90 % en attendant,
    // puis termine à 100 % quand le résultat est là.
    const tick = (ts: number) => {
      if (navigated) return;
      if (failed) { setError(true); return; }

      let value: number;
      if (doneAt !== null) {
        if (pctAtDone === null) pctAtDone = last;
        const k = Math.min((ts - doneAt) / 700, 1); // remontée vers 100 sur 700 ms
        value = pctAtDone + (100 - pctAtDone) * k;
      } else {
        const p = Math.min((ts - t0) / EXPECTED_MS, 1);
        value = (1 - Math.pow(1 - p, 2.4)) * 90; // ease-out plafonné à 90 % tant que l'IA répond
      }
      last = value;

      if (value >= 99.5) {
        setPct(100);
        setMsg("Diagnostic prêt");
        if (finishedAt === null) finishedAt = ts;
        if (ts - finishedAt >= 600) { // petit temps fort « prêt »
          navigated = true;
          if (result) useResult.getState().set(result, photo);
          router.replace("/resultats");
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
      <div className="kicker"><span className="live" />Analyse IA en cours</div>

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
      </div>

      <div className="prog-wrap">
        <div className="prog-top">
          <span className="prog-label">{pct >= 100 ? "Terminé" : "Analyse de ta peau"}</span>
          <span className="prog-pct">{pct}%</span>
        </div>
        <div className="prog-track"><div className="prog-fill" style={{ width: `${pct}%` }} /></div>
      </div>

      <div className="status">
        {error ? (
          <button type="button" className="retry" onClick={() => location.reload()}>
            L&apos;analyse a échoué. Réessayer
          </button>
        ) : (
          <>
            <div className="status-dots"><i /><i /><i /></div>
            <span className="status-msg">{msg}</span>
          </>
        )}
      </div>

      <div className="reassure-analyse">Ta photo est analysée puis supprimée — jamais conservée.</div>
    </div>
  );
}
