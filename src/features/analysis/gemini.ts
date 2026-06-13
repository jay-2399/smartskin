import { GoogleGenAI } from "@google/genai";
import { buildPrompt } from "./prompt";
import { AnalysisResultSchema, type AnalysisResult } from "./schema";
import { SAMPLE_RESULT } from "./sample";
import type { Answers } from "@/features/funnel/types";

// Modèle Gemini multimodal (rapide + économique pour les tests).
const MODEL = "gemini-2.5-flash";

/** True si une vraie clé Gemini est configurée. Sinon → mode démo (bilan d'exemple). */
export function geminiConfigured(): boolean {
  return !!process.env.GEMINI_API_KEY;
}

/**
 * Envoie photo (JPEG) + réponses à Gemini ; renvoie un bilan validé.
 * Sans GEMINI_API_KEY → renvoie le bilan d'exemple (permet de tester sans clé ni compte).
 *
 * Passage en production UE : remplacer le constructeur par
 *   new GoogleGenAI({ vertexai: true, project, location: "europe-west1" })
 * — le reste du code est identique (même SDK @google/genai).
 */
export async function analyzeWithGemini(
  imageJpeg: Buffer,
  answers: Answers
): Promise<AnalysisResult> {
  if (!geminiConfigured()) {
    return SAMPLE_RESULT; // mode démo
  }

  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const response = await ai.models.generateContent({
    model: MODEL,
    contents: [
      {
        role: "user",
        parts: [
          { text: buildPrompt(answers) },
          { inlineData: { mimeType: "image/jpeg", data: imageJpeg.toString("base64") } },
        ],
      },
    ],
    config: { responseMimeType: "application/json" },
  });

  const raw = response.text ?? "{}";
  return AnalysisResultSchema.parse(JSON.parse(raw));
  // imageJpeg sort de portée ici → jamais persisté
}
