"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useResult } from "@/features/analysis/resultStore";
import { useFunnel } from "@/features/funnel/store";
import { SAMPLE_RESULT } from "@/features/analysis/sample";
import { readPendingScan, clearPendingScan } from "@/features/analysis/pendingScan";
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
  const [rehydrated, setRehydrated] = useState(false);
  const result = stored ?? (demo ? SAMPLE_RESULT : null);

  // Après paiement (retour de Stripe + création de compte), la mémoire est vide : on
  // réhydrate le bilan depuis sessionStorage (posé avant le départ vers Stripe) → la
  // routine s'affiche enfin. On PERSISTE le scan ICI, dès l'arrivée : c'est fiable et
  // ça ne dépend plus du fait que l'utilisateur termine le deck et clique « Enregistrer »
  // (avant, un scan non sauvegardé laissait le dashboard afficher un ancien scan). La
  // page reste montée pendant que la routine se compose → le fetch a le temps d'aboutir.
  // Une seule écriture : la garde `getState().result` bloque tout second passage.
  useEffect(() => {
    if (useResult.getState().result || demo) { setRehydrated(true); return; }
    const pending = readPendingScan();
    if (pending) {
      useResult.getState().set(pending.result, pending.photo);
      if (pending.answers) useFunnel.setState({ answers: pending.answers });
      clearPendingScan();
      void fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ result: pending.result, answers: pending.answers, photo: pending.photoDataUrl }),
      }).catch(() => {});
    }
    setRehydrated(true);
  }, [demo]);

  // Médaillon de l'intro V2 : la VRAIE photo de l'analyse (en mémoire, jamais
  // stockée), repli sur un visage générique en démo (sans photo).
  const photoUrl = useMemo(() => (photo ? URL.createObjectURL(photo) : null), [photo]);
  useEffect(() => () => { if (photoUrl) URL.revokeObjectURL(photoUrl); }, [photoUrl]);
  const faceUrl = photoUrl ?? "/capture-face.jpg";

  // Pas de bilan, MÊME après tentative de réhydratation → on renvoie à l'accueil.
  useEffect(() => {
    if (rehydrated && !result) router.replace("/");
  }, [rehydrated, result, router]);

  // Monte l'expérience impérative IMMÉDIATEMENT : l'intro animée joue pendant que
  // `load` compose la routine côté serveur, puis le deck se révèle (cleanup au démontage).
  useEffect(() => {
    const el = rootRef.current;
    if (!el || !result) return;
    const payload = { result, answers: demo && !stored ? EMPTY_ANSWERS : answers };
    return initRoutine(el, {
      onExit: () => router.back(),
      // « Enregistrer mon protocole » : le scan est DÉJÀ persisté (à la réhydratation
      // ci-dessus). Ici on garde juste la routine VALIDÉE en mémoire → le dashboard
      // l'affiche telle quelle, puis on redirige.
      onSave: (validated) => {
        useResult.getState().setValidatedRoutine(validated);
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
