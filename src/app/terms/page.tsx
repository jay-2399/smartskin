import type { Metadata } from "next";
import { LegalBack } from "@/components/LegalBack";
import "../legal.css";

export const metadata: Metadata = {
  title: "Terms of Service — SmartSkin",
  description: "The terms that govern your use of SmartSkin.",
};

export default function TermsPage() {
  return (
    <main className="legal">
      <LegalBack />
      <h1>Terms of Service</h1>
      <p className="legal-updated">Last updated: July 22, 2026</p>

      <p>By using SmartSkin, you agree to these Terms. If you do not agree, please do not use the app.</p>

      <h2>1. The service</h2>
      <p>
        SmartSkin analyzes a photo of your skin and suggests a cosmetic skincare routine. It is a
        <strong> cosmetic assessment, not a medical diagnosis or treatment</strong>, and does not
        replace a dermatologist or other healthcare professional.
      </p>

      <h2>2. Your account</h2>
      <p>
        You sign in with Apple. You are responsible for keeping your Apple ID secure. You must be at
        least 16 years old to use SmartSkin.
      </p>

      <h2>3. Subscriptions and purchases</h2>
      <ul>
        <li>SmartSkin offers a one-time <strong>Lifetime</strong> purchase and an auto-renewable <strong>Weekly</strong> subscription. Prices are shown in the app before you buy.</li>
        <li><strong>Auto-renewable subscriptions renew automatically</strong> at the end of each period unless you cancel at least 24 hours before the end of the current period. Your Apple ID is charged for the renewal.</li>
        <li>You can manage or cancel a subscription anytime in your device&rsquo;s <strong>Settings → [your name] → Subscriptions</strong>.</li>
        <li>Payments, billing, and refunds are handled by Apple. Purchases are governed by Apple&rsquo;s standard End User License Agreement (EULA):{" "}
          <a href="https://www.apple.com/legal/internet-services/itunes/dev/stdeula/" target="_blank" rel="noopener noreferrer">apple.com/legal/…/stdeula</a>.</li>
        <li>The &ldquo;Lifetime&rdquo; purchase grants access for the operating lifetime of the service, not a personal lifetime guarantee.</li>
      </ul>

      <h2>4. Acceptable use</h2>
      <p>
        Please don&rsquo;t misuse the app: no reverse engineering, no automated scraping, no
        uploading of content that is not a photo of your own face, and no unlawful use.
      </p>

      <h2>5. Intellectual property</h2>
      <p>The app, its content, and its analysis engine belong to us. Your photo and your personal data remain yours.</p>

      <h2>6. Disclaimers</h2>
      <p>
        The app is provided &ldquo;as is&rdquo;. The analysis and product recommendations are
        informational and cosmetic, may be imperfect, and are not medical advice. Always patch-test
        new products and consult a professional for any medical concern.
      </p>

      <h2>7. Limitation of liability</h2>
      <p>
        To the maximum extent permitted by law, we are not liable for indirect, incidental, or
        consequential damages arising from your use of the app.
      </p>

      <h2>8. Changes</h2>
      <p>We may update these Terms. We will change the date above; continued use means you accept the changes.</p>

      <h2>9. Contact</h2>
      <p>Questions: <a href="mailto:support@smart-skin.ai">support@smart-skin.ai</a>.</p>
    </main>
  );
}
