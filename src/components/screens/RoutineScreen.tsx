"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useResult } from "@/features/analysis/resultStore";
import { useFunnel } from "@/features/funnel/store";
import { SAMPLE_RESULT } from "@/features/analysis/sample";
import { EMPTY_ANSWERS } from "@/features/funnel/types";
import { initRoutine } from "@/features/routine/storytelling";
import type { RoutineData } from "@/features/routine/products";
import "./routine-v2.css";

type Reco = {
  routine: RoutineData;
  totaux: { prix: number; irritation: number; budget: number | "no_limit"; dansLeBudget: boolean };
  avertissements: string[];
};

/* Routine v2 — expérience « storytelling » (intro → deck de swipe jour→soir →
   protocole). La routine PERSONNALISÉE est construite CÔTÉ SERVEUR (moteur de reco
   sur le catalogue de 140 produits + IA) via /api/routine, puis injectée dans
   l'expérience impérative (storytelling.ts). */
// `demo` lu côté serveur (page) et passé en prop → pas d'erreur d'hydratation.
export function RoutineScreen({ demo = false }: { demo?: boolean }) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const stored = useResult((s) => s.result);
  const photo = useResult((s) => s.photo);
  const answers = useFunnel((s) => s.answers);
  const result = stored ?? (demo ? SAMPLE_RESULT : null);
  const [reco, setReco] = useState<Reco | null>(null);
  const [error, setError] = useState(false);

  // Médaillon de l'intro V2 : la VRAIE photo de l'analyse (en mémoire, jamais
  // stockée), repli sur un visage générique en démo (sans photo).
  const photoUrl = useMemo(() => (photo ? URL.createObjectURL(photo) : null), [photo]);
  useEffect(() => () => { if (photoUrl) URL.revokeObjectURL(photoUrl); }, [photoUrl]);
  const faceUrl = photoUrl ?? "/capture-face.jpg";

  // Pas de bilan en mémoire → on renvoie à l'accueil. (Le paywall est géré côté
  // serveur dans routine/page.tsx via la session.)
  useEffect(() => {
    if (!result) router.replace("/");
  }, [result, router]);

  // Construit la routine produit (serveur) à partir du bilan + des réponses.
  useEffect(() => {
    if (!result) return;
    const payload = { result, answers: demo && !stored ? EMPTY_ANSWERS : answers };
    let alive = true;
    fetch("/api/routine", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("routine"))))
      .then((data: Reco) => { if (alive) { setReco(data); setError(false); } })
      .catch(() => { if (alive) setError(true); });
    return () => { alive = false; };
  }, [result, answers, demo, stored]);

  // Monte l'expérience impérative une fois la routine reçue (cleanup au démontage).
  useEffect(() => {
    const el = rootRef.current;
    if (!el || !reco) return;
    return initRoutine(el, {
      onExit: () => router.back(),
      // « Enregistrer mon protocole » : persiste le scan (best-effort) puis va au dashboard.
      // En démo (non connecté) /api/scan renvoie 401 → ignoré, on redirige quand même.
      onSave: async () => {
        try {
          await fetch("/api/scan", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ result, answers: demo && !stored ? EMPTY_ANSWERS : answers }),
          });
        } catch { /* best-effort : le dashboard retombe sur le bilan d'exemple */ }
        router.push("/dashboard");
      },
      routine: reco.routine,
      totaux: reco.totaux,
      warnings: reco.avertissements,
      faceUrl,
    });
  }, [reco, router, result, answers, demo, stored, faceUrl]);

  if (!result) return null;
  if (error)
    return (
      <div className="routine-loading">
        <p>Impossible de composer ta routine pour le moment.</p>
        <button onClick={() => router.back()}>Retour</button>
      </div>
    );
  if (!reco)
    return (
      <div className="routine-loading">
        <div className="routine-loading-spin" />
        <p>On compose ton protocole sur-mesure…</p>
      </div>
    );
  return <div className="routine-v2" ref={rootRef} />;
}
