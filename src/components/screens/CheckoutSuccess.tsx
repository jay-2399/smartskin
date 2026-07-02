"use client";
import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import "./auth.css";

/* Page de retour après paiement Stripe. Un nouveau payeur n'a PAS encore de compte :
   on lui fait donc CRÉER un compte (email + mot de passe), pas « se connecter ».
   L'email est verrouillé sur l'EMAIL DU PAIEMENT (le webhook a accordé l'accès « à vie »
   à cet email). Une fois le compte créé, on va sur /routine : RoutineScreen réhydrate le
   bilan depuis sessionStorage (posé avant le départ vers Stripe) → la routine s'affiche. */

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
    <path fill="#4285F4" d="M23.5 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.86c2.26-2.08 3.57-5.15 3.57-8.87Z" />
    <path fill="#34A853" d="M12 24c3.24 0 5.96-1.08 7.95-2.91l-3.86-3c-1.08.72-2.45 1.16-4.09 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09A12 12 0 0 0 12 24Z" />
    <path fill="#FBBC05" d="M5.27 14.29a7.2 7.2 0 0 1 0-4.58V6.62H1.29a12 12 0 0 0 0 10.76l3.98-3.09Z" />
    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42A11.95 11.95 0 0 0 12 0 12 12 0 0 0 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75Z" />
  </svg>
);

export function CheckoutSuccess({ email: paidEmail, paid, sessionId }: { email: string | null; paid: boolean; sessionId: string | null }) {
  const router = useRouter();
  const [email, setEmail] = useState(paidEmail ?? "");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const emailLocked = !!paidEmail; // l'accès est lié à l'email payé → on le verrouille

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || !email || password.length < 8) return;
    setError(null);
    setLoading(true);
    try {
      const reg = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      // 200 (nouveau) ou 409 (email déjà utilisé → il se connecte) → on continue ; sinon erreur.
      if (reg.status !== 200 && reg.status !== 409) {
        const data = await reg.json().catch(() => ({}));
        setError(data?.issues?.password?.[0] ?? data?.issues?.email?.[0] ?? "Sign-up failed.");
        setLoading(false);
        return;
      }
      const res = await signIn("credentials", { email, password, redirect: false });
      if (res?.error) {
        setError(reg.status === 409 ? "This email already has an account — wrong password?" : "Sign-in failed.");
        setLoading(false);
        return;
      }
      // Compte OK → on rattache l'accès payé À CE COMPTE (peu importe l'email), sur
      // preuve de la session payée. Puis /routine (la routine se réhydrate depuis sessionStorage).
      if (sessionId) {
        await fetch("/api/checkout/claim", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        }).catch(() => {});
      }
      router.push("/routine");
    } catch {
      setError("Something went wrong.");
      setLoading(false);
    }
  };

  const google = () => {
    setLoading(true);
    // Google redirige → on transporte la session à réclamer dans l'URL de retour ;
    // /routine la consomme pour rattacher l'accès au compte Google (email quelconque).
    const callbackUrl = sessionId ? `/routine?claim=${encodeURIComponent(sessionId)}` : "/routine";
    signIn("google", { callbackUrl });
  };

  if (!paid) {
    return (
      <div className="auth">
        <div className="auth-brand"><Image src="/logo-smartskin.png" alt="SmartSkin AI" width={133} height={26} priority /></div>
        <div className="auth-card">
          <h1 className="auth-title">Payment not confirmed</h1>
          <p className="auth-sub">We couldn&apos;t confirm your payment. You can try again.</p>
          <p className="auth-switch"><a href="/checkout">Back to payment</a></p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth">
      <div className="auth-brand"><Image src="/logo-smartskin.png" alt="SmartSkin AI" width={133} height={26} priority /></div>
      <div className="auth-card">
        <h1 className="auth-title">Payment successful 🎉</h1>
        <p className="auth-sub">Create your account to unlock your protocol.</p>

        <button type="button" className="auth-oauth" onClick={google} disabled={loading}>
          <GoogleIcon />Continue with Google
        </button>
        <div className="auth-divider"><span>or with a password</span></div>

        <form onSubmit={submit} className="auth-form">
          <label className="auth-field">
            <span>Email</span>
            <input type="email" autoComplete="email" required value={email} readOnly={emailLocked}
              onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" />
          </label>
          <label className="auth-field">
            <span>Choose a password</span>
            <input type="password" autoComplete="new-password" required minLength={8} value={password}
              onChange={(e) => setPassword(e.target.value)} placeholder="8 characters minimum" />
          </label>

          {error && <p className="auth-error">{error}</p>}

          <button type="submit" className="auth-cta" disabled={loading || !email || password.length < 8}>
            {loading ? "One moment…" : "Create my account & see my protocol"}
          </button>
        </form>

        {emailLocked && <p className="auth-reassure">Use <strong>{paidEmail}</strong> — the email of your payment.</p>}
      </div>
    </div>
  );
}
