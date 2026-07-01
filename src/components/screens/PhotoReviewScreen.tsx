"use client";
import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useFunnel } from "@/features/funnel/store";

/* Prévisualisation de la photo capturée : reprendre ou continuer.
   La photo vit dans le store (mémoire uniquement, jamais uploadée ici). */

export function PhotoReviewScreen() {
  const router = useRouter();
  const photo = useFunnel((s) => s.photo);
  const url = useMemo(() => (photo ? URL.createObjectURL(photo) : null), [photo]);

  // Pas de photo (accès direct ou rechargement) → retour à la capture
  useEffect(() => {
    if (!photo) router.replace("/capture");
  }, [photo, router]);

  // Libère l'object URL quand la photo change / au démontage
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);

  const retake = () => {
    useFunnel.getState().setPhoto(null); // on jette la photo refusée
    router.push("/capture");
  };

  if (!photo) return null;

  return (
    <div className="screen capture">
      <div className="topbar capture-topbar">
        <button type="button" className="back" aria-label="Back" onClick={retake}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13L5 8l5-5" /></svg>
        </button>
        <span className="tb-title">Your photo</span>
        <span className="tb-step">03</span>
      </div>

      <div className="head">
        <h1>Happy with it?</h1>
        <p>Make sure your face is sharp and well lit.</p>
      </div>

      <div className="vf review">
        {/* eslint-disable-next-line @next/next/no-img-element -- blob en mémoire, next/image ne gère pas les object URLs */}
        {url && <img className="review-photo" src={url} alt="Captured photo of your face" />}
      </div>

      <div className="review-actions">
        <button type="button" className="btn-ghost" onClick={retake}>
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M2 8a6 6 0 1 1 1.7 4.2M2 12.5V8.8h3.7" /></svg>
          Retake
        </button>
        <button type="button" className="cta-btn" onClick={() => router.push(useFunnel.getState().rescan ? "/analyse" : "/questions/q2")}>
          Continue
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8h9M8 4l4 4-4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      </div>

      <div className="shutter-zone">
        <span className="reassure-capture">Your photo stays private to your account.</span>
      </div>
    </div>
  );
}
