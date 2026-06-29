"use client";
import { useEffect, useMemo } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useResult } from "@/features/analysis/resultStore";
import { useFunnel } from "@/features/funnel/store";
import { toSections, skinAgeDelta } from "@/features/analysis/format";
import { CARNATION_SWATCHES, UNDERTONE_SWATCHES } from "@/features/analysis/attributes";
import { SAMPLE_RESULT } from "@/features/analysis/sample";
import { ScoreGauge } from "@/components/ui/ScoreGauge";
import { ResultPhotoMesh } from "@/components/ui/ResultPhotoMesh";
import { Reveal } from "@/components/ui/Reveal";

const ROMAN = ["I", "II", "III", "IV", "V", "VI"];

/* Port de reference/User_flow_screens/11-prop_1-resultats.html, responsive,
   alimenté par le bilan en mémoire (useResult). */
// `demo` est lu côté serveur (page) et passé en prop → pas de divergence SSR/client
// (lire window.location au render cause une erreur d'hydratation). ?demo=1 → affiche
// le bilan d'exemple sans passer par la capture (démo testeurs).
export function ResultsScreen({ demo = false }: { demo?: boolean }) {
  const router = useRouter();
  const stored = useResult((s) => s.result);
  const photo = useResult((s) => s.photo);
  const answers = useFunnel((s) => s.answers);
  const result = stored ?? (demo ? SAMPLE_RESULT : null);
  const photoUrl = useMemo(() => (photo ? URL.createObjectURL(photo) : null), [photo]);

  // Accès direct sans bilan en mémoire → retour à l'accueil
  useEffect(() => {
    if (!result) router.replace("/");
  }, [result, router]);

  useEffect(() => () => { if (photoUrl) URL.revokeObjectURL(photoUrl); }, [photoUrl]);

  if (!result) return null;

  const sections = toSections(result);
  const p = result.profile;
  const ageDelta = skinAgeDelta(result.skinAge, answers.age);
  const v = result.verdict;

  return (
    <div className="screen results">
      <nav className="r-nav">
        <button type="button" className="nav-back" aria-label="Back" onClick={() => router.push("/")}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13L5 8l5-5" /></svg>
        </button>
        <div className="nav-logo"><Image src="/logo-smartskin.png" alt="SmartSkin AI" width={154} height={30} priority /></div>
      </nav>

      {/* HERO : photo + jauge de score */}
      <div className="hero-card">
        <ResultPhotoMesh src={photoUrl} />
        <div className="hero-score">
          <div className="hc-eyebrow">Diagnostic result</div>
          <ScoreGauge value={result.score} state={result.state} sub={result.sub} />
        </div>
      </div>

      {/* STATS PARTAGEABLES (reveal v2) — masquées si la donnée manque */}
      {(result.skinAge != null || result.skinTypeBreakdown) && (
        <Reveal as="div" className="hero-stats">
          {result.skinAge != null && (
            <div className="hstat">
              <span className="hstat-k">Skin age</span>
              <span className="hstat-v">{result.skinAge}<small>yrs</small></span>
              {ageDelta && (
                <span className="hstat-note"><b>{ageDelta.deltaText}</b>{ageDelta.suffix ? ` ${ageDelta.suffix}` : ""}</span>
              )}
            </div>
          )}
          <div className="hstat">
            <span className="hstat-k">Skin type</span>
            <span className="hstat-v hstat-type">{p.skinType}</span>
            {result.skinTypeBreakdown && <span className="hstat-note">{result.skinTypeBreakdown}</span>}
          </div>
        </Reveal>
      )}

      {/* VERDICT — lecture experte (reveal v2) — masqué si absent */}
      {v && (
        <Reveal as="section" className="verdict">
          <div className="verdict-head">
            <span className="verdict-kicker">Expert read</span>
            <span className="verdict-chip">
              <svg viewBox="0 0 14 14" fill="currentColor" width="11" height="11"><path d="M7 0 C7 4 7 4 7 4 C7 4 10 7 14 7 C10 7 7 7 7 7 C7 7 7 10 7 14 C7 10 7 7 7 7 C7 7 4 7 0 7 C4 7 7 7 7 7 C7 7 7 4 7 0 Z" /></svg>
              Photo × your 7 answers
            </span>
          </div>
          <h2 className="verdict-title" dangerouslySetInnerHTML={{ __html: v.title }} />
          <p className="verdict-body" dangerouslySetInnerHTML={{ __html: v.body }} />
          <div className="verdict-link">
            <span className="vl-ic"><svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" width="15" height="15"><path d="M4 3v5a2 2 0 0 0 2 2h6" /><path d="M9.5 7.5L12 10l-2.5 2.5" /></svg></span>
            <p dangerouslySetInnerHTML={{ __html: v.behavioralLink }} />
          </div>
          <div className="verdict-prio">
            <span className="vp-label">Your plan, in order</span>
            {v.plan.map((step, idx) => (
              <div className={`vp-item${idx === v.plan.length - 1 ? " soft" : ""}`} key={idx}>
                <span className="vp-num">{idx + 1}</span>
                <div className="vp-tx"><b>{step.label}</b><span>{step.sub}</span></div>
                <span className="vp-tag">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="11" height="11"><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
                  protocol
                </span>
              </div>
            ))}
          </div>
        </Reveal>
      )}

      {/* PROFIL DE PEAU */}
      <Reveal as="section" className="r-section">
        <div className="sec-head"><span className="sec-name">Skin profile</span></div>
        <div className="meta">
          <div className="pvar"><span className="pvar-name">Skin type</span><span className="meta-v">{p.skinType}</span></div>
          <div className="pvar"><span className="pvar-name">Age range</span><span className="meta-v">{p.ageRange}</span></div>
          <div className="pvar">
            <span className="pvar-name">Skin tone</span>
            <div className="pvar-inline">
              <div className="sw-row">{CARNATION_SWATCHES.map((c, i) => (
                <span key={c} className={`sw${i + 1 === p.carnation ? " on" : ""}`} style={{ background: c }} />
              ))}</div>
              <span className="meta-v">{p.carnationLabel}</span>
            </div>
          </div>
          <div className="pvar">
            <span className="pvar-name">Undertone</span>
            <div className="pvar-inline">
              <div className="sw-row">{UNDERTONE_SWATCHES.map((c, i) => (
                <span key={c} className={`sw${i + 1 === p.undertone ? " on" : ""}`} style={{ background: c }} />
              ))}</div>
              <span className="meta-v">{p.undertoneLabel}</span>
            </div>
          </div>
          <div className="pvar">
            <span className="pvar-name">Sun reaction</span>
            <div className="photo-slider" style={{ ["--n" as string]: p.phototype }}>
              <div className="ps-bar"><div className="ps-track" /><div className="ps-handle" /></div>
              <div className="ps-ticks">{ROMAN.map((r, i) => (
                <span key={r} className={i + 1 === p.phototype ? "on" : ""}>{r}</span>
              ))}</div>
            </div>
            <span className="meta-v pheading">Type {ROMAN[p.phototype - 1]}<small>{p.phototypeSub}</small></span>
          </div>
        </div>
      </Reveal>

      {/* SECTIONS D'ATTRIBUTS */}
      {sections.map((sec) => (
        <Reveal as="section" className="r-section" key={sec.id}>
          <div className="sec-head"><span className="sec-name">{sec.label}</span></div>
          <div className="bento">
            {sec.items.map((a, i) => (
              <div className="vcard" key={a.id} style={{ ["--i" as string]: i }}>
                <div className="vc-main">
                  <div className="vc-id">
                    {a.icon && (
                      <div className="vc-tile">
                        {/* eslint-disable-next-line @next/next/no-img-element -- onError masque les icônes absentes */}
                        <img src={a.icon} alt="" onError={(e) => { (e.currentTarget.closest(".vc-tile") as HTMLElement).style.display = "none"; }} />
                      </div>
                    )}
                    <div className="vc-idtext"><span className="vc-title">{a.label}</span></div>
                  </div>
                  <div className="vc-measure">
                    <div className={`gauge lv${a.level} ${a.betterHigh ? "good-high" : "good-low"}`} style={{ ["--p" as string]: `${a.percent}%` }}>
                      <span className="gauge-tip">{a.tip}</span>
                      <div className="gauge-track" />
                      <div className="gauge-knob" />
                    </div>
                    <div className="gauge-ends"><span className="ge">{a.low}</span><span className="ge hi">{a.high}</span></div>
                  </div>
                </div>
                <p className="vc-situation" dangerouslySetInnerHTML={{ __html: a.situation }} />
              </div>
            ))}
          </div>
        </Reveal>
      ))}

      <div className="cta-wrap">
        {/* ⚠️ TEMPORAIRE : checkout/paywall désactivés → on va direct à la routine.
            Réactiver : router.push(demo ? "/checkout?demo=1" : "/checkout"). */}
        <button type="button" className="cta-btn" onClick={() => router.push(demo ? "/routine?demo=1" : "/routine")}>
          See my custom routine
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M3 7.5h8M7.5 4l3.5 3.5-3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <button type="button" className="cta-link" onClick={() => { useFunnel.getState().reset(); useResult.getState().clear(); router.push("/"); }}>
          Start over
        </button>
      </div>
    </div>
  );
}
