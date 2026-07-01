"use client";

/** Topbar des écrans question : retour + barre de progression (maquettes 02–09). */
export function TopBar({
  index, total = 7, onBack,
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
      <span className="prog-step">{String(index).padStart(2, "0")} / {String(total).padStart(2, "0")}</span>
    </div>
  );
}
