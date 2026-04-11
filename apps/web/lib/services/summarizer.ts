/**
 * Summarizer tool — generates text summaries using LLM.
 * Supports OpenRouter (free) and OpenAI. Set OPENROUTER_API_KEY or OPENAI_API_KEY.
 */
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";

function resolveModel() {
  if (process.env.OPENROUTER_API_KEY) {
    const openrouter = createOpenRouter({ apiKey: process.env.OPENROUTER_API_KEY });
    return openrouter("openai/gpt-4o-mini");
  }
  if (process.env.OPENAI_API_KEY) {
    return openai("gpt-4o-mini");
  }
  return null;
}

export interface SummaryResult {
  originalLength: number;
  summaryLength: number;
  summary: string;
  keyPoints: string[];
  confidence: number;
}

export async function summarize(text: string): Promise<SummaryResult> {
  const model = resolveModel();
  if (!model) {
    throw new Error("No LLM API key configured. Set OPENROUTER_API_KEY (free at openrouter.ai) or OPENAI_API_KEY.");
  }

  try {
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
  } catch (err) {
    console.error("LLM Summarization failed:", err);
    throw err;
  }
}
