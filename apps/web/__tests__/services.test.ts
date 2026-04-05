/**
 * Unit Tests: Paid Tool Services
 * Search hits real public APIs (network). Summarize/analyze use mocked LLM calls — deterministic, no API key required in CI.
 */

import { generateText } from "ai";
import { search } from "@/lib/services/search";
import { summarize } from "@/lib/services/summarizer";
import { analyze } from "@/lib/services/analyzer";

jest.mock("ai", () => ({
  generateText: jest.fn(),
}));

const mockGenerateText = generateText as jest.MockedFunction<typeof generateText>;

beforeAll(() => {
  process.env.OPENAI_API_KEY = "test-mock-key-for-jest";
});

// ─── Search Service ──────────────────────────────────────────────────────────

describe("search()", () => {
  it("returns correct response shape", async () => {
    const result = await search("AI payments");
    expect(result).toHaveProperty("query", "AI payments");
    expect(result).toHaveProperty("results");
    expect(result).toHaveProperty("totalResults");
    expect(result).toHaveProperty("searchTime");
  });

  it("returns at least one result", async () => {
    const result = await search("Stellar blockchain");
    expect(result.results.length).toBeGreaterThan(0);
  });

  it("each result has required fields", async () => {
    const result = await search("x402 protocol");
    result.results.forEach((r) => {
      expect(r).toHaveProperty("title");
      expect(r).toHaveProperty("url");
      expect(r).toHaveProperty("snippet");
      expect(r).toHaveProperty("relevance");
      expect(typeof r.relevance).toBe("number");
      expect(r.relevance).toBeGreaterThan(0);
      expect(r.relevance).toBeLessThanOrEqual(1);
    });
  });

  it("totalResults matches results array length", async () => {
    const result = await search("micropayments");
    expect(result.totalResults).toBe(result.results.length);
  });

  it("searchTime is a positive number", async () => {
    const result = await search("test");
    expect(result.searchTime).toBeGreaterThan(0);
  });

  it("handles empty query string", async () => {
    const result = await search("");
    expect(result.results).toBeDefined();
    expect(Array.isArray(result.results)).toBe(true);
  });
});

// ─── Summarizer Service ──────────────────────────────────────────────────────

describe("summarize()", () => {
  beforeEach(() => {
    mockGenerateText.mockReset();
  });

  it("returns correct response shape from model JSON", async () => {
    mockGenerateText.mockResolvedValue({
      text: '{"summary":"Short summary.","keyPoints":["Point one","Point two"]}',
    } as Awaited<ReturnType<typeof generateText>>);
    const result = await summarize("This is a test sentence about AI payments.");
    expect(result).toHaveProperty("summary", "Short summary.");
    expect(result.keyPoints).toEqual(["Point one", "Point two"]);
    expect(result).toHaveProperty("originalLength");
    expect(result).toHaveProperty("summaryLength");
    expect(result).toHaveProperty("confidence");
  });

  it("reflects model output for long input (length metadata from input)", async () => {
    const longText = "A".repeat(300);
    const truncatedSummary = `${"A".repeat(200)}...`;
    mockGenerateText.mockResolvedValue({
      text: JSON.stringify({ summary: truncatedSummary, keyPoints: ["k"] }),
    } as Awaited<ReturnType<typeof generateText>>);
    const result = await summarize(longText);
    expect(result.originalLength).toBe(300);
    expect(result.summaryLength).toBeLessThanOrEqual(204);
    expect(result.summary.endsWith("...")).toBe(true);
  });

  it("parses JSON embedded in model prose", async () => {
    mockGenerateText.mockResolvedValue({
      text: 'Here is the result:\n{"summary":"Short text.","keyPoints":["a"]}\nThanks.',
    } as Awaited<ReturnType<typeof generateText>>);
    const shortText = "Short text.";
    const result = await summarize(shortText);
    expect(result.summary).toBe("Short text.");
  });

  it("originalLength matches input length", async () => {
    mockGenerateText.mockResolvedValue({
      text: '{"summary":"x","keyPoints":["y"]}',
    } as Awaited<ReturnType<typeof generateText>>);
    const text = "Hello world this is a test.";
    const result = await summarize(text);
    expect(result.originalLength).toBe(text.length);
  });

  it("keyPoints is a non-empty array when model provides them", async () => {
    mockGenerateText.mockResolvedValue({
      text: '{"summary":"s","keyPoints":["a","b","c"]}',
    } as Awaited<ReturnType<typeof generateText>>);
    const result = await summarize("AI agents need payment. x402 helps. Stellar settles.");
    expect(Array.isArray(result.keyPoints)).toBe(true);
    expect(result.keyPoints.length).toBeGreaterThan(0);
  });

  it("confidence is between 0 and 1", async () => {
    mockGenerateText.mockResolvedValue({
      text: '{"summary":"t","keyPoints":["k"]}',
    } as Awaited<ReturnType<typeof generateText>>);
    const result = await summarize("test");
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });

  it("handles empty string input", async () => {
    mockGenerateText.mockResolvedValue({
      text: '{"summary":"","keyPoints":["fallback"]}',
    } as Awaited<ReturnType<typeof generateText>>);
    const result = await summarize("");
    expect(result).toBeDefined();
    expect(result.keyPoints.length).toBeGreaterThan(0);
  });
});

