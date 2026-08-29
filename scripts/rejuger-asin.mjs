// Rejuge les appariements Amazon déjà collectés, avec les règles courantes — sans requête.
//
// Les titres et les ASIN sont gardés dans les fichiers de récolte : quand le contrôle d'appariement
// gagne une règle, il n'y a aucune raison de repayer une recherche pour en profiter. C'est le même
// principe que pour les INCI, où le tri s'était durci après coup.
//
//   node scripts/rejuger-asin.mjs
import fs from "node:fs";
import path from "node:path";
import { apparieTitreMarchand } from "./verifier-appariement.mjs";

const RACINE = path.resolve(import.meta.dirname, "..");
const produits = JSON.parse(fs.readFileSync(path.join(RACINE, "data/scan/catalog.json"), "utf8"));
const parNom = new Map(produits.map((p) => [p.name, p]));

for (const f of ["avis-asin-trouves.json", "avis-asin-serp.json"]) {
  const chemin = path.join(RACINE, "data/scan", f);
  if (!fs.existsSync(chemin)) continue;
  const a = JSON.parse(fs.readFileSync(chemin, "utf8"));
  let promus = 0, retires = 0;

  for (const [nom, v] of Object.entries(a)) {
    const p = parNom.get(nom);
    if (!p) continue;
    // un titre retenu qui ne passe plus
    if (v.trouve && v.titre) {
      const j = apparieTitreMarchand(nom, p.brand, v.titre);
      if (!j.ok) {
        console.log("  ⨯ " + nom.slice(0, 46) + "\n      « " + String(v.titre).slice(0, 58) + " » — "
          + (j.motif || "[" + (j.marqueurs || []).join(", ") + "]"));
        a[nom] = { trouve: false, motif: "rejugé", titreRejete: v.titre, asinRejete: v.asin };
        retires++;
      }
      continue;
    }
    // un candidat écarté qui passerait maintenant
    for (const e of v.ecartes || []) {
      const j = apparieTitreMarchand(nom, p.brand, e.titre || "");
      if (j.ok) {
        console.log("  ✓ " + nom.slice(0, 46) + "\n      « " + String(e.titre).slice(0, 58) + " »");
        a[nom] = { trouve: true, asin: e.asin, titre: e.titre, appariement: j.partSiens, rejuge: true };
        promus++;
        break;
      }
    }
  }
  fs.writeFileSync(chemin, JSON.stringify(a, null, 2), "utf8");
  const ok = Object.values(a).filter((v) => v.trouve).length;
  console.log(f + " → " + ok + " appariés (" + promus + " repêchés, " + retires + " retirés)\n");
}
