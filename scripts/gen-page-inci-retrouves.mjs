import fs from "node:fs";
import path from "node:path";
import { scoreFormule } from "../src/lib/scan/scoring.mjs";

// Page de contrôle des INCI récupérés : chaque produit avec sa photo, sa note AVANT (celle que
// le moteur fabriquait sur une composition vide) et sa note APRÈS, plus la liste retrouvée.
//   node scripts/gen-page-inci-retrouves.mjs [fichier de sortie]
const R = path.resolve(import.meta.dirname, "..");
const SORTIE = process.argv[2] || path.join(R, "inci-retrouves.html");
const cat = JSON.parse(fs.readFileSync(R + "/data/scan/catalog.json", "utf8"));
const produits = Array.isArray(cat) ? cat : (cat.produits || cat.products || Object.values(cat).find(Array.isArray));
const recolte = JSON.parse(fs.readFileSync(R + "/data/scan/inci-recuperes.json", "utf8"));

const CAT = { cleanser:"Nettoyant", moisturizer:"Hydratant", serum:"Sérum", treatment:"Traitement",
  exfoliant:"Exfoliant", toner:"Tonique", mask:"Masque", "makeup-remover":"Démaquillant",
  "eye-cream":"Contour des yeux", sunscreen:"Solaire", "hors-perimetre":"Hors périmètre",
  "spot-treatment":"Soin ciblé" };
const ech = (s) => String(s ?? "").replace(/[&<>"]/g, (m) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;" }[m]));

const items = produits.filter((x) => x.inciSource).map((x) => {
  const v = recolte[x.name] || {};
  const avant = scoreFormule(null, x.category, false);
  const apres = scoreFormule(x.inci, x.category, false);
  return { marque: x.brand, nom: x.name, cat: CAT[x.category] || x.category, image: x.image, url: x.url,
           inci: x.inci, n: x.inci.split(",").length, forme: v.forme || "?", via: v.via || "page",
           av: avant.score, ap: apres.score, bav: avant.bande, bap: apres.bande, d: apres.score - avant.score };
}).sort((a, b) => b.d - a.d);

const teinte = (b) => b === "good" ? "v" : b === "bad" ? "r" : "o";

const carte = (i) => `
    <article class="p" data-cat="${ech(i.cat)}" data-sens="${i.d > 2 ? "haut" : i.d < -2 ? "bas" : "plat"}">
      <div class="ph"><img src="${ech(i.image)}" alt="" loading="lazy"></div>
      <div class="tx">
        <span class="mk">${ech(i.marque)}</span>
        <h2>${ech(i.nom)}</h2>
        <div class="notes">
          <span class="n ${teinte(i.bav)} barre">${i.av}</span>
          <svg width="15" height="9" viewBox="0 0 15 9" aria-hidden="true"><path d="M0 4.5h12M9 1l3.5 3.5L9 8" stroke="currentColor" stroke-width="1.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
          <span class="n ${teinte(i.bap)}">${i.ap}</span>
          <span class="ecart ${i.d > 0 ? "plus" : i.d < 0 ? "moins" : ""}">${i.d > 0 ? "+" : ""}${i.d}</span>
          <span class="pill">${ech(i.cat)}</span>
        </div>
        <details>
          <summary>${i.n} ingrédients retrouvés<span class="via"> · ${ech(i.forme)}${i.via === "collecteur" ? " · Amazon" : ""}</span></summary>
          <p class="inci">${ech(i.inci)}</p>
        </details>
      </div>
    </article>`;

const cats = [...new Set(items.map((i) => i.cat))]
  .sort((a, b) => items.filter((i) => i.cat === b).length - items.filter((i) => i.cat === a).length);

