// INCI des produits de parapharmacie française — par le web, sites de marque et INCIdecoder d'abord.
//
// Le champ ingredients d'Amazon n'a servi que 89 fois sur 500. Pour le reste, la sonde a montré
// que LES MARQUES ELLES-MÊMES publient l'INCI (obligation européenne) et qu'il en sort propre :
// 100 % de reconnaissance sur fr.svr.com, 87 % sur fr.nuxe.com. On interroge donc dans l'ordre
// les sources qui font autorité, et la recherche ouverte n'est que le dernier recours.
//
//   node scripts/chercher-inci-fr.mjs --max 20
//   node scripts/chercher-inci-fr.mjs
import fs from "node:fs";
import path from "node:path";
import { extraireInciDePage } from "./extraire-inci-page.mjs";
import { apparieDepuisPage, traduireEn } from "./verifier-appariement.mjs";
import { validerInci } from "./valider-inci.mjs";

const RACINE = path.resolve(import.meta.dirname, "..");
const FICHES = path.join(RACINE, "data/scan/fiches-fr-brut.json");
const CLE = fs.readFileSync(path.join(RACINE, "bright_key.txt"), "utf8").trim();
const H = { Authorization: "Bearer " + CLE, "Content-Type": "application/json" };
const PARALLELE = 5;
const PAGES_MAX = 3;

const args = process.argv.slice(2);
const MAX = args.includes("--max") ? parseInt(args[args.indexOf("--max") + 1], 10) : Infinity;

const ECARTES = /(amazon|ebay|ubuy|aliexpress|instacart|pinterest|youtube|facebook|instagram|tiktok|reddit|leboncoin|vinted)/i;
const PRIORITAIRES = /(incidecoder|skinsort|cosdna|\.(?:laroche-posay|avene|bioderma|vichy|uriage|svr|ducray|aderma|eucerin|nuxe|caudalie|filorga|lierac|embryolisse|topicrem|noreva|klorane|weleda|bioil|isdin|payot|mixa)\.|fr\.(?:svr|nuxe|avene)\.|newpharma|cocooncenter|easypara|pharma-gdd|santediscount|doctipharma)/i;

async function bd(u) {
  for (let n = 0; n < 3; n++) {
    try {
      const r = await fetch("https://api.brightdata.com/request", { method: "POST", headers: H,
        body: JSON.stringify({ zone: "mcp_unlocker", url: u, format: "raw" }), signal: AbortSignal.timeout(50000) });
      if (!r.ok) throw new Error("HTTP " + r.status);
      const t = await r.text();
      // La zone throttlée répond 200 avec ZÉRO octet — sans ce contrôle, 75 produits d'affilée
      // sont partis en « échec de recherche » silencieux alors que rien n'avait été cherché.
      if (t.length < 500) throw new Error("réponse vide (" + t.length + " o)");
      return t;
    } catch (e) { if (n === 2) throw e; await new Promise((x) => setTimeout(x, 8000 * (n + 1))); }
  }
}
async function serp(q) {
  try { return (JSON.parse(await bd("https://www.google.com/search?q=" + encodeURIComponent(q) + "&brd_json=1")).organic || [])
    .map((o) => ({ u: o.link || o.url, t: o.title || "" })).filter((x) => x.u); } catch { return []; }
}

