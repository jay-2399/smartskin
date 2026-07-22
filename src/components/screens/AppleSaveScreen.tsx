"use client";
import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { isNativeApp, syncNativeAccess } from "@/features/checkout/native-purchase";
import { readPendingScan, clearPendingScan } from "@/features/analysis/pendingScan";
import "./auth.css";

/* Écran de connexion JUSTE APRÈS l'achat natif (StoreKit), iOS-exclusif.
   Le paiement est déjà fait ; ici on demande un Sign in with Apple (un tap + Face ID)
   pour CRÉER/RETROUVER le compte, puis on :
     1) sauvegarde le scan sur le compte (/api/scan, depuis le scan mis de côté),
     2) pose l'accès payé en base (/api/iap/grant, avec le plan acheté),
   avant d'afficher la routine — désormais rattachée au compte (→ dashboard au retour).
   Écran volontairement sans bouton « passer » : le compte est ce qui sauve les données. */

const AppleIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden>
    <path d="M16.36 12.9c.02 2.3 2.02 3.06 2.04 3.07-.02.05-.32 1.1-1.05 2.18-.63.94-1.29 1.87-2.33 1.89-1.02.02-1.35-.6-2.52-.6-1.17 0-1.53.58-2.5.62-1 .04-1.76-1.01-2.4-1.94-1.3-1.9-2.3-5.36-.96-7.7.66-1.16 1.85-1.9 3.14-1.92.99-.02 1.92.66 2.52.66.6 0 1.74-.82 2.93-.7.5.02 1.9.2 2.8 1.52-.07.05-1.67.98-1.65 2.92M14.53 6.5c.53-.64.89-1.53.79-2.42-.76.03-1.69.51-2.24 1.15-.49.56-.92 1.47-.8 2.33.85.07 1.72-.43 2.25-1.06" />
  </svg>
);

export function AppleSaveScreen({ plan }: { plan: "lifetime" | "weekly" }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const continueWithApple = () => {
    // Hors app (web) : pas de Sign in with Apple natif → on affiche juste la routine.
    if (!isNativeApp()) { router.push("/routine"); return; }
    setError(null);
    setLoading(true);
    // Le natif ouvre la feuille Apple (Face ID) et rappelle ici avec le jeton d'identité.
    window.__smartskinAppleAuth = async (idToken: string, name?: string) => {
      const res = await signIn("apple", { idToken, name: name ?? "", redirect: false });
      if (!res?.ok) { setError("Sign-in failed. Please try again."); setLoading(false); return; }
      // Compte ouvert → session présente. On sauve le scan (best-effort) puis on pose l'accès.
      const pending = readPendingScan();
      if (pending) {
        await fetch("/api/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ result: pending.result, answers: pending.answers, photo: pending.photoDataUrl }),
        }).catch(() => {});
      }
      await fetch("/api/iap/grant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      }).catch(() => {});
      // Corrige l'accès avec la date d'expiration RÉELLE de l'abonnement (entitlement StoreKit).
      await syncNativeAccess();
      clearPendingScan();
      router.push("/routine");
    };
    window.webkit?.messageHandlers?.native?.postMessage({ action: "signInWithApple" });
  };

  return (
    <div className="auth">
      <div className="auth-brand"><Image src="/logo-smartskin.png" alt="SmartSkin AI" width={133} height={26} priority /></div>
      <div className="auth-card">
        <h1 className="auth-title">Payment successful 🎉</h1>
        <p className="auth-sub">One last tap to save your routine to your account — so you can track your progress over time.</p>
        <button type="button" className="auth-cta" onClick={continueWithApple} disabled={loading}
          style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%" }}>
          <AppleIcon />{loading ? "One moment…" : "Continue with Apple"}
        </button>
        {error && <p className="auth-error">{error}</p>}
      </div>
    </div>
  );
}
