// Ramène un INCI à la forme que le moteur sait lire : des ingrédients séparés par des virgules.
//
// Les pages produit n'écrivent pas toutes l'INCI de la même façon. On en rencontre trois formes :
//   virgules   « Water, Glycerin, Niacinamide »            → déjà bon
//   points     « Aqua/Water/Eau. Propanediol. Glycerin. »  → Clarins, Avène, L'Oréal…
//   espaces    « Glycerin Dipropylene Glycol Niacinamide » → TONYMOLY, solaires américains
// decouperInci() (scoring.mjs) ne coupe que sur , ; et • : sans cette étape, un INCI en points
// ou en espaces est lu comme UN SEUL ingrédient de 600 caractères, donc reconnu par personne.
import fs from "node:fs";
import path from "node:path";

const DICO = JSON.parse(fs.readFileSync(
  path.join(import.meta.dirname, "../data/scan/dictionnaire.json"), "utf8"));
const NOMS = new Set(Object.keys(DICO).map((s) => s.toUpperCase()));
// combien de mots au maximum dans un nom d'ingrédient (« BUTYROSPERMUM PARKII SHEA BUTTER » = 4)
const MOTS_MAX = Math.min(6, Math.max(...[...NOMS].map((n) => n.split(/\s+/).length)));

const compte = (s, re) => (s.match(re) || []).length;

// ————— forme « points » —————
// On ne remplace un point que s'il sépare vraiment deux ingrédients : suivi d'une espace et
// d'une majuscule, et jamais à l'intérieur d'un nombre (3.5%) ni d'une abréviation (C12-15 Alk.).
function pointsVersVirgules(txt) {
  return txt.replace(/\.\s+(?=[A-Z0-9])/g, ", ").replace(/\.$/, "");
}

// ————— forme « espaces » —————
// Découpage glouton : à chaque position on prend la plus LONGUE suite de mots qui soit un
// ingrédient connu. Ce qui n'est pas reconnu est recraché tel quel plutôt que jeté — mieux vaut
// un ingrédient inconnu qu'un ingrédient perdu.
function espacesVersVirgules(txt) {
  const mots = txt.replace(/\s+/g, " ").trim().split(" ");
  const out = [];
  let orphelins = [];
  let i = 0;
  while (i < mots.length) {
    let trouve = null;
    for (let L = Math.min(MOTS_MAX, mots.length - i); L >= 1; L--) {
      const essai = mots.slice(i, i + L).join(" ");
      const propre = essai.replace(/[.,;]+$/, "").toUpperCase();
      if (NOMS.has(propre)) { trouve = { texte: essai.replace(/[.,;]+$/, ""), L }; break; }
    }
    if (trouve) {
      if (orphelins.length) { out.push(orphelins.join(" ")); orphelins = []; }
      out.push(trouve.texte);
      i += trouve.L;
    } else {
      orphelins.push(mots[i]);
      i += 1;
    }
  }
  if (orphelins.length) out.push(orphelins.join(" "));
  return out.filter(Boolean).join(", ");
}

// ————— reconnaissance de la forme, puis normalisation —————
export function normaliserInci(brut) {
  if (!brut) return { inci: null, forme: "absent", n: 0 };
  let t = String(brut).replace(/\s+/g, " ").trim();

  // les solaires américains sont étiquetés « Active: … Inactive: … » : on garde les deux
  // listes (les filtres UV comptent dans le score) mais on retire les intitulés.
  const otc = /\b(active|inactive)\s+ingredients?\s*:/i.test(t) || /^\s*active\s*:/i.test(t);
  if (otc) t = t.replace(/\b(active|inactive)\s+ingredients?\s*:/gi, ", ").replace(/^\s*,\s*/, "");

  const virgules = compte(t, /,/g);
  const points = compte(t, /\.\s+[A-Z0-9]/g);

  let forme, inci;
  if (virgules >= 6) { forme = "virgules"; inci = t; }
  else if (points >= 6) { forme = "points"; inci = pointsVersVirgules(t); }
  else {
    const essai = espacesVersVirgules(t);
    const n = essai.split(",").length;
    if (n >= 6) { forme = "espaces"; inci = essai; }
    else if (virgules >= 2 || points >= 2) { forme = points > virgules ? "points" : "virgules";
                                             inci = points > virgules ? pointsVersVirgules(t) : t; }
    else { forme = "court"; inci = essai || t; }
  }
  if (otc) forme = "otc-" + forme;
  inci = inci.replace(/\s*,\s*/g, ", ").replace(/(^,\s*|,\s*$)/g, "").trim();
  // Recolle les noms chimiques dont le chiffre de tête forme un ingrédient à lui seul :
  // « 1,2-Hexanediol » devient « 1, 2-Hexanediol » au découpage, et decouperInci() (scoring.mjs)
  // le coupe alors en « 1 » (jeté, trop court) + « 2-Hexanediol » (introuvable au dictionnaire).
  // Un chiffre isolé n'est jamais un ingrédient : il appartient toujours au suivant.
  inci = inci.replace(/(^|,\s*)(\d+),\s+(?=\d)/g, "$1$2,");
  return { inci: inci || null, forme, n: inci ? inci.split(",").length : 0 };
}

// combien des ingrédients produits sont reconnus par le dictionnaire — le juge de paix
export function tauxReconnu(inci) {
  if (!inci) return 0;
  const l = inci.split(",").map((s) => s.trim().toUpperCase().replace(/\s*\/\s*/g, "/")).filter(Boolean);
  if (!l.length) return 0;
  const ok = l.filter((t) => NOMS.has(t) || /^(AQUA|WATER|EAU)\b/.test(t)).length;
  return ok / l.length;
}
