/**
 * Unit Tests: Paid Tool Services
 * Tests search, summarize, and analyze service functions.
 */

import { search } from "@/lib/services/search";
import { summarize } from "@/lib/services/summarizer";
import { analyze } from "@/lib/services/analyzer";

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
  it("returns correct response shape", async () => {
    const result = await summarize("This is a test sentence about AI payments.");
    expect(result).toHaveProperty("summary");
    expect(result).toHaveProperty("keyPoints");
    expect(result).toHaveProperty("originalLength");
    expect(result).toHaveProperty("summaryLength");
    expect(result).toHaveProperty("confidence");
  });

  it("truncates long text to 200 chars", async () => {
    const longText = "A".repeat(300);
    const result = await summarize(longText);
    expect(result.summaryLength).toBeLessThanOrEqual(204); // 200 + "..."
    expect(result.summary.endsWith("...")).toBe(true);
  });

  it("returns full text when under 200 chars", async () => {
    const shortText = "Short text.";
    const result = await summarize(shortText);
    expect(result.summary).toBe(shortText);
  });

  it("originalLength matches input length", async () => {
    const text = "Hello world this is a test.";
    const result = await summarize(text);
    expect(result.originalLength).toBe(text.length);
  });

  it("keyPoints is a non-empty array", async () => {
    const result = await summarize("AI agents need payment. x402 helps. Stellar settles.");
    expect(Array.isArray(result.keyPoints)).toBe(true);
    expect(result.keyPoints.length).toBeGreaterThan(0);
  });

  it("confidence is between 0 and 1", async () => {
    const result = await summarize("test");
    expect(result.confidence).toBeGreaterThan(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });

  it("handles empty string input", async () => {
    const result = await summarize("");
    expect(result).toBeDefined();
    expect(result.keyPoints.length).toBeGreaterThan(0); // falls back to defaults
  });
});

// ─── Analyzer Service ────────────────────────────────────────────────────────

describe("analyze()", () => {
  it("returns correct response shape", async () => {
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
    const result = await analyze("This is a neutral statement.");
    expect(["positive", "neutral", "negative"]).toContain(result.sentiment);
  });

  it("detects positive sentiment", async () => {
    const result = await analyze("This system is efficient and innovative and beneficial.");
    expect(result.sentiment).toBe("positive");
  });

  it("detects negative sentiment", async () => {
    const result = await analyze("There is a problem and an error and a risk and an issue.");
    expect(result.sentiment).toBe("negative");
  });

  it("detects neutral sentiment", async () => {
    const result = await analyze("The sky is blue and water is wet.");
    expect(result.sentiment).toBe("neutral");
  });

  it("extracts known entities from text", async () => {
    const result = await analyze("Stellar and x402 and USDC are used for AI agent payments.");
    expect(result.entities).toContain("Stellar");
    expect(result.entities).toContain("x402");
    expect(result.entities).toContain("USDC");
  });

  it("extracts Finance theme when payment keywords present", async () => {
    const result = await analyze("USDC micropayment fee cost");
    expect(result.themes).toContain("Finance");
  });

  it("extracts Technology theme when tech keywords present", async () => {
    const result = await analyze("AI agent API protocol blockchain");
    expect(result.themes).toContain("Technology");
  });

  it("wordCount matches actual word count", async () => {
    const text = "one two three four five";
    const result = await analyze(text);
    expect(result.wordCount).toBe(5);
  });

  it("readabilityScore is between 60 and 90", async () => {
    const result = await analyze("test text");
    expect(result.readabilityScore).toBeGreaterThanOrEqual(60);
    expect(result.readabilityScore).toBeLessThanOrEqual(90);
  });

  it("topic is derived from first words of input", async () => {
    const result = await analyze("Stellar payments are fast and cheap");
    expect(result.topic).toContain("Stellar");
  });
});
