// Cherche une liste d'ingrédients dans une page QUELCONQUE (site de marque, revendeur…) et
// refuse de rendre autre chose.
//
// Le premier collecteur du catalogue prenait « la zone la plus dense en virgules » sans jamais
// vérifier que c'en était une. Ici c'est l'inverse : on propose des candidats, et seul le
// DICTIONNAIRE tranche. Une énumération quelconque — des tailles, des pays de livraison, une
// liste d'autres produits — ne franchit pas la barre, quelle que soit sa densité en virgules.
import { normaliserInci, tauxReconnu } from "./normaliser-inci.mjs";

const BALISES = /<(script|style|noscript|svg)[^>]*>[\s\S]*?<\/\1>/gi;

function enTexte(html) {
  return html
    .replace(BALISES, " ")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/(p|div|li|td|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&#39;|&rsquo;/g, "'")
    .replace(/&quot;|&ldquo;|&rdquo;/g, '"').replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/[ \t]+/g, " ");
}

// Un INCI se présente presque toujours derrière le mot « Ingredients ». On collecte ce qui suit
// chaque occurrence, plus les blocs JSON du même nom quand la page en embarque.
function candidats(html) {
  const out = [];
  for (const m of html.matchAll(/"(?:ingredients|inciList|ingredient_list)"\s*:\s*"((?:[^"\\]|\\.){30,4000})"/gi))
    out.push(m[1].replace(/\\u002F/gi, "/").replace(/\\n/g, " ").replace(/\\"/g, '"'));

  const txt = enTexte(html);
  // « Ingrédients » accentué et « Composition » : les intitulés des pages FRANÇAISES. Le marqueur
  // anglais seul faisait rater toutes les pharmacies en ligne et les sites de marque en français.
  for (const m of txt.matchAll(/\b(?:ingr[ée]dients?|composition|liste\s+inci|inci)\b\s*[:\-–—]?\s*/gi)) {
    const bloc = txt.slice(m.index + m[0].length, m.index + m[0].length + 2200);
    // on s'arrête au premier signe qu'on a quitté la liste (titre, phrase de mode d'emploi)
    const fin = bloc.search(/\n\s*\n|\b(how to use|directions|usage|reviews?|shipping|related|you may also)\b/i);
    out.push(fin > 60 ? bloc.slice(0, fin) : bloc);
  }
  return out;
}

// Chaque site enrobe sa liste de son propre mobilier : INCIdecoder l'ouvre par « overview » et la
// coupe d'un « [more] » repliable, les boutiques la font suivre de leurs onglets. Ces mots
// passeraient pour des ingrédients inconnus et feraient chuter le taux de reconnaissance — donc
// une bonne liste serait rejetée à cause de son emballage.
const MOBILIER = /\[(more|less)\]|\boverview\b|\bread more on how to read\b|\breport error\b|\bcompare\b/gi;
const FIN = /\[less\]|\bread more on how to read\b|\bshow (less|more)\b|\bwas this helpful\b/i;

function deshabiller(t) {
  let s = String(t).replace(/[\u200B-\u200D\uFEFF]/g, "");   // espaces de largeur nulle
  const f = s.search(FIN);
  if (f > 60) s = s.slice(0, f);
  return s.replace(MOBILIER, " ").replace(/\s+/g, " ").trim();
}

// Retourne le meilleur candidat, ou null. Le seuil est volontairement haut : mieux vaut ne rien
// rendre qu'attribuer à un produit la composition d'un autre.
export function extraireInciDePage(html, { minIngredients = 8, minReconnu = 0.55 } = {}) {
  let best = null;
  for (const brut of candidats(html)) {
    // l'intitulé de la section suit parfois le texte capturé (« Ingredients: Aqua, … ») et
    // deviendrait un ingrédient fantôme en tête de liste
    const propre = deshabiller(brut)
      .replace(/^[\s:.\-–—]*\b(full |key |active |inactive )?ingredients?\b\s*[:\-–—]?\s*/i, "");
    const r = normaliserInci(propre);
    if (!r.inci) continue;
    const n = r.inci.split(",").length;
    if (n < minIngredients) continue;
    const rec = tauxReconnu(r.inci);
    if (rec < minReconnu) continue;
    const note = rec * Math.min(n, 45);          // reconnaissance d'abord, longueur ensuite
    if (!best || note > best.note) best = { inci: r.inci, n, reconnu: rec, forme: r.forme, note };
  }
  return best;
}
