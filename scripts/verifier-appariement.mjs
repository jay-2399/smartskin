// Vérifie qu'une page trouvée sur le web parle bien DU produit qu'on cherchait.
//
// La recherche par nom exact ramène souvent la fiche d'un cousin : « Mighty Patch Original » a
// renvoyé la page du « Mighty Patch Micropoint », « Hydro-Star Pink » celle du « Hydro-Star
// Salicylic Acid ». Ce sont des produits différents, avec des compositions différentes — leur
// attribuer l'INCI du voisin est exactement la faute qu'on essaie de réparer.
//
// La règle : les mots DISTINCTIFS du nom (ce qui reste une fois retirés la marque et le
// vocabulaire commun à toute la catégorie) doivent se retrouver dans l'adresse de la page.
// « Pink » est distinctif ; « patches » ne l'est pas.

const GENERIQUES = new Set(`the a an and for with plus mini duo pack size oz ml fl count ct
  face facial skin care skincare cream creme lotion serum gel oil balm mask masque patch patches
  cleanser wash scrub toner mist spray essence treatment moisturizer moisturiser sunscreen spf
  eye lip body daily night day new original clear pure fresh soft rich light deep ultra super
  hydrating hydration cleansing exfoliating brightening soothing repairing nourishing`
  .split(/\s+/).filter(Boolean));

const mots = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().split(" ").filter(Boolean);

export function distinctifs(nom, marque) {
  const dm = new Set(mots(marque));
  return [...new Set(mots(nom))].filter((m) =>
    m.length > 2 && !dm.has(m) && !GENERIQUES.has(m) && !/^\d+$/.test(m));
}

// `contexte` = l'URL, plus le titre de la page quand on l'a.
export function apparie(nom, marque, contexte) {
  const d = distinctifs(nom, marque);
  if (!d.length) return { ok: true, part: 1, manquants: [], raison: "aucun mot distinctif à vérifier" };
  const c = String(contexte || "").toLowerCase().replace(/[^a-z0-9]+/g, " ");
  const manquants = d.filter((m) => !c.includes(m));
  const part = 1 - manquants.length / d.length;
  return { ok: part >= 0.6, part: Math.round(part * 100) / 100, manquants };
}
