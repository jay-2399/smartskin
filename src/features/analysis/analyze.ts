import type { AnalysisResult } from "./schema";
import { SAMPLE_RESULT } from "./sample";
import { openaiConfigured, analyzeWithOpenAI } from "./openai";
import { geminiConfigured, analyzeWithGemini } from "./gemini";
import type { Answers } from "@/features/funnel/types";

export type Provider = "openai" | "gemini" | "demo";

/** Fournisseur actif selon les clés présentes (OpenAI prioritaire). */
export function activeProvider(): Provider {
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
    case "openai":
      return analyzeWithOpenAI(imageJpeg, answers);
    case "gemini":
      return analyzeWithGemini(imageJpeg, answers);
    default:
      return SAMPLE_RESULT;
  }
}
