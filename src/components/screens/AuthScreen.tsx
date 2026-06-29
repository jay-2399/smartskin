"use client";
import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useResult } from "@/features/analysis/resultStore";
import { useFunnel } from "@/features/funnel/store";
import "./auth.css";

/* Écran d'auth partagé.
   - `login`  : connexion email + mot de passe (méthode retenue), avec Google en option.
   - `signup` : inscription après le paiement simulé du checkout (email + mot de passe). */

const GoogleIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden>
    <path fill="#4285F4" d="M23.5 12.27c0-.79-.07-1.54-.2-2.27H12v4.51h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.86c2.26-2.08 3.57-5.15 3.57-8.87Z" />
    <path fill="#34A853" d="M12 24c3.24 0 5.96-1.08 7.95-2.91l-3.86-3c-1.08.72-2.45 1.16-4.09 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09A12 12 0 0 0 12 24Z" />
    <path fill="#FBBC05" d="M5.27 14.29a7.2 7.2 0 0 1 0-4.58V6.62H1.29a12 12 0 0 0 0 10.76l3.98-3.09Z" />
    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42A11.95 11.95 0 0 0 12 0 12 12 0 0 0 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75Z" />
  </svg>
);
function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const google = async () => {
    setLoading(true);
    await signIn("google", { callbackUrl: "/dashboard" });
  };

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || !email || !password) return;
    setLoading(true);
    setError(null);
    const res = await signIn("credentials", { email, password, redirect: false });
    if (res?.error) {
      setError("Incorrect email or password.");
      setLoading(false);
      return;
    }
    router.push("/dashboard");
  };

  return (
    <div className="auth">
      <div className="auth-brand"><Image src="/logo-smartskin.png" alt="SmartSkin AI" width={133} height={26} priority /></div>
      <div className="auth-card">
        <h1 className="auth-title">Welcome back</h1>
        <p className="auth-sub">Sign in to find your tracking.</p>

        <button type="button" className="auth-oauth" onClick={google} disabled={loading}>
          <GoogleIcon />Continue with Google
        </button>

        <div className="auth-divider"><span>or with your email</span></div>

        <form onSubmit={login} className="auth-form">
          <label className="auth-field">
            <span>Email</span>
            <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" />
          </label>
          <label className="auth-field">
            <span>Password</span>
            <input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Your password" />
          </label>

          {error && <p className="auth-error">{error}</p>}

          <button type="submit" className="auth-cta" disabled={loading || !email || !password}>
            {loading ? "One moment…" : "Sign in"}
          </button>
        </form>

        <p className="auth-switch">No account yet? <a href="/checkout">Unlock my protocol</a></p>
      </div>
    </div>
  );
}

export function AuthScreen({ mode }: { mode: "signup" | "login" }) {
  const router = useRouter();
  const result = useResult((s) => s.result);
  const answers = useFunnel((s) => s.answers);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (mode === "login") return <LoginScreen />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError(null);
    try {
      const reg = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      // 200 (nouveau) ou 409 (déjà client) → on tente la connexion ; sinon erreur.
      if (reg.status !== 200 && reg.status !== 409) {
        const data = await reg.json().catch(() => ({}));
        setError(data?.issues?.password?.[0] ?? data?.issues?.email?.[0] ?? "Sign-up failed.");
        setLoading(false);
        return;
      }
      const res = await signIn("credentials", { email, password, redirect: false });
      if (res?.error) {
        setError("Sign-in failed.");
        setLoading(false);
        return;
      }
      // On rattache le scan en mémoire au nouveau compte (best effort).
      if (result) {
        await fetch("/api/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ result, answers }),
        }).catch(() => {});
      }
      router.push("/routine");
    } catch {
      setError("Something went wrong.");
      setLoading(false);
    }
  };

  // Inscription via Google : le scan en mémoire est perdu à la redirection OAuth → on le
  // stocke en sessionStorage, il est rattaché au compte une fois arrivé sur le dashboard.
  const google = async () => {
    if (result) sessionStorage.setItem("ss_pending_scan", JSON.stringify({ result, answers }));
    setLoading(true);
    await signIn("google", { callbackUrl: "/dashboard" });
  };

  return (
    <div className="auth">
      <div className="auth-brand"><Image src="/logo-smartskin.png" alt="SmartSkin AI" width={133} height={26} priority /></div>
      <div className="auth-card">
        <h1 className="auth-title">Create your account</h1>
        <p className="auth-sub">To save your protocol and track your progress.</p>

        <button type="button" className="auth-oauth" onClick={google} disabled={loading}>
          <GoogleIcon />Continue with Google
        </button>
        <div className="auth-divider"><span>or with your email</span></div>

        <form onSubmit={submit} className="auth-form">
          <label className="auth-field">
            <span>Email</span>
            <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" />
          </label>
          <label className="auth-field">
            <span>Password</span>
            <input type="password" autoComplete="new-password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="8 characters minimum" />
          </label>

          {error && <p className="auth-error">{error}</p>}

          <button type="submit" className="auth-cta" disabled={loading || !email || password.length < 8}>
            {loading ? "One moment…" : "Create my account"}
          </button>
        </form>

        <p className="auth-switch">Already have an account? <a href="/login">Sign in</a></p>
      </div>
    </div>
  );
}
