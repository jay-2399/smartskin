// Verse la campagne parapharmacie française (data/scan/fiches-fr-brut.json) dans le
// catalogue servi par l'app (data/scan/catalog.json).
//
// Jusqu'ici les deux vivaient séparément : fiches-fr-brut est une zone de PRÉPARATION
// (collecte, catégorisation, packshots, INCI), catalog.json est ce que le moteur charge.
// Rien ne reliait les deux, donc aucune des 436 INCI françaises n'était exploitée.
//
// Trois précautions, chacune tient à une propriété du moteur :
//
//   1. LE CATALOGUE EST INDEXÉ PAR NOM. `/api/produit/fiche` cherche `norm(x.name) === cible`
//      et prend le PREMIER trouvé ; deux produits homonymes en rendent un inatteignable.
//      On refuse donc tout nom qui entre en collision, dans le lot comme avec l'existant.
//
//   2. LE NOM EST AFFICHÉ ET SERT À LA RECHERCHE. Un titre Amazon brut (« La Roche-Posay,
//      Pure Vitamin C10, Sérum Concentré Anti-Rides, Lisse & Redonne de l'Éclat, Enrichi
//      en Vitamine C Pure… ») est inutilisable : on en extrait un nom de produit.
//
//   3. ON NE FUSIONNE PAS avec les 154 produits américains des mêmes marques déjà présents.
//      Les formules diffèrent réellement d'un continent à l'autre — le Capital Soleil SPF 60
//      américain est à l'avobenzone quand l'européen est au Mexoryl. Les confondre écrirait
//      une composition fausse. Ils cohabitent, distingués par `source`.
//
//   node scripts/integrer-fiches-fr.mjs --verifier   → rapport complet, n'écrit rien
//   node scripts/integrer-fiches-fr.mjs              → écrit (sauvegarde : catalog.avant-fr.json)
import fs from "node:fs";
import path from "node:path";
import { categoriser } from "../src/lib/scan/categorise.mjs";
import { normaliserInci } from "./normaliser-inci.mjs";
import { validerInci } from "./valider-inci.mjs";

const RACINE = path.resolve(import.meta.dirname, "..");
const D = path.join(RACINE, "data/scan");
const FICHES = path.join(D, "fiches-fr-brut.json");
const CATEGORIES = path.join(D, "categories-fr.json");
const CATALOGUE = path.join(D, "catalog.json");
const SAUVEGARDE = path.join(D, "catalog.avant-fr.json");
const PACKSHOTS = path.join(RACINE, "public/packshots");

const seulementVerifier = process.argv.includes("--verifier");

const fiches = JSON.parse(fs.readFileSync(FICHES, "utf8"));
const categories = JSON.parse(fs.readFileSync(CATEGORIES, "utf8"));
const catalogue = JSON.parse(fs.readFileSync(CATALOGUE, "utf8"));

const norm = (s) => String(s || "").toLowerCase().normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();

// ── le nom de produit ────────────────────────────────────────────────────────
// Les titres d'Amazon.fr égrènent le produit en segments et enchaînent sur l'argumentaire :
// « BIODERMA Sensibio Gel Moussant - Nettoyant apaisant micellaire - Démaquille le visage… ».
// On garde la tête (l'identité), on jette la queue (la vente), et on retire la contenance.
// Le mot à partir duquel un titre cesse de nommer le produit et commence à le vendre.
// Les titres sont multilingues (fr/en/es/de) : la liste l'est aussi.
const VENTE = /\b(pour|avec|adapté|convient|idéal|permet|aide|offre|assure|garantit|grâce|sans rinçage|article|lot de|unité|peaux?|tous types|quotidien|efficace|testé|hydrate|nourrit|lisse|apaise|réduit|protège|anti-âge visible|innovation|nouveau|para|specially|helps?|reduces?|smooths?|hydrates?|soothes?|protects?|improves?|delivers?|targets?|provides?|with|for|to reduce|that|which|ideal|suitable|daily use|all skin|piel|para|specialement|spécialement|réf\.)\b/i;
// Les contenances multiples (« 2 x 300 ml ») doivent passer AVANT la contenance simple,
// sinon « 300 ml » part seul et le « 2 » reste collé au nom.
const TAILLE = /\b\d+\s*[x×]\s*\d+(?:[.,]\d+)?\s*(?:ml|cl|l|g|kg|oz|gr)\b|\b\d+(?:[.,]\d+)?\s*(?:ml|cl|l|g|kg|oz|fl\.?\s*oz|gr)\b|\bx\s*\d+\b|\blot de \d+\b|\b\d+\s*(?:pack|paquets?|unités?)\b/gi;

