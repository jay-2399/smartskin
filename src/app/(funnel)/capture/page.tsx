"use client";
import { useRouter } from "next/navigation";

/* Placeholder — remplacé par le vrai écran capture (MediaPipe) au Plan 3. */
export default function CapturePage() {
  const router = useRouter();
  return (
    <div className="screen">
      <div className="qhead">
        <h1 className="question">Capture photo (placeholder — Plan 3)</h1>
      </div>
      <div className="footer" style={{ marginTop: "auto" }}>
        <div className="foot-row">
          <button type="button" className="cta-btn" onClick={() => router.push("/questions/q2")}>
            Continuer
          </button>
        </div>
      </div>
    </div>
  );
}
