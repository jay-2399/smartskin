"use client";
import { useEffect, useMemo, useRef } from "react";
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
  totaux: { prix: number; irritation: number };
  avertissements: string[];
};

/* Routine v2 — expérience « storytelling » (intro → deck de swipe jour→soir →
   protocole). La routine PERSONNALISÉE est construite CÔTÉ SERVEUR (/api/routine,
   moteur de reco + IA, ~40 s). L'intro joue PENDANT ce chargement (passé via `load`)
   → plus d'écran de chargement séparé, puis le deck se révèle dès l'arrivée. */
// `demo` lu côté serveur (page) et passé en prop → pas d'erreur d'hydratation.
export function RoutineScreen({ demo = false }: { demo?: boolean }) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const stored = useResult((s) => s.result);
  const photo = useResult((s) => s.photo);
  const answers = useFunnel((s) => s.answers);
  const result = stored ?? (demo ? SAMPLE_RESULT : null);

  // Médaillon de l'intro V2 : la VRAIE photo de l'analyse (en mémoire, jamais
  // stockée), repli sur un visage générique en démo (sans photo).
  const photoUrl = useMemo(() => (photo ? URL.createObjectURL(photo) : null), [photo]);
  useEffect(() => () => { if (photoUrl) URL.revokeObjectURL(photoUrl); }, [photoUrl]);
  const faceUrl = photoUrl ?? "/capture-face.jpg";

  // Pas de bilan en mémoire → on renvoie à l'accueil.
  useEffect(() => {
    if (!result) router.replace("/");
  }, [result, router]);

  // Monte l'expérience impérative IMMÉDIATEMENT : l'intro animée joue pendant que
  // `load` compose la routine côté serveur, puis le deck se révèle (cleanup au démontage).
  useEffect(() => {
    const el = rootRef.current;
    if (!el || !result) return;
    const payload = { result, answers: demo && !stored ? EMPTY_ANSWERS : answers };
    return initRoutine(el, {
      onExit: () => router.back(),
      // « Enregistrer mon protocole » : persiste le scan en arrière-plan (best-effort,
      // 401 ignoré en démo) puis redirige immédiatement vers le dashboard.
      onSave: (validated) => {
        // Garde la routine VALIDÉE en mémoire → le dashboard l'affiche telle quelle.
        useResult.getState().setValidatedRoutine(validated);
        void fetch("/api/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }).catch(() => {});
        router.push("/dashboard");
      },
      faceUrl,
      load: () =>
        fetch("/api/routine", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
          .then((r) => (r.ok ? r.json() : Promise.reject(new Error("routine"))))
          .then((d: Reco) => ({ routine: d.routine, totaux: d.totaux, warnings: d.avertissements })),
    });
  }, [result, answers, demo, stored, faceUrl, router]);

  if (!result) return null;
  return <div className="routine-v2" ref={rootRef} />;
}
