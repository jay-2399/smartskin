"use client";
import { useEffect, useMemo } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useResult } from "@/features/analysis/resultStore";
import { useFunnel } from "@/features/funnel/store";
import { toSections } from "@/features/analysis/format";
import { CARNATION_SWATCHES, UNDERTONE_SWATCHES } from "@/features/analysis/attributes";
import { SAMPLE_RESULT } from "@/features/analysis/sample";
import { ScoreGauge } from "@/components/ui/ScoreGauge";
import { ResultPhotoMesh } from "@/components/ui/ResultPhotoMesh";
import { Reveal } from "@/components/ui/Reveal";

const ROMAN = ["I", "II", "III", "IV", "V", "VI"];

/* Port de reference/User_flow_screens/11-prop_1-resultats.html, responsive,
   alimenté par le bilan en mémoire (useResult). */
export function ResultsScreen() {
  const router = useRouter();
  const stored = useResult((s) => s.result);
  const photo = useResult((s) => s.photo);
  // ?demo=1 → affiche le bilan d'exemple sans passer par la capture (démo testeurs)
  const demo = useMemo(
    () => typeof window !== "undefined" && new URLSearchParams(window.location.search).has("demo"),
    []
  );
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

  return (
    <div className="screen results">
      <nav className="r-nav">
        <button type="button" className="nav-back" aria-label="Retour" onClick={() => router.push("/")}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13L5 8l5-5" /></svg>
        </button>
        <div className="nav-logo"><Image src="/logo-smartskin.png" alt="SmartSkin AI" width={154} height={30} priority /></div>
        <span className="nav-count">07 / 07</span>
      </nav>

      {/* HERO : photo + jauge de score */}
      <div className="hero-card">
        <ResultPhotoMesh src={photoUrl} />
        <div className="hero-score">
          <div className="hc-eyebrow">Résultat diagnostic</div>
          <ScoreGauge value={result.score} state={result.state} sub={result.sub} />
        </div>
      </div>

      {/* PROFIL DE PEAU */}
      <Reveal as="section" className="r-section">
        <div className="sec-head"><span className="sec-name">Profil de peau</span></div>
        <div className="meta">
          <div className="pvar"><span className="pvar-name">Type de peau</span><span className="meta-v">{p.skinType}</span></div>
          <div className="pvar"><span className="pvar-name">Tranche d&apos;âge</span><span className="meta-v">{p.ageRange}</span></div>
          <div className="pvar">
            <span className="pvar-name">Carnation</span>
            <div className="pvar-inline">
              <div className="sw-row">{CARNATION_SWATCHES.map((c, i) => (
                <span key={c} className={`sw${i + 1 === p.carnation ? " on" : ""}`} style={{ background: c }} />
              ))}</div>
              <span className="meta-v">{p.carnationLabel}</span>
            </div>
          </div>
          <div className="pvar">
            <span className="pvar-name">Sous-ton</span>
            <div className="pvar-inline">
              <div className="sw-row">{UNDERTONE_SWATCHES.map((c, i) => (
                <span key={c} className={`sw${i + 1 === p.undertone ? " on" : ""}`} style={{ background: c }} />
              ))}</div>
              <span className="meta-v">{p.undertoneLabel}</span>
            </div>
          </div>
          <div className="pvar">
            <span className="pvar-name">Réaction au soleil</span>
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
        <button type="button" className="cta-btn" onClick={() => router.push("/routine")}>
          Voir ma routine sur-mesure
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M3 7.5h8M7.5 4l3.5 3.5-3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <button type="button" className="cta-link" onClick={() => { useFunnel.getState().reset(); useResult.getState().clear(); router.push("/"); }}>
          Refaire une analyse
        </button>
      </div>
    </div>
  );
}
