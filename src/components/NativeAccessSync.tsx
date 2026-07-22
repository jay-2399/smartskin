"use client";
import { useEffect } from "react";
import { syncNativeAccess } from "@/features/checkout/native-purchase";

/* Synchronise l'accès (entitlement StoreKit réel → base) UNE FOIS par ouverture de l'app.
   Monté dans le layout racine → s'exécute quel que soit l'écran d'entrée (welcome OU dashboard).
   Rôle : prolonger l'abonnement au renouvellement. L'expiration, elle, se fait toute seule par
   la comparaison de date en base (cf. features/checkout/access.ts). Hors app iOS : no-op. */
export function NativeAccessSync() {
  useEffect(() => {
    try {
      if (sessionStorage.getItem("smartskin-access-synced")) return;
      sessionStorage.setItem("smartskin-access-synced", "1");
    } catch {
      /* sessionStorage indispo → on synchronise quand même */
    }
    void syncNativeAccess();
  }, []);
  return null;
}
