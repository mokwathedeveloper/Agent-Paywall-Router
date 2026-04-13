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
  SPENDING_POLICY_CONTRACT_ID,
} from "@/lib/constants";

export async function GET(req: Request) {
  const receiver = process.env.STELLAR_RECEIVER_ADDRESS ?? "";
  // Derive base URL from request to avoid localhost fallback in production
  const baseUrl =
    process.env.NEXT_PUBLIC_BASE_URL ??
    `${req.headers.get("x-forwarded-proto") ?? "https"}://${req.headers.get("host") ?? "localhost:3000"}`;

  const makeX402Spec = (amount: string, path: string, payTo: string, asset: string) => ({
    protocol: "x402",
    version: X402_VERSION,
    accepts: [{
      scheme: "exact",
      network: "stellar:testnet",
      asset: asset || USDC_TESTNET_ADDRESS,
      amount,
      payTo: payTo || receiver,
      facilitator: process.env.FACILITATOR_URL ?? DEFAULT_FACILITATOR_URL,
      extra: { areFeesSponsored: true },
    }],
    retryWith: "x402-receipt header on retry request",
    resource: path.startsWith("http") ? path : `${baseUrl}${path}`,
  });

  const dbServices = await import("@/lib/db").then(m => m.getAllServices());

  const tools = dbServices.map(s => ({
    id: s.id,
    name: s.name,
    description: s.description,
    method: s.method,
    url: s.endpoint.startsWith("http") ? s.endpoint : `${baseUrl}${s.endpoint}`,
    priceUsd: s.price_usd,
    payment: s.protocol === "x402" 
      ? makeX402Spec(Math.round(s.price_usd * 10_000_000).toString(), s.endpoint, (s as any).provider_address, (s as any).asset_address)
      : { protocol: "mpp", version: "0.2.0", network: "stellar:testnet", currency: "USDC", amount_usd: s.price_usd.toString(), recipient: (s as any).provider_address || receiver, endpoint: s.endpoint.startsWith("http") ? s.endpoint : `${baseUrl}${s.endpoint}` }
  }));

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
    tools,

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
      horizonBase: "https://horizon-testnet.stellar.org/transactions",
      stellarLabBase: "https://laboratory.stellar.org/#explorer?resource=transactions&endpoint=single&values=eyJoYXNoIjoiXCJ9",
      sampleTransactions: [
        {
          hash: "bcc71244b7fd8a371f948c511d63f17fa39e3473a6bbba4c2eb3fad91869ab87",
          memo: "x402:search:0.01",
          stellarExpert: "https://stellar.expert/explorer/testnet/tx/bcc71244b7fd8a371f948c511d63f17fa39e3473a6bbba4c2eb3fad91869ab87",
          horizon: "https://horizon-testnet.stellar.org/transactions/bcc71244b7fd8a371f948c511d63f17fa39e3473a6bbba4c2eb3fad91869ab87",
        },
        {
          hash: "c78b1a5d26e39a815dc4a6406e6539fdce971d945de598479852ec6bc026953e",
          memo: "x402:summarize:0.02",
          stellarExpert: "https://stellar.expert/explorer/testnet/tx/c78b1a5d26e39a815dc4a6406e6539fdce971d945de598479852ec6bc026953e",
          horizon: "https://horizon-testnet.stellar.org/transactions/c78b1a5d26e39a815dc4a6406e6539fdce971d945de598479852ec6bc026953e",
        },
        {
          hash: "1ed1dea43a78d96861db9e6aec5f30cb649042f61cf994135527647e5ae6a34a",
          memo: "x402:analyze:0.03",
          stellarExpert: "https://stellar.expert/explorer/testnet/tx/1ed1dea43a78d96861db9e6aec5f30cb649042f61cf994135527647e5ae6a34a",
          horizon: "https://horizon-testnet.stellar.org/transactions/1ed1dea43a78d96861db9e6aec5f30cb649042f61cf994135527647e5ae6a34a",
        },
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