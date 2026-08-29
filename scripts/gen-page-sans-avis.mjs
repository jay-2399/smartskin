// Page de contrôle des produits SANS avis, classés par ce qu'il faudrait faire pour en trouver.
//   node scripts/gen-page-sans-avis.mjs [sortie.html]
import fs from "node:fs";
import path from "node:path";

const R = path.resolve(import.meta.dirname, "..");
const j = JSON.parse(fs.readFileSync(R + "/data/scan/catalog.json", "utf8"));
const produits = Array.isArray(j) ? j : Object.values(j).find(Array.isArray);

// on rejoue la résolution d'avis.ts : référence exacte, puis nom exact, puis nom souple
const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const pidUlta = (u) => (String(u || "").match(/\/p\/[^?#]*?-((?:pimprod|xlsImpprod|mkt)?\w{6,})(?:$|[?#])/i) || [])[1] || null;
const parRef = {}, parNom = new Map();
for (const f of fs.readdirSync(R + "/data/avis-enrichis")) {
  if (!f.endsWith(".json")) continue;
  try {
    const e = JSON.parse(fs.readFileSync(R + "/data/avis-enrichis/" + f, "utf8"));
    if (e.ref) parRef[e.ref] = e;
    if (e.asin) parRef[e.asin] = e;
    const k = norm(e.nom || e.name); if (k) parNom.set(k, e);
  } catch {}
}
const aDesAvis = (x) => {
  const r = x.asin || pidUlta(x.url);
  if (r && parRef[r]) return true;
  const k = norm(x.name); if (!k) return false;
  if (parNom.get(k)) return true;
  for (const [m] of parNom) if (m.length >= 12 && (m.includes(k) || k.includes(m))) return true;
  return false;
};

const brutsUlta = new Set(fs.readdirSync(R + "/data/avis-bruts-ulta").map((f) => f.replace(/\.json$/, "")));
const nbCollecte = (x) => {
  const r = pidUlta(x.url); if (!r || !brutsUlta.has(r)) return null;
  try { return (JSON.parse(fs.readFileSync(R + "/data/avis-bruts-ulta/" + r + ".json", "utf8")).avis || []).length; }
  catch { return null; }
};

// Pourquoi cette fiche n'a pas d'avis — et donc par où il faudrait passer pour en trouver.
const VOIES = {
  "sans-marchand": ["Aucune fiche marchande", "Vient d’INCIdecoder, qui n’a pas d’avis. Il faut d’abord retrouver le produit chez un vendeur."],
  "maigre":        ["Avis collectés, trop peu", "Le fichier existe mais tient en quelques avis — pas assez pour en tirer une lecture."],
  "zero-ulta":     ["Zéro avis chez Ulta", "Vérifié à la source : la fiche marchande n’en porte aucun. Il faut chercher ailleurs."],
  "amazon":        ["Amazon, non collecté", "Fiche Amazon connue, avis jamais récupérés."],
  "hors":          ["Hors périmètre", "Corps, cheveux, accessoire — pas la peine."],
};
const classe = (x) => {
  if (x.category === "hors-perimetre") return "hors";
  if (x.source === "incidecoder") return "sans-marchand";
  if (x.source === "amazon") return "amazon";
  const n = nbCollecte(x);
  return n != null ? "maigre" : "zero-ulta";
};

const CAT = { cleanser: "Nettoyant", moisturizer: "Hydratant", serum: "Sérum", treatment: "Traitement",
  exfoliant: "Exfoliant", toner: "Tonique", mask: "Masque", "makeup-remover": "Démaquillant",
  "eye-cream": "Contour des yeux", sunscreen: "Solaire", "hors-perimetre": "Hors périmètre" };
const ech = (s) => String(s ?? "").replace(/[&<>"]/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[m]));

const items = produits.filter((x) => !aDesAvis(x)).map((x) => {
  const cle = classe(x);
  return { marque: x.brand, nom: x.name, cat: CAT[x.category] || x.category, image: x.image, url: x.url,
           cle, voie: VOIES[cle][0], n: nbCollecte(x), hors: cle === "hors" };
}).sort((a, b) => (a.hors - b.hors) || a.marque.localeCompare(b.marque, "fr"));

const voies = [...new Set(items.map((i) => i.voie))].sort((a, b) =>
  items.filter((i) => i.voie === b).length - items.filter((i) => i.voie === a).length);
const marques = [...new Set(items.map((i) => i.marque))]
  .sort((a, b) => items.filter((i) => i.marque === b).length - items.filter((i) => i.marque === a).length).slice(0, 10);

const carte = (i) => `
    <article class="p${i.hors ? " hors" : ""}" data-voie="${ech(i.voie)}" data-marque="${ech(i.marque)}">
      <div class="ph"><img src="${ech(i.image)}" alt="" loading="lazy"></div>
      <div class="tx">
        <span class="mk">${ech(i.marque)}</span>
        <h2>${ech(i.nom)}</h2>
        <div class="bas">
          <span class="pill">${ech(i.cat)}</span>
          <span class="voie v-${i.cle}">${ech(i.voie)}${i.n != null ? " · " + i.n : ""}</span>
        </div>
      </div>
      ${i.url ? `<a class="lien" href="${ech(i.url)}" target="_blank" rel="noopener" aria-label="Ouvrir la fiche"></a>` : ""}
    </article>`;

const html = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Produits sans avis — ${items.length} fiches</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600;700&display=swap">
<style>
  :root{ --ground:#faf9f7; --carte:#fff; --encre:#1b1a19; --doux:#6f6a65; --trait:#e6e2dc;
         --bleu:#2f5d8a; --bleu-f:#eaf0f6; --tiede:#9a6b23; --tiede-f:#fbf2e4;
         --alerte:#b4401f; --alerte-f:#fbeee9; --neutre:#5a6a72; --neutre-f:#eef2f4; }
  @media (prefers-color-scheme:dark){ :root:not([data-theme="light"]){
    --ground:#141312; --carte:#1e1c1b; --encre:#f2efeb; --doux:#a09a93; --trait:#312e2b;
    --bleu:#8fb4d8; --bleu-f:#16212b; --tiede:#d8a458; --tiede-f:#2a2113;
    --alerte:#e88055; --alerte-f:#2a1a13; --neutre:#9db2bd; --neutre-f:#1b2226; }}
  *{box-sizing:border-box}
  body{margin:0;background:var(--ground);color:var(--encre);
       font:400 15px/1.5 Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;-webkit-font-smoothing:antialiased}
  header{max-width:1240px;margin:0 auto;padding:56px 28px 26px}
  h1{margin:0 0 10px;font:400 44px/1.05 "Instrument Serif",Georgia,serif;letter-spacing:-.01em;text-wrap:balance}
  h1 em{font-style:italic;color:var(--bleu)}
  .sous{margin:0;max-width:64ch;color:var(--doux)}
  .stats{display:flex;flex-wrap:wrap;gap:26px;margin:26px 0 0;padding:18px 0 0;border-top:1px solid var(--trait)}
  .st b{display:block;font:600 26px/1 Inter;font-variant-numeric:tabular-nums}
  .st span{font-size:12px;color:var(--doux);letter-spacing:.04em;text-transform:uppercase}
  .barre{position:sticky;top:0;z-index:5;background:color-mix(in srgb,var(--ground) 88%,transparent);
         backdrop-filter:blur(12px);border-bottom:1px solid var(--trait);margin-top:26px}
  .barre .in{max-width:1240px;margin:0 auto;padding:12px 28px;display:flex;flex-wrap:wrap;gap:8px;align-items:center}
  button.f{appearance:none;cursor:pointer;font:500 13px/1 Inter;color:var(--doux);background:transparent;
           border:1px solid var(--trait);border-radius:100px;padding:8px 14px}
  button.f:hover{color:var(--encre);border-color:var(--doux)}
  button.f[aria-pressed="true"]{background:var(--encre);color:var(--ground);border-color:var(--encre)}
  button.f:focus-visible{outline:2px solid var(--bleu);outline-offset:2px}
  input[type=search]{flex:1 1 180px;min-width:150px;font:400 13px/1 Inter;color:var(--encre);
    background:var(--carte);border:1px solid var(--trait);border-radius:100px;padding:9px 14px}
  .compte{margin-left:auto;font-size:12px;color:var(--doux);font-variant-numeric:tabular-nums}
  main{max-width:1240px;margin:0 auto;padding:24px 28px 80px}
  .grille{display:grid;gap:14px;grid-template-columns:repeat(auto-fill,minmax(320px,1fr))}
  .p{position:relative;display:flex;gap:14px;padding:14px;background:var(--carte);border:1px solid var(--trait);border-radius:14px}
  .p:hover{border-color:var(--doux)} .p.hors{opacity:.55}
  .ph{flex:0 0 72px;height:72px;border-radius:10px;overflow:hidden;background:#fff;display:flex;align-items:center;justify-content:center}
  .ph img{width:100%;height:100%;object-fit:contain}
  .tx{min-width:0;display:flex;flex-direction:column;gap:5px;flex:1}
  .mk{font:600 11px/1 Inter;letter-spacing:.06em;text-transform:uppercase;color:var(--doux)}
  h2{margin:0;font:500 14px/1.32 Inter;letter-spacing:-.005em}
  .bas{margin-top:auto;display:flex;flex-wrap:wrap;gap:6px;align-items:center;padding-top:4px}
  .pill{font:600 10px/1 Inter;letter-spacing:.05em;text-transform:uppercase;color:var(--doux);
        border:1px solid var(--trait);border-radius:100px;padding:5px 9px}
  .voie{font:600 10px/1 Inter;letter-spacing:.04em;border-radius:100px;padding:5px 9px;color:var(--bleu);background:var(--bleu-f)}
  .voie.v-maigre{color:var(--tiede);background:var(--tiede-f)}
  .voie.v-zero-ulta{color:var(--alerte);background:var(--alerte-f)}
  .voie.v-hors{color:var(--neutre);background:var(--neutre-f)}
  .lien{position:absolute;inset:0;border-radius:14px}
  .lien:focus-visible{outline:2px solid var(--bleu);outline-offset:2px}
  .rien{padding:48px 0;text-align:center;color:var(--doux)}
  footer{max-width:70ch;margin:0 auto;padding:0 28px 60px;color:var(--doux);font-size:13px}
  @media (max-width:560px){ header{padding:36px 20px 20px} h1{font-size:31px}
    .barre .in,main{padding-left:20px;padding-right:20px} .grille{grid-template-columns:1fr} }
</style>
</head>
<body>
<header>
  <h1>${items.length} produits <em>sans avis</em></h1>
  <p class="sous">Sur ${produits.length} fiches du catalogue. L’étiquette de droite dit pourquoi&nbsp;: la plupart n’ont aucune fiche marchande à interroger, d’autres en ont une qui ne porte réellement aucun commentaire.</p>
  <div class="stats">
    <div class="st"><b>${items.length}</b><span>sans avis</span></div>
    <div class="st"><b>${items.filter((i) => !i.hors).length}</b><span>vraies cibles</span></div>
    <div class="st"><b>${items.filter((i) => i.cle === "sans-marchand").length}</b><span>sans fiche marchande</span></div>
    <div class="st"><b>${Math.round(items.length / produits.length * 100)}&nbsp;%</b><span>du catalogue</span></div>
  </div>
</header>

<div class="barre"><div class="in">
  <button class="f" aria-pressed="true" data-t="voie" data-f="*">Tout</button>
  ${voies.map((v) => `<button class="f" aria-pressed="false" data-t="voie" data-f="${ech(v)}">${ech(v)} <span style="opacity:.55">${items.filter((i) => i.voie === v).length}</span></button>`).join("\n  ")}
  ${marques.map((m) => `<button class="f" aria-pressed="false" data-t="marque" data-f="${ech(m)}">${ech(m)} <span style="opacity:.55">${items.filter((i) => i.marque === m).length}</span></button>`).join("\n  ")}
  <input type="search" id="q" placeholder="Chercher…" aria-label="Rechercher">
  <span class="compte" id="n"></span>
</div></div>

<main>
  <div class="grille" id="g">${items.map(carte).join("")}</div>
  <p class="rien" id="rien" hidden>Aucun produit ne correspond.</p>
</main>

<footer>Le nombre qui suit « Avis collectés, trop peu » est le nombre d’avis réellement récupérés. Les produits hors périmètre sont grisés.</footer>

<script>
  var cartes = [].slice.call(document.querySelectorAll(".p"));
  var boutons = [].slice.call(document.querySelectorAll("button.f"));
  var q = document.getElementById("q"), n = document.getElementById("n"), rien = document.getElementById("rien");
  var f = { voie: "*", marque: null };
  function rendre() {
    var t = q.value.trim().toLowerCase(), vus = 0;
    cartes.forEach(function (c) {
      var ok = (f.voie === "*" || c.dataset.voie === f.voie)
            && (!f.marque || c.dataset.marque === f.marque)
            && (!t || c.textContent.toLowerCase().indexOf(t) >= 0);
      c.hidden = !ok; if (ok) vus++;
    });
    n.textContent = vus + " / " + cartes.length;
    rien.hidden = vus > 0;
  }
  boutons.forEach(function (b) {
    b.addEventListener("click", function () {
      if (b.dataset.t === "marque") { f.marque = f.marque === b.dataset.f ? null : b.dataset.f; }
      else { f.voie = b.dataset.f; }
      boutons.forEach(function (o) {
        o.setAttribute("aria-pressed", String(o.dataset.t === "marque" ? f.marque === o.dataset.f : f.voie === o.dataset.f));
      });
      rendre();
    });
  });
  q.addEventListener("input", rendre);
  rendre();
</script>
</body>
</html>`;

const out = process.argv[2] || path.join(R, "produits-sans-avis.html");
fs.writeFileSync(out, html, "utf8");
console.log("écrit :", out, "—", items.length, "produits");
