// Page de revue de la campagne parapharmacie française : les 502 fiches, leur packshot,
// leur note formule, leurs avis Amazon — et, pour celles qui ne sont pas au catalogue,
// la raison. Sert à relire le travail d'un coup d'œil plutôt que fiche par fiche.
//
// Les vignettes sont EMBARQUÉES en base64 pour que la page soit autonome (elle s'ouvre
// hors du dépôt, et se publie telle quelle). D'où le passage par des miniatures : les
// packshots pleins pèsent 8,8 Mo, les vignettes 190 px en pèsent 2,2.
//
//   node scripts/gen-page-catalogue-fr.mjs [dossier-vignettes] [sortie.html]
import fs from "node:fs";
import path from "node:path";
import { scoreFormule } from "../src/lib/scan/scoring.mjs";

const RACINE = path.resolve(import.meta.dirname, "..");
const VIGNETTES = process.argv[2] || path.join(RACINE, "public/packshots");
const SORTIE = process.argv[3] || path.join(RACINE, "catalogue-parapharmacie-fr.html");

const fiches = JSON.parse(fs.readFileSync(path.join(RACINE, "data/scan/fiches-fr-brut.json"), "utf8"));
const cats = JSON.parse(fs.readFileSync(path.join(RACINE, "data/scan/categories-fr.json"), "utf8"));
const catalogue = JSON.parse(fs.readFileSync(path.join(RACINE, "data/scan/catalog.json"), "utf8"));
const auCatalogue = new Map(catalogue.filter((p) => p.source === "amazon-fr").map((p) => [p.asin, p]));

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

const CATEGORIE = {
  moisturizer: "Hydratant", serum: "Sérum", cleanser: "Nettoyant", sunscreen: "Solaire",
  toner: "Lotion", treatment: "Traitement", "eye-cream": "Contour des yeux", mask: "Masque",
  exfoliant: "Exfoliant", "makeup-remover": "Démaquillant", "hors-perimetre": "Hors périmètre",
};

function vignette(asin) {
  const f = path.join(VIGNETTES, asin + ".webp");
  if (!fs.existsSync(f)) return null;
  return "data:image/webp;base64," + fs.readFileSync(f).toString("base64");
}

// ── assemblage ───────────────────────────────────────────────────────────────
const produits = [];
for (const f of Object.values(fiches)) {
  const p = auCatalogue.get(f.asin);
  const categorie = (cats[f.asin] || {}).categorie || null;

  let etat, raison = null;
  if (p) etat = "catalogue";
  else if (f.erreur) { etat = "morte"; raison = "page Amazon supprimée"; }
  else if (!(f.inciWeb || f._inciOk)) { etat = "sans-inci"; raison = "aucune composition publiée"; }
  else { etat = "ecarte"; raison = "composition ou doublon écarté au contrôle"; }

  let note = null;
  if (p && p.category !== "hors-perimetre") {
    const s = scoreFormule(p.inci, p.category, p.filtresUV);
    if (s && typeof s.score === "number") note = s;
  }

  produits.push({
    asin: f.asin,
    nom: p ? p.name : (f.marque + " " + String(f.gamme || "")).trim(),
    marque: p ? p.brand : f.marque,
    gamme: f.gamme || null,
    categorie,
    etat, raison,
    img: vignette(f.asin),
    avisNote: typeof f.note === "number" ? f.note : null,
    avisN: typeof f.nbAvis === "number" ? f.nbAvis : null,
    score: note ? note.score : null,
    bande: note ? note.bande : null,
    metier: note ? note.metier : null,
    partielle: note ? Boolean(note.analysePartielle) : false,
    nIng: p ? p.inci.split(",").filter((x) => x.trim()).length : 0,
    uv: Boolean(p && p.filtresUV),
    alpha: Boolean(p && p.inciOrdreAlpha),
    source: p ? "web" : null,
  });
}

// tri par défaut : les mieux notés d'abord, puis ce qui n'a pas de note
produits.sort((a, b) => (b.score ?? -1) - (a.score ?? -1) || a.nom.localeCompare(b.nom, "fr"));

