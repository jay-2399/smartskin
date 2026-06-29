"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import { signIn } from "next-auth/react";
import "./auth.css";

/* Page de retour après paiement Stripe (flux « paiement puis compte »). Si le paiement
   est confirmé, on envoie automatiquement un lien de connexion à l'EMAIL PAYÉ → le
   compte (créé par le webhook avec l'accès « à vie ») se connecte sans risque de
   divergence d'email. Google reste proposé comme alternative. */

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
    <path fill="#4285F4" d="M23.5 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.86c2.26-2.08 3.57-5.15 3.57-8.87Z" />
    <path fill="#34A853" d="M12 24c3.24 0 5.96-1.08 7.95-2.91l-3.86-3c-1.08.72-2.45 1.16-4.09 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09A12 12 0 0 0 12 24Z" />
    <path fill="#FBBC05" d="M5.27 14.29a7.2 7.2 0 0 1 0-4.58V6.62H1.29a12 12 0 0 0 0 10.76l3.98-3.09Z" />
    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42A11.95 11.95 0 0 0 12 0 12 12 0 0 0 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75Z" />
  </svg>
);
const CheckIcon = () => (
  <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M4 12.5l5 5L20 6" />
  </svg>
);

export function CheckoutSuccess({ email, paid }: { email: string | null; paid: boolean }) {
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!paid || !email) return;
    let alive = true;
    signIn("resend", { email, redirect: false, callbackUrl: "/routine" })
      .then((res) => {
        if (!alive) return;
        if (res?.error) setError("The link couldn't be sent to this address.");
        else setSent(true);
      })
      .catch(() => { if (alive) setError("Something went wrong."); });
    return () => { alive = false; };
  }, [paid, email]);

  if (!paid) {
    return (
      <div className="auth">
        <div className="auth-brand"><Image src="/logo-smartskin.png" alt="SmartSkin AI" width={133} height={26} priority /></div>
        <div className="auth-card">
          <h1 className="auth-title">Payment not confirmed</h1>
          <p className="auth-sub">We couldn't confirm your payment. You can try again.</p>
          <p className="auth-switch"><a href="/checkout">Back to payment</a></p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth">
      <div className="auth-brand"><Image src="/logo-smartskin.png" alt="SmartSkin AI" width={133} height={26} priority /></div>
      <div className="auth-card">
        <div className="auth-sent">
          <span className="auth-sent-ic"><CheckIcon /></span>
          <b>Payment successful 🎉</b>
          <p>
            {sent
              ? <>We sent a sign-in link to <strong>{email}</strong>. Click it to access your protocol.</>
              : error
                ? error
                : <>Preparing your access…</>}
          </p>
        </div>

        <div className="auth-divider"><span>or sign in with</span></div>
        <button type="button" className="auth-oauth" onClick={() => signIn("google", { callbackUrl: "/routine" })}>
          <GoogleIcon />Continue with Google
        </button>
        {email && <p className="auth-reassure"><CheckIcon />Preferably use <strong>{email}</strong> (your payment address).</p>}
      </div>
    </div>
  );
}
