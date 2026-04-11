/**
 * Data analyzer tool — performs structured analysis using LLM.
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

export interface AnalysisResult {
  topic: string;
  sentiment: "positive" | "neutral" | "negative";
  entities: string[];
  themes: string[];
  readabilityScore: number;
  wordCount: number;
  summary: string;
}

export async function analyze(text: string): Promise<AnalysisResult> {
  const words = text.split(/\s+/).filter((w) => w.length > 0);

  const model = resolveModel();
  if (!model) {
    throw new Error("No LLM API key configured. Set OPENROUTER_API_KEY (free at openrouter.ai) or OPENAI_API_KEY.");
  }

  try {
    const { text: resultText } = await generateText({
      model,
      system:
        "Analyze the provided text. Identify the main topic, sentiment (positive/neutral/negative), key entities, and themes. " +
        "Also provide a readability score (0-100) and a brief summary. " +
        "Return the result in JSON format.",
      prompt: `Text to analyze: ${text}`,
    });

    let analysis: AnalysisResult = {
      topic: words.slice(0, 5).join(" ") + "...",
      sentiment: "neutral",
      entities: [],
      themes: [],
      readabilityScore: 60,
      wordCount: words.length,
      summary: resultText.substring(0, 100),
    };

    try {
      const jsonMatch = resultText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        analysis = { ...analysis, ...parsed };
      }
    } catch { /* use defaults */ }

    return analysis;
  } catch (err) {
    console.error("LLM Analysis failed:", err);
    throw err;
  }
}
