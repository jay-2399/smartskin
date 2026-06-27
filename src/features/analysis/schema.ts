import { z } from "zod";
import { ATTRIBUTE_IDS } from "./attributes";

// Schéma de sortie imposé à Gemini (et validé à la réception).
// Aligné sur la maquette 11-prop_1-resultats.html.

export const ProfileSchema = z.object({
  skinType: z.string().min(1),          // ex. "Mixte"
  ageRange: z.string().min(1),          // ex. "25–35 ans"
  carnation: z.number().int().min(1).max(6),
  carnationLabel: z.string().min(1),    // ex. "Intermédiaire"
  undertone: z.number().int().min(1).max(4),
  undertoneLabel: z.string().min(1),    // ex. "Plutôt chaud"
  phototype: z.number().int().min(1).max(6),
  phototypeSub: z.string().min(1),      // ex. "brûle modérément, bronze progressivement"
});

export const AttributeResultSchema = z.object({
  id: z.enum(ATTRIBUTE_IDS as [string, ...string[]]),
  level: z.number().int().min(1).max(4), // 1 = idéal/absent, 4 = sévère
  tip: z.string().min(1),                // mot-clé court (ex. "modérées")
  situation: z.string().min(1),          // phrase d'analyse
});

// Verdict « Lecture experte » (reveal v2) : la couche de synthèse/raisonnement.
// Optionnel + .catch(undefined) côté résultat → un verdict malformé masque le
// bloc sans faire échouer tout le bilan.
export const VerdictSchema = z.object({
  title: z.string().min(1),          // synthèse : le levier dominant
  body: z.string().min(1),           // cause-racine : signaux → un seul levier
  behavioralLink: z.string().min(1), // une réponse q1-q7 reliée à un résultat
  plan: z.array(z.object({ label: z.string().min(1), sub: z.string().min(1) })).min(1), // 3 priorités
});

export const AnalysisResultSchema = z.object({
  // Observations zone par zone rédigées par l'IA AVANT de noter (ancre son
  // raisonnement → notes plus justes). Optionnel : ne bloque pas le bilan si absent.
  observations: z.string().optional(),
  score: z.number().int().min(0).max(100),
  state: z.string().min(1),              // ex. "Bon état général"
  sub: z.string().min(1),                // ex. "Continue, tu es sur la bonne voie."
  // issue : nullish — les LLM renvoient souvent null pour « non applicable »
  photoQuality: z.object({ ok: z.boolean(), issue: z.string().nullish() }),
  profile: ProfileSchema,
  attributes: z.array(AttributeResultSchema),
  // Reveal v2 — champs optionnels, tolérants à l'absence/malformation (.catch) :
  skinAge: z.number().int().min(10).max(100).optional().catch(undefined),       // âge de peau estimé (photo)
  skinTypeBreakdown: z.string().optional().catch(undefined),                    // « zone T grasse · joues normales »
  verdict: VerdictSchema.optional().catch(undefined),
});

export type AnalysisResult = z.infer<typeof AnalysisResultSchema>;
export type AttributeResult = z.infer<typeof AttributeResultSchema>;
