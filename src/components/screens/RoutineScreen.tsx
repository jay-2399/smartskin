"use client";
import { useEffect, useMemo } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useResult } from "@/features/analysis/resultStore";
import { useFunnel } from "@/features/funnel/store";
import { SAMPLE_RESULT } from "@/features/analysis/sample";
import { EMPTY_ANSWERS } from "@/features/funnel/types";
import { buildRoutine, type RoutineStep, type Layer } from "@/features/routine/recommend";

function StepCard({ s, n }: { s: RoutineStep; n: number }) {
  return (
    <div className="rt-card">
      <span className="rt-step">{n}</span>
      <div className="rt-body">
        <div className="rt-top">
          <span className="rt-role">{s.role}</span>
          <span className="rt-freq">{s.frequency}</span>
        </div>
        <h3 className="rt-name">{s.active}</h3>
        <p className="rt-why" dangerouslySetInnerHTML={{ __html: s.why }} />
      </div>
    </div>
  );
}

/* Phase 1 — PROTOCOLE de soin construit selon le playbook : 3 couches
   (socle quotidien · actifs ciblés rotatifs · rituel hebdo), dosées par le
   budget de tolérance. Ancien layout en cartes, AUCUNE marque ni produit. */
export function RoutineScreen() {
  const router = useRouter();
  const stored = useResult((s) => s.result);
  const answers = useFunnel((s) => s.answers);
  const demo = useMemo(
    () => typeof window !== "undefined" && new URLSearchParams(window.location.search).has("demo"),
    []
  );
  const result = stored ?? (demo ? SAMPLE_RESULT : null);

  useEffect(() => {
    if (!result) router.replace("/");
  }, [result, router]);

  const routine = useMemo(
    () => (result ? buildRoutine(result, demo && !stored ? EMPTY_ANSWERS : answers) : null),
    [result, answers, demo, stored]
  );

  if (!result || !routine) return null;

  // Les 3 couches du playbook (§1), affichées en sections de cartes (même layout).
  const byLayer = (l: Layer) => routine.steps.filter((s) => s.layer === l);
  const socle = byLayer("socle");
  const actifs = byLayer("actif");
  const rituel = byLayer("rituel");

  return (
    <div className="screen routine">
      <nav className="r-nav">
        <button type="button" className="nav-back" aria-label="Retour aux résultats" onClick={() => router.back()}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13L5 8l5-5" /></svg>
        </button>
        <div className="nav-logo"><Image src="/logo-smartskin.png" alt="SmartSkin AI" width={154} height={30} priority /></div>
        <span className="nav-count">Protocole</span>
      </nav>

      <div className="rt-headblock">
        <h1>Ton protocole sur-mesure.</h1>
        <p>Trois couches : le <b>socle</b> quotidien, les <b>actifs ciblés</b> sur ton bilan, et un <b>rituel</b>. Sans marque ni produit — à toi de choisir des soins qui contiennent ces ingrédients.</p>
      </div>

      {routine.priorities.length > 0 && (
        <div className="rt-prio">
          <span className="rt-prio-lbl">On cible en priorité</span>
          <div className="rt-prio-chips">
            {routine.priorities.map((p) => <span key={p} className="rt-chip">{p}</span>)}
          </div>
        </div>
      )}

      {routine.medicalNote && (
        <div className="rt-note warn">
          <strong>À retenir.</strong> {routine.medicalNote}
        </div>
      )}

      {/* Couche 1 — socle quotidien (coût 0, tous les jours). */}
      {socle.length > 0 && (
        <>
          <div className="rt-secname"><span>Ton socle quotidien</span><span className="rt-tag">tous les jours</span></div>
          <div className="rt-steps">
            {socle.map((s, i) => <StepCard key={s.active} s={s} n={i + 1} />)}
          </div>
        </>
      )}

      {/* Couche 2 — actifs ciblés, dosés par le budget de tolérance. */}
      {actifs.length > 0 && (
        <>
          <div className="rt-secname">
            <span>Tes actifs ciblés</span>
            <span className="rt-tag load" title="Charge d'irritation de la semaine vs ce que ta peau tolère">charge {routine.load}/{routine.ceiling}</span>
          </div>
          <div className="rt-steps">
            {actifs.map((s, i) => <StepCard key={s.active} s={s} n={i + 1} />)}
          </div>
          <p className="rt-cap">Un seul actif fort par soir, jamais deux — et la fréquence ci-dessus est calée sur ce que ta peau encaisse, pour traiter sans irriter.</p>
        </>
      )}

      {/* Couche 3 — rituel hebdo. */}
      {rituel.length > 0 && (
        <>
          <div className="rt-secname"><span>Ton rituel hebdo</span></div>
          <div className="rt-steps">
            {rituel.map((s, i) => <StepCard key={s.active} s={s} n={i + 1} />)}
          </div>
        </>
      )}

      <div className="rt-note">
        <strong>Comment doser.</strong> {routine.introduction}
      </div>

      {routine.avoid.length > 0 && (
        <div className="rt-avoid">
          <span className="rt-avoid-lbl">À éviter pour toi</span>
          <ul>{routine.avoid.map((a) => <li key={a}>{a}</li>)}</ul>
        </div>
      )}

      <div className="rt-timeline">
        <span className="rt-tl-ico">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="9" cy="9" r="7" /><path d="M9 5v4l2.5 2" /></svg>
        </span>
        <p><strong>Ce que tu peux espérer.</strong> {routine.timeline} La <b>régularité</b> compte plus que l&apos;intensité.</p>
      </div>

      <div className="rt-soon">
        <p>Bientôt : ta <b>routine produits matin & soir</b>, avec des soins concrets qui contiennent ces actifs, adaptés à ton budget.</p>
      </div>

      <div className="cta-wrap">
        <button type="button" className="cta-btn ghost" onClick={() => router.back()}>
          Revoir mon bilan
        </button>
        <button type="button" className="cta-link" onClick={() => { useFunnel.getState().reset(); useResult.getState().clear(); router.push("/"); }}>
          Refaire une analyse
        </button>
      </div>
    </div>
  );
}
