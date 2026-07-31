"use client";
import { useRouter } from "next/navigation";
import "./results-glass.css";

/* Page dédiée « Sources » (App Store Guideline 1.4.1 : divulguer clairement la
   méthodologie + rappeler de consulter un médecin). Ouverte depuis la ligne
   « Sources & medical disclaimer » en pied de bilan. Navigation INTERNE :
   fonctionne dans la WebView de l'app, contrairement aux liens externes. */

/* Références — chaque URL a été vérifiée le 2026-07-31 (HTTP 200 + titre
   conforme). Ne rien ajouter sans vérifier. */
const SOURCES = [
  { org: "American Academy of Dermatology", title: "Skin care basics", ref: "aad.org/public/everyday-care/skin-care-basics" },
  { org: "American Academy of Dermatology", title: "Acne Resource Center", ref: "aad.org/public/diseases/acne" },
  { org: "American Academy of Dermatology", title: "Sunscreen FAQs", ref: "aad.org/public/everyday-care/sun-protection/sunscreen-patients/sunscreen-faqs" },
  { org: "MedlinePlus — U.S. National Library of Medicine", title: "Aging skin", ref: "medlineplus.gov/skinaging.html" },
  { org: "MedlinePlus — U.S. National Library of Medicine", title: "Skin conditions", ref: "medlineplus.gov/skinconditions.html" },
  { org: "DermNet", title: "Skin phototype (Fitzpatrick skin type)", ref: "dermnetnz.org/topics/skin-phototype" },
];

export function SourcesScreen() {
  const router = useRouter();
  return (
    <div className="screen results">
      <nav className="r-nav">
        <button type="button" className="nav-back" aria-label="Back" onClick={() => router.back()}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13L5 8l5-5" /></svg>
        </button>
      </nav>

      <section className="r-section sources">
        <div className="sec-head"><span className="sec-name">Sources</span></div>
        <p className="src-note">
          SmartSkin provides a cosmetic skin assessment, not a medical diagnosis. If you have a
          skin concern, consult a dermatologist or another qualified health professional — and
          always check with a doctor before making medical decisions.
        </p>
        <p className="src-note">
          Your report is built from your photo and your questionnaire answers, analyzed against
          the visible characteristics of the skin (blemishes, texture, tone, signs of aging).
          Our analysis and recommendations follow published guidance from these references:
        </p>
        <ul className="src-list">
          {SOURCES.map((s) => (
            <li key={s.ref}>
              <b>{s.org}</b> — {s.title}
              <span className="src-ref">{s.ref}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
