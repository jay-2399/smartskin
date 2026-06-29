import type { Metadata, Viewport } from "next";
import { Manrope, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-manrope",
});
const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-jetbrains",
});

export const metadata: Metadata = {
  title: "SmartSkin — Analyse de peau",
  description: "Bilan de peau personnalisé par IA. Pas un diagnostic médical.",
};

// viewport-fit=cover : le contenu va sous la zone du statut/notch iOS (plus de
// bande claire en haut) et active les `env(safe-area-inset-*)` utilisés dans l'app.
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  // iOS : teinte la zone de la status bar avec le fond de l'app (--bg) au lieu
  // du blanc système → supprime la « bande blanche » en haut sur certains écrans.
  themeColor: "#F1F3F6",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className={`${manrope.variable} ${jetbrains.variable}`}>
      <body>{children}</body>
    </html>
  );
}
