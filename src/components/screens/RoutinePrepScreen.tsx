"use client";
import { useEffect, useMemo, useRef } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useResult, type PreparedReco } from "@/features/analysis/resultStore";
import { useFunnel } from "@/features/funnel/store";
import { SAMPLE_RESULT } from "@/features/analysis/sample";
import { EMPTY_ANSWERS } from "@/features/funnel/types";
import { topConcerns } from "@/features/routine/recommend";
import { ATTRIBUTE_BY_ID } from "@/features/analysis/attributes";
import "./routine-prep.css";

/* /preparation — écran de load « montée de tension » (liquid glass), porté de
   routine-intro-liquid-glass/. La routine est construite POUR DE VRAI ici (/api/routine,
   ~40 s) : la jauge monte, tenue à ~92 % tant que la reco n'est pas arrivée, puis rampe
   finale → « Your protocol is ready. » → paywall. La reco est gardée dans le store
   (preparedReco) : après paiement, le deck s'affiche sans refaire le calcul. Si le
   calcul échoue, on enchaîne quand même sur le paywall (reconstruction post-paiement,
   comportement d'avant). Aucune UI de routine dévoilée ici — volontaire. */

const CIRC = 2 * Math.PI * 76;
const EXPECTED_MS = 38_000; // durée typique du calcul (la jauge s'y cale, sans finir avant)

const SunIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><circle cx="12" cy="12" r="4.5" /><path d="M12 2.5v2.5M12 19v2.5M4.2 4.2l1.8 1.8M18 18l1.8 1.8M2.5 12H5M19 12h2.5M4.2 19.8L6 18M18 6l1.8-1.8" /></svg>
);

