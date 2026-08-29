// Détoure les packshots de la campagne française : fond blanc → transparence, format webp.
//
// Les images d'Amazon sont des JPEG sur fond blanc — posées sur la carte en verre de la fiche,
// elles montrent leur rectangle (et sur fond sombre, une boîte lumineuse). Le détourage part des
// BORDS et ne creuse que le fond contigu : un flacon blanc reste entier (cf. detourer-packshot).
// Sortie : public/packshots/<asin>.webp, 420 px, ~15-40 Ko — servies par l'app elle-même,
// plus aucune dépendance aux serveurs d'images d'Amazon.
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { detourer } from "./detourer-packshot.mjs";

const RACINE = path.resolve(import.meta.dirname, "..");
const FICHES = path.join(RACINE, "data/scan/fiches-fr-brut.json");
const SORTIE = path.join(RACINE, "public/packshots");
const TAILLE = 420;
const PARALLELE = 6;
fs.mkdirSync(SORTIE, { recursive: true });

const fiches = JSON.parse(fs.readFileSync(FICHES, "utf8"));
const cibles = Object.values(fiches).filter((f) => !f.erreur && f.image && f.asin
  && !fs.existsSync(path.join(SORTIE, f.asin + ".webp")));
console.log(cibles.length + " packshots à détourer\n");

let faits = 0, rates = 0;
async function traiter(f) {
  try {
    const r = await fetch(f.image, { signal: AbortSignal.timeout(25000) });
    if (!r.ok) throw new Error("HTTP " + r.status);
    const brut = Buffer.from(await r.arrayBuffer());
    const { buffer, partFond } = await detourer(brut);
    // un « détourage » qui n'a rien trouvé à creuser (photo pleine page, fond non blanc) est
    // gardé tel quel : mieux vaut un rectangle qu'une image trouée au mauvais endroit
    const src = partFond >= 5 ? buffer : brut;
    await sharp(src).resize(TAILLE, TAILLE, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 }).toFile(path.join(SORTIE, f.asin + ".webp"));
    process.stdout.write(partFond >= 5 ? "." : "o");
  } catch { rates++; process.stdout.write("!"); }
  if (++faits % 40 === 0) process.stdout.write(" " + faits + "/" + cibles.length + "\n");
}
const file = cibles.slice();
await Promise.all(Array.from({ length: PARALLELE }, async () => { while (file.length) await traiter(file.shift()); }));
const n = fs.readdirSync(SORTIE).filter((x) => x.endsWith(".webp")).length;
const poids = fs.readdirSync(SORTIE).reduce((s, x) => s + fs.statSync(path.join(SORTIE, x)).size, 0);
console.log("\n\n" + n + " packshots · " + Math.round(poids / 1024 / 1024 * 10) / 10 + " Mo · " + rates + " échecs");
