/**
 * Shared LLM model resolver.
 *
 * Priority: OPENROUTER_API_KEY (free) → OPENAI_API_KEY (paid)
 *
 * Get a free OpenRouter key at https://openrouter.ai — no credit card required.
 */
import { openai } from "@ai-sdk/openai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";

export interface ResolvedModel {
  model: ReturnType<typeof openai>;
  provider: string;
}

export function resolveModel(): ResolvedModel | null {
  if (process.env.OPENROUTER_API_KEY) {
    const openrouter = createOpenRouter({ apiKey: process.env.OPENROUTER_API_KEY });
    return {
      model: openrouter("openai/gpt-4o-mini") as ReturnType<typeof openai>,
      provider: "OpenRouter (openai/gpt-4o-mini)",
    };
  }
  if (process.env.OPENAI_API_KEY) {
    return {
      model: openai("gpt-4o-mini"),
      provider: "OpenAI (gpt-4o-mini)",
    };
  }
  return null;
}

export function requireModel(): ResolvedModel {
  const resolved = resolveModel();
  if (!resolved) {
    throw new Error(
      "No LLM API key configured. " +
      "Set OPENROUTER_API_KEY (free at https://openrouter.ai) or OPENAI_API_KEY in .env.local"
    );
  }
  return resolved;
}
