// Dernier recours pour les fiches dont NI Ulta NI Amazon ne publient la composition : on cherche
// le produit sur le web et on lit l'INCI chez qui l'affiche — site de la marque, revendeur,
// pharmacie en ligne.
//
// Le risque de cette approche est évident : rien ne garantit que la page trouvée parle du BON
// produit. Trois garde-fous, dans cet ordre :
//   1. la requête est le nom EXACT entre guillemets, pas une recherche approximative ;
//   2. les places de marché (eBay, Ubuy, AliExpress…) sont écartées — leurs fiches recopient
//      n'importe quoi, souvent la description d'une autre contenance ;
//   3. extraireInciDePage n'accepte une liste que si le dictionnaire en reconnaît 55 % ;
//   4. le titre et l'adresse de la page doivent porter les mots DISTINCTIFS du produit — sans
//      quoi la recherche ramène le cousin : « Mighty Patch Original » a rapporté la page du
//      « Mighty Patch Micropoint », trois VIDIVICI différents la même fiche.
// On garde l'URL d'origine dans le résultat : une provenance vérifiable vaut mieux qu'un chiffre.
//
//   node scripts/chercher-inci-web.mjs --max 8    → échantillon
//   node scripts/chercher-inci-web.mjs            → tout ce qui manque
import fs from "node:fs";
import path from "node:path";
import { extraireInciDePage } from "./extraire-inci-page.mjs";
import { apparie } from "./verifier-appariement.mjs";

const RACINE = path.resolve(import.meta.dirname, "..");
const SORTIE = path.join(RACINE, "data/scan/inci-web.json");
const CLE = fs.readFileSync(path.join(RACINE, "bright_key.txt"), "utf8").trim();
const H = { Authorization: "Bearer " + CLE, "Content-Type": "application/json" };

const args = process.argv.slice(2);
const MAX = args.includes("--max") ? parseInt(args[args.indexOf("--max") + 1], 10) : Infinity;
const PARALLELE = 4;
const PAGES_PAR_PRODUIT = 3;   // au-delà, le rendement s'effondre et la facture monte

// places de marché et agrégateurs : fiches recopiées, contenances mélangées → à éviter
const ECARTES = /(ebay|ubuy|aliexpress|amazon\.|walmart\.com\/ip|etsy|mercari|poshmark|joom|desertcart|gosupps|editorialist|pinterest|youtube|facebook|instagram|tiktok|reddit)/i;
// sites qui publient l'INCI de façon fiable : on les essaie en premier
const PRIORITAIRES = /(incidecoder|skinsort|cosdna|sephora|target\.com|boots\.com|lookfantastic|dermstore|beautylish|cultbeauty|feelunique|notino|douglas)/i;

async function bd(url, { markdown = false, essais = 1, delaiMs = 45000 } = {}) {
  for (let n = 0; ; n++) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), delaiMs);
    try {
      const body = { zone: "mcp_unlocker", url, format: "raw" };
      if (markdown) body.data_format = "markdown";
      const r = await fetch("https://api.brightdata.com/request",
        { method: "POST", headers: H, body: JSON.stringify(body), signal: ctrl.signal });
      if (!r.ok) throw new Error("HTTP " + r.status);
      return await r.text();
    } catch (e) { if (n >= essais) throw e; } finally { clearTimeout(t); }
  }
}

async function chercher(requete) {
  const u = "https://www.google.com/search?q=" + encodeURIComponent(requete) + "&brd_json=1";
  const t = await bd(u);
  let j; try { j = JSON.parse(t); } catch { return []; }
  return (j.organic || []).map((o) => o.link || o.url).filter(Boolean);
}

const cat = JSON.parse(fs.readFileSync(path.join(RACINE, "data/scan/catalog.json"), "utf8"));
const produits = Array.isArray(cat) ? cat : (cat.produits || cat.products || Object.values(cat).find(Array.isArray));
// les accessoires n'ont pas d'INCI par nature : inutile de payer pour eux
const ACCESSOIRE = /\b(silicone|reusable|brow mask|headband|applicator|spatula|roller|brush|sponge|tool|device|mitt|towel|vacuum)\b/i;
const cibles = produits.filter((x) => !x.inci && !ACCESSOIRE.test(x.name)).slice(0, MAX);

const acquis = fs.existsSync(SORTIE) ? JSON.parse(fs.readFileSync(SORTIE, "utf8")) : {};
const aFaire = cibles.filter((x) => !(x.name in acquis));
console.log(cibles.length + " fiches sans composition (accessoires exclus) — " + aFaire.length + " à traiter\n");

let faits = 0;
const sauver = () => fs.writeFileSync(SORTIE, JSON.stringify(acquis, null, 2), "utf8");

async function traiter(x) {
  const requete = `"${x.name}" ingredients`;
  let res = { url: null, inci: null, type: "rien", essais: [] };
  try {
    const liens = (await chercher(requete))
      .filter((u) => !ECARTES.test(u))
      .sort((a, b) => (PRIORITAIRES.test(b) ? 1 : 0) - (PRIORITAIRES.test(a) ? 1 : 0))
      .slice(0, PAGES_PAR_PRODUIT);
    for (const u of liens) {
      try {
        const html = await bd(u);
        res.essais.push(u);
        const titre = (((html.match(/<title[^>]*>([\s\S]{0,220}?)<\/title>/i) || [])[1] || "") + " " +
                       ((html.match(/property=["\']og:title["\'][^>]*content=["\']([^"\']{0,220})/i) || [])[1] || ""))
                      .replace(/\s+/g, " ").trim();
        const bon = apparie(x.name, x.brand, u + " " + titre);
        if (!bon.ok) { res.ecartes = (res.ecartes || []).concat([{ url: u, titre, manque: bon.manquants }]); continue; }
        const r = extraireInciDePage(html);
        if (r) { res = { url: u, titre, inci: r.inci, type: "inci", n: r.n,
                         reconnu: Math.round(r.reconnu * 100) / 100, forme: r.forme,
                         appariement: bon.part, essais: res.essais, ecartes: res.ecartes }; break; }
      } catch { res.essais.push(u + " (échec)"); }
    }
    if (!res.inci && !liens.length) res.type = "aucun-lien";
  } catch (e) { res = { url: null, inci: null, type: "erreur", erreur: String(e.message), essais: [] }; }
  acquis[x.name] = res;
  faits++;
  process.stdout.write(res.type === "inci" ? "✓" : res.type === "erreur" ? "!" : "·");
  if (faits % 20 === 0) { sauver(); process.stdout.write(" " + faits + "/" + aFaire.length + "\n"); }
}

const file = aFaire.slice();
await Promise.all(Array.from({ length: PARALLELE }, async () => { while (file.length) await traiter(file.shift()); }));
sauver();

const t = {};
for (const v of Object.values(acquis)) t[v.type] = (t[v.type] || 0) + 1;
console.log("\n\n— recherche web —");
for (const [k, n] of Object.entries(t).sort((a, b) => b[1] - a[1])) console.log("  " + k.padEnd(12) + n);
console.log("\nécrit dans " + path.relative(RACINE, SORTIE) + " — RIEN n'a été fusionné.");
