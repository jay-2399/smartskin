// DÉDOUBLONNAGE DU CATALOGUE — supprime les entrées qui décrivent un produit déjà présent.
//
// D'où vient le problème : le catalogue a été assemblé en trois passes (Ulta, INCIdecoder,
// Amazon) collées bout à bout, sans jamais comparer les entrées entre sources. Le même produit
// y figure donc plusieurs fois sous des libellés différents — nom traduit, nom raccourci, nom
// commercial d'une autre région. Conséquence concrète : le scan propose au modèle les deux
// lignes, et s'il choisit celle qui n'a pas d'avis, l'utilisatrice perd les avis qu'on possède.
//
// Critère retenu : INCI STRICTEMENT identique. Même formule = même produit. On ne dédoublonne
// JAMAIS sur la ressemblance des noms : « Centella Ampoule » et « Centella Teca Ampoule » ont
// 80 % de mots communs et sont deux formules différentes — les fusionner attribuerait les avis
// d'un produit à un autre.
//
// Ce que ce script NE supprime PAS : les variantes sous licence (patchs Hello Kitty / Kuromi /
// My Melody / Cinnamoroll, baume Snoopy). Formule identique, mais ce sont des références
// distinctes en rayon : si on supprime l'entrée Hello Kitty, une photo de la boîte Hello Kitty
// se voit répondre « Miffy ». Elles gardent leur ligne et empruntent les avis de leur jumelle
// via le repli INCI de src/lib/scan/avis.ts.
//
// Usage : node scripts/dedoublonner-catalogue.mjs            → liste sans rien écrire
//         node scripts/dedoublonner-catalogue.mjs --appliquer → réécrit catalog.json
import fs from "node:fs";
import path from "node:path";

const FICHIER = path.join(process.cwd(), "data", "scan", "catalog.json");

// Réécritures pures : le même produit écrit une deuxième fois. Aucune boîte ne porte ce nom-là
// en rayon à côté de l'autre. Chaque ligne a été vérifiée à la main contre l'INCI de sa jumelle.
const A_SUPPRIMER = [
  "CeraVe Aceite Limpiador Hidratante",                    // nom espagnol de Hydrating Foaming Oil Cleanser
  "CeraVe Balancing Air Foam Cleanser",                    // même chose que « …Air Foam Facial Cleanser »
  "CeraVe Cleansing Balm",                                 // nom tronqué de Makeup Removing Cleansing Balm
  "CeraVe Blemish Control Gel Moisturiser With 2% Salicylic Acid & Niacinamide For Blemish-prone Skin", // nom UK d'Acne Control Gel
  "The Ordinary GF 15% Solution",                          // même chose que « GF 15% Serum »
  "The Ordinary Buffet",                                   // ancien nom de Multi-Peptide + Hyaluronic Acid
  "Neutrogena Alcohol-free Daily Facial Toner",            // même chose que « …Gentle Daily Facial Toner »
];

const cat = JSON.parse(fs.readFileSync(FICHIER, "utf8"));
const cible = new Set(A_SUPPRIMER);
const gardes = cat.filter((p) => !cible.has(p.name));
const retires = cat.filter((p) => cible.has(p.name));

for (const p of retires) console.log("  − " + p.name + "   (" + p.source + ")");
const absents = A_SUPPRIMER.filter((n) => !cat.some((p) => p.name === n));
for (const n of absents) console.log("  ? INTROUVABLE : " + n);

console.log(`\n${cat.length} → ${gardes.length} produits (${retires.length} retirés)`);

if (process.argv.includes("--appliquer")) {
  if (absents.length) { console.error("des lignes sont introuvables — rien n'a été écrit"); process.exit(1); }
  fs.writeFileSync(FICHIER, JSON.stringify(gardes, null, 1));
  console.log("catalog.json réécrit.");
} else {
  console.log("(essai à blanc — relancer avec --appliquer pour écrire)");
}