const nCatalogue = produits.filter((p) => p.etat === "catalogue").length;
const notes = produits.filter((p) => p.score != null).map((p) => p.score).sort((a, b) => a - b);
const mediane = notes[Math.floor(notes.length / 2)];
const marques = [...new Set(produits.map((p) => p.marque))].sort((a, b) => a.localeCompare(b, "fr"));
const parCat = {};
for (const p of produits) if (p.categorie) parCat[p.categorie] = (parCat[p.categorie] || 0) + 1;

// ── la fiche ─────────────────────────────────────────────────────────────────
const bandeDe = (s) => (s >= 75 ? "haut" : s >= 45 ? "moyen" : "bas");

const carte = (p) => {
  const drapeaux = [
    p.uv ? '<span class="tag tag-uv">filtres UV</span>' : "",
    p.alpha ? '<span class="tag tag-alerte">ordre alphabétique</span>' : "",
    p.partielle ? '<span class="tag tag-alerte">analyse partielle</span>' : "",
  ].join("");

  const note = p.score != null
    ? `<div class="note n-${bandeDe(p.score)}">
         <div class="note-tete"><span class="note-chiffre">${p.score}</span><span class="note-sur">/100</span>
           <span class="note-metier">${esc(p.metier || "")}</span></div>
         <div class="jauge"><i style="width:${p.score}%"></i></div>
       </div>`
    : `<div class="note note-absente">${p.etat === "catalogue" ? "hors périmètre — pas de note" : esc(p.raison)}</div>`;

  const avis = p.avisNote != null
    ? `<span class="avis"><b>${p.avisNote.toFixed(1)}</b>★ <span class="avis-n">${(p.avisN || 0).toLocaleString("fr-FR")} avis</span></span>`
    : '<span class="avis avis-vide">pas d\'avis</span>';

  return `<article class="fiche etat-${p.etat}" data-etat="${p.etat}" data-cat="${p.categorie || ""}" data-marque="${esc(p.marque)}" data-score="${p.score ?? -1}" data-note="${p.avisNote ?? -1}" data-nom="${esc((p.nom + " " + p.marque + " " + (p.gamme || "")).toLowerCase())}">
  <div class="visuel">${p.img ? `<img loading="lazy" src="${p.img}" alt="">` : '<span class="sans-image">sans visuel</span>'}</div>
  <div class="corps">
    <div class="marque">${esc(p.marque)}</div>
    <h3>${esc(p.nom)}</h3>
    <div class="ligne-meta">${p.categorie ? `<span class="cat">${esc(CATEGORIE[p.categorie] || p.categorie)}</span>` : ""}${avis}</div>
    ${note}
    <div class="pied">${p.nIng ? `<span class="ing">${p.nIng} ingrédients</span>` : `<span class="ing ing-vide">composition absente</span>`}${drapeaux}</div>
  </div>
</article>`;
};

