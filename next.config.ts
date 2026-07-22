import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Autorise les ressources dev de Next depuis un tunnel cloudflared
  // (*.trycloudflare.com) pour l'aperçu sur mobile. Sans ça, Next bloque en
  // cross-origin l'hydratation → la page s'affiche mais reste figée (aucun clic).
  // N'affecte QUE `next dev` ; aucun effet en production.
  allowedDevOrigins: ["*.trycloudflare.com"],
};

export default nextConfig;
