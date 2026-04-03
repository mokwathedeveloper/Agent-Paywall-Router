/**
 * Data analyzer tool — performs structured analysis using LLM.
 */
import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";

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

  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY missing; analyzer requires real LLM output");
  }

  try {
    const { text: resultText } = await generateText({
      model: openai("gpt-4o-mini"),
      system: "Analyze the provided text. Identify the main topic, sentiment (positive/neutral/negative), key entities, and themes. " +
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
