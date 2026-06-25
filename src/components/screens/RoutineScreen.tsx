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
export function RoutineScreen() {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const stored = useResult((s) => s.result);
  const answers = useFunnel((s) => s.answers);
  const demo = useMemo(
    () => typeof window !== "undefined" && new URLSearchParams(window.location.search).has("demo"),
    []
  );
  const result = stored ?? (demo ? SAMPLE_RESULT : null);
  const [reco, setReco] = useState<Reco | null>(null);
  const [error, setError] = useState(false);

  // Pas de bilan en mémoire → on renvoie à l'accueil (sauf démo).
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
      routine: reco.routine,
      totaux: reco.totaux,
      warnings: reco.avertissements,
    });
  }, [reco, router]);

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
