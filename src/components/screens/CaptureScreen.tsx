"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useFunnel } from "@/features/funnel/store";
import { startCamera, stopCamera, captureJpeg } from "@/features/capture/camera";
import { loadFaceMesh } from "@/features/capture/faceMesh";
import { startValidationLoop } from "@/features/capture/validationLoop";
import { validateAndPrepareUpload } from "@/features/capture/uploadValidation";
import { VALIDATION_CONFIG } from "@/features/capture/config";
import type { Status, ValidationState } from "@/features/capture/types";

/* Port fidèle de reference/User_flow_screens/03-capture.html,
   branché sur la validation live (docs/specs/live-analysis.md). */

const CheckIcon = () => (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 5.2l2 2 4-4.4" /></svg>
);

/* Pastilles critères de la maquette (la stabilité vit dans le hint du viewfinder). */
const CHIPS: { key: keyof Pick<ValidationState, "faceCount" | "faceSize" | "centering" | "orientation" | "luminance" | "sharpness">; label: string }[] = [
  { key: "faceCount", label: "Visage détecté" },
  { key: "faceSize", label: "Bonne distance" },
  { key: "centering", label: "Bien centré" },
  { key: "orientation", label: "Face à la caméra" },
  { key: "luminance", label: "Lumière suffisante" },
  { key: "sharpness", label: "Image nette" },
];

const chipClass = (s: Status) => (s === "ok" ? " ok" : s === "warning" ? " warn" : "");

