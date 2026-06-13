"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useFunnel } from "@/features/funnel/store";
import { useResult } from "@/features/analysis/resultStore";

/* Port fidèle de reference/User_flow_screens/10-analyse.html.
   En parallèle de l'animation, appelle POST /api/analyze puis route vers /resultats. */

const MESSAGES = [
  "Détection du visage…",
  "Lecture du grain de peau…",
  "Analyse des pores et du sébum…",
  "Cartographie du teint et de l'éclat…",
  "Évaluation des zones sensibles…",
  "Compilation de ton diagnostic…",
];
const MIN_DURATION = 5200; // ms — laisse l'animation se jouer même si l'API répond vite

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
  const [msg, setMsg] = useState(MESSAGES[0]);
  const [error, setError] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (!photo) router.replace("/capture");
  }, [photo, router]);

  useEffect(() => () => { if (photoUrl) URL.revokeObjectURL(photoUrl); }, [photoUrl]);

  useEffect(() => {
    if (started.current || !photo) return;
    started.current = true;

    // messages qui défilent
    let mi = 0;
    const msgTimer = setInterval(() => {
      mi = (mi + 1) % MESSAGES.length;
      setMsg(MESSAGES[mi]);
    }, 850);

    // progression animée
    const t0 = performance.now();
    let raf = 0;
    const tick = (ts: number) => {
      const p = Math.min((ts - t0) / MIN_DURATION, 1);
      setPct(Math.round((1 - Math.pow(1 - p, 2.2)) * 100));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    // appel API en parallèle
    const answers = useFunnel.getState().answers;
    const apiCall = (async () => {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ answers, image: await blobToBase64(photo) }),
      });
      return res;
    })();

    const minDelay = new Promise((r) => setTimeout(r, MIN_DURATION));

    Promise.all([apiCall, minDelay])
      .then(async ([res]) => {
        if (res.status === 422) { router.replace("/capture"); return; }
        if (!res.ok) { setError(true); return; }
        const result = await res.json();
        useResult.getState().set(result, photo);
        router.replace("/resultats");
      })
      .catch(() => setError(true))
      .finally(() => { clearInterval(msgTimer); cancelAnimationFrame(raf); });

    return () => { clearInterval(msgTimer); cancelAnimationFrame(raf); };
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
