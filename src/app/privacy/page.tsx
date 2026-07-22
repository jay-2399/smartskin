import type { Metadata } from "next";
import { LegalBack } from "@/components/LegalBack";
import "../legal.css";

export const metadata: Metadata = {
  title: "Privacy Policy — SmartSkin",
  description: "How SmartSkin collects, uses, and protects your data.",
};

export default function PrivacyPage() {
  return (
    <main className="legal">
      <LegalBack />
      <h1>Privacy Policy</h1>
      <p className="legal-updated">Last updated: July 22, 2026</p>

      <p>
        SmartSkin (&ldquo;we&rdquo;, &ldquo;us&rdquo;) provides an AI-powered skincare analysis app.
        This policy explains what we collect, why, and the rights you have. We keep the data we
        collect minimal and under your control.
      </p>

      <h2>1. Who we are</h2>
      <p>
        SmartSkin is operated by DaVinci Digitale. For any privacy question or request, contact us
        at <a href="mailto:support@smart-skin.ai">support@smart-skin.ai</a>.
      </p>

      <h2>2. What we collect</h2>
      <ul>
        <li><strong>Face photo</strong> — the selfie you take (or upload) for skin analysis.</li>
        <li><strong>Skin questionnaire</strong> — your answers (age range, skin concerns, etc.).</li>
        <li><strong>Analysis results</strong> — your skin score, detected attributes, skin type, and recommended routine.</li>
        <li><strong>Account information</strong> — when you sign in with Apple, we receive a unique Apple identifier, your email (or Apple&rsquo;s private-relay address if you choose &ldquo;Hide My Email&rdquo;), and your name the first time you sign in.</li>
        <li><strong>Purchase status</strong> — whether you have an active plan. We never receive or store your card or payment details; all payments are handled by Apple.</li>
        <li><strong>Usage analytics</strong> — anonymous product-usage events (screens visited, taps) via PostHog and Microsoft Clarity, to improve the app.</li>
      </ul>

      <h2>3. Your face photo — how it is handled</h2>
      <p>Your face photo is sensitive data and we treat it carefully:</p>
      <ul>
        <li>It is sent, over an encrypted connection, to our AI analysis provider (Anthropic — Claude) to analyze your skin. This processing takes place in the <strong>European Union</strong>.</li>
        <li><strong>Before you create an account (guest scan):</strong> the photo is used only to produce your analysis and is <strong>not stored on our servers</strong> — it stays on your device.</li>
        <li><strong>Once you have an account:</strong> your scan photos are <strong>stored</strong>, linked to your account, so you can see your history and profile picture and track your skin over time.</li>
        <li>You can have all of your photos and scans deleted at any time (see &ldquo;Your rights&rdquo;).</li>
        <li>We never use your photo for advertising, never sell it, and never share it except with the processors listed below.</li>
      </ul>

      <h2>4. Why we use your data</h2>
      <ul>
        <li>To provide the analysis and your personalized routine.</li>
        <li>With your consent, to process your face photo (sensitive data).</li>
        <li>To operate your account and remember your history.</li>
        <li>Our legitimate interest in improving the app (anonymous analytics).</li>
      </ul>

      <h2>5. Who we share data with</h2>
      <p>We use a small number of trusted processors:</p>
      <ul>
        <li><strong>Anthropic</strong> — AI skin analysis (photo + answers), EU processing.</li>
        <li><strong>Apple</strong> — Sign in with Apple, and payments/subscriptions.</li>
        <li><strong>Render</strong> — hosting and database, located in the European Union (Frankfurt).</li>
        <li><strong>PostHog</strong> and <strong>Microsoft Clarity</strong> — anonymous product analytics.</li>
      </ul>
      <p>We do not sell your personal data to anyone.</p>

      <h2>6. Where your data is stored, and for how long</h2>
      <p>
        Your account data (scans, photos, results) is stored in the European Union. We keep it while
        your account is active. If you delete your account, your photos, scans, and personal data are deleted.
      </p>

      <h2>7. Your rights</h2>
      <p>
        Depending on where you live (including under the EU GDPR), you can access, correct, delete,
        export, or object to the processing of your data. To exercise any right — including deleting
        your photos and account — email <a href="mailto:support@smart-skin.ai">support@smart-skin.ai</a>{" "}
        and we will act within the legal timeframe.
      </p>

      <h2>8. Not a medical service</h2>
      <p>
        SmartSkin provides a cosmetic skin assessment, not a medical diagnosis or treatment, and does
        not replace a dermatologist. Consult a healthcare professional for any medical concern.
      </p>

      <h2>9. Children</h2>
      <p>SmartSkin is not intended for children under 16, and we do not knowingly collect their data.</p>

      <h2>10. Changes</h2>
      <p>
        We may update this policy. We will change the &ldquo;Last updated&rdquo; date above and, for
        significant changes, notify you in the app.
      </p>

      <h2>11. Contact</h2>
      <p>Questions or requests: <a href="mailto:support@smart-skin.ai">support@smart-skin.ai</a>.</p>
    </main>
  );
}
