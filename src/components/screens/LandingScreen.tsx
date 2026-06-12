"use client";
import Image from "next/image";
import { useRouter } from "next/navigation";

/* Port fidèle de reference/User_flow_screens/01-landing.html. */

const CheckIcon = () => (
  <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 5.2l2 2 4-4.4" /></svg>
);

export function LandingScreen() {
  const router = useRouter();
  return (
    <div className="screen landing">
      {/* PHOTO en bas */}
      <div className="hero-photo">
        <Image src="/woman-acne.png" alt="" width={2048} height={1810} priority />
      </div>

      {/* RECO CARD derrière la photo (z-index < visage) */}
      <div className="reco-card rc1 reco-behind">
        <div className="reco-img">
          <Image src="/prod-effaclar.png" alt="La Roche-Posay Effaclar" width={1440} height={1440} />
        </div>
        <div className="reco-brand">La Roche-Posay</div>
        <div className="reco-name">Effaclar Gel Cleanser</div>
        <span className="reco-price">$18.99</span>
      </div>

      {/* RECO CARDS par-dessus la photo */}
      <div className="reco">
        <div className="reco-card rc2">
          <div className="reco-img">
            <Image src="/prod-dralthea.png" alt="Dr. Althea 345 Relief Cream" width={800} height={800} />
          </div>
          <div className="reco-brand">Dr. Althea</div>
          <div className="reco-name">345 Relief Cream</div>
          <span className="reco-price">$24.00</span>
        </div>
        <div className="reco-card rc3">
          <div className="reco-img">
            <Image src="/prod-paula.png" alt="Paula's Choice 2% BHA" width={1200} height={900} />
          </div>
          <div className="reco-brand">Paula&apos;s Choice</div>
          <div className="reco-name">2% BHA Liquid Exfoliant</div>
          <span className="reco-price">$35.00</span>
        </div>
      </div>

      {/* CONTENU au-dessus */}
      <div className="content">
        <div className="brand">
          <Image src="/logo-smartskin.png" alt="SmartSkin AI" width={154} height={30} priority />
        </div>

        <div className="copy">
          <div className="eyebrow">Diagnostic peau par IA</div>
          <h1 className="title">
            <span className="t1">Comprends</span> <span className="t2 soft">vraiment ta peau.</span>
          </h1>
          <div className="reassure">
            <span className="ra"><span className="ck"><CheckIcon /></span>Gratuit</span>
            <span className="ra-sep"></span>
            <span className="ra"><span className="ck"><CheckIcon /></span>~30 secondes</span>
            <span className="ra-sep"></span>
            <span className="ra"><span className="ck"><CheckIcon /></span>photo non conservée</span>
          </div>
          <p className="subtitle">
            Une IA analyse ta peau en quelques secondes. <b>Pas un quiz</b> — une vraie analyse visuelle.
          </p>
        </div>
      </div>

      <div className="cta-zone">
        <button type="button" className="cta-btn" onClick={() => router.push("/questions/q1")}>
          Diagnostiquer ma peau en 1 minute
          <svg width="17" height="17" viewBox="0 0 17 17" fill="none"><path d="M3 8.5h9M8 4l4.5 4.5L8 13" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      </div>
    </div>
  );
}
