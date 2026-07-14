"use client";
import { useEffect, useState } from "react";
import { AnalyseScreen } from "@/components/screens/AnalyseScreen";
import { useFunnel } from "@/features/funnel/store";
import { EMPTY_ANSWERS } from "@/features/funnel/types";

// Écran d'analyse AUTONOME, hors funnel officiel : /analyse-2.
// On injecte une photo fixée (public/analyse2-face.jpg) + des réponses vides dans le
// store AVANT de monter AnalyseScreen (sinon il renvoie à /capture faute de photo).
// AnalyseScreen joue alors « analyse en cours » + le maillage du visage, lance la vraie
// analyse, puis bascule sur le reveal /resultats — comme le vrai parcours.
export default function Page() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const blob = await (await fetch("/analyse2-face.jpg")).blob();
        if (cancelled) return;
        useFunnel.setState({ photo: blob, answers: structuredClone(EMPTY_ANSWERS) });
      } catch { /* si l'image échoue, AnalyseScreen renverra à /capture */ }
      if (!cancelled) setReady(true);
    })();
    return () => { cancelled = true; };
  }, []);

  if (!ready) return null;
  return <AnalyseScreen />;
}
