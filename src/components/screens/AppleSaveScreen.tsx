"use client";
import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { isNativeApp, syncNativeAccess } from "@/features/checkout/native-purchase";
import { readPendingScan, clearPendingScan } from "@/features/analysis/pendingScan";
import posthog from "posthog-js";
import { AppleLogo } from "@/components/ui/AppleLogo";
import "./auth.css";

/* Écran de connexion JUSTE APRÈS l'achat natif (StoreKit), iOS-exclusif.
   Le paiement est déjà fait ; ici on demande un Sign in with Apple (un tap + Face ID)
   pour CRÉER/RETROUVER le compte, puis on :
     1) sauvegarde le scan sur le compte (/api/scan, depuis le scan mis de côté),
     2) pose l'accès payé en base (/api/iap/grant, avec le plan acheté),
   avant d'afficher la routine — désormais rattachée au compte (→ dashboard au retour).
   Écran volontairement sans bouton « passer » : le compte est ce qui sauve les données. */

export function AppleSaveScreen({ plan }: { plan: "lifetime" | "weekly" }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const continueWithApple = () => {
    // Hors app (web) : pas de Sign in with Apple natif → on affiche juste la routine.
    if (!isNativeApp()) { router.push("/routine"); return; }
    setError(null);
    setLoading(true);
    // Le natif rappelle ici si la feuille Apple échoue ou est annulée. Sans ce rappel,
    // le bouton restait désactivé sur « One moment… » sans possibilité de réessayer.
    window.__smartskinAppleAuthError = (raison?: string) => {
      setLoading(false);
      setError(raison === "canceled" ? null : "Sign-in failed. Please try again.");
    };
    // Le natif ouvre la feuille Apple (Face ID) et rappelle ici avec le jeton d'identité.
    window.__smartskinAppleAuth = async (idToken: string, name?: string) => {
      // mode "signup" : cet écran vient APRÈS le paiement — créer le compte est
      // précisément son rôle. L'accueil, lui, se contente de connecter (mode "login").
      const res = await signIn("apple", { idToken, name: name ?? "", mode: "signup", redirect: false });
      // NextAuth v5 : un échec revient en HTTP 200 (`ok: true`) avec `error` rempli →
      // tester les deux, sinon on enchaîne sans session et la sauvegarde part dans le vide.
      if (!res?.ok || res.error) { setError("Sign-in failed. Please try again."); setLoading(false); return; }
      posthog.capture("account_created", { method: "apple", plan });
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
          {/* Le logo se dimensionne sur la hauteur du bouton, sans padding vertical
              ajouté (HIG) ; ce bouton est la déclinaison noire, logo et texte blancs. */}
          <span className="apple-logo-slot"><AppleLogo /></span>
          {loading ? "One moment…" : "Continue with Apple"}
        </button>
        {error && <p className="auth-error">{error}</p>}
      </div>
    </div>
  );
}
