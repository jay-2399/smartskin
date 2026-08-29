// Page de contrôle des produits qui viennent de recevoir des avis : ce qu'on a récupéré, chez
// qui, et sur quelle fiche Amazon on s'est appuyé.
//   node scripts/gen-page-avis-nouveaux.mjs [sortie.html]
import fs from "node:fs";
import path from "node:path";

const R = path.resolve(import.meta.dirname, "..");
const produits = JSON.parse(fs.readFileSync(R + "/data/scan/catalog.json", "utf8"));
// Vignettes embarquées : les URL d'Ulta et d'INCIdecoder répondent, mais un lecteur qui bloque
// les requêtes externes n'affiche que des cadres vides. 3 Ko par photo, la page se suffit.
const fV = R + "/data/scan/vignettes.json";
const vignettes = fs.existsSync(fV) ? JSON.parse(fs.readFileSync(fV, "utf8")) : {};

const CAT = { cleanser:"Nettoyant", moisturizer:"Hydratant", serum:"Sérum", treatment:"Traitement",
  exfoliant:"Exfoliant", toner:"Tonique", mask:"Masque", "makeup-remover":"Démaquillant",
  "eye-cream":"Contour des yeux", sunscreen:"Solaire", "hors-perimetre":"Hors périmètre" };
const ech = (s) => String(s ?? "").replace(/[&<>"]/g, (m) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;" }[m]));

const items = produits.filter((p) => p.asinAvis)
  .map((p) => {
    const f = R + "/data/avis-bruts/" + p.asinAvis + ".json";
    if (!fs.existsSync(f)) return null;
    const b = JSON.parse(fs.readFileSync(f, "utf8"));
    const lus = (b.avis || []).length;
    return { marque: p.brand, nom: p.name, cat: CAT[p.category] || p.category, image: p.image,
             note: b.note, nb: b.nbAvis, lus, asin: p.asinAvis, titreAmazon: p.asinAvisTitre || b.nom,
             vignette: vignettes[p.image] || null,
             maigre: lus < 15 };
  }).filter(Boolean).sort((a, b) => b.lus - a.lus);

const etoiles = (n) => {
  const e = Math.round(Number(n) || 0);
  return Array.from({ length: 5 }, (_, i) => i < e ? "★" : "<span class=\"off\">★</span>").join("");
};

const carte = (i) => `
    <article class="p${i.maigre ? " maigre" : ""}" data-cat="${ech(i.cat)}" data-etat="${i.maigre ? "maigre" : "fourni"}">
      <div class="ph">${i.vignette ? `<img src="${i.vignette}" alt="" loading="lazy">` : `<img src="${ech(i.image)}" alt="" loading="lazy">`}</div>
      <div class="tx">
        <span class="mk">${ech(i.marque)}</span>
        <h2>${ech(i.nom)}</h2>
        <div class="note">
          <b>${i.note != null ? (Math.round(i.note * 10) / 10).toFixed(1) : "—"}</b>
          <span class="et">${etoiles(i.note)}</span>
          <span class="nb">${i.nb != null ? Number(i.nb).toLocaleString("fr-FR") + " avis" : "—"}</span>
        </div>
        <div class="bas">
          <span class="pill">${ech(i.cat)}</span>
          <span class="lus${i.maigre ? " peu" : ""}">${i.lus} lus</span>
        </div>
        <details>
          <summary>fiche Amazon retenue</summary>
          <p class="src">${ech(i.titreAmazon)}<br><a href="https://www.amazon.com/dp/${ech(i.asin)}" target="_blank" rel="noopener">${ech(i.asin)} ↗</a></p>
        </details>
      </div>
    </article>`;

const cats = [...new Set(items.map((i) => i.cat))]
  .sort((a, b) => items.filter((i) => i.cat === b).length - items.filter((i) => i.cat === a).length);
const totalLus = items.reduce((s, i) => s + i.lus, 0);
const totalAnnonces = items.reduce((s, i) => s + (i.nb || 0), 0);