const html = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>INCI retrouvés — ${items.length} produits</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600;700&display=swap">
<style>
  :root{ --ground:#faf9f7; --carte:#fff; --encre:#1b1a19; --doux:#6f6a65; --trait:#e6e2dc;
         --vert:#3f6b4a; --vert-f:#eaf2ec; --orange:#9a6b23; --orange-f:#fbf2e4;
         --rouge:#b4401f; --rouge-f:#fbeee9; --accent:#2f5d8a; }
  @media (prefers-color-scheme:dark){ :root:not([data-theme="light"]){
    --ground:#141312; --carte:#1e1c1b; --encre:#f2efeb; --doux:#a09a93; --trait:#312e2b;
    --vert:#8ab894; --vert-f:#1a2a1e; --orange:#d8a458; --orange-f:#2a2113;
    --rouge:#e88055; --rouge-f:#2a1a13; --accent:#8fb4d8; }}
  *{box-sizing:border-box}
  body{margin:0;background:var(--ground);color:var(--encre);
       font:400 15px/1.5 Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;-webkit-font-smoothing:antialiased}
  header{max-width:1280px;margin:0 auto;padding:56px 28px 26px}
  h1{margin:0 0 10px;font:400 44px/1.05 "Instrument Serif",Georgia,serif;letter-spacing:-.01em;text-wrap:balance}
  h1 em{font-style:italic;color:var(--accent)}
  .sous{margin:0;max-width:64ch;color:var(--doux)}
  .stats{display:flex;flex-wrap:wrap;gap:26px;margin:26px 0 0;padding:18px 0 0;border-top:1px solid var(--trait)}
  .st b{display:block;font:600 26px/1 Inter;font-variant-numeric:tabular-nums}
  .st span{font-size:12px;color:var(--doux);letter-spacing:.04em;text-transform:uppercase}
  .barre{position:sticky;top:0;z-index:5;background:color-mix(in srgb,var(--ground) 88%,transparent);
         backdrop-filter:blur(12px);border-bottom:1px solid var(--trait);margin-top:26px}
  .barre .in{max-width:1280px;margin:0 auto;padding:12px 28px;display:flex;flex-wrap:wrap;gap:8px;align-items:center}
  button.f{appearance:none;cursor:pointer;font:500 13px/1 Inter;color:var(--doux);background:transparent;
           border:1px solid var(--trait);border-radius:100px;padding:8px 14px}
  button.f:hover{color:var(--encre);border-color:var(--doux)}
  button.f[aria-pressed="true"]{background:var(--encre);color:var(--ground);border-color:var(--encre)}
  button.f:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
  input[type=search]{flex:1 1 200px;min-width:160px;font:400 13px/1 Inter;color:var(--encre);
    background:var(--carte);border:1px solid var(--trait);border-radius:100px;padding:9px 14px}
  .compte{margin-left:auto;font-size:12px;color:var(--doux);font-variant-numeric:tabular-nums}
  main{max-width:1280px;margin:0 auto;padding:24px 28px 80px}
  .grille{display:grid;gap:14px;grid-template-columns:repeat(auto-fill,minmax(340px,1fr))}
  .p{display:flex;gap:14px;padding:14px;background:var(--carte);border:1px solid var(--trait);border-radius:14px}
  .ph{flex:0 0 76px;height:76px;border-radius:10px;overflow:hidden;background:#fff;display:flex;align-items:center;justify-content:center}
  .ph img{width:100%;height:100%;object-fit:contain}
  .tx{min-width:0;display:flex;flex-direction:column;gap:6px;flex:1}
  .mk{font:600 11px/1 Inter;letter-spacing:.06em;text-transform:uppercase;color:var(--doux)}
  h2{margin:0;font:500 14px/1.32 Inter;letter-spacing:-.005em}
  .notes{display:flex;flex-wrap:wrap;gap:7px;align-items:center;color:var(--doux)}
  .n{font:600 13px/1 Inter;font-variant-numeric:tabular-nums;border-radius:7px;padding:5px 8px}
  .n.v{color:var(--vert);background:var(--vert-f)} .n.o{color:var(--orange);background:var(--orange-f)}
  .n.r{color:var(--rouge);background:var(--rouge-f)}
  .n.barre{opacity:.5}
  .ecart{font:600 11px/1 Inter;font-variant-numeric:tabular-nums;color:var(--doux)}
  .ecart.plus{color:var(--vert)} .ecart.moins{color:var(--rouge)}
  .pill{margin-left:auto;font:600 10px/1 Inter;letter-spacing:.05em;text-transform:uppercase;color:var(--doux);
        border:1px solid var(--trait);border-radius:100px;padding:5px 9px}
  details{margin-top:auto}
  summary{cursor:pointer;font-size:11px;color:var(--accent);list-style:none}
  summary::-webkit-details-marker{display:none}
  summary::before{content:"▸ ";font-size:9px}
  details[open] summary::before{content:"▾ "}
  .via{color:var(--doux)}
  .inci{margin:7px 0 0;font-size:11px;line-height:1.5;color:var(--doux);word-break:break-word;
        max-height:150px;overflow-y:auto;padding:9px;background:var(--ground);border-radius:8px}
  .rien{padding:48px 0;text-align:center;color:var(--doux)}
  footer{max-width:70ch;margin:0 auto;padding:0 28px 60px;color:var(--doux);font-size:13px}
  @media (max-width:560px){ header{padding:36px 20px 20px} h1{font-size:31px}
    .barre .in,main{padding-left:20px;padding-right:20px} .grille{grid-template-columns:1fr} }
</style>
</head>
<body>
<header>
  <h1>${items.length} compositions <em>retrouvées</em></h1>
  <p class="sous">Ces produits portaient un <code>inci: null</code> et recevaient malgré tout une note de formule autour de 48/100, calculée sur une liste vide. La composition a été récupérée à la source&nbsp;: le premier chiffre est la note fabriquée, le second la vraie.</p>
  <div class="stats">
    <div class="st"><b>${items.length}</b><span>INCI récupérés</span></div>
    <div class="st"><b>${items.filter((i) => Math.abs(i.d) >= 3).length}</b><span>notes corrigées de 3 pts ou plus</span></div>
    <div class="st"><b>${items.filter((i) => i.bav !== i.bap).length}</b><span>changent de couleur</span></div>
    <div class="st"><b>${Math.round(items.filter((i) => Math.abs(i.d) >= 3).reduce((s, i) => s + Math.abs(i.d), 0) / items.filter((i) => Math.abs(i.d) >= 3).length * 10) / 10}</b><span>écart moyen (pts)</span></div>
  </div>
</header>

<div class="barre"><div class="in">
  <button class="f" aria-pressed="true" data-t="cat" data-f="*">Tout</button>
  <button class="f" aria-pressed="false" data-t="sens" data-f="haut">Note relevée</button>
  <button class="f" aria-pressed="false" data-t="sens" data-f="bas">Note abaissée</button>
  ${cats.map((c) => `<button class="f" aria-pressed="false" data-t="cat" data-f="${ech(c)}">${ech(c)} <span style="opacity:.55">${items.filter((i) => i.cat === c).length}</span></button>`).join("\n  ")}
  <input type="search" id="q" placeholder="Chercher…" aria-label="Rechercher">
  <span class="compte" id="n"></span>
</div></div>

<main>
  <div class="grille" id="g">${items.map(carte).join("")}</div>
  <p class="rien" id="rien" hidden>Aucun produit ne correspond.</p>
</main>

<footer>Trié par ampleur de la correction. Déplier une carte montre la liste d’ingrédients récupérée et sa provenance — <b>virgules</b>, <b>points</b> ou <b>espaces</b> selon la façon dont la page l’écrivait, <b>Amazon</b> quand elle vient du collecteur dédié.</footer>

<script>
  var cartes = [].slice.call(document.querySelectorAll(".p"));
  var boutons = [].slice.call(document.querySelectorAll("button.f"));
  var q = document.getElementById("q"), n = document.getElementById("n"), rien = document.getElementById("rien");
  var f = { cat: "*", sens: null };
  function rendre() {
    var t = q.value.trim().toLowerCase(), vus = 0;
    cartes.forEach(function (c) {
      var ok = (f.cat === "*" || c.dataset.cat === f.cat)
            && (!f.sens || c.dataset.sens === f.sens)
            && (!t || c.textContent.toLowerCase().indexOf(t) >= 0);
      c.hidden = !ok; if (ok) vus++;
    });
    n.textContent = vus + " / " + cartes.length;
    rien.hidden = vus > 0;
  }
  boutons.forEach(function (b) {
    b.addEventListener("click", function () {
      var t = b.dataset.t;
      if (t === "sens") { f.sens = f.sens === b.dataset.f ? null : b.dataset.f; }
      else { f.cat = b.dataset.f; }
      boutons.forEach(function (o) {
        o.setAttribute("aria-pressed", String(o.dataset.t === "sens" ? f.sens === o.dataset.f : f.cat === o.dataset.f));
      });
      rendre();
    });
  });
  q.addEventListener("input", rendre);
  rendre();
</script>
</body>
</html>`;

fs.writeFileSync(SORTIE, html, "utf8");
console.log("écrit :", SORTIE, "—", items.length, "produits");
