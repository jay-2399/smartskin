"use client";
import { useEffect, useMemo } from "react";
import { useFeatureFlagVariantKey } from "@posthog/react";
import posthog from "posthog-js";
import { CheckoutScreen } from "./CheckoutScreen";
import { PaywallB } from "./PaywallB";

/* Aiguillage A/B du paywall.
   - A = CheckoutScreen (clair glassmorphique), B = PaywallB (sombre immersif).
   - La variante vient du feature flag PostHog `paywall-experiment` (control → A, test → B),
     assigné/persisté par PostHog (répartition modifiable côté PostHog sans redéployer).
   - Override manuel `?v=a` / `?v=b` (dev / QA) : prioritaire sur le flag.
   - Sans clé PostHog → A par défaut (inactif).
   Émet `paywall_viewed` (PostHog) + tag la variante dans Clarity pour filtrer les replays. */

const PH_CONFIGURED = !!process.env.NEXT_PUBLIC_POSTHOG_KEY;
const FLAG = "different-paywall-page"; // clé du feature flag / experiment côté PostHog

export function PaywallSwitch() {
  const override = useMemo<"A" | "B" | null>(() => {
    if (typeof window === "undefined") return null;
    const v = new URLSearchParams(window.location.search).get("v");
    return v === "b" ? "B" : v === "a" ? "A" : null;
  }, []);

  const flag = useFeatureFlagVariantKey(FLAG); // "control" | "test" | … | undefined (en cours/absent)

  // A par défaut (jamais de page blanche, même si le flag n'existe pas / PostHog absent) ;
  // on bascule sur B pour TOUTE variante ≠ "control" (robuste au nom exact de la variante).
  const variant: "A" | "B" = override ?? (typeof flag === "string" && flag !== "control" ? "B" : "A");

  // On n'émet paywall_viewed que quand la variante est CERTAINE (override, PostHog absent,
  // ou flag résolu) → évite de compter un "A" transitoire pendant le chargement du flag.
  const resolved = !!override || !PH_CONFIGURED || flag !== undefined;
  useEffect(() => {
    if (!resolved) return;
    posthog.capture("paywall_viewed", { variant, source: override ? "override" : "flag" });
    (window as unknown as { clarity?: (...a: unknown[]) => void }).clarity?.("set", "paywall_variant", variant);
  }, [resolved, variant, override]);

  return variant === "B" ? <PaywallB /> : <CheckoutScreen />;
}