// ─── Analyzer Service ────────────────────────────────────────────────────────

describe("analyze()", () => {
  beforeEach(() => {
    mockGenerateText.mockReset();
  });

  function mockAnalysis(overrides: Record<string, unknown>) {
    mockGenerateText.mockResolvedValue({
      text: JSON.stringify({
        topic: "default topic",
        sentiment: "neutral",
        entities: [] as string[],
        themes: [] as string[],
        readabilityScore: 70,
        summary: "brief",
        ...overrides,
      }),
    } as Awaited<ReturnType<typeof generateText>>);
  }

  it("returns correct response shape", async () => {
    mockAnalysis({
      topic: "AI payments",
      entities: [],
      themes: [],
    });
    const result = await analyze("AI payments enable efficient micropayments.");
    expect(result).toHaveProperty("topic");
    expect(result).toHaveProperty("sentiment");
    expect(result).toHaveProperty("entities");
    expect(result).toHaveProperty("themes");
    expect(result).toHaveProperty("readabilityScore");
    expect(result).toHaveProperty("wordCount");
    expect(result).toHaveProperty("summary");
  });

  it("sentiment is one of the valid values", async () => {
    mockAnalysis({ sentiment: "neutral" });
    const result = await analyze("This is a neutral statement.");
    expect(["positive", "neutral", "negative"]).toContain(result.sentiment);
  });

  it("uses model sentiment positive", async () => {
    mockAnalysis({ sentiment: "positive" });
    const result = await analyze("This system is efficient and innovative and beneficial.");
    expect(result.sentiment).toBe("positive");
  });

  it("uses model sentiment negative", async () => {
    mockAnalysis({ sentiment: "negative" });
    const result = await analyze("There is a problem and an error and a risk and an issue.");
    expect(result.sentiment).toBe("negative");
  });

  it("uses model sentiment neutral", async () => {
    mockAnalysis({ sentiment: "neutral" });
    const result = await analyze("The sky is blue and water is wet.");
    expect(result.sentiment).toBe("neutral");
  });

  it("merges entities from model JSON", async () => {
    mockAnalysis({
      entities: ["Stellar", "x402", "USDC"],
      themes: [],
    });
    const result = await analyze("Stellar and x402 and USDC are used for AI agent payments.");
    expect(result.entities).toContain("Stellar");
    expect(result.entities).toContain("x402");
    expect(result.entities).toContain("USDC");
  });

  it("merges Finance theme from model", async () => {
    mockAnalysis({ themes: ["Finance"] });
    const result = await analyze("USDC micropayment fee cost");
    expect(result.themes).toContain("Finance");
  });

  it("merges Technology theme from model", async () => {
    mockAnalysis({ themes: ["Technology"] });
    const result = await analyze("AI agent API protocol blockchain");
    expect(result.themes).toContain("Technology");
  });

  it("wordCount matches actual word count when not overridden", async () => {
    mockAnalysis({});
    const text = "one two three four five";
    const result = await analyze(text);
    expect(result.wordCount).toBe(5);
  });

  it("readabilityScore from model JSON is preserved", async () => {
    mockAnalysis({ readabilityScore: 75 });
    const result = await analyze("test text");
    expect(result.readabilityScore).toBe(75);
  });

  it("topic from model JSON is preserved", async () => {
    mockAnalysis({ topic: "Stellar payments are fast" });
    const result = await analyze("Stellar payments are fast and cheap");
    expect(result.topic).toContain("Stellar");
  });
});
