// Télécharge et réduit les photos produit en vignettes embarquables.
//
// Les pages de contrôle pointaient les images chez Ulta et INCIdecoder. Les deux répondent, mais
// un lecteur qui bloque les requêtes externes (panneau latéral, aperçu, navigateur strict)
// n'affiche alors que des cadres vides — la page devient illisible là où on la lit vraiment.
// Une vignette de 150 px pèse quelques kilo-octets : autant la mettre dans le fichier.
//
//   node scripts/vignettes-produits.mjs        → complète data/scan/vignettes.json
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const RACINE = path.resolve(import.meta.dirname, "..");
const SORTIE = path.join(RACINE, "data/scan/vignettes.json");
const TAILLE = 150;
const PARALLELE = 8;

const produits = JSON.parse(fs.readFileSync(path.join(RACINE, "data/scan/catalog.json"), "utf8"));
const cibles = produits.filter((p) => p.asinAvis && p.image);
const vignettes = fs.existsSync(SORTIE) ? JSON.parse(fs.readFileSync(SORTIE, "utf8")) : {};
const aFaire = cibles.filter((p) => !(p.image in vignettes));
console.log(cibles.length + " photos, " + aFaire.length + " à réduire\n");

let faits = 0;
async function traiter(p) {
  try {
    const r = await fetch(p.image, { signal: AbortSignal.timeout(20000) });
    if (!r.ok) throw new Error("HTTP " + r.status);
    const buf = Buffer.from(await r.arrayBuffer());
    const petit = await sharp(buf)
      .resize(TAILLE, TAILLE, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 78 })
      .toBuffer();
    vignettes[p.image] = "data:image/webp;base64," + petit.toString("base64");
    process.stdout.write(".");
  } catch {
    vignettes[p.image] = null;     // photo inaccessible : la carte gardera un cadre vide
    process.stdout.write("!");
  }
  if (++faits % 20 === 0) fs.writeFileSync(SORTIE, JSON.stringify(vignettes), "utf8");
}

const file = aFaire.slice();
await Promise.all(Array.from({ length: PARALLELE }, async () => { while (file.length) await traiter(file.shift()); }));
fs.writeFileSync(SORTIE, JSON.stringify(vignettes), "utf8");

const ok = Object.values(vignettes).filter(Boolean);
const poids = ok.reduce((s, v) => s + v.length, 0);
console.log("\n\n" + ok.length + " vignettes · " + Math.round(poids / 1024) + " Ko au total · "
  + Math.round(poids / ok.length / 1024 * 10) / 10 + " Ko en moyenne");
