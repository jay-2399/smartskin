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

// « original », « clear », « night », « day », « invisible » ne sont PAS du vocabulaire courant :
// ce sont les marqueurs qui distinguent deux variantes d'une même gamme. Les traiter comme
// communs rendait le Mighty Patch Original indiscernable de l'Invisible+.
const GENERIQUES = new Set(`the a an and for with pack size oz ml fl count ct
  face facial skin care skincare cream creme lotion serum gel oil balm mask masque patch patches
  cleanser wash scrub toner mist spray essence treatment moisturizer moisturiser sunscreen spf
  eye lip body daily new
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


// ── le contrôle qui compte vraiment ──
//
// Vérifier que NOS mots sont sur la page rejette à tort : notre nom vient d'Ulta et traîne des
// mots que le fabricant n'emploie pas — « Caffeine Eye Cream for Depuffing » chez nous,
// « Caffeine Eye Cream » chez Mario Badescu. Même produit, refusé pour rien.
//
// Le danger est dans l'autre sens : un mot sur LA PAGE qui n'est pas chez nous. « Mighty Patch
// Micropoint » quand on cherche l'« Original », c'est un autre produit, une autre formule.
// Donc on lit le titre de la page et on exige que SES mots distinctifs soient chez nous.
//
// On garde tout de même un plancher dans l'ancien sens : une page qui ne partagerait AUCUN mot
// avec notre nom n'est pas notre produit non plus, même si son titre est vague.

// Le titre d'une page porte le nom de la boutique après un séparateur, et des scories qui
// passeraient pour des mots du produit : entités HTML non décodées (« &ndash; » devenait le mot
// « ndash », qui comptait comme un ingrédient de nom étranger et faisait rejeter la page), symbole
// déposé, contenance, nombre d'unités.
const ENTITES = { amp: "&", ndash: "–", mdash: "—", lsquo: "'", rsquo: "'", ldquo: '"', rdquo: '"',
                  quot: '"', apos: "'", nbsp: " ", lt: "<", gt: ">", trade: " ", reg: " ", deg: "°" };
function decoder(t) {
  return String(t || "")
    .replace(/&([a-z]+);/gi, (m, n) => ENTITES[n.toLowerCase()] ?? " ")
    .replace(/&#(\d+);/g, (m, n) => String.fromCharCode(+n))
    .replace(/[™®©]/g, " ");
}
function titreProduit(titre) {
  return decoder(titre)
    .split(/\s*[|·—–]\s*|\s+-\s+/)[0]           // « Produit – Boutique » → « Produit »
    .replace(/\b\d+\s*(count|ct|pack|pcs?|ml|g|oz|fl\.?\s*oz)\b/gi, " ")   // contenances
    .slice(0, 120);
}

// Certains mots ne sont pas des mots comme les autres : ce sont EXACTEMENT ce qui sépare deux
// variantes d'une même gamme. « The Rice Polish: Deep » et « The Rice Polish: Daily » ne diffèrent
// que par là, et leurs formules diffèrent vraiment. Un seul de ces mots présent sur la page et
// absent de chez nous suffit à disqualifier, quel que soit le reste du recouvrement.
const VARIANTES = new Set(`original invisible micropoint deep light rich intense extra ultra max pro
  mini travel jumbo refill duo trio kit set night day nuit jour pink blue green clear white black
  gold rose sensitive oily dry combination normal mature men women kids baby forte plus advanced
  gentle strong medicated fragrance-free unscented tinted matte dewy`.split(/\s+/).filter(Boolean));

export function apparieDepuisPage(nom, marque, titre, url) {
  const nos = new Set(distinctifs(decoder(nom), marque));
  const siens = distinctifs(titreProduit(titre), marque);

  // sens qui compte : les mots distinctifs de la page doivent être chez nous
  const etrangers = siens.filter((m) => !nos.has(m));
  const partSiens = siens.length ? 1 - etrangers.length / siens.length : 0;

  // plancher : la page doit tout de même parler un peu de notre produit
  const contexte = (String(url || "") + " " + String(titre || "")).toLowerCase().replace(/[^a-z0-9]+/g, " ");
  const communs = [...nos].filter((m) => contexte.includes(m)).length;
  const partNotre = nos.size ? communs / nos.size : 1;

  // Sans mot distinctif d'aucun côté, on ne peut rien affirmer : on refuse.
  if (!siens.length && !nos.size) return { ok: false, etrangers: [], partSiens: 0, partNotre: 0,
                                           raison: "aucun mot distinctif de part et d'autre" };
  // Deux seuils, chacun contre une faute différente : `partSiens` empêche de prendre le cousin
  // (un mot de la page absent de chez nous), `partNotre` empêche de prendre une page qui ne parle
  // pas vraiment de notre produit. Ni l'un ni l'autre n'attrape le cas où plusieurs de nos
  // produits tombent sur la MÊME page — ça se règle après coup, en repérant les collisions.
  const marqueurs = etrangers.filter((m) => VARIANTES.has(m));
  const ok = marqueurs.length === 0 && partSiens >= 0.6 && partNotre >= 0.5;
  return { ok, etrangers, marqueurs, partSiens: Math.round(partSiens * 100) / 100,
           partNotre: Math.round(partNotre * 100) / 100 };
}
