import { NextResponse } from "next/server";
import {
  USDC_TESTNET_ADDRESS,
  X402_VERSION,
  DEFAULT_FACILITATOR_URL,
  TOOL_PRICES_TOKEN_UNITS,
  SPENDING_POLICY_CONTRACT_ID,
} from "@/lib/constants";

export async function GET() {
  const receiver = process.env.STELLAR_RECEIVER_ADDRESS ?? "";

  const makePaymentSpec = (amount: string, url: string) => ({
    x402Version: X402_VERSION,
    resource: { url },
    accepts: [{
      scheme: "exact",
      network: "stellar:testnet",
      asset: USDC_TESTNET_ADDRESS,
      amount,
      payTo: receiver,
      facilitator: process.env.FACILITATOR_URL ?? DEFAULT_FACILITATOR_URL,
      extra: { areFeesSponsored: true },
    }],
  });

  return NextResponse.json({
    service: "Agent Paywall Router",
    description: "Agent-native payment layer for paid web actions via Stellar x402",
    network: "stellar:testnet",
    protocol: `x402 v${X402_VERSION}`,
    spendingPolicyContract: SPENDING_POLICY_CONTRACT_ID,
    receiverAddress: receiver,
    tools: [
      {
        name: "search",
        method: "GET",
        endpoint: "/api/tools/search",
        params: "?q={query}",
        price_usd: 0.01,
        price_stroops: TOOL_PRICES_TOKEN_UNITS.search,
        description: "Real web search via DuckDuckGo + Wikipedia. Returns titles, snippets, and URLs.",
        payment: makePaymentSpec(TOOL_PRICES_TOKEN_UNITS.search, "/api/tools/search"),
      },
      {
        name: "summarize",
        method: "POST",
        endpoint: "/api/tools/summarize",
        body: "{ text: string }",
        price_usd: 0.02,
        price_stroops: TOOL_PRICES_TOKEN_UNITS.summarize,
        description: "Text summarization — extracts key points and summary from any text.",
        payment: makePaymentSpec(TOOL_PRICES_TOKEN_UNITS.summarize, "/api/tools/summarize"),
      },
      {
        name: "analyze",
        method: "POST",
        endpoint: "/api/tools/analyze",
        body: "{ text: string }",
        price_usd: 0.03,
        price_stroops: TOOL_PRICES_TOKEN_UNITS.analyze,
        description: "Sentiment analysis, entity extraction, and theme detection.",
        payment: makePaymentSpec(TOOL_PRICES_TOKEN_UNITS.analyze, "/api/tools/analyze"),
      },
      {
        name: "mpp-search",
        method: "POST",
        endpoint: "/api/tools/mpp",
        body: "{ query: string }",
        price_usd: 0.01,
        protocol: "MPP (Machine Payments Protocol)",
        description: "Web search via Stripe MPP charge protocol on Stellar. Alternative to x402 for session-based or high-frequency payments.",
        mpp_spec: {
          protocol: "mpp",
          version: "0.2.0",
          network: "stellar:testnet",
          currency: "USDC",
          amount: "0.01",
          recipient: process.env.STELLAR_RECEIVER_ADDRESS ?? "",
        },
      },
    ],
  });
}
