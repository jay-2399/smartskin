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
const FLAG = "paywall-experiment";

export function PaywallSwitch() {
  const override = useMemo<"A" | "B" | null>(() => {
    if (typeof window === "undefined") return null;
    const v = new URLSearchParams(window.location.search).get("v");
    return v === "b" ? "B" : v === "a" ? "A" : null;
  }, []);

  const flag = useFeatureFlagVariantKey(FLAG); // "control" | "test" | undefined (en cours)

  let variant: "A" | "B" | null;
  if (override) variant = override;
  else if (!PH_CONFIGURED) variant = "A";
  else if (flag === undefined) variant = null; // flag pas encore résolu → on attend (évite un mauvais comptage)
  else variant = flag === "test" ? "B" : "A";

  useEffect(() => {
    if (!variant) return;
    posthog.capture("paywall_viewed", { variant, source: override ? "override" : "flag" });
    (window as unknown as { clarity?: (...a: unknown[]) => void }).clarity?.("set", "paywall_variant", variant);
  }, [variant, override]);

  if (variant === null) return null; // bref, le temps que le flag se résolve
  return variant === "B" ? <PaywallB /> : <CheckoutScreen />;
}
