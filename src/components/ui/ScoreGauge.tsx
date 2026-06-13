"use client";
import { useEffect, useRef, useState } from "react";

/* Jauge de score demi-cercle — port de la maquette 11-prop_1-resultats.html (compteur dégradé). */

const cx = 120, cy = 118, R = 90, bw = 20, sA = -90, eA = 90;
const span = eA - sA;

function pol(a: number, r: number): [number, number] {
  const t = (a * Math.PI) / 180;
  return [cx + r * Math.sin(t), cy - r * Math.cos(t)];
}
function arc(a1: number, a2: number, r: number): string {
  const [x1, y1] = pol(a1, r);
  const [x2, y2] = pol(a2, r);
  const large = a2 - a1 > 180 ? 1 : 0;
  return `M${x1.toFixed(2)} ${y1.toFixed(2)} A${r} ${r} 0 ${large} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
}

function scoreBand(v: number): string {
  if (v >= 80) return "great";
  if (v >= 60) return "good";
  if (v >= 40) return "fair";
  return "low";
}

export function ScoreGauge({ value, state, sub }: { value: number; state: string; sub: string }) {
  const v = Math.max(0, Math.min(100, value));
  const vA = sA + (span * v) / 100;
  const fillRef = useRef<SVGPathElement>(null);
  const [num, setNum] = useState(0);

  useEffect(() => {
    // animations réduites (ou rAF indisponible) → afficher directement le score final
    if (typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      setNum(v);
      return;
    }
    // remplissage de l'arc
    const fill = fillRef.current;
    if (fill) {
      const L = fill.getTotalLength();
      fill.style.strokeDasharray = `${L}`;
      fill.style.strokeDashoffset = `${L}`;
      requestAnimationFrame(() => {
        fill.style.transition = "stroke-dashoffset 1.6s cubic-bezier(.22,1,.36,1)";
        fill.style.strokeDashoffset = "0";
      });
    }
    // compteur
    const dur = 1550;
    let t0: number | null = null, raf = 0;
    const tick = (ts: number) => {
      if (t0 === null) t0 = ts;
      const p = Math.min((ts - t0) / dur, 1);
      setNum(Math.round(v * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    const start = setTimeout(() => { raf = requestAnimationFrame(tick); }, 420);
    return () => { clearTimeout(start); cancelAnimationFrame(raf); };
  }, [v]);

  const ticks = [];
  const n = 28;
  for (let i = 0; i <= n; i++) {
    const a = sA + (span * i) / n;
    const [x1, y1] = pol(a, R + 5);
    const [x2, y2] = pol(a, R - 1);
    ticks.push(<line key={i} className="sg-tick" x1={x1.toFixed(1)} y1={y1.toFixed(1)} x2={x2.toFixed(1)} y2={y2.toFixed(1)} />);
  }

  return (
    <div className={`scoregauge band-${scoreBand(v)}`}>
      <svg className="sg-svg" viewBox="0 0 240 168" overflow="visible">
        <defs>
          <linearGradient id="sgbgrad" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor="#DCEFFA" /><stop offset="48%" stopColor="#83C8EE" /><stop offset="100%" stopColor="#1F97DC" />
          </linearGradient>
        </defs>
        <path className="sg-track" d={arc(sA, eA, R)} fill="none" strokeWidth={bw} strokeLinecap="round" />
        <path ref={fillRef} className="sg-fill" d={arc(sA, vA, R)} fill="none" stroke="url(#sgbgrad)" strokeWidth={bw} strokeLinecap="round" />
        {ticks}
        <g className="sg-needle" style={{ transform: `rotate(${vA}deg)`, transformBox: "view-box", transformOrigin: "120px 118px", transition: "transform 1.55s cubic-bezier(.22,1,.36,1)" }}>
          <line className="sg-needle-l" x1="120" y1={cy - (R + 6)} x2="120" y2={cy - (R - bw - 2)} />
        </g>
        <text className="sg-num" x="120" y="150" textAnchor="middle">{num}</text>
      </svg>
      <div className="sg-state">{state}</div>
      <div className="sg-sub">{sub}</div>
    </div>
  );
}
