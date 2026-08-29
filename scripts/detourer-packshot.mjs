// Rend transparent le fond blanc d'un packshot, sans service externe.
//
// Les images d'Ulta arrivent déjà en PNG détouré — c'est ce qui fait que les packshots de la
// fiche se détachent du verre. Celles d'Amazon et des sites européens sont des JPEG sur fond
// blanc : posées sur la carte, elles montrent leur rectangle.
//
// Un simple seuil sur la clarté ne marche pas : il perce aussi le produit quand celui-ci est
// blanc — un flacon de CeraVe deviendrait un contour vide. On part donc des BORDS et on ne
// propage que dans le fond contigu, ce qui laisse intact tout blanc entouré de produit.
import fs from "node:fs";
import sharp from "sharp";

const TOLERANCE = 18;     // écart au blanc toléré (0-255) — au-delà, c'est du produit
const ADOUCI = 1;         // pixels de fondu sur le bord, pour éviter l'escalier

export async function detourer(entree) {
  const img = sharp(entree).ensureAlpha();
  const { width: W, height: H } = await img.metadata();
  const px = await img.raw().toBuffer();

  const fond = new Uint8Array(W * H);
  const pile = [];
  const estClair = (i) => px[i * 4] >= 255 - TOLERANCE && px[i * 4 + 1] >= 255 - TOLERANCE && px[i * 4 + 2] >= 255 - TOLERANCE;
  // amorce : tout le pourtour
  for (let x = 0; x < W; x++) { pile.push(x); pile.push((H - 1) * W + x); }
  for (let y = 0; y < H; y++) { pile.push(y * W); pile.push(y * W + W - 1); }

  while (pile.length) {
    const i = pile.pop();
    if (fond[i] || !estClair(i)) continue;
    fond[i] = 1;
    const x = i % W, y = (i - x) / W;
    if (x > 0) pile.push(i - 1);
    if (x < W - 1) pile.push(i + 1);
    if (y > 0) pile.push(i - W);
    if (y < H - 1) pile.push(i + W);
  }

  // le fond devient transparent ; les pixels de bordure sont adoucis
  for (let i = 0; i < W * H; i++) {
    if (!fond[i]) continue;
    px[i * 4 + 3] = 0;
  }
  if (ADOUCI) {
    for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
      const i = y * W + x;
      if (fond[i]) continue;
      let voisinsFond = 0;
      for (const j of [i - 1, i + 1, i - W, i + W]) if (fond[j]) voisinsFond++;
      if (voisinsFond) px[i * 4 + 3] = Math.round(255 * (1 - voisinsFond / 6));
    }
  }

  const part = fond.reduce((s, v) => s + v, 0) / (W * H);
  return { buffer: await sharp(px, { raw: { width: W, height: H, channels: 4 } }).png().toBuffer(),
           partFond: Math.round(part * 100) };
}

// usage direct : node scripts/detourer-packshot.mjs <url|fichier> <sortie.png>
if (process.argv[1] && process.argv[1].endsWith("detourer-packshot.mjs")) {
  const [, , src, dst] = process.argv;
  const entree = /^https?:/.test(src) ? Buffer.from(await (await fetch(src)).arrayBuffer()) : fs.readFileSync(src);
  const r = await detourer(entree);
  fs.writeFileSync(dst || "detoure.png", r.buffer);
  console.log("écrit " + (dst || "detoure.png") + " — " + r.partFond + " % de l'image était du fond");
}
