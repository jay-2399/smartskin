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
// Ce qui est VRAIMENT commun à tous les produits : les liaisons, les contenances. Rien d'autre.
// La liste a d'abord été plus large, et c'est ce qui a laissé passer les cousins : « body » y
// figurait, donc « medicube BODY Peel Shot » répondait pour le soin visage ; « hydrating » aussi,
// donc le « Hydrating Eye Cream » de Lancôme répondait pour l'« Ultra Dark Circle ». Un mot de
// forme (foam, balm, gel), de zone (eye, body, lip) ou d'action (hydrating, clarifying) n'est
// jamais du remplissage : c'est souvent la seule chose qui sépare deux références d'une gamme.
const GENERIQUES = new Set(`the a an and for with pack size oz ml fl count ct new skin skincare
  care beauty cosmetics official store inc ltd`.split(/\s+/).filter(Boolean));

// Les titres d'Amazon.fr sont en français, les pages d'ingrédients en anglais : « Gel Nettoyant
// Purifiant » et « Purifying Foaming Gel » désignent le même flacon sans partager un mot. On
// ramène donc chaque jeton à l'anglais AVANT toute comparaison — le lexique ne couvre que le
// vocabulaire de la cosmétique, pas la langue.
const LEXIQUE_FR = { creme: "cream", baume: "balm", serum: "serum", nettoyant: "cleanser",
  moussant: "foaming", purifiant: "purifying", micellaire: "micellar", eau: "water", huile: "oil",
  lait: "milk", gelee: "jelly", mousse: "foam", solaire: "sun", ecran: "sunscreen",
  teinte: "tinted", yeux: "eye", levres: "lip", mains: "hand", corps: "body", visage: "face",
  peau: "skin", peaux: "skin", nuit: "night", jour: "day", homme: "men", femme: "women",
  hydratant: "hydrating", hydratante: "hydrating", apaisant: "soothing", apaisante: "soothing",
  reparateur: "repairing", reparatrice: "repairing", cicatrisant: "repairing",
  cicatrisante: "repairing", nourrissant: "nourishing", nourrissante: "nourishing",
  matifiant: "mattifying", matifiante: "mattifying", exfoliant: "exfoliating",
  demaquillant: "makeup remover", legere: "light", leger: "light", riche: "rich",
  concentre: "concentrated", concentree: "concentrated", rides: "wrinkles", cernes: "circles",
  taches: "spots", imperfections: "blemishes", boutons: "blemishes", seche: "dry",
  seches: "dry", grasse: "oily", grasses: "oily", mixte: "combination", sensible: "sensitive",
  sensibles: "sensitive", normale: "normal", anti: "anti", soin: "care" };
const sansAccents = (x) => String(x).normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const mots = (s) => sansAccents(String(s || "")).toLowerCase().replace(/[^a-z0-9]+/g, " ").trim()
  .split(" ").filter(Boolean)
  .flatMap((m) => (LEXIQUE_FR[m] || m).split(" "));

// Le pluriel est ramené au singulier des deux côtés : sans ça, « Toner Pad » et « Toner Pads »
// passaient pour deux produits différents, et le pluriel comptait comme un mot étranger.
const singulier = (m) => (m.length > 3 && m.endsWith("s") && !m.endsWith("ss")) ? m.slice(0, -1) : m;

/** Le nom ramené au vocabulaire anglais du lexique — pour interroger un site anglophone
 *  (INCIdecoder) avec un titre français : « Eau Micellaire » → « water micellar ». */
export function traduireEn(nom) { return mots(nom).join(" "); }

export function distinctifs(nom, marque) {
  const dm = new Set([...mots(marque)].map(singulier));
  return [...new Set(mots(nom).map(singulier))].filter((m) =>
    m.length > 2 && !dm.has(m) && !GENERIQUES.has(m) && !/^\d+$/.test(m));
}

