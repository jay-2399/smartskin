"use client";
import { useEffect } from "react";

/* Microsoft Clarity — analytics comportemental (heatmaps + session replays).
   L'ID de projet (public, visible côté client de toute façon) vient de
   NEXT_PUBLIC_CLARITY_PROJECT_ID. Sans variable → no-op : Clarity reste inactif
   en local/preview tant que l'ID n'est pas défini (prod uniquement).
   Import dynamique : le SDK ne charge que côté client, après hydratation. */
export function Clarity() {
  useEffect(() => {
    const projectId = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID;
    if (!projectId) return;
    import("@microsoft/clarity").then(({ default: clarity }) => {
      clarity.init(projectId);
    });
  }, []);
  return null;
}
