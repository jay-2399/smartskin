"use client";
import { useEffect, useState } from "react";
import { RoutineScreen } from "@/components/screens/RoutineScreen";
import { useResult } from "@/features/analysis/resultStore";
import { useFunnel } from "@/features/funnel/store";
import { EMPTY_ANSWERS } from "@/features/funnel/types";
import { EXCLUSIVE2_RESULT } from "@/features/analysis/exclusive2";

// Routine de la page reveal EXCLUSIVE 2, hors funnel : /exclusive-2/routine.
// On injecte le bilan préréglé + la photo (en Blob, pour le médaillon) dans le store
// AVANT de monter RoutineScreen, sinon celui-ci, ne trouvant pas de bilan, renverrait
// à l'accueil. Puis la routine se construit normalement (moteur de reco).
export default function Page() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let photo: Blob | null = null;
      try { photo = await (await fetch("/exclusive2-face.jpg")).blob(); } catch { /* médaillon générique si échec */ }
      if (cancelled) return;
      useResult.getState().set(EXCLUSIVE2_RESULT, photo);
      useFunnel.setState({ answers: EMPTY_ANSWERS });
      setReady(true);
    })();
    return () => { cancelled = true; };
  }, []);

  if (!ready) return null;
  return <RoutineScreen />;
}
