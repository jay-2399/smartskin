import fs from "node:fs";
import path from "node:path";
// Page de contrôle de ce qui RESTE sans composition, avec la raison de chaque échec.
//   node scripts/gen-page-inci-manquants.mjs [sortie.html]
const R = path.resolve(import.meta.dirname, "..");
const j = JSON.parse(fs.readFileSync(R + "/data/scan/catalog.json", "utf8"));
const l = Array.isArray(j) ? j : Object.values(j).find(Array.isArray);
const marq = fs.existsSync(R + "/data/scan/inci-marque.json")
  ? JSON.parse(fs.readFileSync(R + "/data/scan/inci-marque.json", "utf8")) : {};
const rec = JSON.parse(fs.readFileSync(R + "/data/scan/inci-recuperes.json", "utf8"));
const web = JSON.parse(fs.readFileSync(R + "/data/scan/inci-web.json", "utf8"));

const CAT = { cleanser:"Nettoyant", moisturizer:"Hydratant", serum:"Sérum", treatment:"Traitement",
  exfoliant:"Exfoliant", toner:"Tonique", mask:"Masque", "makeup-remover":"Démaquillant",
  "eye-cream":"Contour des yeux", sunscreen:"Solaire", "hors-perimetre":"Hors périmètre" };
const ACC = /\b(silicone|reusable|brow mask|headband|applicator|spatula|roller|brush|sponge|tool|device|mitt|towel|vacuum)\b/i;
const ech = (s) => String(s ?? "").replace(/[&<>"]/g, (m) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;" }[m]));

// pourquoi cette fiche n'a rien : ce que chaque tentative a rapporté
const POURQUOI = {
  accessoire:  ["Accessoire", "Pas de composition par nature — un outil, pas un produit."],
  absent:      ["La source n’a rien", "Ulta ou Amazon rendent un champ vide, et le web n’a rien donné."],
  marketing:   ["Argumentaire", "La fiche ne publie qu’un texte de vente, pas la liste réglementaire."],
  renvoi:      ["Renvoi à l’emballage", "« Voir l’emballage pour la liste complète »."],
  introuvable: ["Page inattendue", "Ni la fiche marchande ni le web n’ont livré de liste."],
  "mauvais-produit": ["Mauvais produit écarté", "Le web a rapporté la fiche d’un cousin — refusée volontairement."],
  douteux:     ["Liste douteuse", "Une liste a été trouvée mais le dictionnaire n’en reconnaît pas assez."],
  rien:        ["Rien trouvé", "Recherche menée, aucune page ne publie la composition."],
};

const items = l.filter((x) => !x.inci).map((x) => {
  const acc = ACC.test(x.name);
  const w = web[x.name] || marq[x.name], r = rec[x.name];
  const cle = acc ? "accessoire" : (w && w.type !== "rien" ? w.type : (w ? "rien" : (r ? r.type : "introuvable")));
  const [titre, expl] = POURQUOI[cle] || POURQUOI.introuvable;
  return { marque: x.brand, nom: x.name, cat: CAT[x.category] || x.category, image: x.image,
           url: x.url, cause: titre, expl, cle,
           essais: (w && w.essais ? w.essais.length : 0),
           dit: (r && r.brut) || (w && w.inciRejete) || null,
           hors: x.category === "hors-perimetre" || acc };
}).sort((a, b) => (a.hors - b.hors) || a.cat.localeCompare(b.cat, "fr") || a.marque.localeCompare(b.marque, "fr"));

const cats = [...new Set(items.map((i) => i.cat))].sort((a, b) =>
  items.filter((i) => i.cat === b).length - items.filter((i) => i.cat === a).length);
const causes = [...new Set(items.map((i) => i.cause))].sort((a, b) =>
  items.filter((i) => i.cause === b).length - items.filter((i) => i.cause === a).length);

