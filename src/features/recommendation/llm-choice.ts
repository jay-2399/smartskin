import OpenAI from "openai";
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
    "Tu aides à finaliser une routine skincare. Pour CHAQUE catégorie, choisis le MEILLEUR produit",
    "PARMI les candidats fournis (uniquement — n'invente jamais un produit ni un `num` hors liste).",
    "La sécurité et la pertinence sont déjà vérifiées : tu juges la qualité du match + les avis.",
    "",
    `Profil : type de peau = ${profile.skinType}${profile.sensitive ? " (sensible)" : ""} ;`,
    `préoccupations prioritaires (libellés français à reprendre TELS QUELS) = ${profile.concerns.map(frConcern).join(", ") || "aucune"}.`,
    "",
    "Pour chaque produit choisi, rédige un « pourquoi » COURT et PERCUTANT, rapide à lire :",
    "MAXIMUM 200 caractères (vise 150-180), 1 à 2 phrases brèves, FR, tutoiement. En 2 temps :",
    "  1) DIAGNOSTIC — cite 1 préoccupation prioritaire ci-dessus que CE produit adresse.",
    "  2) MÉCANISME — en quelques mots, COMMENT son actif clé agit (appuie-toi sur la synthèse/les avis).",
    "Va à l'essentiel : pas de phrase d'usage, pas de remplissage. Mets en gras (balises <b>…</b>,",
    "le HTML est rendu) la préoccupation citée ET l'actif clé.",
    "",
    "IMPÉRATIF DE STYLE : écris UNIQUEMENT en français naturel, pour une cliente. N'emploie JAMAIS",
    "de mots anglais ni de noms de champs techniques (acne, comedones, targets, byProfile, avis_pour_ta_peau,",
    "avis_clients…). Pour nommer une préoccupation, reprends EXACTEMENT les libellés français fournis",
    "(« tes imperfections », « tes points noirs »…), jamais l'identifiant brut.",
    "C'est un BILAN beauté, PAS un avis médical : pas de promesse de guérison, pas de vocabulaire",
    "médical (pathologie, traitement, ordonnance) — reste cosmétique et honnête. Ne vante pas pour une",
    "peau sensible un produit noté « à surveiller » pour elle.",
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
    // Pas de `temperature` : gpt-5.x n'accepte que la valeur par défaut (un override
    // → 400 « unsupported_value », l'appel échouait silencieusement et retombait sur le repli).
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