const html = `<!doctype html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Avis récupérés — ${items.length} produits</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@400;500;600;700&display=swap">
<style>
  :root{ --ground:#faf9f7; --carte:#fff; --encre:#1b1a19; --doux:#6f6a65; --trait:#e6e2dc;
         --or:#b8791f; --vert:#3f6b4a; --vert-f:#eaf2ec; --tiede:#9a6b23; --tiede-f:#fbf2e4; --accent:#2f5d8a; }
  @media (prefers-color-scheme:dark){ :root:not([data-theme="light"]){
    --ground:#141312; --carte:#1e1c1b; --encre:#f2efeb; --doux:#a09a93; --trait:#312e2b;
    --or:#e0a94f; --vert:#8ab894; --vert-f:#1a2a1e; --tiede:#d8a458; --tiede-f:#2a2113; --accent:#8fb4d8; }}
  *{box-sizing:border-box}
  body{margin:0;background:var(--ground);color:var(--encre);
       font:400 15px/1.5 Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;-webkit-font-smoothing:antialiased}
  header{max-width:1240px;margin:0 auto;padding:56px 28px 26px}
  h1{margin:0 0 10px;font:400 44px/1.05 "Instrument Serif",Georgia,serif;letter-spacing:-.01em;text-wrap:balance}
  h1 em{font-style:italic;color:var(--accent)}
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
  button.f:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
  input[type=search]{flex:1 1 180px;min-width:150px;font:400 13px/1 Inter;color:var(--encre);
    background:var(--carte);border:1px solid var(--trait);border-radius:100px;padding:9px 14px}
  .compte{margin-left:auto;font-size:12px;color:var(--doux);font-variant-numeric:tabular-nums}
  main{max-width:1240px;margin:0 auto;padding:24px 28px 80px}
  .grille{display:grid;gap:14px;grid-template-columns:repeat(auto-fill,minmax(330px,1fr))}
  .p{display:flex;gap:14px;padding:14px;background:var(--carte);border:1px solid var(--trait);border-radius:14px}
  .p:hover{border-color:var(--doux)} .p.maigre{opacity:.72}
  .ph{flex:0 0 76px;height:76px;border-radius:10px;overflow:hidden;background:#fff;display:flex;align-items:center;justify-content:center}
  .ph img{width:100%;height:100%;object-fit:contain}
  .tx{min-width:0;display:flex;flex-direction:column;gap:5px;flex:1}
  .mk{font:600 11px/1 Inter;letter-spacing:.06em;text-transform:uppercase;color:var(--doux)}
  h2{margin:0;font:500 14px/1.32 Inter;letter-spacing:-.005em}
  .note{display:flex;align-items:baseline;gap:7px;margin-top:2px}
  .note b{font:700 17px/1 Inter;font-variant-numeric:tabular-nums}
  .et{color:var(--or);font-size:12px;letter-spacing:1.5px;line-height:1}
  .et .off{opacity:.26}
  .nb{font-size:11.5px;color:var(--doux);font-variant-numeric:tabular-nums}
  .bas{margin-top:auto;display:flex;flex-wrap:wrap;gap:6px;align-items:center;padding-top:4px}
  .pill{font:600 10px/1 Inter;letter-spacing:.05em;text-transform:uppercase;color:var(--doux);
        border:1px solid var(--trait);border-radius:100px;padding:5px 9px}
  .lus{font:600 10px/1 Inter;letter-spacing:.04em;border-radius:100px;padding:5px 9px;color:var(--vert);background:var(--vert-f)}
  .lus.peu{color:var(--tiede);background:var(--tiede-f)}
  details{margin-top:2px}
  summary{cursor:pointer;font-size:11px;color:var(--accent);list-style:none}
  summary::-webkit-details-marker{display:none}
  summary::before{content:"▸ ";font-size:9px}
  details[open] summary::before{content:"▾ "}
  .src{margin:6px 0 0;font-size:11px;line-height:1.5;color:var(--doux);padding:9px;background:var(--ground);border-radius:8px}
  .src a{color:var(--accent);font-variant-numeric:tabular-nums}
  .rien{padding:48px 0;text-align:center;color:var(--doux)}
  footer{max-width:70ch;margin:0 auto;padding:0 28px 60px;color:var(--doux);font-size:13px}
  @media (max-width:560px){ header{padding:36px 20px 20px} h1{font-size:31px}
    .barre .in,main{padding-left:20px;padding-right:20px} .grille{grid-template-columns:1fr} }
</style>
</head>
<body>
<header>
  <h1>${items.length} produits ont <em>enfin des avis</em></h1>
  <p class="sous">Ils n’en avaient aucun : ni Ulta ni INCIdecoder n’en portaient. Retrouvés sur Amazon, leur fiche vérifiée une à une. « ${totalAnnonces.toLocaleString("fr-FR")} avis » est le compteur d’Amazon&nbsp;; « lus » est ce que la collecte a réellement rapporté, et c’est là-dessus que se bâtira la synthèse.</p>
  <div class="stats">
    <div class="st"><b>${items.length}</b><span>produits pourvus</span></div>
    <div class="st"><b>${totalAnnonces.toLocaleString("fr-FR")}</b><span>avis annoncés</span></div>
    <div class="st"><b>${totalLus.toLocaleString("fr-FR")}</b><span>avis réellement lus</span></div>
    <div class="st"><b>${items.filter((i) => i.maigre).length}</b><span>sous 15 avis lus</span></div>
  </div>
</header>

<div class="barre"><div class="in">
  <button class="f" aria-pressed="true" data-t="etat" data-f="*">Tout</button>
  <button class="f" aria-pressed="false" data-t="etat" data-f="fourni">15 avis et plus <span style="opacity:.55">${items.filter((i) => !i.maigre).length}</span></button>
  <button class="f" aria-pressed="false" data-t="etat" data-f="maigre">moins de 15 <span style="opacity:.55">${items.filter((i) => i.maigre).length}</span></button>
  ${cats.map((c) => `<button class="f" aria-pressed="false" data-t="cat" data-f="${ech(c)}">${ech(c)} <span style="opacity:.55">${items.filter((i) => i.cat === c).length}</span></button>`).join("\n  ")}
  <input type="search" id="q" placeholder="Chercher…" aria-label="Rechercher">
  <span class="compte" id="n"></span>
</div></div>

<main>
  <div class="grille" id="g">${items.map(carte).join("")}</div>
  <p class="rien" id="rien" hidden>Aucun produit ne correspond.</p>
</main>

<footer>Trié par nombre d’avis lus. Déplier une carte montre le titre de la fiche Amazon retenue — c’est sur ce titre que l’appariement a été contrôlé. Les fiches à moins de 15 avis lus sont grisées&nbsp;: elles garderont leur note, sans lecture personnalisée.</footer>

<script>
  var cartes = [].slice.call(document.querySelectorAll(".p"));
  var boutons = [].slice.call(document.querySelectorAll("button.f"));
  var q = document.getElementById("q"), n = document.getElementById("n"), rien = document.getElementById("rien");
  var f = { etat: "*", cat: null };
  function rendre() {
    var t = q.value.trim().toLowerCase(), vus = 0;
    cartes.forEach(function (c) {
      var ok = (f.etat === "*" || c.dataset.etat === f.etat)
            && (!f.cat || c.dataset.cat === f.cat)
            && (!t || c.textContent.toLowerCase().indexOf(t) >= 0);
      c.hidden = !ok; if (ok) vus++;
    });
    n.textContent = vus + " / " + cartes.length;
    rien.hidden = vus > 0;
  }
  boutons.forEach(function (b) {
    b.addEventListener("click", function () {
      if (b.dataset.t === "cat") { f.cat = f.cat === b.dataset.f ? null : b.dataset.f; }
      else { f.etat = b.dataset.f; }
      boutons.forEach(function (o) {
        o.setAttribute("aria-pressed", String(o.dataset.t === "cat" ? f.cat === o.dataset.f : f.etat === o.dataset.f));
      });
      rendre();
    });
  });
  q.addEventListener("input", rendre);
  rendre();
</script>
</body>
</html>`;

const out = process.argv[2] || path.join(R, "avis-recuperes.html");
fs.writeFileSync(out, html, "utf8");
console.log("écrit :", out, "—", items.length, "produits");
