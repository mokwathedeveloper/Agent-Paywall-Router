/**
 * GET /api/services
 *
 * Agent-optimised service marketplace registry.
 * Returns available paid services sorted by price (cheapest first) so agents
 * can make cost-aware decisions without parsing the full catalog.
 *
 * This is a thin projection of /api/catalog — no duplicate logic.
 * The catalog remains the source of truth; this endpoint formats it for agents.
 *
 * Response shape is intentionally minimal so LLMs can parse it cheaply.
 */
import { NextResponse } from "next/server";
import { TOOL_PRICES, SPENDING_POLICY_CONTRACT_ID } from "@/lib/constants";

export interface ServiceEntry {
  id: string;
  name: string;
  description: string;
  priceUsd: number;
  protocol: "x402" | "mpp";
  endpoint: string;
  method: "GET" | "POST";
  inputParam: string;
  stellarNetwork: "stellar:testnet";
  spendingPolicyContract: string;
}

export async function GET(req: Request): Promise<NextResponse> {
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ??
    `${req.headers.get("x-forwarded-proto") ?? "https"}://${req.headers.get("host") ?? "localhost:3000"}`;

  const services: ServiceEntry[] = [
    {
      id: "search",
      name: "Web Search",
      description: "Real-time web search via DuckDuckGo + Wikipedia. Use for unknown facts, news, current events.",
      priceUsd: TOOL_PRICES.search,
      protocol: "x402",
      endpoint: `${baseUrl}/api/tools/search`,
      method: "GET",
      inputParam: "q",
      stellarNetwork: "stellar:testnet",
      spendingPolicyContract: SPENDING_POLICY_CONTRACT_ID,
    },
    {
      id: "summarize",
      name: "Text Summarizer",
      description: "Extracts key points and summary from long text. Use only after retrieving content that needs condensing.",
      priceUsd: TOOL_PRICES.summarize,
      protocol: "x402",
      endpoint: `${baseUrl}/api/tools/summarize`,
      method: "POST",
      inputParam: "text",
      stellarNetwork: "stellar:testnet",
      spendingPolicyContract: SPENDING_POLICY_CONTRACT_ID,
    },
    {
      id: "analyze",
      name: "Sentiment Analyzer",
      description: "Sentiment analysis, entity extraction, theme detection. Use for deeper insight on retrieved content.",
      priceUsd: TOOL_PRICES.analyze,
      protocol: "x402",
      endpoint: `${baseUrl}/api/tools/analyze`,
      method: "POST",
      inputParam: "text",
      stellarNetwork: "stellar:testnet",
      spendingPolicyContract: SPENDING_POLICY_CONTRACT_ID,
    },
    {
      id: "mpp-search",
      name: "MPP Web Search",
      description: "Web search via Stripe Machine Payments Protocol. Alternative to x402 for session-based flows.",
      priceUsd: TOOL_PRICES.search,
      protocol: "mpp",
      endpoint: `${baseUrl}/api/tools/mpp`,
      method: "POST",
      inputParam: "query",
      stellarNetwork: "stellar:testnet",
      spendingPolicyContract: SPENDING_POLICY_CONTRACT_ID,
    },
  ];

  // Sort cheapest first — agents should prefer lower-cost options
  const sorted = [...services].sort((a, b) => a.priceUsd - b.priceUsd);

  return NextResponse.json(
    {
      services: sorted,
      totalServices: sorted.length,
      cheapest: sorted[0],
      network: "stellar:testnet",
      paymentProtocols: ["x402", "mpp"],
      agentHint:
        "Choose the cheapest service that satisfies the task. " +
        "Prefer search ($0.01) for information retrieval. " +
        "Only use summarize ($0.02) or analyze ($0.03) if explicitly required. " +
        "All payments are real USDC on Stellar testnet via x402.",
    },
    {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=30",
      },
    }
  );
}