const carte = (i) => `
    <article class="p${i.hors ? " hors" : ""}" data-cat="${ech(i.cat)}" data-cause="${ech(i.cause)}">
      <div class="ph"><img src="${ech(i.image)}" alt="" loading="lazy"></div>
      <div class="tx">
        <span class="mk">${ech(i.marque)}</span>
        <h2>${ech(i.nom)}</h2>
        <div class="bas">
          <span class="pill">${ech(i.cat)}</span>
          <span class="cause c-${i.cle}">${ech(i.cause)}</span>
        </div>
        ${i.dit ? `<details><summary>ce que la fiche dit à la place</summary><p class="dit">${ech(String(i.dit).slice(0, 400))}</p></details>` : ""}
      </div>
      ${i.url ? `<a class="lien" href="${ech(i.url)}" target="_blank" rel="noopener" aria-label="Ouvrir la fiche d’origine"></a>` : ""}
    </article>`;

const html = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Compositions introuvables — ${items.length} fiches</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600;700&display=swap">
<style>
  :root{ --ground:#faf9f7; --carte:#fff; --encre:#1b1a19; --doux:#6f6a65; --trait:#e6e2dc;
         --alerte:#b4401f; --alerte-f:#fbeee9; --tiede:#9a6b23; --tiede-f:#fbf2e4;
         --neutre:#5a6a72; --neutre-f:#eef2f4; }
  @media (prefers-color-scheme:dark){ :root:not([data-theme="light"]){
    --ground:#141312; --carte:#1e1c1b; --encre:#f2efeb; --doux:#a09a93; --trait:#312e2b;
    --alerte:#e88055; --alerte-f:#2a1a13; --tiede:#d8a458; --tiede-f:#2a2113;
    --neutre:#9db2bd; --neutre-f:#1b2226; }}
  *{box-sizing:border-box}
  body{margin:0;background:var(--ground);color:var(--encre);
       font:400 15px/1.5 Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;-webkit-font-smoothing:antialiased}
  header{max-width:1240px;margin:0 auto;padding:56px 28px 26px}
  h1{margin:0 0 10px;font:400 44px/1.05 "Instrument Serif",Georgia,serif;letter-spacing:-.01em;text-wrap:balance}
  h1 em{font-style:italic;color:var(--alerte)}
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
  button.f:focus-visible{outline:2px solid var(--alerte);outline-offset:2px}
  input[type=search]{flex:1 1 200px;min-width:160px;font:400 13px/1 Inter;color:var(--encre);
    background:var(--carte);border:1px solid var(--trait);border-radius:100px;padding:9px 14px}
  .compte{margin-left:auto;font-size:12px;color:var(--doux);font-variant-numeric:tabular-nums}
  main{max-width:1240px;margin:0 auto;padding:24px 28px 80px}
  .grille{display:grid;gap:14px;grid-template-columns:repeat(auto-fill,minmax(320px,1fr))}
  .p{position:relative;display:flex;gap:14px;padding:14px;background:var(--carte);
     border:1px solid var(--trait);border-radius:14px}
  .p:hover{border-color:var(--doux)}
  .p.hors{opacity:.62}
  .ph{flex:0 0 72px;height:72px;border-radius:10px;overflow:hidden;background:#fff;
      display:flex;align-items:center;justify-content:center}
  .ph img{width:100%;height:100%;object-fit:contain}
  .tx{min-width:0;display:flex;flex-direction:column;gap:5px;flex:1}
  .mk{font:600 11px/1 Inter;letter-spacing:.06em;text-transform:uppercase;color:var(--doux)}
  h2{margin:0;font:500 14px/1.32 Inter;letter-spacing:-.005em}
  .bas{margin-top:auto;display:flex;flex-wrap:wrap;gap:6px;align-items:center;padding-top:4px}
  .pill{font:600 10px/1 Inter;letter-spacing:.05em;text-transform:uppercase;color:var(--doux);
        border:1px solid var(--trait);border-radius:100px;padding:5px 9px}
  .cause{font:600 10px/1 Inter;letter-spacing:.04em;border-radius:100px;padding:5px 9px;
         color:var(--alerte);background:var(--alerte-f)}
  .cause.c-marketing,.cause.c-renvoi,.cause.c-douteux{color:var(--tiede);background:var(--tiede-f)}
  .cause.c-accessoire{color:var(--neutre);background:var(--neutre-f)}
  details{position:relative;z-index:2}
  summary{cursor:pointer;font-size:11px;color:var(--doux);list-style:none}
  summary::-webkit-details-marker{display:none}
  summary::before{content:"▸ ";font-size:9px}
  details[open] summary::before{content:"▾ "}
  .dit{margin:6px 0 0;font-size:11px;line-height:1.5;color:var(--doux);font-style:italic;
       padding:9px;background:var(--ground);border-radius:8px;word-break:break-word}
  .lien{position:absolute;inset:0;border-radius:14px;z-index:1}
  .lien:focus-visible{outline:2px solid var(--alerte);outline-offset:2px}
  .rien{padding:48px 0;text-align:center;color:var(--doux)}
  footer{max-width:70ch;margin:0 auto;padding:0 28px 60px;color:var(--doux);font-size:13px}
  @media (max-width:560px){ header{padding:36px 20px 20px} h1{font-size:31px}
    .barre .in,main{padding-left:20px;padding-right:20px} .grille{grid-template-columns:1fr} }
</style>
</head>
<body>
<header>
  <h1>${items.length} compositions <em>introuvables</em></h1>
  <p class="sous">Ce qui reste après les deux campagnes de récupération&nbsp;: lecture directe des fiches Ulta et Amazon, puis recherche du nom exact sur le web. Ces produits portent toujours une note de formule d’environ 48/100, calculée sur une liste vide. L’étiquette de droite dit pourquoi chacun a échappé aux deux passes.</p>
  <div class="stats">
    <div class="st"><b>${items.length}</b><span>sans composition</span></div>
    <div class="st"><b>${items.filter((i) => !i.hors).length}</b><span>vrais soins visage</span></div>
    <div class="st"><b>${items.filter((i) => i.cat === "Traitement").length}</b><span>traitements</span></div>
    <div class="st"><b>${items.filter((i) => i.hors).length}</b><span>accessoires ou hors périmètre</span></div>
  </div>
</header>

<div class="barre"><div class="in">
  <button class="f" aria-pressed="true" data-t="cat" data-f="*">Tout</button>
  ${causes.map((c) => `<button class="f" aria-pressed="false" data-t="cause" data-f="${ech(c)}">${ech(c)} <span style="opacity:.55">${items.filter((i) => i.cause === c).length}</span></button>`).join("\n  ")}
  ${cats.map((c) => `<button class="f" aria-pressed="false" data-t="cat" data-f="${ech(c)}">${ech(c)} <span style="opacity:.55">${items.filter((i) => i.cat === c).length}</span></button>`).join("\n  ")}
  <input type="search" id="q" placeholder="Chercher…" aria-label="Rechercher">
  <span class="compte" id="n"></span>
</div></div>

<main>
  <div class="grille" id="g">${items.map(carte).join("")}</div>
  <p class="rien" id="rien" hidden>Aucun produit ne correspond.</p>
</main>

<footer>Cliquer une carte ouvre la fiche marchande d’origine. Les accessoires et les produits hors périmètre sont grisés&nbsp;: ils n’auront jamais d’INCI, et c’est normal.</footer>

<script>
  var cartes = [].slice.call(document.querySelectorAll(".p"));
  var boutons = [].slice.call(document.querySelectorAll("button.f"));
  var q = document.getElementById("q"), n = document.getElementById("n"), rien = document.getElementById("rien");
  var f = { cat: "*", cause: null };
  function rendre() {
    var t = q.value.trim().toLowerCase(), vus = 0;
    cartes.forEach(function (c) {
      var ok = (f.cat === "*" || c.dataset.cat === f.cat)
            && (!f.cause || c.dataset.cause === f.cause)
            && (!t || c.textContent.toLowerCase().indexOf(t) >= 0);
      c.hidden = !ok; if (ok) vus++;
    });
    n.textContent = vus + " / " + cartes.length;
    rien.hidden = vus > 0;
  }
  boutons.forEach(function (b) {
    b.addEventListener("click", function () {
      if (b.dataset.t === "cause") { f.cause = f.cause === b.dataset.f ? null : b.dataset.f; }
      else { f.cat = b.dataset.f; }
      boutons.forEach(function (o) {
        o.setAttribute("aria-pressed", String(o.dataset.t === "cause" ? f.cause === o.dataset.f : f.cat === o.dataset.f));
      });
      rendre();
    });
  });
  q.addEventListener("input", rendre);
  rendre();
</script>
</body>
</html>`;
const out = process.argv[2] || (R + "/compositions-introuvables.html");
fs.writeFileSync(out, html, "utf8");
console.log("écrit :", out, "—", items.length, "produits");
