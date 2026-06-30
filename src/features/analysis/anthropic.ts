import Anthropic from "@anthropic-ai/sdk";
import { buildPrompt } from "./prompt";
import { AnalysisResultSchema, type AnalysisResult } from "./schema";
import type { Answers } from "@/features/funnel/types";

// Modèle vision le plus capable (2026). Choisi pour sa rigueur à SUIVRE les
// consignes anti-hallucination du prompt (« DO NOT INVENT ») — le point faible
// de l'analyse photo (cf. CLAUDE.md). `adaptive` : il raisonne avant de noter.
const MODEL = "claude-opus-4-8";

/** True si une vraie clé Anthropic est configurée. Sinon → fournisseur suivant. */
export function anthropicConfigured(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

/** Extrait l'objet JSON d'une réponse (tolère un ```json … ``` ou du texte
 *  autour). Claude répond normalement en JSON pur ; ceci est un filet de sécurité. */
function extractJson(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const body = fenced ? fenced[1] : text;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  return start >= 0 && end > start ? body.slice(start, end + 1) : body;
}

/** Envoie photo (JPEG) + réponses à Claude Opus 4.8 (vision) ; renvoie un bilan
 *  validé. La photo n'est jamais persistée : passée ici, puis garbage-collectée. */
export async function analyzeWithAnthropic(
  imageJpeg: Buffer,
  answers: Answers
): Promise<AnalysisResult> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const response = await client.messages.create({
    model: MODEL,
    max_tokens: 16000,
    thinking: { type: "adaptive" }, // raisonne zone par zone avant de noter → calibration plus fidèle
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: "image/jpeg", data: imageJpeg.toString("base64") },
          },
          { type: "text", text: buildPrompt(answers) },
        ],
      },
    ],
  });

  const block = response.content.find((b) => b.type === "text");
  const raw = block?.type === "text" ? block.text : "{}";
  return AnalysisResultSchema.parse(JSON.parse(extractJson(raw)));
}
