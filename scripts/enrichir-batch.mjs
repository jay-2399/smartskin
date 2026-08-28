// ENRICHISSEMENT PAR LOTS (Batch API) — l'alternative aux sous-agents.
//
// Les sous-agents fonctionnaient, mais ils meurent avec le processus Claude Code : il fallait en
// relancer douze à chaque coupure. Le Batch API prend les 1 400 demandes d'un coup, les traite de
// façon asynchrone et coûte moitié prix. Plus rien à surveiller.
//
// Le format d'entrée et de sortie est EXACTEMENT celui des agents : on lit les mêmes fichiers
// `in/<REF>.txt`, on écrit les mêmes `out/<REF>.json`. La reprise (ne jamais refaire ce qui
// existe) et la validation (`--finaliser`) restent inchangées.
//
// Usage : node scripts/enrichir-batch.mjs --envoyer [--combien N]
//         node scripts/enrichir-batch.mjs --etat
//         node scripts/enrichir-batch.mjs --recuperer
import fs from "node:fs";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";

const RACINE = process.cwd();
const TRAVAIL = path.join(RACINE, "data", "_travail-enrichissement");
const LOTS = path.join(TRAVAIL, "lots.json");
const MODELE = "claude-sonnet-5";
const PAR_LOT = 500;                       // on découpe pour rester loin des limites de taille

// Le premier envoi laissait le modèle écrire son JSON librement : 163 réponses sur 1373 étaient
// invalides, toujours pour la même raison — une citation d'acheteur entre guillemets non échappés
// au milieu d'une chaîne. La sortie structurée règle ça à la source : l'API garantit le format.
const SCHEMA = z.object({
  segments: z.record(z.string(), z.string()),
  concerns: z.record(z.string(), z.string()),
  aspects: z.array(z.object({
    libelle: z.string(),
    polarite: z.enum(["pos", "neg"]),
    concerne: z.array(z.string()),
  })),
  extraits: z.array(z.object({
    i: z.number().int(),
    peau: z.string().nullable(),
    sujets: z.array(z.string()),
  })),
  reserve: z.string().nullable(),
});

const cle = process.env.ANTHROPIC_API_KEY
  || (fs.readFileSync(path.join(RACINE, ".env"), "utf8").match(/^\s*ANTHROPIC_API_KEY\s*=\s*["']?([^"'\r\n]+)/m) || [])[1];
const client = new Anthropic({ apiKey: cle });

const lire = () => { try { return JSON.parse(fs.readFileSync(LOTS, "utf8")); } catch { return []; } };
const ecrire = (l) => fs.writeFileSync(LOTS, JSON.stringify(l, null, 1));

/** Les produits qui n'ont pas encore de réponse — la même règle de reprise que les agents. */
function restants() {
  const faits = new Set(fs.readdirSync(path.join(TRAVAIL, "out")).map((f) => f.replace(/\.json$/, "")));
  return fs.readdirSync(path.join(TRAVAIL, "in"))
    .filter((f) => f.endsWith(".txt"))
    .map((f) => f.replace(/\.txt$/, ""))
    .filter((ref) => !faits.has(ref));
}

// ── envoi ────────────────────────────────────────────────────────────────────
const arg = (n, d) => { const i = process.argv.indexOf(n); return i > 0 ? process.argv[i + 1] : d; };

if (process.argv.includes("--envoyer")) {
  const refs = restants().slice(0, Number(arg("--combien", 1e9)));
  if (!refs.length) { console.log("rien à envoyer."); process.exit(0); }
  const lots = lire();
  // Une référence n'est réservée que par un lot ENCORE EN COURS. Une fois le lot récupéré, ce qui
  // n'a pas produit de fiche (réponse invalide) doit pouvoir repartir — sinon la reprise se bloque.
  const enCours = new Set(lots.filter((l) => !l.recupere).flatMap((l) => l.refs));
  const aFaire = refs.filter((r) => !enCours.has(r));
  console.log(`${refs.length} produits sans réponse · ${refs.length - aFaire.length} déjà dans un lot · ${aFaire.length} à envoyer`);

  for (let i = 0; i < aFaire.length; i += PAR_LOT) {
    const tranche = aFaire.slice(i, i + PAR_LOT);
    const requests = tranche.map((ref) => ({
      custom_id: ref,
      params: {
        model: MODELE,
        max_tokens: 4000,
        // pas de réflexion étendue : c'est de l'extraction fidèle, pas du raisonnement, et
        // les sous-agents produisaient déjà de bonnes fiches sur cette même consigne
        thinking: { type: "disabled" },
        output_config: { format: zodOutputFormat(SCHEMA) },
        messages: [{ role: "user", content: fs.readFileSync(path.join(TRAVAIL, "in", ref + ".txt"), "utf8") }],
      },
    }));
    const lot = await client.messages.batches.create({ requests });
    lots.push({ id: lot.id, cree: lot.created_at, refs: tranche, recupere: false });
    ecrire(lots);
    console.log(`  lot ${lot.id} — ${tranche.length} produits`);
  }
  console.log(`\n${lots.filter((l) => !l.recupere).length} lot(s) en cours. État : node scripts/enrichir-batch.mjs --etat`);
  process.exit(0);
}

// ── état ─────────────────────────────────────────────────────────────────────
if (process.argv.includes("--etat")) {
  const lots = lire();
  if (!lots.length) { console.log("aucun lot."); process.exit(0); }
  let prets = 0;
  for (const l of lots) {
    const b = await client.messages.batches.retrieve(l.id);
    const c = b.request_counts;
    const fini = b.processing_status === "ended";
    if (fini && !l.recupere) prets++;
    console.log(`${l.id}  ${b.processing_status.padEnd(10)} ${l.refs.length} demandes · ` +
      `${c.succeeded} ok · ${c.processing} en cours · ${c.errored} erreurs · ${c.expired} expirées` +
      (l.recupere ? " · déjà récupéré" : fini ? "  ← À RÉCUPÉRER" : ""));
  }
  if (prets) console.log(`\n${prets} lot(s) prêts : node scripts/enrichir-batch.mjs --recuperer`);
  process.exit(0);
}

// ── récupération ─────────────────────────────────────────────────────────────
if (process.argv.includes("--recuperer")) {
  const lots = lire();
  const json = (s) => { const m = String(s).match(/\{[\s\S]*\}/); if (!m) return null; try { return JSON.parse(m[0]); } catch { return null; } };
  let ok = 0, illisibles = 0, echecs = 0;
  for (const l of lots) {
    if (l.recupere) continue;
    const b = await client.messages.batches.retrieve(l.id);
    if (b.processing_status !== "ended") { console.log(`${l.id} : ${b.processing_status}, on attend`); continue; }
    for await (const r of await client.messages.batches.results(l.id)) {
      if (r.result.type !== "succeeded") { echecs++; continue; }
      const texte = (r.result.message.content || []).filter((x) => x.type === "text").map((x) => x.text).join("");
      const out = json(texte);
      if (!out) { illisibles++; continue; }
      fs.writeFileSync(path.join(TRAVAIL, "out", r.custom_id + ".json"), JSON.stringify(out, null, 1));
      ok++;
    }
    l.recupere = true; ecrire(lots);
    console.log(`${l.id} récupéré`);
  }
  console.log(`\n${ok} fiches écrites · ${illisibles} réponses illisibles · ${echecs} requêtes en échec`);
  console.log("(les illisibles et les échecs repartiront au prochain --envoyer)");
  process.exit(0);
}

console.log("usage : --envoyer [--combien N] | --etat | --recuperer");
