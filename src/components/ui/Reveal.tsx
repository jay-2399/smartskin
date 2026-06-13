"use client";
import { useEffect, useRef, useState } from "react";

/* Révèle son contenu (fondu + montée) quand il entre dans le viewport.
   Respecte prefers-reduced-motion (visible immédiatement). Réutilisable. */
export function Reveal({
  children,
  className = "",
  delay = 0,
  as: Tag = "div",
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number; // secondes — pour échelonner plusieurs Reveal
  as?: "div" | "section";
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Pas de garde reduced-motion ici : le CSS rend .reveal-scroll visible par
    // défaut (l'animation n'existe que sous prefers-reduced-motion: no-preference).
    // root = conteneur scrollable réel (les écrans défilent en interne, pas la fenêtre).
    let root: HTMLElement | null = el.parentElement;
    while (root) {
      const oy = getComputedStyle(root).overflowY;
      if (oy === "auto" || oy === "scroll") break;
      root = root.parentElement;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { root, threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    io.observe(el);
    // Filet de sécurité : ne jamais laisser le contenu masqué si l'IO ne tire pas
    // (environnements headless, navigateurs capricieux). Révèle au pire après 4 s.
    const safety = setTimeout(() => { setShown(true); io.disconnect(); }, 4000);
    return () => { io.disconnect(); clearTimeout(safety); };
  }, []);

  return (
    <Tag
      ref={ref as React.Ref<HTMLDivElement & HTMLElement>}
      className={`reveal-scroll${shown ? " in" : ""} ${className}`.trim()}
      style={delay ? { transitionDelay: `${delay}s` } : undefined}
    >
      {children}
    </Tag>
  );
}
