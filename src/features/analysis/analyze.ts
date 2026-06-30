import type { AnalysisResult } from "./schema";
import { SAMPLE_RESULT } from "./sample";
import { anthropicConfigured, analyzeWithAnthropic } from "./anthropic";
import { openaiConfigured, analyzeWithOpenAI } from "./openai";
import { geminiConfigured, analyzeWithGemini } from "./gemini";
import { computeScore, scoreState } from "./score";
import type { Answers } from "@/features/funnel/types";

/** Remplace le score (et l'état) choisis librement par l'IA par un score
 *  CALCULÉ à partir des 16 notes — cohérent et reproductible (cf. score.ts). */
function withComputedScore(r: AnalysisResult): AnalysisResult {
  const score = computeScore(r.attributes);
  return { ...r, score, state: scoreState(score) };
}

export type Provider = "anthropic" | "openai" | "gemini" | "demo";

/** Fournisseur actif selon les clés présentes (Anthropic prioritaire). */
export function activeProvider(): Provider {
  if (anthropicConfigured()) return "anthropic";
  if (openaiConfigured()) return "openai";
  if (geminiConfigured()) return "gemini";
  return "demo";
}

/** Point d'entrée unique de l'analyse — bascule OpenAI / Gemini / démo.
 *  Sans aucune clé → bilan d'exemple (test sans clé ni compte). */
export async function analyzePhoto(
  imageJpeg: Buffer,
  answers: Answers
): Promise<AnalysisResult> {
  switch (activeProvider()) {
    case "anthropic":
      return withComputedScore(await analyzeWithAnthropic(imageJpeg, answers));
    case "openai":
      return withComputedScore(await analyzeWithOpenAI(imageJpeg, answers));
    case "gemini":
      return withComputedScore(await analyzeWithGemini(imageJpeg, answers));
    default:
      return SAMPLE_RESULT; // déjà cohérent par construction (cf. sample.ts)
  }
}
