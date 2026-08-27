// ENRICHIR LES AVIS BRUTS → la lecture segmentée par peau ET par problème de peau.
//
// C'est l'étape qui redonne à la section « What buyers say » ce qui faisait son intérêt dans
// la maquette : elle ne dit pas « ce que les clients pensent » mais « ce que les clients QUI TE
// RESSEMBLENT pensent ».
//
// On ne fabrique PAS un résumé par profil (ce serait un appel par combinaison de peau, absurde).
// On demande au modèle de SEGMENTER ce que rapportent les testeurs selon la peau et les problèmes
// qu'ils déclarent eux-mêmes dans leur avis — c'est fréquent : « I have very sensitive, dry skin… »,
// « I struggle with acne ». La fiche ne montre ensuite QUE le segment de son type de peau et les
// problèmes qu'elle a cochés. L'utilisatrice garde l'accès à TOUS les avis collectés, à part.
//
// SORTIE EN ANGLAIS : l'app est en anglais, ces phrases s'affichent telles quelles.
//
// Usage : node scripts/enrichir-avis.mjs [--combien N]
import fs from "node:fs";
import path from "node:path";

const RACINE = process.cwd();
const ENTREE = path.join(RACINE, "data", "avis-bruts");
const SORTIE = path.join(RACINE, "data", "avis-enrichis");
const CLE = process.env.ANTHROPIC_API_KEY
  || (fs.readFileSync(path.join(RACINE, ".env"), "utf8").match(/^\s*ANTHROPIC_API_KEY\s*=\s*["']?([^"'\r\n]+)/m) || [])[1];
const MODELE = process.env.MODEL || "claude-opus-5";
const COMBIEN_LUS = 80;

fs.mkdirSync(SORTIE, { recursive: true });

async function demander(prompt, maxTokens = 3000) {
  for (let essai = 1; essai <= 4; essai++) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 150000);
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "x-api-key": CLE, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify({ model: MODELE, max_tokens: maxTokens, messages: [{ role: "user", content: prompt }] }),
        signal: ctrl.signal,
      });
      clearTimeout(t);
      if (!r.ok) throw new Error(`${r.status} ${(await r.text()).slice(0, 110)}`);
      const d = await r.json();
      return (d.content || []).filter((b) => b.type === "text").map((b) => b.text).join("");
    } catch (e) {
      if (essai === 4) throw e;
      await new Promise((r) => setTimeout(r, Math.min(45000, 5000 * 2 ** (essai - 1))));
    }
  }
}
const json = (s) => { const m = s.match(/\{[\s\S]*\}/); if (!m) return null; try { return JSON.parse(m[0]); } catch { return null; } };

/** Les avis à faire lire, tirés au prorata de la VRAIE répartition d'étoiles d'Amazon.
 *  Le lot collecté sur-représente lourdement les avis sévères — mesuré sur 160 produits, il note
 *  en moyenne 0,55 étoile en dessous de la note officielle, et jusqu'à 29 % de 1 étoile là où
 *  Amazon en compte 3 %. Lire ce lot tel quel produirait une synthèse plus dure que la réalité.
 *  On tire donc par étoile selon la distribution officielle, en prenant d'abord les avis les plus
 *  substantiels : un avis long dit la peau de son auteur, un avis de trois mots ne dit rien.
 *  Si une étoile manque de stock, on rend MOINS d'avis plutôt que de recreuser le biais. */
function choisirPertinents(brut, N = COMBIEN_LUS) {
  const parNote = {};
  for (const a of brut.avis) (parNote[a.note] = parNote[a.note] || []).push(a);
  for (const n of Object.keys(parNote)) {
    parNote[n].sort((x, y) => (y.utiles - x.utiles) || (y.texte.length - x.texte.length));
  }
  const cles = { 5: "five_star", 4: "four_star", 3: "three_star", 2: "two_star", 1: "one_star" };
  const d = brut.distribution || {};
  const total = Object.values(cles).reduce((a, k) => a + (Number(d[k]) || 0), 0);
  if (!total) {
    return [...brut.avis].sort((x, y) => (y.utiles - x.utiles) || (y.texte.length - x.texte.length)).slice(0, N);
  }
  const choisis = [];
  for (const [note, cle] of Object.entries(cles)) {
    choisis.push(...(parNote[note] || []).slice(0, Math.round(N * (Number(d[cle]) || 0) / total)));
  }
  return choisis;
}

