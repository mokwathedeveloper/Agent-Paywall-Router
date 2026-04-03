/**
 * GET /api/catalog
 *
 * Machine-readable service discovery endpoint.
 * Any external AI agent can call this to discover available paid tools,
 * their prices, payment specs, and the Soroban spending policy contract.
 *
 * This directly implements the "Bazaar-style discoverability for x402 services"
 * inspiration idea from the Stellar Hacks: Agents hackathon.
 */
import { NextResponse } from "next/server";
import {
  USDC_TESTNET_ADDRESS,
  USDC_CONTRACT_ADDRESS,
  X402_VERSION,
  DEFAULT_FACILITATOR_URL,
  TOOL_PRICES_TOKEN_UNITS,
  TOOL_PRICES,
  SPENDING_POLICY_CONTRACT_ID,
} from "@/lib/constants";

export async function GET() {
  const receiver = process.env.STELLAR_RECEIVER_ADDRESS ?? "";
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

  const makeX402Spec = (amount: string, path: string) => ({
    protocol: "x402",
    version: X402_VERSION,
    accepts: [{
      scheme: "exact",
      network: "stellar:testnet",
      asset: USDC_TESTNET_ADDRESS,
      amount,
      payTo: receiver,
      facilitator: process.env.FACILITATOR_URL ?? DEFAULT_FACILITATOR_URL,
      extra: { areFeesSponsored: true },
    }],
    retryWith: "x402-receipt header on retry request",
    resource: `${baseUrl}${path}`,
  });

  const makeMppSpec = (amount: string) => ({
    protocol: "mpp",
    version: "0.2.0",
    network: "stellar:testnet",
    currency: "USDC",
    amount_usd: amount,
    recipient: receiver,
    endpoint: `${baseUrl}/api/tools/mpp`,
  });

  return NextResponse.json({
    // ── Service identity ──────────────────────────────────────────────────
    name: "Agent Paywall Router",
    description: "Agent-native payment layer for paid web actions. Per-request micropayments via Stellar x402 and MPP protocols.",
    version: "1.0.0",
    url: baseUrl,
    github: "https://github.com/mokwathedeveloper/Agent-Paywall-Router",

    // ── Network ───────────────────────────────────────────────────────────
    network: "stellar:testnet",
    protocols: ["x402", "mpp"],
    asset: "USDC",
    assetContract: USDC_CONTRACT_ADDRESS,

    // ── On-chain policy ───────────────────────────────────────────────────
    spendingPolicy: {
      contract: SPENDING_POLICY_CONTRACT_ID,
      network: "stellar:testnet",
      limitUsd: 5.00,
      limitStroops: 50_000_000,
      explorer: `https://stellar.expert/explorer/testnet/contract/${SPENDING_POLICY_CONTRACT_ID}`,
      description: "Soroban contract enforces per-agent spending limits on-chain. Call authorize(agent, amount) before each payment.",
    },

    // ── Tools ─────────────────────────────────────────────────────────────
    tools: [
      {
        id: "search",
        name: "Web Search",
        description: "Real-time web search via DuckDuckGo + Wikipedia. Returns titles, snippets, and URLs.",
        method: "GET",
        url: `${baseUrl}/api/tools/search`,
        params: { q: "string — search query" },
        priceUsd: TOOL_PRICES.search,
        payment: makeX402Spec(TOOL_PRICES_TOKEN_UNITS.search, "/api/tools/search"),
        example: {
          request: `GET ${baseUrl}/api/tools/search?q=Stellar+blockchain`,
          headers: { "x402-receipt": "<payment_receipt>" },
        },
      },
      {
        id: "summarize",
        name: "Text Summarizer",
        description: "Extracts key points and summary from any text input.",
        method: "POST",
        url: `${baseUrl}/api/tools/summarize`,
        body: { text: "string — text to summarize" },
        priceUsd: TOOL_PRICES.summarize,
        payment: makeX402Spec(TOOL_PRICES_TOKEN_UNITS.summarize, "/api/tools/summarize"),
        example: {
          request: `POST ${baseUrl}/api/tools/summarize`,
          headers: { "Content-Type": "application/json", "x402-receipt": "<payment_receipt>" },
          body: { text: "Your text here..." },
        },
      },
      {
        id: "analyze",
        name: "Sentiment Analyzer",
        description: "Sentiment analysis, entity extraction, and theme detection.",
        method: "POST",
        url: `${baseUrl}/api/tools/analyze`,
        body: { text: "string — text to analyze" },
        priceUsd: TOOL_PRICES.analyze,
        payment: makeX402Spec(TOOL_PRICES_TOKEN_UNITS.analyze, "/api/tools/analyze"),
        example: {
          request: `POST ${baseUrl}/api/tools/analyze`,
          headers: { "Content-Type": "application/json", "x402-receipt": "<payment_receipt>" },
          body: { text: "Your text here..." },
        },
      },
      {
        id: "mpp-search",
        name: "MPP Web Search",
        description: "Web search via Stripe Machine Payments Protocol (MPP) — alternative to x402 for session-based flows.",
        method: "POST",
        url: `${baseUrl}/api/tools/mpp`,
        body: { query: "string — search query" },
        priceUsd: TOOL_PRICES.search,
        payment: makeMppSpec("0.01"),
      },
    ],

    // ── Agent integration guide ───────────────────────────────────────────
    agentGuide: {
      step1: "Call GET /api/catalog to discover available tools and prices",
      step2: "Call POST /api/sessions to create a session with a spending limit",
      step3: "Call POST /api/agent with your prompt — the agent handles tool selection and payment automatically",
      step4: "Or call individual tool endpoints directly with x402-receipt header after paying",
      orchestration: `POST ${baseUrl}/api/agent`,
      orchestrationBody: { prompt: "string", sessionId: "string (optional)" },
    },

    // ── Proof of work ─────────────────────────────────────────────────────
    onChainProof: {
      agentWallet: "GB77G4BRHXR6ZA7Z3KAPXXDJPD7QCLPZBILBFMQ6NYHJKVEJS47NLBAG",
      explorerBase: "https://stellar.expert/explorer/testnet",
      sampleTransactions: [
        { hash: "bcc71244b7fd8a371f948c511d63f17fa39e3473a6bbba4c2eb3fad91869ab87", memo: "x402:search:0.01" },
        { hash: "c78b1a5d26e39a815dc4a6406e6539fdce971d945de598479852ec6bc026953e", memo: "x402:summarize:0.02" },
        { hash: "1ed1dea43a78d96861db9e6aec5f30cb649042f61cf994135527647e5ae6a34a", memo: "x402:analyze:0.03" },
      ],
    },
  }, {
    headers: {
      // Allow any agent/client to call this endpoint
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=60",
    },
  });
}
