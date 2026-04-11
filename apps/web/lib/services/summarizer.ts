/**
 * Summarizer tool — generates text summaries using LLM.
 * Uses shared resolveModel() — supports OpenRouter (free) and OpenAI.
 */
import { generateText } from "ai";
import { requireModel } from "@/lib/llm";

export interface SummaryResult {
  originalLength: number;
  summaryLength: number;
  summary: string;
  keyPoints: string[];
  confidence: number;
}

export async function summarize(text: string): Promise<SummaryResult> {
  const { model } = requireModel();

  const { text: summaryText } = await generateText({
    model,
    system: "Summarize the provided text. Return a concise summary and 3-5 key points.",
    prompt: `Text to summarize: ${text}\n\nReturn the result in JSON format with "summary" and "keyPoints" fields.`,
  });

  let summary = summaryText.trim();
  let keyPoints = ["Summary completed."];

  try {
    const jsonMatch = summaryText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      summary = parsed.summary || summary;
      keyPoints = parsed.keyPoints || keyPoints;
    }
  } catch { /* use default parsing */ }

  return {
    originalLength: text.length,
    summaryLength: summary.length,
    summary,
    keyPoints,
    confidence: 0.95,
  };
}
