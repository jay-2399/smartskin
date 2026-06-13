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

export const AnalysisResultSchema = z.object({
  score: z.number().int().min(0).max(100),
  state: z.string().min(1),              // ex. "Bon état général"
  sub: z.string().min(1),                // ex. "Continue, tu es sur la bonne voie."
  photoQuality: z.object({ ok: z.boolean(), issue: z.string().optional() }),
  profile: ProfileSchema,
  attributes: z.array(AttributeResultSchema),
});

export type AnalysisResult = z.infer<typeof AnalysisResultSchema>;
export type AttributeResult = z.infer<typeof AttributeResultSchema>;