// `contexte` = l'URL, plus le titre de la page quand on l'a.
export function apparie(nom, marque, contexte) {
  const d = distinctifs(nom, marque);
  if (!d.length) return { ok: true, part: 1, manquants: [], raison: "aucun mot distinctif à vérifier" };
  const c = " " + mots(contexte).join(" ") + " ";
  const manquants = d.filter((m) => !c.includes(" " + m + " "));
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
    // habillage des sites d'ingrédients : « X ingredients (Explained) », « Composition de X »
    .replace(/\b(ingredients?|composition|inci)\b[\s(].*$/i, " ")
    .replace(/\bingredients?$/i, " ")
    // On ne coupe QUE sur les séparateurs de boutique (barre verticale, tiret cadratin). Le
    // trait d'union simple sépare souvent deux parties du NOM sur Amazon (« … - Creamy Foam »,
    // « … - Hydrating Eye Cream ») : couper là supprimait précisément ce qui distingue la
    // référence, et le cousin passait pour le bon produit.
    .split(/\s*[|·—–]\s*/)[0]
    .replace(/\b\d+\s*(count|ct|pack|pcs?|ml|g|oz|fl\.?\s*oz)\b/gi, " ")   // contenances
    .slice(0, 120);
}

// Certains mots ne sont pas des mots comme les autres : ce sont EXACTEMENT ce qui sépare deux
// variantes d'une même gamme. « The Rice Polish: Deep » et « The Rice Polish: Daily » ne diffèrent
// que par là, et leurs formules diffèrent vraiment. Un seul de ces mots présent sur la page et
// absent de chez nous suffit à disqualifier, quel que soit le reste du recouvrement.
// Deux familles de marqueurs, qui ne se comportent pas pareil.
// FORMAT : la contenance change, la formule non. Pour des AVIS c'est tolérable dans les deux sens
// -- le mini et le grand flacon d'un même soin partagent ce que les gens en disent.
const FORMAT_VARIANTE = new Set(`mini travel jumbo refill pack set kit deluxe sample`.split(/\s+/).filter(Boolean));
// IDENTITÉ : ce qui sépare deux produits réellement différents. Manquant d'un côté OU de l'autre,
// il disqualifie — « Peel Shot Glow WHITE Rice » ne peut pas répondre pour un titre qui dit
// seulement « Rice » quand la marque fait aussi une version Black Rice.
// Deux sévérités de marqueur, parce que les sources ne fautent pas de la même façon.
// IDENTITÉ : ce qu'aucun titre n'a le droit de changer NI d'omettre — couleurs, force, version,
// zone du corps. « White Rice » ne répond pas pour « Rice », « Sensitive » pas pour la gamme nue.
const IDENTITE = new Set(`original invisible micropoint deep light rich intense extra ultra max pro
  duo trio night day nuit jour pink blue green clear white black
  gold rose sensitive oily dry combination normal mature men women kids baby forte plus advanced
  gentle strong medicated fragrance-free unscented tinted matte dewy
  body hand foot hair scalp lip eye`.split(/\s+/).filter(Boolean));
// PRÉSENTATION : la forme et les adjectifs d'action. En trop chez eux, ils trahissent un cousin
// (le FOAM Cleanser n'est pas le BUBBLE) ; mais une encyclopédie d'ingrédients les OMET — la page
// « Bioderma Sensibio Forte » est bien notre « Sensibio Forte Cream ». Une place de marché, elle,
// écrit la forme : là, l'omission reste disqualifiante.
const PRESENTATION = new Set(`foam bubble balm gel oil cream milk powder stick spray pad wipe bar liquid whip jelly
  hydrating clarifying soothing brightening purifying exfoliating calming firming mattifying
  nourishing repairing smoothing plumping illuminating detoxifying refreshing cooling whipped
  radiance concentrated serum toner cleanser moisturizer moisturiser essence lotion mask masque
  creme fluid fluide`.split(/\s+/).filter(Boolean));
const VARIANTES = new Set([...IDENTITE, ...PRESENTATION]);

// « pads » est le même marqueur que « pad » : sans cette tolérance, un tonique EN PADS répondait
// pour le tonique liquide de la même gamme.
const estVariante = (m) => VARIANTES.has(m) || (m.endsWith("s") && VARIANTES.has(m.slice(0, -1)));

export function apparieDepuisPage(nom, marque, titre, url, { formesExigees = false } = {}) {
  const nos = new Set(distinctifs(decoder(nom), marque));
  const siens = distinctifs(titreProduit(titre), marque);

  // sens qui compte : les mots distinctifs de la page doivent être chez nous
  const etrangers = siens.filter((m) => !nos.has(m));
  const partSiens = siens.length ? 1 - etrangers.length / siens.length : 0;

  // plancher : la page doit tout de même parler un peu de notre produit. Face à une encyclopédie
  // (formesExigees=false), seuls les mots d'IDENTITÉ comptent au dénominateur : « Vitamin Activ Cg
  // Radiance Concentrated Serum » chez nous, « Vitamin Activ Cg » chez INCIdecoder — les adjectifs
  // et le nom de catégorie omis ne doivent pas faire chuter la part.
  const contexte = " " + mots(String(url || "") + " " + String(titre || "")).join(" ") + " ";
  const nosComptes = formesExigees ? [...nos]
    : [...nos].filter((m) => !PRESENTATION.has(m) && !PRESENTATION.has(m.replace(/s$/, "")));
  const base = nosComptes.length ? nosComptes : [...nos];
  const communs = base.filter((m) => contexte.includes(" " + m + " ")).length;
  const partNotre = base.length ? communs / base.length : 1;

  // Sans mot distinctif d'aucun côté, on ne peut rien affirmer : on refuse.
  if (!siens.length && !nos.size) return { ok: false, etrangers: [], partSiens: 0, partNotre: 0,
                                           raison: "aucun mot distinctif de part et d'autre" };
  // Deux seuils, chacun contre une faute différente : `partSiens` empêche de prendre le cousin
  // (un mot de la page absent de chez nous), `partNotre` empêche de prendre une page qui ne parle
  // pas vraiment de notre produit. Ni l'un ni l'autre n'attrape le cas où plusieurs de nos
  // produits tombent sur la MÊME page — ça se règle après coup, en repérant les collisions.
  // un marqueur d'identité en trop chez EUX, ou manquant chez eux alors qu'on l'a, disqualifie
  const exigeant = (m) => IDENTITE.has(m) || IDENTITE.has(m.replace(/s$/, "")) ||
                          (formesExigees && estVariante(m));
  const manquants = [...nos].filter((m) => exigeant(m) && !siens.includes(m) && !contexte.includes(m));
  const marqueurs = etrangers.filter((m) => estVariante(m)).concat(manquants);

  // Quand TOUS nos mots distinctifs figurent chez eux, leurs mots en trop sont du référencement,
  // pas une autre référence : « Effaclar Duo Dual Action Acne Treatment SPF 30 » est bien notre
  // « Effaclar Duo [+] SPF 30 ». Exiger en plus qu'ils n'aient rien ajouté rejetait le bon produit.
  // Un mot étranger chez eux n'est toléré que si TOUS nos mots distinctifs sont chez eux : leurs
  // ajouts sont alors du référencement autour du même nom (« Effaclar Duo DUAL ACTION »). Quand il
  // manque en plus des nôtres, ce mot étranger est une autre identité — c'est ainsi que le
  // « Toleriane DERMALLERGO » répondait pour le « Toleriane Double Repair » (moitié de nos mots
  // présents, un mot à eux en plus : deux produits différents).
  const ok = marqueurs.length === 0 && partNotre >= 0.5 &&
             (partSiens >= 0.6 || partNotre === 1) &&
             (etrangers.length === 0 || partNotre === 1);
  return { ok, etrangers, marqueurs, partSiens: Math.round(partSiens * 100) / 100,
           partNotre: Math.round(partNotre * 100) / 100 };
}


// ── appariement d'un TITRE DE PLACE DE MARCHÉ ──────────────────────────────────
//
// Un titre Amazon n'est pas un nom de produit : c'est une ligne de référencement. Au nom réel
// s'accrochent une queue d'adjectifs (« …Toner-Soothing and Hydrating »), une contenance, un
// nombre d'unités, parfois une autre langue. Comparer mot à mot cette queue avec notre nom
// rejetait de vrais appariements — le Centella Asiatica Toner de Mixsoon refusé sur « soothing ».
//
// Deux contrôles que le titre de page ne demandait pas, et dont l'absence a laissé passer des
// faux évidents :
//   — LA MARQUE. « KOEC PDRN Pink Collagen Toning Gel » a répondu pour le medicube du même nom.
//     Deux marques différentes ne sont jamais le même produit, quel que soit le reste.
//   — LE NUMÉRO DE VERSION. « Galac Niacin 2.0 » a répondu pour le « 3.0 ». Un chiffre isolé est
//     ignoré ailleurs — ici c'est parfois la seule différence entre deux références.

const QUEUE = /\s*[,\-–—|(]|\s+\b(?:for|with|by|pack of|set of)\b\s/i;

// La marque sort du titre AVANT la coupure : « La Roche-Posay Effaclar Duo Dual Action » se
// coupait au trait d'union de « Roche-Posay » et il ne restait que « La Roche ». Une marque à
// trait d'union n'est pas une queue de référencement.
// Allégations qu'Amazon accroche à presque toutes les fiches. Elles contiennent parfois un mot
// qui, ailleurs, distingue deux références — « No White Cast » sur un solaire faisait rejeter le
// bon produit à cause de « white ». Une promesse n'est pas une variante.
const ALLEGATIONS = /\b(no white cast|non[- ]?comedogenic|fragrance[- ]?free|cruelty[- ]?free|dermatologist[- ]?tested|for all skin types|oil[- ]?free|alcohol[- ]?free|paraben[- ]?free|vegan|hypoallergenic|clinically proven)\b/gi;

function nomDansTitre(titre, marque) {
  let t = decoder(titre).replace(ALLEGATIONS, " ");
  if (marque) {
    const m = String(marque).trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/[\s\-.']+/g, "[\\s\\-.']*");
    t = t.replace(new RegExp(m, "gi"), " ");
  }
  // « Marque - Produit » : la marque retirée, le titre COMMENCE par le séparateur, et couper au
  // premier donnait une chaîne vide — plus aucun mot à comparer, tout s'appariait. On prend le
  // premier segment non vide.
  t = t.split(QUEUE).map((x) => x.trim()).find(Boolean) || "";
  return t.replace(/\b\d+(?:\.\d+)?\s*(?:count|ct|pcs?|ml|g|oz|fl\.?\s*oz)\b/gi, " ").replace(/\s+/g, " ").trim();
}

const versions = (s) => (String(s).match(/\b\d+\.\d+\b/g) || []);
// Un nombre QUALIFIÉ est une caractéristique du produit, pas un chiffre de remplissage : « SPF 15 »
// ne répond pas pour « SPF 50 », « 2% » pas pour « 4% ». Le découpage en mots les jette — c'est
// ainsi que le Skin Restoring Moisturizer SPF 15 a récupéré la fiche du SPF 50.
function qualifies(s) {
  const t = String(s);
  const out = [];
  for (const m of t.matchAll(/\bspf\s*(\d{1,3})\b/gi)) out.push("spf" + m[1]);
  for (const m of t.matchAll(/(\d+(?:[.,]\d+)?)\s*%/g)) out.push(m[1].replace(",", ".") + "%");
  return [...new Set(out)];
}

export function apparieTitreMarchand(nom, marque, titre) {
  const t = decoder(titre);
  const nMarque = String(marque || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  const nTitre = t.toLowerCase().replace(/[^a-z0-9]/g, "");
  // la marque doit figurer dans le titre, entière ou par son premier mot s'il est distinctif
  const tete = String(marque || "").split(/\s+/)[0].toLowerCase().replace(/[^a-z0-9]/g, "");
  if (nMarque && !nTitre.includes(nMarque) && !(tete.length >= 4 && nTitre.includes(tete)))
    return { ok: false, motif: "marque absente du titre", marqueurs: [] };

  // 3.0 ne répond pas pour 2.0
  const vN = versions(nom), vT = versions(nomDansTitre(t, marque));
  if (vN.length && vT.length && !vT.some((v) => vN.includes(v)))
    return { ok: false, motif: "version différente (" + vT.join(", ") + " ≠ " + vN.join(", ") + ")", marqueurs: vT };

  // SPF et pourcentages : s'ils sont annoncés des deux côtés, ils doivent concorder
  const qN = qualifies(nom), qT = qualifies(t);
  const desaccord = qN.filter((x) => {
    const type = x.endsWith("%") ? "%" : "spf";
    const memeType = qT.filter((y) => (y.endsWith("%") ? "%" : "spf") === type);
    return memeType.length && !memeType.includes(x);
  });
  if (desaccord.length)
    return { ok: false, motif: "ne concorde pas : " + desaccord.join(", ") + " ≠ " + qT.join(", "), marqueurs: desaccord };

  // le reste se juge sur le nom débarrassé de sa queue de référencement — une place de marché
  // écrit la forme du produit, donc son omission y reste disqualifiante
  return apparieDepuisPage(nom, marque, nomDansTitre(t, marque), t, { formesExigees: true });
}
