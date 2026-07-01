"use client";
import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "@posthog/react";

/* PostHog — analytics + feature flags + A/B Experiments. Initialisé côté client
   UNIQUEMENT si NEXT_PUBLIC_POSTHOG_KEY est défini (sinon no-op : inactif en local/
   preview tant que la clé n'est pas là, comme Clarity). Host EU par défaut (RGPD). */
const KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY;
const HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://eu.i.posthog.com";

if (typeof window !== "undefined" && KEY && !posthog.__loaded) {
  posthog.init(KEY, {
    api_host: HOST,
    person_profiles: "identified_only", // profils créés seulement après identify (coût maîtrisé)
    capture_pageview: true,
  });
}

// On enveloppe toujours (même sans clé) : le client posthog non initialisé est inerte,
// et les hooks (useFeatureFlagVariantKey…) ont un contexte valide et renvoient undefined.
export function PostHogProvider({ children }: { children: React.ReactNode }) {
  return <PHProvider client={posthog}>{children}</PHProvider>;
}
