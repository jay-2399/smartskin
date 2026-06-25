"use client";

const pad = (n: number) => String(n).padStart(2, "0");

/** Topbar des écrans question : retour + barre de progression + « 01 / 06 » (maquettes 02–09). */
export function TopBar({
  index, total = 6, onBack,
}: {
  index: number;
  total?: number;
  onBack: () => void;
}) {
  const pct = Math.round((index / total) * 100);
  return (
    <div className="topbar">
      <button type="button" className="back" aria-label="Retour" onClick={onBack}>
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13L5 8l5-5" /></svg>
      </button>
      <div className="prog" role="progressbar" aria-label={`Étape ${index} sur ${total}`} aria-valuenow={index} aria-valuemin={1} aria-valuemax={total}>
        <div className="prog-fill" style={{ "--pw": `${pct}%` } as React.CSSProperties} />
      </div>
      <span className="prog-step">{pad(index)} / {pad(total)}</span>
    </div>
  );
}
