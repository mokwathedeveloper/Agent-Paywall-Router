import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase";
import { SPENDING_POLICY_CONTRACT_ID } from "@/lib/constants";

export async function GET() {
  return NextResponse.json({
    status: "healthy",
    service: "agent-paywall-router",
    timestamp: new Date().toISOString(),
    network: "stellar:testnet",
    protocol: "x402 v2",
    database: isSupabaseConfigured ? "supabase" : "in-memory",
    sorobanContract: SPENDING_POLICY_CONTRACT_ID,
    contractExplorer: `https://stellar.expert/explorer/testnet/contract/${SPENDING_POLICY_CONTRACT_ID}`,
    agentWallet: process.env.STELLAR_RECEIVER_ADDRESS ?? "not configured",
  });
}
