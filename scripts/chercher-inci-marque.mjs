// Troisième et dernière campagne : aller chercher la composition sur le SITE DE LA MARQUE.
//
// La recherche web ouverte (chercher-inci-web.mjs) laisse 86 vrais soins sans composition. Sur
// ces fiches, les revendeurs ne publient rien — mais le fabricant, lui, a presque toujours la
// liste sur sa propre page produit : c'est une obligation réglementaire dans l'UE, et un usage
// courant ailleurs. Le problème n'est donc pas que la donnée n'existe pas, c'est qu'elle est
// noyée : une recherche ouverte remonte les boutiques avant le fabricant.
//
// D'où deux étapes. On trouve d'abord le domaine officiel de la marque — une seule recherche
// pour toutes ses fiches — puis on cherche chaque produit À L'INTÉRIEUR de ce domaine.
//
//   node scripts/chercher-inci-marque.mjs --max 8
//   node scripts/chercher-inci-marque.mjs
import fs from "node:fs";
import path from "node:path";
import { extraireInciDePage } from "./extraire-inci-page.mjs";
import { apparieDepuisPage } from "./verifier-appariement.mjs";

const RACINE = path.resolve(import.meta.dirname, "..");
const SORTIE = path.join(RACINE, "data/scan/inci-marque.json");
const DOMAINES = path.join(RACINE, "data/scan/domaines-marques.json");
const CLE = fs.readFileSync(path.join(RACINE, "bright_key.txt"), "utf8").trim();
const H = { Authorization: "Bearer " + CLE, "Content-Type": "application/json" };

const args = process.argv.slice(2);
const MAX = args.includes("--max") ? parseInt(args[args.indexOf("--max") + 1], 10) : Infinity;
const PARALLELE = 4;

// tout ce qui n'est pas le fabricant : on cherche SON site, pas celui de ses revendeurs
const REVENDEUR = /(ulta|sephora|amazon|target|walmart|ebay|ubuy|aliexpress|iherb|yesstyle|oliveyoung|dermstore|cultbeauty|lookfantastic|notino|douglas|boots|cvs|walgreens|instacart|skinsort|incidecoder|cosdna|beautypedia|reddit|youtube|facebook|instagram|tiktok|pinterest|wikipedia|linkedin|glassdoor|crunchbase|trustpilot)\./i;

async function bd(url, { essais = 1, delaiMs = 45000 } = {}) {
  for (let n = 0; ; n++) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), delaiMs);
    try {
      const r = await fetch("https://api.brightdata.com/request", { method: "POST", headers: H,
        body: JSON.stringify({ zone: "mcp_unlocker", url, format: "raw" }), signal: ctrl.signal });
      if (!r.ok) throw new Error("HTTP " + r.status);
      return await r.text();
    } catch (e) { if (n >= essais) throw e; } finally { clearTimeout(t); }
  }
}

async function chercher(requete) {
  const t = await bd("https://www.google.com/search?q=" + encodeURIComponent(requete) + "&brd_json=1");
  let j; try { j = JSON.parse(t); } catch { return []; }
  return (j.organic || []).map((o) => o.link || o.url).filter(Boolean);
}

const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
const hote = (u) => (String(u).match(/https?:\/\/(?:www\.)?([^\/]+)/) || [])[1] || "";

// ── étape 1 : le domaine officiel de la marque ──
// On n'accepte un domaine que si le nom de la marque s'y retrouve : sans ce contrôle, la
// première place de marché venue passerait pour le fabricant.
const domaines = fs.existsSync(DOMAINES) ? JSON.parse(fs.readFileSync(DOMAINES, "utf8")) : {};
async function domaineDe(marque) {
  if (marque in domaines) return domaines[marque];
  let d = null;
  try {
    for (const u of await chercher(`${marque} official site skincare`)) {
      const h = hote(u);
      if (REVENDEUR.test(h)) continue;
      const n = norm(marque);
      // « Hero Cosmetics » → herocosmetics.us, mais aussi hero.com : on tolère le premier mot seul
      const tete = norm(marque.split(/\s+/)[0]);
      if (norm(h).includes(n) || (tete.length >= 4 && norm(h).includes(tete))) { d = h; break; }
    }
  } catch {}
  domaines[marque] = d;
  fs.writeFileSync(DOMAINES, JSON.stringify(domaines, null, 2), "utf8");
  return d;
}

// ── étape 2 : demander le produit au site, plutôt que de le chercher ──
// La plupart de ces marques tournent sur Shopify, qui expose sa propre base en JSON sur toute
// boutique. On lui donne le nom, elle rend ses produits avec leur adresse exacte : pas de
// recherche approximative, pas de page de collection ramenée à la place de la fiche.
// La recherche restreinte au domaine ne sert que de secours, pour les sites qui n'en sont pas.
async function viaShopify(dom, requete) {
  // les crochets DOIVENT être encodés : Bright Data refuse l'URL telle quelle, et l'appel
  // retombait silencieusement sur la recherche Google
  const u = `https://${dom}/search/suggest.json?q=${encodeURIComponent(requete)}` +
            `&resources%5Btype%5D=product&resources%5Blimit%5D=6`;
  let j;
  try { j = JSON.parse(await bd(u)); } catch { return null; }   // pas une boutique Shopify
  const p = j?.resources?.results?.products;
  if (!Array.isArray(p)) return null;
  return p.map((x) => ({ url: x.url?.startsWith("http") ? x.url : `https://${dom}${x.url}`,
                         titre: x.title || "" }));
}

