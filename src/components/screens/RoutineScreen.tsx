"use client";
import { useEffect, useMemo } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useResult } from "@/features/analysis/resultStore";
import { useFunnel } from "@/features/funnel/store";
import { SAMPLE_RESULT } from "@/features/analysis/sample";
import { EMPTY_ANSWERS } from "@/features/funnel/types";
import { buildRoutine, type RoutineStep } from "@/features/routine/recommend";

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

/* Phase 1 — PROTOCOLE de soin : les actifs/ingrédients conseillés + des conseils
   généraux propres au profil. AUCUNE marque, aucun produit (= Phase 2), et PAS
   de routine produits matin/soir (= Phase 2 aussi). Suite directe du reveal. */
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
        <p>Voici les <b>actifs</b> dont ta peau a besoin et le <b>pourquoi</b> de chacun — sans marque ni produit. À toi de choisir des soins qui contiennent ces ingrédients.</p>
      </div>

      {routine.priorities.length > 0 && (
        <div className="rt-prio">
          <span className="rt-prio-lbl">On cible en priorité</span>
          <div className="rt-prio-chips">
            {routine.priorities.map((p) => <span key={p} className="rt-chip">{p}</span>)}
          </div>
        </div>
      )}

      {routine.minimal && (
        <div className="rt-note warn">
          <strong>Protocole volontairement minimal.</strong> Tu as indiqué un suivi dermatologique en cours :
          on s&apos;en tient au nettoyage, à l&apos;hydratation et à la protection. <b>Valide tout nouvel actif avec ton dermatologue.</b>
        </div>
      )}

      <div className="rt-secname">Les actifs recommandés pour toi</div>
      <div className="rt-steps">
        {routine.steps.map((s, i) => <StepCard key={s.active} s={s} n={i + 1} />)}
      </div>

      {routine.gentleStart && (
        <div className="rt-note">
          <strong>Commence en douceur.</strong> Introduis <b>un seul actif à la fois</b>, 2-3 fois par semaine au début,
          puis augmente si ta peau le tolère. Mieux vaut lent et régulier que fort et irritant.
        </div>
      )}

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
