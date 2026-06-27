"use client";
import { useEffect, useMemo, useRef, useState } from "react";

/* Code-gate viral : overlay flouté par-dessus l'écran reveal (/resultats). On voit
   son scan/score floutés derrière ; il faut saisir le code « de la vidéo TikTok »
   pour révéler. Le code est validé CÔTÉ SERVEUR (/api/gate) → jamais dans le bundle.
   Affiché en permanence, sauf démo (?demo=1, contournable par ?gate=1) ou déjà
   débloqué dans la session. */

const KEY = "smartskin_gate_unlocked";
const LEN = 5;

export function CodeGate() {
  const [dismissed, setDismissed] = useState(false);
  const [unlocking, setUnlocking] = useState(false);
  const [cells, setCells] = useState<string[]>(Array(LEN).fill(""));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  // Rendu identique SSR/1ᵉ rendu client (= null) tant que non monté → pas d'erreur
  // d'hydratation. `allowed` dépend de window/sessionStorage (impossibles en SSR).
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  // Le gate s'applique-t-il ? (client only : URL + sessionStorage).
  const allowed = useMemo(() => {
    if (typeof window === "undefined") return false;
    const params = new URLSearchParams(window.location.search);
    if (sessionStorage.getItem(KEY) === "1") return false; // déjà débloqué cette session
    if (params.has("demo") && !params.has("gate")) return false; // démo → bypass (sauf ?gate=1)
    return true;
  }, []);

  const code = cells.join("");
  const complete = code.replace(/\s/g, "").length === LEN;

  function setCell(i: number, raw: string) {
    const ch = raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 1);
    setCells((prev) => { const next = [...prev]; next[i] = ch; return next; });
    setError(false);
    if (ch && i < LEN - 1) refs.current[i + 1]?.focus();
  }

  function onKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !cells[i] && i > 0) refs.current[i - 1]?.focus();
    if (e.key === "Enter") submit();
  }

  function onPaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const t = (e.clipboardData.getData("text") || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    if (!t) return;
    setCells(Array.from({ length: LEN }, (_, k) => t.charAt(k) || ""));
    setError(false);
    refs.current[Math.min(t.length, LEN - 1)]?.focus();
  }

  async function submit() {
    if (!complete || loading) return;
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/gate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (data.ok) {
        sessionStorage.setItem(KEY, "1");
        setUnlocking(true); // fondu de l'overlay
        setTimeout(() => setDismissed(true), 600);
        return;
      }
      throw new Error("invalid");
    } catch {
      setError(true);
      setCells(Array(LEN).fill(""));
      refs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  }

  if (!mounted || !allowed || dismissed) return null;

  return (
    <div className={`codegate${unlocking ? " unlocked" : ""}`}>
      <div className="cg-card">
        <div className="cg-status"><span className="dot" />Analyse terminée</div>
        <div className="cg-emblem">
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2 L13.9 10.1 L22 12 L13.9 13.9 L12 22 L10.1 13.9 L2 12 L10.1 10.1 Z" /></svg>
        </div>
        <h3 className="cg-title">Tes résultats t&apos;attendent.</h3>
        <p className="cg-sub">Saisis le code de ta vidéo TikTok pour les révéler.</p>
        <div className={`cg-cells${error ? " err" : ""}`}>
          {cells.map((c, i) => (
            <input
              key={i}
              ref={(el) => { refs.current[i] = el; }}
              className={`cg-cell${c ? " filled" : ""}`}
              type="text"
              maxLength={1}
              inputMode="text"
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              value={c}
              onChange={(e) => setCell(i, e.target.value)}
              onKeyDown={(e) => onKeyDown(i, e)}
              onPaste={onPaste}
              aria-label={`Caractère ${i + 1} du code`}
              autoFocus={i === 0}
            />
          ))}
        </div>
        <button type="button" className="cg-btn" disabled={!complete || loading} onClick={submit}>
          <svg className="cg-spark" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2 L13.9 10.1 L22 12 L13.9 13.9 L12 22 L10.1 13.9 L2 12 L10.1 10.1 Z" /></svg>
          <span>{loading ? "Vérification…" : "Révéler mes résultats"}</span>
        </button>
        {error && <p className="cg-err">Code invalide — vérifie sous la vidéo TikTok.</p>}
        <div className="cg-foot">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7" /></svg>
          100% gratuit · sans inscription
        </div>
        <p className="cg-hint">Le code est <b>épinglé sous la vidéo</b> sur TikTok.</p>
      </div>
    </div>
  );
}