const CONSIGNE = `You read buyer reviews of a skincare product and produce a reading SEGMENTED BY
SKIN TYPE AND BY SKIN CONCERN, for an app that scores products against each person's own skin.

Many reviewers state their skin in their review ("I have very sensitive, dry skin…", "I struggle
with acne", "best drugstore buy for mature skin"). That is the information to exploit: say WHO
reports WHAT. Never average it out.

WRITE IN ENGLISH — the app is in English and these sentences are displayed verbatim.
Third person, factual, no marketing superlatives, no invented numbers.

Produce:

1. **segments** — what reviewers report, by skin type. Only types you genuinely have material for
   in the reviews supplied. One sentence each.
   Allowed keys: "oily", "dry", "combination", "sensitive", "normal", "mature".
   Invent nothing: if nothing is said about oily skin, write no "oily" key.

2. **concerns** — what reviewers who share a given skin CONCERN report about it. This is what the
   sheet shows the user for the problems she declared, so it matters as much as the segments.
   One or two sentences each, and INCLUDE THE DISSENT when there is any ("four report no new
   breakouts; one describes cystic pimples").
   Allowed keys, and nothing else: "aging", "dehydration", "redness", "barrier", "spots",
   "blemishes", "oiliness".

3. **aspects** — what recurs in the reviews, with its POLARITY. This is what Amazon's raw data
   does not give and what is missed most.
   Each aspect: a short label (3-7 words, sentence case), "pos" or "neg", and in "concerne" the
   skin types or concerns it applies to ONLY when it does not apply to everyone (fragrance that
   only bothers sensitive skin). Leave "concerne" empty when it holds for everyone. 4 to 7 aspects.
   Cover texture, feel, wear, packaging and value — not just skin outcomes, which the segments
   and concerns already carry.

4. **extraits** — 5 to 7 of the most INFORMATIVE reviews (not the most glowing): those that state
   the reviewer's skin and a concrete effect. Give the index in the list supplied, plus which skin
   type and which concerns each one speaks to, so the sheet can pick the ones that match its user.
   Include at least one critical review (3 stars or below) whenever the list contains one.

Answer with JSON ONLY:
{"segments":{"<type>":"<one sentence>"},
 "concerns":{"<concern>":"<one or two sentences>"},
 "aspects":[{"libelle":"...","polarite":"pos"|"neg","concerne":["<types or concerns>"]}],
 "extraits":[{"i":<index>,"peau":"<type or null>","sujets":["<concerns>"]}],
 "reserve":"<one sentence if the reviews are too few or too thin to conclude, otherwise null>"}`;

// ── deux modes hors-API, pour faire lire les avis par des sous-agents ────────
// --preparer <dossier> : écrit un fichier de consigne prêt à lire par produit
// --finaliser <dossier> : relit les réponses brutes des agents et écrit data/avis-enrichis/
// La sélection des 80 avis est recalculée à l'identique des deux côtés : les index que renvoie
// un agent désignent donc toujours le même avis.
function charge(f) { return JSON.parse(fs.readFileSync(path.join(ENTREE, f), "utf8")); }

const iPrep = process.argv.indexOf("--preparer");
if (iPrep > 0) {
  const dossier = process.argv[iPrep + 1];
  fs.mkdirSync(path.join(dossier, "in"), { recursive: true });
  fs.mkdirSync(path.join(dossier, "out"), { recursive: true });
  let n = 0, car = 0;
  for (const f of fs.readdirSync(ENTREE).filter((x) => x.endsWith(".json"))) {
    const brut = charge(f);
    if (!brut.avis?.length) continue;
    const lus = choisirPertinents(brut);
    const texte = `${CONSIGNE}\n\nPRODUIT : ${brut.nom} (${brut.categorie})\n` +
      `NOTE GLOBALE : ${brut.note ?? "?"}/5 sur ${brut.nbAvis ?? "?"} avis\n\nAVIS :\n` +
      lus.map((r, i) => `[${i}] ${r.note}/5 — ${r.titre}\n${r.texte}`).join("\n\n");
    fs.writeFileSync(path.join(dossier, "in", brut.asin + ".txt"), texte);
    n++; car += texte.length;
  }
  console.log(`${n} consignes écrites dans ${dossier}/in · ${(car / 1e6).toFixed(2)} M car.`);
  process.exit(0);
}