// Le nom « produit » d'un titre Amazon. Trois pièges, tous rencontrés :
// « Marque - Produit - Descriptif » coupait au premier tiret et rendait… la marque seule ;
// « 75ml » dans une recherche entre guillemets ne matche rien ; les ™ non plus.
function nomCourt(f) {
  let t = String(f.titre || "").replace(/\s+/g, " ");
  const m = String(f.marque || "").trim();
  if (m) t = t.replace(new RegExp(m.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/[\s\-.']+/g, "[\\s\\-.']*"), "gi"), " ");
  // Les titres d'Amazon.fr égrènent le nom en segments : « , Toleriane, Eau Micellaire, … ».
  // En garder UN donnait un nom d'un seul mot — la gamme, pas le produit. On joint les segments
  // jusqu'à tenir au moins trois mots.
  const segs = t.split(/\s*[|,]\s*|\s+[-–—]\s+/).map((x) => x.trim()).filter((x) => x.length > 2);
  let seg = "";
  for (const x of segs) { seg = (seg + " " + x).trim(); if (seg.split(/\s+/).length >= 3) break; }
  seg = seg || t;
  return seg
    .replace(/\b\d+(?:[.,]\d+)?\s*(?:ml|cl|l|g|kg|oz|fl\.?\s*oz|x\s*\d+)\b/gi, " ")
    .replace(/[™®]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
}

const fiches = JSON.parse(fs.readFileSync(FICHES, "utf8"));
const cibles = Object.values(fiches).filter((f) => !f.erreur && !f._inciOk && !f.inciWeb && f.titre).slice(0, MAX);
console.log(cibles.length + " fiches sans INCI — recherche web, sources d'autorité d'abord\n");

let faits = 0;
const sauver = () => fs.writeFileSync(FICHES, JSON.stringify(fiches, null, 1), "utf8");

// INCIdecoder nomme ses pages par une simple mise en tirets du nom : tenter l'adresse en direct
// coûte UNE requête et évite le moteur de recherche — décisif sur les noms trop génériques
// (« Effaclar Sérum ») dont les recherches ramènent tout sauf la bonne page.
function slugsIncidecoder(f, nom) {
  const slug = (x) => traduireEn(f.marque + " " + x).replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const sansTaille = nom.replace(/\bspf\s*\d+\+?\b/gi, " ").trim();
  return [...new Set([slug(nom), slug(sansTaille),
      slug(sansTaille.split(/\s+/).slice(0, 3).join(" ")),
      slug(sansTaille.split(/\s+/).slice(0, 2).join(" "))])]   // « Minéral 89 » seul
    .map((x) => "https://incidecoder.com/products/" + x);
}

async function traiter(f) {
  const nom = nomCourt(f);
  let res = null;
  try {
    for (const u of slugsIncidecoder(f, nom)) {
      try {
        const html = await bd(u);
        if (!/ingredients \(explained\)/i.test(html)) continue;   // page 404 ou liste de marque
        const titre = (((html.match(/<title[^>]*>([\s\S]{0,220}?)<\/title>/i) || [])[1] || "")).replace(/\s+/g, " ").trim();
        const bon = apparieDepuisPage(nom, f.marque, titre, u);
        // Un slug est CONSTRUIT depuis notre propre nom : quand la page qui répond a tous ses
        // mots chez nous (partSiens = 1, ≥ 2 mots, aucun marqueur d'identité qui manque), c'est
        // notre produit dont le titre traîne des descripteurs en plus — « Minéral 89 Booster
        // Quotidien Fortifiant » sur la page « Vichy Mineral 89 ». Les variantes restent
        // protégées : un marqueur d'identité manquant (Yeux, White, Prebiotic…) disqualifie.
        const rattrape = !bon.ok && bon.partSiens === 1 && (bon.nSiens || 0) >= 2 && !bon.marqueurs.length;
        if (!bon.ok && !rattrape) continue;
        const r = extraireInciDePage(html);
        if (!r) continue;
        const j = validerInci(r.inci, { minIngredients: 2 });
        if (!j.ok) continue;
        const EXC = /\b(aqua|water|eau|glycerin|phenoxyethanol|tocopherol|xanthan|carbomer|edta|paraffinum|dimethicone|butylene|propanediol|citric acid|benzoate|sorbate|cetearyl|caprylyl)\b/i;
        if (j.n < 20 && !EXC.test(j.inci)) continue;
        res = { inci: j.inci, n: j.n, reconnu: r.reconnu, url: u };
        break;
      } catch { /* slug suivant */ }
    }
    let org = res ? [] : await serp(`"${nom}" ${f.marque} ingredients composition`);
    // repli : INCIdecoder en direct — il couvre ces marques presque exhaustivement
    if (!org.some((x) => /incidecoder/.test(x.u)))
      org = org.concat(await serp(`site:incidecoder.com ${f.marque} ${traduireEn(nom)}`));
    const liens = org.filter((x) => !ECARTES.test(x.u))
      .sort((a, b) => (PRIORITAIRES.test(b.u) ? 1 : 0) - (PRIORITAIRES.test(a.u) ? 1 : 0))
      .slice(0, PAGES_MAX);
    for (const { u, t: titreSerp } of liens) {
      try {
        const html = await bd(u);
        const titre = (((html.match(/<title[^>]*>([\s\S]{0,220}?)<\/title>/i) || [])[1] || titreSerp || "")).replace(/\s+/g, " ").trim();
        const bon = apparieDepuisPage(nom, f.marque, titre, u);
        if (!bon.ok) continue;
        const r = extraireInciDePage(html);
        if (!r) continue;
        const j = validerInci(r.inci, { minIngredients: 2 });
        if (!j.ok) continue;
        // Garde-fou local contre les GLOSSAIRES de sites de marque : laroche-posay.us a servi le
        // même menu « Hyaluronic Acid, Vitamin C, Retinol… » pour quatre produits différents. Une
        // vraie formule courte contient de l'eau ou un excipient ; une liste d'actifs célèbres
        // sans aucun des deux n'est pas une composition.
        const EXC = /\b(aqua|water|eau|glycerin|phenoxyethanol|tocopherol|xanthan|carbomer|edta|paraffinum|dimethicone|butylene|propanediol|citric acid|benzoate|sorbate|cetearyl|caprylyl)\b/i;
        if (j.n < 20 && !EXC.test(j.inci)) continue;
        res = { inci: j.inci, n: j.n, reconnu: r.reconnu, url: u };
        break;
      } catch { /* page suivante */ }
    }
  } catch { /* la fiche reste sans */ }
  if (res) { f.inciWeb = res.inci; f.inciWebUrl = res.url; f.inciWebN = res.n; }
  else f.inciWeb = null;
  faits++;
  process.stdout.write(res ? "✓" : "·");
  if (faits % 25 === 0) { sauver(); process.stdout.write(" " + faits + "/" + cibles.length + "\n"); }
}

const file = cibles.slice();
await Promise.all(Array.from({ length: PARALLELE }, async () => { while (file.length) await traiter(file.shift()); }));
sauver();

// dernier filet : la MÊME formule sur plusieurs fiches = page commune (glossaire, rubrique)
const parInci = {};
for (const [k, f] of Object.entries(fiches)) if (f.inciWeb && f.inciWeb.split(",").length > 3)
  (parInci[f.inciWeb.toLowerCase().replace(/[^a-z0-9]/g, "")] ||= []).push(k);
for (const grp of Object.values(parInci)) {
  if (grp.length < 2) continue;
  console.log("\ncollision — " + grp.length + " fiches, même formule : rejetées");
  for (const k of grp) { fiches[k].inciWeb = null; delete fiches[k].inciWebUrl; delete fiches[k].inciWebN; }
}
sauver();

const ok = Object.values(fiches).filter((f) => f.inciWeb).length;
const deja = Object.values(fiches).filter((f) => f._inciOk).length;
console.log("\n\n— INCI —");
console.log("  " + ok + " trouvés sur le web + " + deja + " d'Amazon = " + (ok + deja) + " / 500");
