// Affiché INSTANTANÉMENT pendant le rendu serveur du dashboard (Suspense). Sans ça,
// la navigation depuis la routine reste figée sur l'écran précédent jusqu'à la fin
// du rendu → on croit que « ça ne redirige pas ». Ici on voit tout de suite la bascule.
export default function Loading() {
  return (
    <div className="dash-loading">
      <style>{`
        .dash-loading { min-height:100dvh; max-width:480px; margin:0 auto; display:flex;
          flex-direction:column; align-items:center; justify-content:center; gap:18px;
          padding:24px; text-align:center; background:var(--bg); color:var(--graphite,#6b7280);
          font-family:var(--fd); }
        .dash-loading .spin { width:34px; height:34px; border-radius:50%;
          border:3px solid rgba(0,0,0,0.10); border-top-color:var(--accent-d,#4a7a96);
          animation:dashSpin .8s linear infinite; }
        @keyframes dashSpin { to { transform:rotate(360deg); } }
      `}</style>
      <div className="spin" />
      <p>On prépare ton espace…</p>
    </div>
  );
}
