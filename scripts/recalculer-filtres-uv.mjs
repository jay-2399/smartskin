// RECALCUL DU DRAPEAU `filtresUV` DU CATALOGUE (audit du 7 septembre, B4).
// Le drapeau était posé dès que l'oxyde de zinc ou le dioxyde de titane apparaissaient dans les
// 8 premiers ingrédients, par sous-chaîne : 32 produits non solaires recevaient +8 « protection
// UV » et disaient « ça vous protège des UV » à une utilisatrice qui ne se protège pas. La règle
// vit dans categorise.mjs (`filtresUVDe`) ; ce script l'applique au catalogue, pose explicitement
// true ou false, et imprime chaque bascule. Il ne supprime ni ne réordonne aucune fiche.
//
// Usage : node scripts/recalculer-filtres-uv.mjs             → simulation
//         node scripts/recalculer-filtres-uv.mjs --appliquer → écrit catalog.json (sauvegarde catalog.avant-filtres-uv.json)
import fs from "node:fs";
import path from "node:path";
import { tokens, filtresUVDe } from "../src/lib/scan/categorise.mjs";

const D = path.join(process.cwd(), "data", "scan") + path.sep;
const cat = JSON.parse(fs.readFileSync(D + "catalog.json", "utf8"));
const bascules = [];
for (const p of cat) {
  if (p.category === "hors-perimetre" || !p.inci) continue;
  const nouveau = filtresUVDe(p.name, p.brand, tokens(p.inci), p.category);
  if (!!p.filtresUV !== nouveau) { bascules.push({ nom: p.name, cat: p.category, de: !!p.filtresUV, a: nouveau }); p.filtresUV = nouveau; }
  else if (p.filtresUV === undefined) p.filtresUV = false;   // valeur explicite, comme le reste du catalogue
}
for (const b of bascules) console.log(`${b.de ? "true → false" : "false → true"}  [${b.cat}] ${b.nom}`);
console.log(`\n${bascules.length} bascule(s) : ${bascules.filter((b) => !b.a).length} vers false, ${bascules.filter((b) => b.a).length} vers true ; ${cat.length} fiches`);
if (process.argv.includes("--appliquer")) {
  fs.copyFileSync(D + "catalog.json", D + "catalog.avant-filtres-uv.json");
  fs.writeFileSync(D + "catalog.json", JSON.stringify(cat));   // une ligne : le format du fichier
  console.log("✅ APPLIQUÉ (sauvegarde catalog.avant-filtres-uv.json)");
} else console.log("(simulation — relancer avec --appliquer)");
