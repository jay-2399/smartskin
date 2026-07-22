"use client";

// Lien « retour » pour les pages légales ouvertes dans la WebView (pas de barre de nav
// native) : revient à l'écran précédent (paywall) sans en perdre l'état.
export function LegalBack() {
  return (
    <a
      className="legal-back"
      href="#"
      onClick={(e) => {
        e.preventDefault();
        if (typeof window !== "undefined") window.history.back();
      }}
    >
      ← Back
    </a>
  );
}