// ── la cible ──
const cat = JSON.parse(fs.readFileSync(path.join(RACINE, "data/scan/catalog.json"), "utf8"));
const produits = Array.isArray(cat) ? cat : (cat.produits || cat.products || Object.values(cat).find(Array.isArray));
const ACCESSOIRE = /\b(silicone|reusable|brow mask|headband|applicator|spatula|roller|brush|sponge|tool|device|mitt|towel|vacuum)\b/i;
const cibles = produits.filter((x) => !x.inci && !ACCESSOIRE.test(x.name) && x.category !== "hors-perimetre").slice(0, MAX);

const acquis = fs.existsSync(SORTIE) ? JSON.parse(fs.readFileSync(SORTIE, "utf8")) : {};
const aFaire = cibles.filter((x) => !(x.name in acquis));
console.log(cibles.length + " soins sans composition — " + aFaire.length + " à traiter\n");

let faits = 0;
const sauver = () => fs.writeFileSync(SORTIE, JSON.stringify(acquis, null, 2), "utf8");

async function traiter(x) {
  let res = { type: "rien", url: null, inci: null, domaine: null, voie: null, ecartes: [] };
  try {
    const dom = await domaineDe(x.brand);
    res.domaine = dom;
    if (!dom) { res.type = "pas-de-site"; acquis[x.name] = res; faits++; process.stdout.write("∅"); return; }

    // le nom sans la marque : « Hero Cosmetics Mighty Patch Original » → « Mighty Patch Original »
    const sansMarque = x.name.replace(new RegExp("^" + x.brand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"), "").trim()
                       || x.name;

    let liens = await viaShopify(dom, sansMarque);
    res.voie = liens ? "shopify" : "recherche";
    if (!liens) {
      liens = (await chercher(`site:${dom} ${sansMarque}`))
        .filter((u) => hote(u).includes(dom.split(".")[0]))
        .map((u) => ({ url: u, titre: null }));
    }
    liens = liens.slice(0, 3);
    if (!liens.length) { res.type = "aucune-page"; acquis[x.name] = res; faits++; process.stdout.write("·"); return; }

    for (const { url, titre: titreConnu } of liens) {
      try {
        const html = await bd(url);
        const titre = titreConnu ||
          (((html.match(/<title[^>]*>([\s\S]{0,220}?)<\/title>/i) || [])[1] || "") + " " +
           ((html.match(/property=["\']og:title["\'][^>]*content=["\']([^"\']{0,220})/i) || [])[1] || ""))
          .replace(/\s+/g, " ").trim();
        const bon = apparieDepuisPage(x.name, x.brand, titre, url);
        if (!bon.ok) { res.ecartes.push({ url, titre, etrangers: bon.etrangers, siens: bon.partSiens }); continue; }
        const r = extraireInciDePage(html);
        if (!r) { res.ecartes.push({ url, titre, raison: "bon produit mais pas de liste lisible" }); continue; }
        res = { type: "inci", url, titre, inci: r.inci, n: r.n, reconnu: Math.round(r.reconnu * 100) / 100,
                forme: r.forme, appariement: bon.partSiens, domaine: dom, voie: res.voie, ecartes: res.ecartes };
        break;
      } catch { /* page inaccessible : on passe à la suivante */ }
    }
  } catch (e) { res = { type: "erreur", erreur: String(e.message), domaine: res.domaine, ecartes: [] }; }
  acquis[x.name] = res;
  faits++;
  process.stdout.write({ inci: "\u2713", "pas-de-site": "\u2205", "aucune-page": "\u00b7", erreur: "!" }[res.type] || "\u00b7");
  if (faits % 20 === 0) { sauver(); process.stdout.write(" " + faits + "/" + aFaire.length + "\n"); }
}

const file = aFaire.slice();
await Promise.all(Array.from({ length: PARALLELE }, async () => { while (file.length) await traiter(file.shift()); }));
sauver();

// ── dernier filet : les collisions ──
// Aucune règle sur les noms ne peut distinguer « Clear Deep Cleansing Oil » de « Clear PURIFYING
// Deep Cleansing Oil » — le second contient le premier. Mais si trois de nos produits désignent
// la MÊME page, au moins deux sont faux, et on ne sait pas lequel est le bon. On les refuse tous.
const parUrl = {};
for (const [nom, v] of Object.entries(acquis)) if (v.inci && v.url) (parUrl[v.url] ||= []).push(nom);
let collisions = 0;
for (const [url, noms] of Object.entries(parUrl)) {
  if (noms.length < 2) continue;
  console.log("\ncollision — " + noms.length + " produits sur " + url.slice(8, 74));
  for (const n of noms) {
    console.log("     ⨯ " + n.slice(0, 56));
    acquis[n] = { ...acquis[n], type: "collision", inciRejete: acquis[n].inci, inci: null, partage: noms };
    collisions++;
  }
}
if (collisions) sauver();

const t = {};
for (const v of Object.values(acquis)) t[v.type] = (t[v.type] || 0) + 1;
console.log("\n\n— sites de marque —");
for (const [k, n] of Object.entries(t).sort((a, b) => b[1] - a[1])) console.log("  " + k.padEnd(14) + n);
const sd = Object.entries(domaines).filter(([, d]) => d).length;
console.log("\ndomaines officiels trouvés : " + sd + " / " + Object.keys(domaines).length);
console.log("écrit dans " + path.relative(RACINE, SORTIE) + " — RIEN n'a été fusionné.");
