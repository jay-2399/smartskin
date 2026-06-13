import OpenAI from "openai";
import { buildPrompt } from "./prompt";
import { AnalysisResultSchema, type AnalysisResult } from "./schema";
import type { Answers } from "@/features/funnel/types";

// Modèle vision flagship (cf. liste des modèles de la clé, 2026).
const MODEL = "gpt-5.5";

export function openaiConfigured(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

/** Envoie photo (JPEG) + réponses à GPT-5.5 (vision) ; renvoie un bilan validé.
 *  La photo n'est jamais persistée : passée ici, puis garbage-collectée. */
export async function analyzeWithOpenAI(
  imageJpeg: Buffer,
  answers: Answers
): Promise<AnalysisResult> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const dataUrl = `data:image/jpeg;base64,${imageJpeg.toString("base64")}`;

  const response = await client.chat.completions.create({
    model: MODEL,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: buildPrompt(answers) },
          { type: "image_url", image_url: { url: dataUrl } },
        ],
      },
    ],
  });

  const raw = response.choices[0]?.message?.content ?? "{}";
  return AnalysisResultSchema.parse(JSON.parse(raw));
}
