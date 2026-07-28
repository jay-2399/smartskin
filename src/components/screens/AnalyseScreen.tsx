"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useFunnel } from "@/features/funnel/store";
import { useResult } from "@/features/analysis/resultStore";
import { paintFaceMesh } from "@/features/analysis/paintFaceMesh";
import type { AnalysisResult } from "@/features/analysis/schema";
import posthog from "posthog-js";

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
  const aiConsent = useFunnel((s) => s.aiConsent);
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
    if (!photoUrl || !aiConsent) return; // le maillage (visuel « analyse ») n'apparaît qu'après consentement
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    let cancelled = false;
    (async () => {
      const img = imgRef.current, canvas = meshRef.current, wrap = scanRef.current;
      if (!img || !canvas || !wrap) return;
      const ok = await paintFaceMesh(img, canvas, wrap, { objectPositionY: 0.22 });
      if (ok && !cancelled) canvas.classList.add("on");
    })();
    return () => { cancelled = true; };
  }, [photoUrl, aiConsent]);

  useEffect(() => {
    if (!photo) return;
    // Consentement explicite requis avant tout envoi de la photo à l'IA tierce (Anthropic) — App Store 5.1.2(i).
    if (!aiConsent) return;
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
          posthog.capture("analysis_completed", { score: w.result?.score });
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
  }, [photo, router, aiConsent]);

  return (
    <div className="screen analyse">
      <Image className="analyse-logo" src="/logo-smartskin.png" alt="SmartSkin AI" width={150} height={29} priority />
      {aiConsent && <div className="kicker"><span className="live" />AI analysis in progress</div>}

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
        {aiConsent && <div className="scan-sweep" />}
      </div>

      {aiConsent ? (
        <>
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
        </>
      ) : (
        <div className="status"><span className="status-msg">Review the details below to start your analysis.</span></div>
      )}

      <div className="reassure-analyse">Analyzed securely in the EU — never sold or used for ads.</div>

      {/* Consentement explicite AVANT l'envoi de la photo à l'IA tierce (Anthropic) — requis App Store (5.1.2(i)).
          Tant que non accepté, l'appel /api/analyze est bloqué (voir l'effet ci-dessus). */}
      {!aiConsent && (
        <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(12,14,18,0.55)", backdropFilter: "blur(3px)", WebkitBackdropFilter: "blur(3px)", padding: 16 }}>
          <div style={{ width: "100%", maxWidth: 440, background: "#fff", borderRadius: 22, padding: "24px 22px 20px", boxShadow: "0 12px 40px rgba(0,0,0,0.25)" }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: "#EAF1FF", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 14 }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l7 3v6.2c0 4.8-3.2 8-7 9.8-3.8-1.8-7-5-7-9.8V5l7-3z" /><path d="M9 12l2.2 2.2L15.5 9.8" /></svg>
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 600, lineHeight: 1.25, margin: "0 0 8px", color: "#14181F" }}>Analyze your photo</h2>
            <p style={{ fontSize: 14.5, lineHeight: 1.5, margin: "0 0 6px", color: "#3A4250" }}>
              To build your skin analysis, your <b>photo</b> and your <b>answers</b> are sent securely to our AI provider, <b>Anthropic (Claude)</b>. Processing takes place in the <b>European Union</b>.
            </p>
            <p style={{ fontSize: 13, lineHeight: 1.5, margin: "0 0 18px", color: "#6B7280" }}>
              Your photo is never sold and never used for advertising.{" "}
              <a href="/privacy" style={{ color: "#2563EB", textDecoration: "underline" }}>Privacy Policy</a>
            </p>
            <button type="button" onClick={() => useFunnel.getState().setAiConsent(true)} style={{ width: "100%", padding: 14, border: "none", borderRadius: 14, background: "#14181F", color: "#fff", fontSize: 15.5, fontWeight: 600, cursor: "pointer" }}>
              Agree &amp; analyze
            </button>
            <button type="button" onClick={() => router.push("/welcome")} style={{ width: "100%", padding: 12, marginTop: 8, border: "none", borderRadius: 14, background: "transparent", color: "#6B7280", fontSize: 14, fontWeight: 500, cursor: "pointer" }}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
