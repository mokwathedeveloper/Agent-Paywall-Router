/**
 * @file Shared domain types for Agent Paywall Router.
 * Single source of truth — imported by db, store, API routes, and tests.
 */

// ─── Payment Protocol ────────────────────────────────────────────────────────

export type PaymentStatus = "pending" | "success" | "failed";

export type ToolName = "search" | "summarize" | "analyze";

export type AgentStepStatus =
  | "pending"
  | "calling"
  | "payment_required"
  | "paying"
  | "success"
  | "failed";

// ─── Database Models ─────────────────────────────────────────────────────────

export interface DBSession {
  id: string;
  spending_limit: number;
  used_amount: number;
  expires_at: string;
  created_at: string;
}

export interface DBService {
  id: string;
  name: string;
  description: string;
  price_usd: number;
  protocol: "x402" | "mpp";
  endpoint: string;
  method: "GET" | "POST";
  input_param: string;
  stellar_network: string;
  spending_policy_contract: string;
  is_external: boolean;
  created_at?: string;
}

export interface DBTransaction {
  id: string;
  session_id: string;
  endpoint: string;
  tool_name: string;
  amount: number;
  provider_share: number;
  agent_share: number;
  status: PaymentStatus;
  tx_hash: string | null;
  request_payload: Record<string, unknown>;
  created_at: string;
}

// ─── Agent ───────────────────────────────────────────────────────────────────

export interface AgentStep {
  id: number;
  action: string;
  status: AgentStepStatus;
  tool: string | null;
  cost: number;
  latency: number;
  detail: string;
  timestamp: string;
}

export interface SpendingSummary {
  sessionId: string;
  limit: number;
  used: number;
  remaining: number;
  percentage: number;
  transactionCount: number;
  expiresAt: string;
}

// ─── API Response Shapes ─────────────────────────────────────────────────────

export interface AgentResponse {
  sessionId: string;
  tool: ToolName;
  cost: number;
  txHash: string;
  result: unknown;
  steps: AgentStep[];
  summary: SpendingSummary;
}

export interface TransactionsResponse {
  transactions: DBTransaction[];
  total: number;
  totalSpent: number;
}

// ─── x402 Payment Protocol ───────────────────────────────────────────────────

export interface X402PaymentRequirement {
  scheme: string;
  network: string;
  asset: string;
  amount: string;
  payTo: string | undefined;
  facilitator: string;
  extra: { areFeesSponsored: boolean };
}

export interface X402PaymentRequired {
  x402Version: number;
  resource: { url: string };
  accepts: X402PaymentRequirement[];
}
