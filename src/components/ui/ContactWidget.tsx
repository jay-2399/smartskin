"use client";
import { useEffect, useRef, useState } from "react";
import "./contact-widget.css";

/* Widget concierge de contact : bouton flottant (bas-droite) → panneau de verre avec
   un vrai formulaire (nom / email / message). Envoi vers /api/contact (Resend).
   `defaultEmail` pré-remplit le champ email d'un utilisateur connecté. */

type Status = "idle" | "sending" | "done" | "error";

export function ContactWidget({ defaultEmail }: { defaultEmail?: string | null }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState(defaultEmail ?? "");
  const [message, setMessage] = useState("");
  const [company, setCompany] = useState(""); // honeypot
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const firstFieldRef = useRef<HTMLInputElement>(null);

  // Email connu → on le garde à jour si la prop arrive après coup (hydratation session).
  useEffect(() => { if (defaultEmail) setEmail(defaultEmail); }, [defaultEmail]);

  // Fermeture au clavier (Escape) + focus sur le 1er champ à l'ouverture.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    const t = setTimeout(() => firstFieldRef.current?.focus(), 120);
    return () => { window.removeEventListener("keydown", onKey); clearTimeout(t); };
  }, [open]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status === "sending") return;
    if (!name.trim() || !email.trim() || message.trim().length < 5) {
      setError("Fill in your name, email and a short message.");
      return;
    }
    setError(null);
    setStatus("sending");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, message, company }),
      });
      if (!res.ok) throw new Error("send_failed");
      setStatus("done");
    } catch {
      setStatus("error");
      setError("Couldn't send your message. Please try again.");
    }
  };

  const close = () => {
    setOpen(false);
    // On laisse l'état « done » visible tant qu'on ne rouvre pas : reset à la réouverture.
    if (status === "done") {
      setTimeout(() => { setStatus("idle"); setName(""); setMessage(""); }, 300);
    }
  };

  return (
    <>
      <div className={`cw-scrim${open ? " on" : ""}`} onClick={close} aria-hidden />

      <div className={`cw-panel${open ? " on" : ""}`} role="dialog" aria-modal="true" aria-label="Contact us" aria-hidden={!open}>
        {status === "done" ? (
          <div className="cw-done">
            <div className="cw-check">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
            </div>
            <div className="cw-done-t">Message sent</div>
            <p className="cw-done-s">Thanks — we&apos;ll get back to you by email shortly.</p>
            <button type="button" className="cw-cta" onClick={close} style={{ marginTop: 16 }}>Close</button>
          </div>
        ) : (
          <>
            <div className="cw-head">
              <div>
                <div className="cw-title">Talk to us</div>
                <p className="cw-sub">A question about your skin or your plan? We reply within a day.</p>
              </div>
              <button type="button" className="cw-x" onClick={close} aria-label="Close">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
              </button>
            </div>

            <form className="cw-form" onSubmit={submit} noValidate>
              <div className="cw-field">
                <label htmlFor="cw-name">Name</label>
                <input id="cw-name" ref={firstFieldRef} className="cw-input" value={name}
                  onChange={(e) => setName(e.target.value)} placeholder="Your name" autoComplete="name" maxLength={120} />
              </div>
              <div className="cw-field">
                <label htmlFor="cw-email">Email</label>
                <input id="cw-email" className="cw-input" type="email" value={email}
                  onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" autoComplete="email" maxLength={200} />
              </div>
              <div className="cw-field">
                <label htmlFor="cw-msg">Message</label>
                <textarea id="cw-msg" className="cw-area" value={message}
                  onChange={(e) => setMessage(e.target.value)} placeholder="How can we help?" maxLength={4000} />
              </div>

              {/* honeypot anti-spam — masqué, ne pas remplir */}
              <input className="cw-hp" tabIndex={-1} autoComplete="off" aria-hidden value={company}
                onChange={(e) => setCompany(e.target.value)} />

              {error && <p className="cw-err">{error}</p>}

              <button type="submit" className="cw-cta" disabled={status === "sending"}>
                {status === "sending" ? "Sending…" : "Send message"}
              </button>
              <p className="cw-foot">We only use your email to reply.</p>
            </form>
          </>
        )}
      </div>

      <button type="button" className={`cw-fab${open ? " open" : ""}`} onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close contact form" : "Contact us"} aria-expanded={open}>
        {open ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.9-.9L3 21l1.9-5.6a8.5 8.5 0 0 1-.9-3.9A8.38 8.38 0 0 1 12.5 3 8.38 8.38 0 0 1 21 11.5Z" /></svg>
        )}
      </button>
    </>
  );
}
