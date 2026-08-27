// COLLECTE DES AVIS ULTA — via PowerReviews, la plateforme qui héberge les avis d'Ulta.
//
// Ulta n'héberge pas ses avis : la page appelle l'API publique de PowerReviews depuis le
// navigateur. On fait le même appel. Aucun scraping, aucun proxy, aucun coût.
//
// Pourquoi pas le jeu de données Bright Data « Ulta » : il ne rend que 5 avis par produit,
// quand le produit en compte parfois plus de mille. Il n'accepte aucun paramètre pour en
// demander davantage — c'est structurel.
//
// L'identifiant produit est le dernier segment de l'URL Ulta, qu'on possède déjà pour les
// 2 068 produits. Donc AUCUN appariement à faire, et aucun risque de se tromper de produit —
// contrairement à la route Amazon, qui exige de retrouver chaque produit par son nom.
//
// Usage : node scripts/collecte-avis-ulta.mjs [--combien N] [--avis N] [--produit <pid>]
import fs from "node:fs";
import path from "node:path";

const RACINE = process.cwd();
const SORTIE = path.join(RACINE, "data", "avis-bruts-ulta");
const CLE = "daa0f241-c242-4483-afb7-4449942d1a2b";   // clé publique de la page Ulta
const MARCHAND = "6406";
const PAR_PAGE = 25;                                   // maximum accepté par l'API
const CIBLE = 200;                                     // avis visés par produit

fs.mkdirSync(SORTIE, { recursive: true });
const attendre = (ms) => new Promise((r) => setTimeout(r, ms));

/** L'identifiant PowerReviews : le dernier segment de l'URL Ulta (pimprod…, mkt…, xlsImpprod…). */
export function identifiant(url) {
  const m = String(url || "").split("?")[0].match(/\/p\/[^/?]*?-([A-Za-z]+\d+)$/);
  return m ? m[1] : null;
}

async function page(pid, depuis) {
  const u = `https://display.powerreviews.com/m/${MARCHAND}/l/en_US/product/${pid}/reviews`
    + `?apikey=${CLE}&paging.size=${PAR_PAGE}&paging.from=${depuis}`;
  for (let essai = 1; essai <= 3; essai++) {
    try {
      const r = await fetch(u, { signal: AbortSignal.timeout(25000) });
      if (!r.ok) throw new Error("HTTP " + r.status);
      return await r.json();
    } catch (e) {
      if (essai === 3) throw e;
      await attendre(1500 * essai);
    }
  }
}

/** Tous les avis d'un produit, jusqu'à `cible`, mis à la forme de data/avis-bruts/. */
export async function avisDe(pid, cible = CIBLE) {
  const p1 = await page(pid, 0);
  const r1 = p1?.results?.[0];
  if (!r1) return null;
  const total = Number(r1.rollup?.review_count) || 0;
  const brut = [...(r1.reviews || [])];
  // on s'arrête au plus petit des trois : la cible, le stock réel, et ce que l'API veut bien rendre
  for (let d = PAR_PAGE; d < Math.min(cible, total); d += PAR_PAGE) {
    const p = await page(pid, d);
    const lot = p?.results?.[0]?.reviews || [];
    if (!lot.length) break;
    brut.push(...lot);
    await attendre(250);                               // on ne martèle pas l'API d'Ulta
  }
  const avis = brut
    .filter((x) => (x.details?.comments || "").trim().length > 60)
    .map((x) => ({
      note: Number(x.metrics?.rating) || null,
      auteur: String(x.details?.nickname || "").slice(0, 40),
      titre: String(x.details?.headline || "").slice(0, 120),
      texte: String(x.details?.comments || "").replace(/\s+/g, " ").trim().slice(0, 1500),
      date: x.details?.created_date ? new Date(x.details.created_date).toISOString().slice(0, 10) : "",
      verifie: x.badges?.is_verified_buyer === true,
      utiles: Number(x.metrics?.helpful_votes) || 0,
    }));
  // la répartition d'étoiles sert au tirage représentatif, comme pour Amazon
  const d = r1.rollup?.rating_histogram || [];
  const distribution = {
    one_star: d[0] ?? null, two_star: d[1] ?? null, three_star: d[2] ?? null,
    four_star: d[3] ?? null, five_star: d[4] ?? null,
  };
  return { note: Number(r1.rollup?.average_rating) || null, nbAvis: total, distribution, avis };
}

// ── déroulé ──────────────────────────────────────────────────────────────────
if (import.meta.url === `file://${process.argv[1]}`) {
  const arg = (n, d) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; };
  const cat = JSON.parse(fs.readFileSync(path.join(RACINE, "data", "scan", "catalog.json"), "utf8"))
    .filter((p) => p.source === "ulta" && p.category !== "hors-perimetre" && identifiant(p.url));
  const unSeul = arg("--produit", null);
  // reprise : un produit déjà collecté n'est jamais refait. Un run de deux heures finit toujours
  // par être interrompu, et re-solliciter l'API d'Ulta pour rien serait discourtois.
  const restants = cat.filter((p) => !fs.existsSync(path.join(SORTIE, identifiant(p.url) + ".json")));
  const lot = unSeul ? cat.filter((p) => identifiant(p.url) === unSeul)
                     : restants.slice(0, Number(arg("--combien", restants.length)));
  if (!unSeul) console.log(`${cat.length - restants.length} déjà collectés, ${restants.length} restants`);
  const cible = Number(arg("--avis", CIBLE));
  console.log(`${lot.length} produit(s) · cible ${cible} avis chacun\n`);
  let ok = 0, vides = 0;
  for (const [i, p] of lot.entries()) {
    const pid = identifiant(p.url);
    process.stdout.write(`  ${String(i + 1).padStart(4)}/${lot.length}  ${p.name.slice(0, 44).padEnd(46)}`);
    try {
      const r = await avisDe(pid, cible);
      if (!r || !r.avis.length) { vides++; console.log("aucun avis"); continue; }
      fs.writeFileSync(path.join(SORTIE, pid + ".json"), JSON.stringify({
        pid, asin: null, nom: p.name, categorie: p.category, source: "ulta", url: p.url,
        note: r.note, nbAvis: r.nbAvis, distribution: r.distribution, avis: r.avis,
      }, null, 1));
      ok++;
      console.log(`${String(r.avis.length).padStart(3)} avis retenus / ${r.nbAvis} annoncés`);
    } catch (e) { console.log("ERREUR " + String(e.message).slice(0, 60)); }
  }
  console.log(`\n${ok} produits écrits · ${vides} sans avis`);
}