// ── page ─────────────────────────────────────────────────────────────────────
const html = `<title>Parapharmacie française</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Familjen+Grotesk:wght@400;500;600;700&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,600;1,6..72,400&display=swap">
<style>
:root{
  --fond:#F4F6F3; --carte:#FFFFFF; --encre:#161A17; --encre-2:#5B655C; --encre-3:#8D968C;
  --filet:#E1E6DF; --filet-fort:#CBD3C8; --accent:#1F7A4C; --accent-doux:#E8F1EA;
  --haut:#2E7D5B; --moyen:#B07C24; --bas:#B5442F;
  --haut-fond:#E6F1EA; --moyen-fond:#F7EEDC; --bas-fond:#F8E7E2;
  --ombre:0 1px 2px rgba(22,26,23,.05), 0 6px 16px -10px rgba(22,26,23,.18);
}
@media (prefers-color-scheme: dark){
  :root:not([data-theme="light"]){
    --fond:#101310; --carte:#191D19; --encre:#EDF1EC; --encre-2:#A3ADA2; --encre-3:#767F75;
    --filet:#262B26; --filet-fort:#343A33; --accent:#5CB98A; --accent-doux:#1B2A21;
    --haut:#6BC496; --moyen:#D8A552; --bas:#E08067;
    --haut-fond:#172A21; --moyen-fond:#2A2317; --bas-fond:#2C1D19;
    --ombre:0 1px 2px rgba(0,0,0,.4), 0 6px 16px -10px rgba(0,0,0,.6);
  }
}
:root[data-theme="dark"]{
  --fond:#101310; --carte:#191D19; --encre:#EDF1EC; --encre-2:#A3ADA2; --encre-3:#767F75;
  --filet:#262B26; --filet-fort:#343A33; --accent:#5CB98A; --accent-doux:#1B2A21;
  --haut:#6BC496; --moyen:#D8A552; --bas:#E08067;
  --haut-fond:#172A21; --moyen-fond:#2A2317; --bas-fond:#2C1D19;
  --ombre:0 1px 2px rgba(0,0,0,.4), 0 6px 16px -10px rgba(0,0,0,.6);
}
*{box-sizing:border-box}
body{margin:0;background:var(--fond);color:var(--encre);
  font-family:"Familjen Grotesk",-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
  font-variant-numeric:tabular-nums;-webkit-font-smoothing:antialiased}

.bandeau{position:sticky;top:0;z-index:10;background:var(--carte);border-bottom:1px solid var(--filet);
  padding:18px 24px 14px;box-shadow:0 1px 0 rgba(22,26,23,.03)}
.bandeau-haut{display:flex;flex-wrap:wrap;align-items:baseline;gap:8px 20px;max-width:1560px;margin:0 auto}
h1{font-family:Newsreader,Georgia,serif;font-weight:600;font-size:26px;margin:0;letter-spacing:-.01em;text-wrap:balance}
.dek{color:var(--encre-2);font-size:14px}
.compteurs{display:flex;flex-wrap:wrap;gap:10px 26px;max-width:1560px;margin:12px auto 0}
.compteur{display:flex;align-items:baseline;gap:7px}
.compteur b{font-family:Newsreader,Georgia,serif;font-size:21px;font-weight:600;line-height:1}
.compteur span{font-size:12px;color:var(--encre-2);text-transform:uppercase;letter-spacing:.06em}

.commandes{display:flex;flex-wrap:wrap;gap:8px;max-width:1560px;margin:14px auto 0;align-items:center}
.recherche{flex:1 1 220px;min-width:180px;max-width:340px;padding:8px 12px;border:1px solid var(--filet-fort);
  border-radius:8px;background:var(--fond);color:var(--encre);font:inherit;font-size:14px}
.recherche::placeholder{color:var(--encre-3)}
select,.pilule{padding:7px 12px;border:1px solid var(--filet-fort);border-radius:999px;background:var(--carte);
  color:var(--encre);font:inherit;font-size:13px;cursor:pointer}
select{border-radius:8px}
.pilule[aria-pressed="true"]{background:var(--encre);color:var(--fond);border-color:var(--encre)}
.pilule:focus-visible,.recherche:focus-visible,select:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.decompte{margin-left:auto;font-size:13px;color:var(--encre-2)}

.grille{display:grid;grid-template-columns:repeat(auto-fill,minmax(232px,1fr));gap:14px;
  padding:20px 24px 60px;max-width:1560px;margin:0 auto}

.fiche{background:var(--carte);border:1px solid var(--filet);border-radius:12px;overflow:hidden;
  display:flex;flex-direction:column;box-shadow:var(--ombre)}
.fiche.etat-morte,.fiche.etat-sans-inci,.fiche.etat-ecarte{opacity:.72;border-style:dashed}
/* Le display:flex ci-dessus l'emporte sur la regle navigateur [hidden]{display:none} :
   sans cette ligne, le filtrage compte juste mais ne cache rien. */
.fiche[hidden],[hidden]{display:none!important}
/* TUILE BLANCHE, dans les deux thèmes, et c'est délibéré : les packshots sont détourés en
   transparence, mais le détourage a fui à travers le blanc des emballages (313 des 487 ont
   plus de 25 % de trous dans leur propre silhouette). Sur fond sombre ces trous laissent
   passer le noir et le produit devient méconnaissable ; sur blanc ils redeviennent
   invisibles, exactement comme sur la photo d'origine. */
/* Carre GARANTI. La propriete aspect-ratio seule ne tient pas ici : la tuile est un élément flex, et une
   image plus haute que large étire sa hauteur au lieu d'être contrainte par elle. Le produit
   s'affichait alors presque à sa taille native, donc flou. Hauteur nulle + padding de 100 %,
   image en position absolue : la tuile ne peut plus grandir, et l'image se contente de la place. */
.visuel{position:relative;height:0;padding-top:100%;background:#FFFFFF;
  border-bottom:1px solid var(--filet);overflow:hidden}
/* PAS de mix-blend-mode ici. Les packshots sont DÉTOURÉS (canal alpha), pas des photos sur
   fond blanc : multiplier une étiquette blanche par un fond sombre la noircit entièrement,
   et le produit devient illisible. La transparence suffit, sur les deux thèmes. */
.visuel img{position:absolute;inset:12px;margin:auto;max-width:calc(100% - 24px);
  max-height:calc(100% - 24px);width:auto;height:auto;object-fit:contain}
.sans-image{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;
  font-size:12px;color:#8D968C}
.corps{padding:11px 13px 13px;display:flex;flex-direction:column;gap:8px;flex:1}
.marque{font-size:10px;font-weight:700;letter-spacing:.09em;text-transform:uppercase;color:var(--accent)}
h3{margin:0;font-size:13.5px;font-weight:500;line-height:1.32;text-wrap:balance}
.ligne-meta{display:flex;flex-wrap:wrap;align-items:center;gap:6px;font-size:12px;color:var(--encre-2)}
.cat{background:var(--accent-doux);color:var(--accent);padding:2px 8px;border-radius:5px;font-size:11px;font-weight:600}
.avis b{font-weight:700;color:var(--encre)}
.avis-n{color:var(--encre-3)}
.avis-vide{color:var(--encre-3);font-style:italic}

.note{margin-top:auto;border-radius:8px;padding:8px 9px 9px}
.note-tete{display:flex;align-items:baseline;gap:4px}
.note-chiffre{font-family:Newsreader,Georgia,serif;font-size:23px;font-weight:600;line-height:1}
.note-sur{font-size:11px;color:var(--encre-3)}
.note-metier{margin-left:auto;font-size:10.5px;color:var(--encre-2);text-align:right;line-height:1.2}
.jauge{margin-top:6px;height:4px;border-radius:2px;background:var(--filet-fort);overflow:hidden}
.jauge i{display:block;height:100%;border-radius:2px}
.n-haut{background:var(--haut-fond)} .n-haut .note-chiffre{color:var(--haut)} .n-haut .jauge i{background:var(--haut)}
.n-moyen{background:var(--moyen-fond)} .n-moyen .note-chiffre{color:var(--moyen)} .n-moyen .jauge i{background:var(--moyen)}
.n-bas{background:var(--bas-fond)} .n-bas .note-chiffre{color:var(--bas)} .n-bas .jauge i{background:var(--bas)}
.note-absente{background:var(--fond);color:var(--encre-2);font-size:12px;font-style:italic;line-height:1.35}

.pied{display:flex;flex-wrap:wrap;gap:5px;align-items:center;font-size:11px;color:var(--encre-3)}
.ing-vide{font-style:italic}
.tag{padding:2px 7px;border-radius:5px;font-size:10px;font-weight:600;border:1px solid var(--filet-fort)}
.tag-uv{color:var(--encre-2)}
.tag-alerte{color:var(--moyen);border-color:var(--moyen);background:var(--moyen-fond)}

.vide{grid-column:1/-1;text-align:center;color:var(--encre-2);padding:60px 20px;font-size:15px}
@media (max-width:640px){
  .bandeau{padding:14px 16px 12px} h1{font-size:21px} .grille{padding:16px 16px 48px;gap:11px;
    grid-template-columns:repeat(auto-fill,minmax(158px,1fr))}
  .decompte{margin-left:0;width:100%}
}
@media (prefers-reduced-motion:reduce){*{animation:none!important;transition:none!important}}
</style>

<header class="bandeau">
  <div class="bandeau-haut">
    <h1>Parapharmacie française</h1>
    <div class="dek">Avène · La Roche-Posay · Bioderma · Vichy · Uriage · Eucerin · et ${marques.length - 6} autres marques</div>
  </div>
  <div class="compteurs">
    <div class="compteur"><b>${produits.length}</b><span>fiches collectées</span></div>
    <div class="compteur"><b>${nCatalogue}</b><span>au catalogue</span></div>
    <div class="compteur"><b>${notes.length}</b><span>notées</span></div>
    <div class="compteur"><b>${mediane}</b><span>note médiane</span></div>
    <div class="compteur"><b>${produits.filter((p) => p.etat !== "catalogue").length}</b><span>hors catalogue</span></div>
  </div>
  <div class="commandes">
    <input class="recherche" id="q" type="search" placeholder="Chercher un produit, une gamme…" aria-label="Chercher">
    <select id="marque" aria-label="Marque"><option value="">Toutes les marques</option>${marques.map((m) => `<option value="${esc(m)}">${esc(m)}</option>`).join("")}</select>
    <select id="cat" aria-label="Catégorie"><option value="">Toutes catégories</option>${Object.entries(parCat).sort((a, b) => b[1] - a[1]).map(([c, n]) => `<option value="${c}">${esc(CATEGORIE[c] || c)} (${n})</option>`).join("")}</select>
    <select id="tri" aria-label="Trier"><option value="score">Note formule ↓</option><option value="avis">Note clients ↓</option><option value="nom">Nom A→Z</option></select>
    <button class="pilule" id="fCat" aria-pressed="false">Au catalogue</button>
    <button class="pilule" id="fHors" aria-pressed="false">Hors catalogue</button>
    <div class="decompte" id="decompte"></div>
  </div>
</header>

<main class="grille" id="grille">
${produits.map(carte).join("\n")}
<div class="vide" id="vide" hidden>Aucun produit ne correspond.</div>
</main>

<script>
(function(){
  var grille=document.getElementById("grille");
  var fiches=[].slice.call(grille.querySelectorAll(".fiche"));
  var q=document.getElementById("q"), marque=document.getElementById("marque"),
      cat=document.getElementById("cat"), tri=document.getElementById("tri"),
      fCat=document.getElementById("fCat"), fHors=document.getElementById("fHors"),
      decompte=document.getElementById("decompte"), vide=document.getElementById("vide");

  function appliquer(){
    var t=q.value.trim().toLowerCase(), m=marque.value, c=cat.value;
    var auCat=fCat.getAttribute("aria-pressed")==="true";
    var hors=fHors.getAttribute("aria-pressed")==="true";
    var n=0;
    fiches.forEach(function(f){
      var ok=(!t||f.dataset.nom.indexOf(t)>=0) && (!m||f.dataset.marque===m) && (!c||f.dataset.cat===c)
        && (!auCat||f.dataset.etat==="catalogue") && (!hors||f.dataset.etat!=="catalogue");
      f.hidden=!ok; if(ok)n++;
    });
    decompte.textContent=n+" produit"+(n>1?"s":"")+" affiché"+(n>1?"s":"");
    vide.hidden=n>0;
  }

  function trier(){
    var mode=tri.value;
    var tries=fiches.slice().sort(function(a,b){
      if(mode==="nom") return a.querySelector("h3").textContent.localeCompare(b.querySelector("h3").textContent,"fr");
      var cle=mode==="avis"?"note":"score";
      return (+b.dataset[cle])-(+a.dataset[cle])
        || a.querySelector("h3").textContent.localeCompare(b.querySelector("h3").textContent,"fr");
    });
    tries.forEach(function(f){grille.appendChild(f)});
    grille.appendChild(vide);
  }

  [q,marque,cat].forEach(function(el){el.addEventListener("input",appliquer)});
  tri.addEventListener("change",function(){trier();appliquer()});
  [fCat,fHors].forEach(function(b){
    b.addEventListener("click",function(){
      var on=b.getAttribute("aria-pressed")==="true";
      b.setAttribute("aria-pressed",String(!on));
      if(!on){ var autre=(b===fCat?fHors:fCat); autre.setAttribute("aria-pressed","false"); }
      appliquer();
    });
  });
  appliquer();
})();
</script>`;

fs.writeFileSync(SORTIE, html, "utf8");
const poids = fs.statSync(SORTIE).size;
console.log(`${produits.length} fiches — ${nCatalogue} au catalogue, ${notes.length} notées (médiane ${mediane})`);
console.log(`visuels embarqués : ${produits.filter((p) => p.img).length}`);
console.log(`écrit : ${SORTIE} (${(poids / 1048576).toFixed(1)} Mo)`);
