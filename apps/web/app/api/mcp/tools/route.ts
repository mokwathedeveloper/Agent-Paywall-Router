import { NextResponse } from "next/server";
import { TOOL_PRICES_TOKEN_UNITS } from "@/lib/constants";

/**
 * GET /api/mcp/tools
 * 
 * Exposes tools in a format compatible with Model Context Protocol (MCP).
 * External agents (Claude, Codex, etc.) can discover capabilities and prices.
 */
export async function GET() {
  const receiver = process.env.STELLAR_RECEIVER_ADDRESS;

  const tools = [
    {
      name: "search",
      description: "Real-time web search. Returns titles, snippets, and URLs. Cost: $0.01 USDC on Stellar.",
      price: "0.01",
      price_stroops: TOOL_PRICES_TOKEN_UNITS.search,
      input_schema: {
        type: "object",
        properties: {
          query: { type: "string", description: "The search query" }
        },
        required: ["query"]
      }
    },
    {
      name: "summarize",
      description: "Extracts key points and summary from any text. Cost: $0.02 USDC on Stellar.",
      price: "0.02",
      price_stroops: TOOL_PRICES_TOKEN_UNITS.summarize,
      input_schema: {
        type: "object",
        properties: {
          text: { type: "string", description: "The text to summarize" }
        },
        required: ["text"]
      }
    },
    {
      name: "analyze",
      description: "Sentiment analysis, entity extraction, and theme detection. Cost: $0.03 USDC on Stellar.",
      price: "0.03",
      price_stroops: TOOL_PRICES_TOKEN_UNITS.analyze,
      input_schema: {
        type: "object",
        properties: {
          text: { type: "string", description: "The text to analyze" }
        },
        required: ["text"]
      }
    }
  ];

  return NextResponse.json({
    tools,
    ...(receiver
      ? {}
      : {
          warnings: [
            "STELLAR_RECEIVER_ADDRESS is not configured; MCP payment specs will omit receiver.",
          ],
        }),
    payment: {
      network: "stellar:testnet",
      asset: "USDC",
      ...(receiver ? { receiver } : {}),
      protocol: "x402"
    }
  }, {
    headers: {
      "Access-Control-Allow-Origin": "*",
    }
  });
}