export function CaptureScreen() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [loading, setLoading] = useState(true);
  const [fatalError, setFatalError] = useState<string | null>(null);
  const [state, setState] = useState<ValidationState | null>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    let stream: MediaStream | null = null;
    let stopLoop: (() => void) | null = null;
    let cancelled = false;

    (async () => {
      try {
        // Caméra et modèle en parallèle (le modèle met 1-3 s à charger)
        const [s, landmarker] = await Promise.all([startCamera(video), loadFaceMesh()]);
        if (cancelled) { stopCamera(s); landmarker.close(); return; }
        stream = s;
        setLoading(false);
        stopLoop = startValidationLoop(video, landmarker, setState);
      } catch (e) {
        if (cancelled) return;
        setLoading(false);
        setFatalError(
          e instanceof DOMException && (e.name === "NotAllowedError" || e.name === "PermissionDeniedError")
            ? "Autorise l'accès à la caméra pour continuer."
            : "Impossible d'initialiser l'analyse, recharge la page."
        );
      }
    })();

    return () => {
      cancelled = true;
      stopLoop?.();
      stopCamera(stream);
    };
  }, []);

  // La capture ne peut JAMAIS se déclencher tant que le modèle charge (spec, précondition transverse)
  const canCapture = !loading && !fatalError && (state?.canCapture ?? false);

  // Capture AUTOMATIQUE : 3 s de tout-vert continu → photo (décision produit, remplace le bouton).
  // Le compte à rebours s'annule si une condition repasse au rouge.
  const [countdown, setCountdown] = useState<number | null>(null);
  const shotRef = useRef(false);

  const shoot = useCallback(async () => {
    const video = videoRef.current;
    if (!video || shotRef.current) return;
    shotRef.current = true;
    const blob = await captureJpeg(video);
    useFunnel.getState().setPhoto(blob); // en mémoire uniquement — jamais uploadée ici
    router.push("/capture/apercu"); // prévisualisation : reprendre ou continuer
  }, [router]);

  useEffect(() => {
    if (!canCapture || shotRef.current) {
      setCountdown(null);
      return;
    }
    const total = Math.round(VALIDATION_CONFIG.autoCapture.holdMs / 1000);
    setCountdown(total);
    let n = total;
    const iv = setInterval(() => {
      n -= 1;
      if (n <= 0) {
        clearInterval(iv);
        setCountdown(0);
        void shoot();
      } else {
        setCountdown(n);
      }
    }, 1000);
    return () => clearInterval(iv);
  }, [canCapture, shoot]);

  // ── Upload d'une photo existante ──
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // permet de re-sélectionner le même fichier
    if (!file) return;
    setUploadError(null);
    setUploading(true);
    const res = await validateAndPrepareUpload(file);
    setUploading(false);
    if (!res.ok || !res.blob) {
      setUploadError(res.message ?? "Photo non conforme.");
      return;
    }
    // l'utilisateur a choisi cette photo → on continue directement, sans écran d'aperçu
    useFunnel.getState().setPhoto(res.blob);
    router.push("/questions/q2");
  };

  const hintText = fatalError
    ? fatalError
    : loading
      ? "Initialisation de l'IA…"
      : countdown !== null
        ? countdown > 0
          ? `Ne bouge plus — capture dans ${countdown}s`
          : "Capture !"
        : state?.topMessage ?? "Détection…";

  return (
    <div className="screen capture">
      <div className="topbar capture-topbar">
        <button type="button" className="back" aria-label="Retour" onClick={() => router.push("/questions/q1")}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13L5 8l5-5" /></svg>
        </button>
        <span className="tb-title">Capture photo</span>
        <span className="tb-step">03</span>
      </div>

      <div className="head">
        <h1>Cadre ton visage dans l&apos;ovale.</h1>
        <p>La photo se déclenche dès que tout est au vert.</p>
      </div>

      {/* VIEWFINDER */}
      <div className={`vf${canCapture ? " ready" : ""}`}>
        {/* miroir en preview ; la capture est dé-mirrorée dans captureJpeg() */}
        <video ref={videoRef} className="vf-video" playsInline muted />
        <svg className="vf-ovl" viewBox="0 0 386 418" fill="none" preserveAspectRatio="xMidYMid slice">
          <defs>
            <mask id="hole"><rect width="386" height="418" fill="#fff" /><ellipse cx="193" cy="206" rx="118" ry="150" fill="#000" /></mask>
          </defs>
          <rect width="386" height="418" fill="rgba(20,23,28,0.5)" mask="url(#hole)" />
          <ellipse className="guide-oval" cx="193" cy="206" rx="118" ry="150" />
          <path className="vf-corner" d="M20 54 L20 36 L38 36" />
          <path className="vf-corner" d="M366 54 L366 36 L348 36" />
          <path className="vf-corner" d="M20 364 L20 382 L38 382" />
          <path className="vf-corner" d="M366 364 L366 382 L348 382" />
        </svg>
        <div className="vf-hint"><span className="ld" /><span>{hintText}</span></div>
        {countdown !== null && countdown > 0 && (
          <div className="vf-count" aria-live="polite">{countdown}</div>
        )}
        {loading && !fatalError && (
          <div className="vf-loading"><span className="spinner" aria-hidden />Initialisation de l&apos;IA…</div>
        )}
      </div>

      {/* CRITÈRES */}
      <div className="crit">
        {CHIPS.map(({ key, label }) => (
          <div key={key} className={`c${state ? chipClass(state[key].status) : ""}`}>
            <span className="ico"><CheckIcon /></span>
            {label}
          </div>
        ))}
      </div>

      {/* STATUT (capture automatique — pas de bouton) */}
      <div className="shutter-zone">
        <span className={`shutter-lbl${countdown !== null ? " ready" : ""}`}>
          {countdown !== null ? "Capture automatique en cours…" : "Ajuste ton cadrage…"}
        </span>

        {/* Alternative : importer une photo existante */}
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPick} />
        <button
          type="button"
          className="upload-link"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
        >
          {uploading ? "Vérification de la photo…" : "ou importer une photo"}
        </button>
        {uploadError && <span className="upload-err">{uploadError}</span>}

        <span className="reassure-capture">Ta photo est analysée puis supprimée.</span>
      </div>
    </div>
  );
}
