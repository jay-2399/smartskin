import OpenAI from "openai";
import { z } from "zod";
import type { CatalogProduct } from "./catalog";
import type { EngineProfile } from "./profile";

/* Étape 5 — IA choix + « pourquoi », UNIQUEMENT sur les shortlists (~5 fiches/cat).
   Le LLM ne voit jamais les 140, ne refait NI la sécurité NI le matching (verrouillés
   en amont). Un seul appel pour toutes les catégories (coût maîtrisé).
   Garde-fous : num hors shortlist → ignoré (repli déterministe côté orchestrateur).
   Cf. docs/moteur-reco-implementation.md §4 Étape 5 / §6. */

const MODEL = "gpt-5.5";

export function openaiConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

export interface LlmChoice {
  num: number;
  pourquoi: string;
}

const ResponseSchema = z.object({
  choix: z.array(z.object({ category: z.string(), num: z.number(), pourquoi: z.string() })),
});

/** Fiche allégée envoyée au LLM (le matching/byProfile sont déjà résolus). */
function lighten(p: CatalogProduct, skinType: string) {
  return {
    num: p.num,
    name: p.name,
    brand: p.brand,
    price: p.price,
    keyActives: p.keyActives,
    targets: p.targets,
    irritationCost: p.irritationCost,
    byProfile_user: p.couche3?.byProfile?.[skinType as keyof NonNullable<typeof p.couche3>["byProfile"]] ?? "unknown",
    note: p.couche3?.note ?? "",
    customers_say: (p.couche3?.customers_say ?? "").slice(0, 400),
  };
}

function buildPrompt(shortlists: Record<string, CatalogProduct[]>, profile: EngineProfile): string {
  const cat = Object.fromEntries(
    Object.entries(shortlists).map(([c, list]) => [c, list.map((p) => lighten(p, profile.skinType))])
  );
  return [
    "Tu aides à finaliser une routine skincare. Pour CHAQUE catégorie, choisis le MEILLEUR produit",
    "PARMI les candidats fournis (uniquement — n'invente jamais un produit ni un `num` hors liste).",
    "La sécurité et la pertinence sont déjà vérifiées : tu juges la qualité du match + les avis.",
    "",
    `Profil : type de peau = ${profile.skinType}${profile.sensitive ? " (sensible)" : ""} ;`,
    `préoccupations prioritaires = ${profile.concerns.join(", ") || "aucune"}.`,
    "",
    "Pour chaque produit choisi, rédige un « pourquoi » court (1–2 phrases, FR, tutoiement),",
    "appuyé sur les avis (customers_say/note) et byProfile_user. C'est un BILAN, pas un avis médical :",
    "pas de promesse de soin, pas de vocabulaire médical. Ne vante pas pour peau sensible un produit",
    "noté « caution » pour elle.",
    "",
    "Candidats (JSON) :",
    JSON.stringify(cat),
    "",
    'Réponds en JSON STRICT : { "choix": [ { "category": "...", "num": 0, "pourquoi": "..." }, ... ] }',
  ].join("\n");
}

/** Choix + pourquoi pour chaque catégorie. Renvoie une map num→{num,pourquoi}.
 *  Lève si l'appel échoue (l'orchestrateur retombe alors sur le déterministe). */
export async function pickAndExplain(
  shortlists: Record<string, CatalogProduct[]>,
  profile: EngineProfile
): Promise<Map<string, LlmChoice>> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await client.chat.completions.create({
    model: MODEL,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [{ role: "user", content: buildPrompt(shortlists, profile) }],
  });
  const raw = response.choices[0]?.message?.content ?? "{}";
  const parsed = ResponseSchema.parse(JSON.parse(raw));

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