const iFin = process.argv.indexOf("--finaliser");
if (iFin > 0) {
  const dossier = process.argv[iFin + 1];
  const PEAUX = ["oily", "dry", "combination", "sensitive", "normal", "mature"];
  const SOUCIS = ["aging", "dehydration", "redness", "barrier", "spots", "blemishes", "oiliness"];
  const tri = (o, permis) => Object.fromEntries(Object.entries(o || {})
    .filter(([k, v]) => permis.includes(k) && typeof v === "string" && v.trim()));
  let ok = 0; const soucis = [];
  for (const f of fs.readdirSync(path.join(dossier, "out")).filter((x) => x.endsWith(".json"))) {
    const asin = f.replace(/\.json$/, "");
    const brut = charge(asin + ".json");
    const lus = choisirPertinents(brut);
    const out = JSON.parse(fs.readFileSync(path.join(dossier, "out", f), "utf8"));
    const extraits = (out.extraits || [])
      .filter((e) => e && Number.isInteger(e.i) && lus[e.i]).slice(0, 7)
      .map((e) => ({ ...lus[e.i], peau: e.peau || null, sujets: Array.isArray(e.sujets) ? e.sujets : [] }));
    const seg = tri(out.segments, PEAUX), con = tri(out.concerns, SOUCIS);
    const perdus = Object.keys(out.segments || {}).filter((k) => !PEAUX.includes(k))
      .concat(Object.keys(out.concerns || {}).filter((k) => !SOUCIS.includes(k)));
    if (perdus.length) soucis.push(`${asin} : clés hors liste ignorées — ${perdus.join(", ")}`);
    if (!extraits.length) soucis.push(`${asin} : aucun extrait valide`);
    if (!Object.keys(seg).length && !Object.keys(con).length) soucis.push(`${asin} : ni peau ni problème`);
    fs.writeFileSync(path.join(SORTIE, asin + ".json"), JSON.stringify({
      asin: brut.asin, nom: brut.nom, note: brut.note, nbAvis: brut.nbAvis,
      lus: lus.length, collectes: brut.avis.length,
      segments: seg, concerns: con,
      aspects: (out.aspects || []).filter((a) => a && a.libelle && (a.polarite === "pos" || a.polarite === "neg")).slice(0, 7),
      extraits, reserve: out.reserve || null,
    }, null, 1));
    ok++;
  }
  console.log(`${ok} fiches écrites dans data/avis-enrichis/`);
  if (soucis.length) { console.log(`\n${soucis.length} anomalie(s) :`); soucis.forEach((s) => console.log("  " + s)); }
  process.exit(0);
}

// ── déroulé ──────────────────────────────────────────────────────────────────
const arg = (n, d) => { const i = process.argv.indexOf(n); return i > 0 ? Number(process.argv[i + 1]) : d; };
const fichiers = fs.readdirSync(ENTREE).filter((f) => f.endsWith(".json"));
const aFaire = fichiers.filter((f) => !fs.existsSync(path.join(SORTIE, f)));
const lot = aFaire.slice(0, arg("--combien", aFaire.length));

console.log(`${lot.length} produits à enrichir (${fichiers.length - aFaire.length} déjà faits), modèle ${MODELE}\n`);
let ok = 0, sautes = 0, erreurs = 0;
for (const [i, f] of lot.entries()) {
  const brut = JSON.parse(fs.readFileSync(path.join(ENTREE, f), "utf8"));
  if (!brut.avis?.length) { sautes++; continue; }
  const lus = choisirPertinents(brut);
  process.stdout.write(`  ${String(i + 1).padStart(3)}/${lot.length}  ${brut.nom.slice(0, 40).padEnd(42)}`);
  try {
    const liste = lus.map((r, n) => `[${n}] ${r.note}/5 — ${r.titre}\n${r.texte}`).join("\n\n");
    const out = json(await demander(`${CONSIGNE}\n\nPRODUIT : ${brut.nom} (${brut.categorie})\n` +
      `NOTE GLOBALE : ${brut.note ?? "?"}/5 sur ${brut.nbAvis ?? "?"} avis\n\nAVIS :\n${liste}`));
    if (!out) { erreurs++; console.log("réponse illisible"); continue; }
    // on ne garde que des index valides, et on recopie l'avis choisi avec ses étiquettes
    const extraits = (out.extraits || [])
      .filter((e) => e && Number.isInteger(e.i) && lus[e.i])
      .slice(0, 7)
      .map((e) => ({ ...lus[e.i], peau: e.peau || null, sujets: Array.isArray(e.sujets) ? e.sujets : [] }));
    fs.writeFileSync(path.join(SORTIE, f), JSON.stringify({
      asin: brut.asin, nom: brut.nom, note: brut.note, nbAvis: brut.nbAvis,
      lus: lus.length, collectes: brut.avis.length,
      segments: out.segments || {},
      concerns: out.concerns || {},
      aspects: (out.aspects || []).slice(0, 7),
      extraits,
      reserve: out.reserve || null,
    }, null, 1));
    ok++;
    console.log(`${lus.length} lus · ${Object.keys(out.segments || {}).length} peaux · ` +
      `${Object.keys(out.concerns || {}).length} problèmes · ${(out.aspects || []).length} aspects · ${extraits.length} extraits`);
  } catch (e) { erreurs++; console.log("ERREUR " + e.message); }
}
console.log(`\n${ok} enrichis · ${sautes} sans avis · ${erreurs} en erreur`);