export function RoutinePrepScreen({ demo = false }: { demo?: boolean }) {
  const router = useRouter();
  const stored = useResult((s) => s.result);
  const photo = useResult((s) => s.photo);
  const result = stored ?? (demo ? SAMPLE_RESULT : null);

  const rootRef = useRef<HTMLDivElement>(null);
  const fgRef = useRef<SVGCircleElement>(null);
  const numRef = useRef<HTMLSpanElement>(null);
  const statusRef = useRef<HTMLDivElement>(null);

  const photoUrl = useMemo(() => (photo ? URL.createObjectURL(photo) : null), [photo]);
  useEffect(() => () => { if (photoUrl) URL.revokeObjectURL(photoUrl); }, [photoUrl]);
  const faceUrl = photoUrl ?? "/capture-face.jpg";

  // Data perso (chips + copy) dérivée du bilan — jamais hardcodée.
  const skinType = result?.profile.skinType ?? "";
  const concerns = useMemo(
    () => (result ? topConcerns(result).slice(0, 2).map((id) => ATTRIBUTE_BY_ID[id]?.label ?? id) : []),
    [result]
  );
  const chips = [skinType, ...concerns].filter(Boolean);

  // Accès direct sans bilan → accueil.
  useEffect(() => {
    if (!result) router.replace("/");
  }, [result, router]);

  useEffect(() => {
    const root = rootRef.current;
    const fg = fgRef.current;
    const num = numRef.current;
    const statusEl = statusRef.current;
    if (!root || !fg || !num || !statusEl || !result) return;

    const to = (path: string) => (demo ? `${path}?demo=1` : path);
    const stages: { p: number; t: string }[] = [
      { p: 0.0, t: "Reading your skin…" },
      { p: 0.16, t: `Your ${skinType.toLowerCase()} skin` },
      { p: 0.34, t: concerns.join(" · ") || "Mapping your needs" },
      { p: 0.52, t: "Screening 2,137 formulas" },
      { p: 0.7, t: "Matching to your exact needs" },
      { p: 0.86, t: "Narrowing to your 4 best matches" },
    ];
    const chipP = [0.18, 0.3, 0.42];
    const chipEls = Array.from(root.querySelectorAll<HTMLElement>(".rp-chip"));

    fg.style.strokeDasharray = String(CIRC);
    fg.style.strokeDashoffset = String(CIRC);

    let destroyed = false;
    let raf = 0;
    const timeouts: ReturnType<typeof setTimeout>[] = [];
    const setT = (fn: () => void, ms: number) => timeouts.push(setTimeout(fn, ms));

    let dataArrived = false;
    let finishing = false;
    let finishStart = 0;
    let pHold = 0;
    let stageIdx = -1;
    let start: number | null = null;

    // Le VRAI calcul de la reco, en parallèle de l'animation. Échec → on enchaîne
    // quand même (le paywall puis /routine reconstruiront, comme avant).
    const payload = { result, answers: demo && !stored ? EMPTY_ANSWERS : useFunnel.getState().answers };
    fetch("/api/routine", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("routine"))))
      .then((d: PreparedReco) => { if (!destroyed) useResult.getState().setPreparedReco(d); })
      .catch(() => {})
      .finally(() => { dataArrived = true; });

    const setStatus = (t: string) => {
      statusEl.style.opacity = "0";
      setT(() => { statusEl.textContent = t; statusEl.style.opacity = "1"; }, 140);
    };
    const apply = (p: number) => {
      fg.style.strokeDashoffset = String(CIRC * (1 - p));
      num.textContent = Math.round(2137 * p).toLocaleString("fr-FR");
      chipEls.forEach((c, i) => { if (p >= chipP[i]) c.classList.add("in"); });
      let cur = 0;
      for (let k = 0; k < stages.length; k++) if (p >= stages[k].p) cur = k;
      if (cur !== stageIdx) { stageIdx = cur; setStatus(stages[cur].t); }
      if (p > 0.8) root.classList.add("climax");
    };
    const done = () => {
      root.classList.add("done");
      statusEl.style.opacity = "0";
      setT(() => {
        statusEl.textContent = "Your protocol is ready.";
        statusEl.classList.add("big");
        statusEl.style.opacity = "1";
      }, 260);
      setT(() => { if (!destroyed) router.push(to("/checkout")); }, 2100);
    };

    // reduced-motion : pas d'animation — jauge pleine dès l'arrivée de la donnée.
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      const wait = setInterval(() => {
        if (!dataArrived) return;
        clearInterval(wait);
        apply(1);
        done();
      }, 300);
      return () => { destroyed = true; clearInterval(wait); timeouts.forEach(clearTimeout); };
    }

    const frame = (now: number) => {
      if (destroyed) return;
      if (start === null) start = now;
      let p: number;
      if (!finishing) {
        const t = Math.min(1, (now - start) / EXPECTED_MS);
        p = Math.min(0.92, 1 - Math.pow(1 - t, 2)); // easing, TENU à 92 % tant que la reco n'est pas là
        if (dataArrived) { finishing = true; finishStart = now; pHold = p; }
      } else {
        const k = Math.min(1, (now - finishStart) / 800);
        p = pHold + (1 - pHold) * (1 - Math.pow(1 - k, 2));
      }
      apply(p);
      if (p >= 1) { done(); return; }
      raf = requestAnimationFrame(frame);
    };
    setT(() => { raf = requestAnimationFrame(frame); }, 700);

    return () => { destroyed = true; cancelAnimationFrame(raf); timeouts.forEach(clearTimeout); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result, demo, router]);

  if (!result) return null;

  return (
    <div className="rprep" ref={rootRef}>
      <Image className="rp-logo" src="/logo-smartskin.png" alt="SmartSkin AI" width={164} height={32} priority />
      <div className="rp-eyebrow"><SunIcon />Day routine</div>
      <h1 className="rp-title">Building your custom protocol.</h1>
      <div className="rp-wrap">
        <div className="rp-face"><img src={faceUrl} alt="" /></div>
        <div className="rp-gleam" />
        <svg className="rp-pring" viewBox="0 0 158 158"><circle className="bg" cx="79" cy="79" r="76" /><circle className="fg" ref={fgRef} cx="79" cy="79" r="76" /></svg>
        <div className="rp-check"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7" /></svg></div>
      </div>
      <div className="rp-chips">
        {chips.map((c) => <span className="rp-chip" key={c}>{c}</span>)}
      </div>
      <div className="rp-status" ref={statusRef}>Reading your skin…</div>
      <div className="rp-count"><span className="rp-num" ref={numRef}>0</span><small>formulas screened for your skin</small></div>
    </div>
  );
}