function nomProduit(f) {
  let t = String(f.titre || "").replace(/\s+/g, " ").trim();
  const marque = String(f.marque || "").trim();

  // retirer la marque partout où elle apparaît (elle sera remise proprement en tête)
  if (marque) {
    const re = new RegExp(marque.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/[\s\-.']+/g, "[\\s\\-.']*"), "gi");
    t = t.replace(re, " ");
  }
  t = t.replace(TAILLE, " ").replace(/[™®]/g, " ").replace(/\s+/g, " ").trim();

  // Découpe en segments, on en empile assez pour tenir un nom, PUIS on coupe au premier mot
  // d'argumentaire — où qu'il soit. Couper seulement aux frontières de segments ne suffit pas :
  // Amazon écrit « Crème Solaire Hydratante SPF50+ pour Peaux Sensibles » d'un seul tenant, et
  // quand c'est le PREMIER segment qui vend, s'arrêter avant lui ne laisse rien du tout.
  const segs = t.split(/\s*[|,]\s*|\s+[-–—]\s+/).map((x) => x.trim()).filter((x) => x.length > 1);
  const gardes = [];
  for (const s of segs) {
    gardes.push(s);
    if (gardes.join(" ").split(/\s+/).length >= 6) break;   // un nom de produit dépasse rarement 6 mots
  }
  let nom = (gardes.join(" ") || t).replace(/\s+/g, " ").trim();

  // la coupe : au premier mot qui vend, mais jamais avant d'avoir deux mots d'identité
  const mots = nom.split(/\s+/);
  let fin = mots.length;
  for (let i = 2; i < mots.length; i++) if (VENTE.test(mots[i])) { fin = i; break; }
  nom = mots.slice(0, Math.min(fin, 7)).join(" ")
    .replace(/^[-–—.\s]+|[-–—.,\s]+$/g, "")
    // une queue en conjonction (« … Vitamin C & », « … Serum with ») n'est pas un nom
    .replace(/\s+(?:&|et|and|à|de|du|des|la|le|les|con|y|und|mit|with|for|the|a|au|aux)$/i, "")
    // « Eau Thermale d'Uriage » perd sa marque et garde l'élision : « Eau Thermale d' »
    .replace(/\s+(?:d|l|qu|n|s|j|c)['’]$/i, "")
    .trim();

  // « BIODERMA » en capitales dans le titre, « Bioderma » dans la marque : on prend la marque.
  const tetesMarque = norm(marque).split(" ")[0];
  if (tetesMarque && norm(nom).startsWith(tetesMarque)) nom = nom.slice(nom.search(/\s/) + 1).trim();

  // Coupe trop agressive (« BIODERMA Photoderm » réduit à rien) : on retombe sur la gamme,
  // qui est l'identité minimale dont on dispose toujours.
  if (nom.split(/\s+/).filter(Boolean).length < 1 && f.gamme) nom = String(f.gamme).trim();

  const complet = (marque ? marque + " " + nom : nom).replace(/\s+/g, " ").trim();
  return complet.length > 90 ? complet.slice(0, 90).replace(/\s+\S*$/, "") : complet;
}

// ── mise en forme de la composition ──────────────────────────────────────────
// Le moteur (decouperInci, scoring.mjs) ne coupe que sur « , ; • ». Or les fiches Amazon
// publient aussi en tirets cadratins (Uriage), en points (Lierac, Noreva) ou sans aucun
// séparateur (Weleda). Sans cette étape, une liste Uriage de 35 ingrédients est lue comme UN
// SEUL ingrédient de 800 caractères : reconnue par personne, et le produit est noté sur du vide.
// C'est arrivé sur 18 des 85 fiches venues d'Amazon.
const preNettoyer = (s) => String(s || "")
  .replace(/^\s*(?:formule\s+)?inci\s*:\s*/i, "")      // « Formule INCI : AQUA/EAU… »
  // Weleda marque ses allergènes par un astérisque EN COURS de liste (« FRAGRANCE (PARFUM)* »).
  // validerInci coupe au premier astérisque — la règle vise les appels de note de FIN de liste
  // (« *ecocert Approved ») — et tronquait donc 22 ingrédients à 7. On retire l'astérisque quand
  // il colle à un ingrédient (suivi d'une virgule, d'un point ou de la fin) ; celui qui INTRODUIT
  // une note, lui, est suivi de texte et reste en place pour que la règle joue.
  .replace(/\*(?=\s*[,.]|\s*$)/g, "")
  .replace(/\s*[•●·—–|]\s*/g, ", ")
  .replace(/\s+/g, " ").trim();

function inciPropre(brut) {
  const p = preNettoyer(brut);
  // déjà en virgules et fournie : on n'y touche pas, normaliserInci ne ferait que du bruit
  if ((p.match(/,/g) || []).length >= 4) return p;
  return normaliserInci(p).inci || p;
}

// Une liste très courte est vraie pour une eau thermale ou une huile pure, et FAUSSE partout
// ailleurs : c'est alors le champ Amazon tronqué (« Aqua » pour un contour des yeux) ou un
// résumé publicitaire (« Thermal Water, Hyaluronic Acid, Antioxidants »). Le validateur ne
// peut pas les distinguer — sa tolérance mono-matériau existe justement pour les eaux
// thermales. Ce qui tranche, c'est ce que le produit DIT ÊTRE.
const MONO_PLAUSIBLE = /\b(eau thermale|eau thermique|thermal (spring )?water|thermalwasser|agua termal|huile|oil|serum d.eau)\b/i;

// ── sélection ────────────────────────────────────────────────────────────────
// Seules les fiches qui portent une COMPOSITION : sans INCI, un produit n'est ni notable
// (`/api/produit/score`) ni même listé par la recherche, qui filtre sur `p.inci`.
const retenues = Object.values(fiches).filter((f) => !f.erreur && (f.inciWeb || f._inciOk));
const sansInci = Object.values(fiches).filter((f) => !f.erreur && !(f.inciWeb || f._inciOk)).length;

// La marque doit s'écrire comme dans le catalogue : `marqueDe()` ne normalise pas la casse,
// et « Embryolisse » à côté d'« EMBRYOLISSE » ferait deux marques dans la liste soumise à la
// reconnaissance photo. Quand l'orthographe existe déjà, on adopte la sienne.
const marquesExistantes = new Map();
for (const p of catalogue) {
  const m = (p.brand || p.name.split(" ")[0]).trim();
  if (m && !marquesExistantes.has(m.toLowerCase())) marquesExistantes.set(m.toLowerCase(), m);
}
const marqueAlignee = (m) => marquesExistantes.get(String(m || "").trim().toLowerCase()) || m;

const candidats = [];
const inciRefusees = [];
for (const f of retenues) {
  const inci = inciPropre(f.inciWeb || f.ingredients);
  const categorie = (categories[f.asin] || {}).categorie || "indetermine";
  const nom = nomProduit({ ...f, marque: marqueAlignee(f.marque) });
  const packshot = fs.existsSync(path.join(PACKSHOTS, f.asin + ".webp"));
  // Les compositions venues du WEB ont déjà passé la validation stricte ET le contrôle de
  // source à la fusion. Celles venues d'Amazon (_inciOk) n'ont jamais eu que l'ancienne règle,
  // plus lâche : on les repasse au juge d'aujourd'hui.
  if (f._inciOk) {
    const v = validerInci(inci);
    if (!v.ok) { inciRefusees.push([f.asin, nom, v.motif]); continue; }
  }
  const nInci = inci.split(",").filter((x) => x.trim()).length;
  if (nInci < 5 && !MONO_PLAUSIBLE.test(nom)) {
    inciRefusees.push([f.asin, nom, `composition à ${nInci} ingrédient(s) — tronquée ou publicitaire`]);
    continue;
  }

  const c = categoriser(nom, inci);
  const p = {
    source: "amazon-fr",
    name: nom,
    brand: marqueAlignee(f.marque),
    category: categorie,
    url: f.url,
    // Le packshot détouré quand il existe (detourer-fiches-fr.mjs), sinon la photo Amazon.
    image: packshot ? "/packshots/" + f.asin + ".webp" : f.image,
    inci,
    asin: f.asin,
  };
  if (c.filtresUV) p.filtresUV = true;
  // Composition juste mais publiée par ordre alphabétique : la POSITION n'y est pas un proxy
  // de dose, alors que le moteur s'en sert (malusAlcoolTop5, capRisque3Top5, @actifTop5).
  // On transporte le drapeau jusqu'au catalogue plutôt que de le perdre en route.
  if (f.inciOrdreAlpha) p.inciOrdreAlpha = true;
  candidats.push({ p, f });
}

// ── doublons DANS le lot ─────────────────────────────────────────────────────
// Le catalogue vient d'Amazon, où un même produit est listé plusieurs fois (marketplaces
// .fr/.de/.es, conditionnements). On garde l'exemplaire le mieux pourvu.
const parNom = new Map();
const doublons = [];
for (const c of candidats) {
  const k = norm(c.p.name);
  if (!parNom.has(k)) { parNom.set(k, c); continue; }
  const gardee = parNom.get(k);
  const mieux = (x) => (x.p.image?.startsWith("/packshots/") ? 2 : 0) + (x.p.inci || "").length / 1e4;
  const [garde, jete] = mieux(c) > mieux(gardee) ? [c, gardee] : [gardee, c];
  parNom.set(k, garde);
  doublons.push([jete.p.asin, garde.p.asin, garde.p.name]);
}

// ── collisions avec l'existant ───────────────────────────────────────────────
// Un homonyme rendrait l'un des deux inatteignable par /api/produit/fiche.
const nomsExistants = new Map(catalogue.map((p) => [norm(p.name), p]));
const collisions = [];
const aEcrire = [];
for (const c of parNom.values()) {
  const dejaLa = nomsExistants.get(norm(c.p.name));
  if (dejaLa) { collisions.push([c.p.asin, c.p.name, dejaLa.source]); continue; }
  aEcrire.push(c.p);
}

// ── rapport ──────────────────────────────────────────────────────────────────
console.log(`fiches FR exploitables      : ${retenues.length} (+ ${sansInci} sans INCI, écartées)`);
console.log(`compositions refusées       : ${inciRefusees.length}`);
console.log(`doublons dans le lot        : ${doublons.length}`);
console.log(`collisions de nom (écartées): ${collisions.length}`);
console.log(`À ÉCRIRE                    : ${aEcrire.length}\n`);

const parCat = {};
for (const p of aEcrire) parCat[p.category] = (parCat[p.category] || 0) + 1;
console.log("par catégorie :", JSON.stringify(parCat));
console.log(`packshots détourés : ${aEcrire.filter((p) => p.image?.startsWith("/packshots/")).length}/${aEcrire.length}`);
console.log(`filtres UV marqués : ${aEcrire.filter((p) => p.filtresUV).length}`);
const sansImage = aEcrire.filter((p) => !p.image).length;
if (sansImage) console.log(`⚠ sans image       : ${sansImage}`);

if (inciRefusees.length) {
  console.log(`\nCOMPOSITIONS REFUSÉES :`);
  for (const [asin, nom, motif] of inciRefusees) console.log(`  ${asin}  ${nom.slice(0, 52).padEnd(52)} ${motif}`);
}
if (doublons.length) {
  console.log(`\nDOUBLONS ÉCARTÉS (même produit, plusieurs listings) :`);
  for (const [jete, garde, nom] of doublons) console.log(`  ${jete} → ${garde}  ${nom}`);
}
if (collisions.length) {
  console.log(`\nCOLLISIONS DE NOM AVEC L'EXISTANT (écartées — un homonyme masquerait l'autre) :`);
  for (const [asin, nom, src] of collisions) console.log(`  ${asin}  « ${nom} »  (déjà présent, source ${src})`);
}

console.log(`\nÉCHANTILLON DE NOMS PRODUITS :`);
for (const p of aEcrire.slice(0, 25)) console.log(`  [${p.category}] ${p.name}`);

// ── écriture ─────────────────────────────────────────────────────────────────
// On AJOUTE À LA FIN : `catalogue()` numérote les produits par leur index de lecture, donc
// insérer au milieu renuméroterait tout l'existant.
if (!seulementVerifier) {
  fs.writeFileSync(SAUVEGARDE, JSON.stringify(catalogue));
  fs.writeFileSync(CATALOGUE, JSON.stringify(catalogue.concat(aEcrire), null, 1));
  console.log(`\n✅ écrit : ${catalogue.length} + ${aEcrire.length} = ${catalogue.length + aEcrire.length} produits`);
  console.log(`   sauvegarde : ${path.basename(SAUVEGARDE)}`);
} else {
  console.log(`\n(--verifier : rien n'a été écrit)`);
}
