import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { CONCERN_PHRASE } from "@/features/routine/actives";
import type { CatalogProduct } from "./catalog";
import type { EngineProfile } from "./profile";

/** Préoccupation (id interne) → libellé français prêt à citer (« tes imperfections »). */
const frConcern = (id: string): string => CONCERN_PHRASE[id] ?? id;

/* Étape 5 — IA choix + « pourquoi », UNIQUEMENT sur les shortlists (~5 fiches/cat).
   Le LLM ne voit jamais les 140, ne refait NI la sécurité NI le matching (verrouillés
   en amont). Un seul appel pour toutes les catégories (coût maîtrisé).
   Garde-fous : num hors shortlist → ignoré (repli déterministe côté orchestrateur).
   Cf. docs/moteur-reco-implementation.md §4 Étape 5 / §6. */

// Texte seul (pas d'image) → Sonnet 4.6 suffit (2× moins cher qu'Opus, rapide).
const ANTHROPIC_MODEL = "claude-sonnet-4-6";
const OPENAI_MODEL = "gpt-5.5";

function anthropicConfigured(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

/** True si un LLM est dispo pour le « pourquoi » (Anthropic prioritaire, sinon OpenAI).
 *  Faux → l'orchestrateur garde le top-score déterministe (sans texte « pourquoi »). */
export function llmConfigured(): boolean {
  return anthropicConfigured() || !!process.env.OPENAI_API_KEY;
}

/** Extrait l'objet JSON d'une réponse (tolère ```json … ``` ou du texte autour). */
function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fenced ? fenced[1] : text;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  return start >= 0 && end > start ? body.slice(start, end + 1) : body;
}

/** Un appel LLM texte → JSON brut. Anthropic (Sonnet 4.6) si clé présente, sinon OpenAI. */
async function callLlm(prompt: string): Promise<string> {
  if (anthropicConfigured()) {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const response = await client.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 4000,
      messages: [{ role: "user", content: prompt }],
    });
    const block = response.content.find((b) => b.type === "text");
    return block?.type === "text" ? block.text : "{}";
  }
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await client.chat.completions.create({
    model: OPENAI_MODEL,
    response_format: { type: "json_object" },
    messages: [{ role: "user", content: prompt }],
  });
  return response.choices[0]?.message?.content ?? "{}";
}

export interface LlmChoice {
  num: number;
  pourquoi: string;
}

const ResponseSchema = z.object({
  choix: z.array(z.object({ category: z.string(), num: z.number(), pourquoi: z.string() })),
});

/** Fiche allégée envoyée au LLM (le matching/byProfile sont déjà résolus). Clés EN
 *  FRANÇAIS, `traite` traduit en libellés citables → réduit les fuites de jargon. */
function lighten(p: CatalogProduct, skinType: string) {
  return {
    num: p.num,
    nom: p.name,
    marque: p.brand,
    prix: p.price,
    actif_cle: p.keyActives,
    traite: p.targets.map(frConcern),
    irritation: p.irritationCost,
    avis_pour_ta_peau: p.couche3?.byProfile?.[skinType as keyof NonNullable<typeof p.couche3>["byProfile"]] ?? "unknown",
    synthese: p.couche3?.note ?? "",
    avis_clients: (p.couche3?.customers_say ?? "").slice(0, 400),
  };
}

function buildPrompt(shortlists: Record<string, CatalogProduct[]>, profile: EngineProfile): string {
  const cat = Object.fromEntries(
    Object.entries(shortlists).map(([c, list]) => [c, list.map((p) => lighten(p, profile.skinType))])
  );
  return [
    "You help finalize a skincare routine. For EACH category, choose the BEST product",
    "AMONG the candidates provided (only — never invent a product or a `num` outside the list).",
    "Safety and relevance are already checked: you judge the match quality + the reviews.",
    "",
    `Profile: skin type = ${profile.skinType}${profile.sensitive ? " (sensitive)" : ""};`,
    `priority concerns (use these exact labels) = ${profile.concerns.map(frConcern).join(", ") || "none"}.`,
    "",
    "For each chosen product, write a SHORT, PUNCHY « why », quick to read:",
    "MAXIMUM 200 characters (aim 150-180), 1 to 2 brief sentences, in English, addressing the user as \"you\". In 2 beats:",
    "  1) DIAGNOSIS — cite 1 priority concern above that THIS product addresses.",
    "  2) MECHANISM — in a few words, HOW its key active works (lean on the summary/reviews).",
    "Get to the point: no boilerplate, no filler. Bold (with <b>…</b> tags,",
    "the HTML is rendered) the cited concern AND the key active.",
    "",
    "STYLE RULE: write ONLY in natural English, for a customer. NEVER use",
    "technical field names (acne, comedones, targets, byProfile, avis_pour_ta_peau,",
    "avis_clients…). To name a concern, reuse EXACTLY the labels provided",
    "(« your blemishes », « your blackheads »…), never the raw identifier.",
    "It's a beauty ASSESSMENT, NOT medical advice: no promise of cure, no medical",
    "vocabulary (pathology, treatment, prescription) — stay cosmetic and honest. Don't praise for a",
    "sensitive skin a product rated « to watch » for it.",
    "",
    "Candidates (JSON):",
    JSON.stringify(cat),
    "",
    'Reply in STRICT JSON: { "choix": [ { "category": "...", "num": 0, "pourquoi": "..." }, ... ] }',
  ].join("\n");
}

/** Choix + pourquoi pour chaque catégorie. Renvoie une map num→{num,pourquoi}.
 *  Lève si l'appel échoue (l'orchestrateur retombe alors sur le déterministe). */
export async function pickAndExplain(
  shortlists: Record<string, CatalogProduct[]>,
  profile: EngineProfile
): Promise<Map<string, LlmChoice>> {
  const raw = await callLlm(buildPrompt(shortlists, profile));
  const parsed = ResponseSchema.parse(JSON.parse(extractJson(raw)));

  const byCategory = new Map<string, LlmChoice>();
  for (const c of parsed.choix) {
    const list = shortlists[c.category];
    if (!list) continue;
    // Garde-fou : le num doit appartenir à la shortlist de SA catégorie.
    if (!list.some((p) => p.num === c.num)) continue;
    byCategory.set(c.category, { num: c.num, pourquoi: c.pourquoi });
  }
  return byCategory;
}
