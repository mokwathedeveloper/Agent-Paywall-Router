/**
 * GET /api/demo/run
 *
 * End-to-end demo entrypoint for the Agent Paywall Router.
 *
 * Runs a fixed agent task that exercises the full payment flow:
 *   prompt → LLM → 402 paywall → x402 payment → Soroban policy → tool result
 *
 * Accepts an optional ?task= query param to override the default prompt.
 * Reuses the existing /api/agent orchestration engine — no logic duplication.
 *
 * Returns a structured demo report with:
 *   - each step with status, cost, and latency
 *   - real Stellar transaction hash
 *   - Soroban policy transaction hash
 *   - explorer links for on-chain verification
 *   - final result from the tool
 */
import { NextRequest, NextResponse } from "next/server";
import type { AgentStep } from "@/lib/types";

const DEMO_TASKS = [
  "Search for Stellar blockchain micropayments and summarize the key points",
  "Search for x402 payment protocol and analyze the main themes",
  "Search for AI agent economy and summarize what you find",
] as const;

interface AgentResponse {
  sessionId: string;
  tool: string;
  cost: number;
  txHash: string | null;
  result: unknown;
  steps: AgentStep[];
  summary: {
    limit: number;
    used: number;
    remaining: number;
    transactionCount: number;
  } | null;
  proofs: {
    policyTxHash: string | null;
    policyAgent: string | null;
  };
  error?: string;
  detail?: string;
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const taskParam = req.nextUrl.searchParams.get("task");
  // Sanitize: strip control characters, enforce max length, reject URL-like values (SSRF guard)
  const rawTask = taskParam?.trim().replace(/[\r\n]/g, " ").slice(0, 500) ?? "";
  const isUrlLike = /^https?:\/\//i.test(rawTask);
  const task = (!rawTask || isUrlLike) ? DEMO_TASKS[0] : rawTask;

  // Validate env before starting — fail fast with a clear message
  const missing: string[] = [];
  if (!process.env.OPENROUTER_API_KEY && !process.env.OPENAI_API_KEY) missing.push("OPENROUTER_API_KEY (free at openrouter.ai) or OPENAI_API_KEY");
  if (!process.env.STELLAR_PRIVATE_KEY) missing.push("STELLAR_PRIVATE_KEY");
  if (!process.env.STELLAR_RECEIVER_ADDRESS) missing.push("STELLAR_RECEIVER_ADDRESS");
  if (!process.env.NEXT_PUBLIC_BASE_URL) missing.push("NEXT_PUBLIC_BASE_URL");

  if (missing.length > 0) {
    return NextResponse.json({
      ok: false,
      error: "Missing required environment variables",
      missing,
      fix: `Add the following to apps/web/.env.local:\n${missing.map(k => `${k}=...`).join("\n")}`,
    }, { status: 503 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL!;
  const startedAt = new Date().toISOString();
  const wallStart = Date.now();

  // Call the existing /api/agent endpoint — reuse all orchestration logic
  let agentRes: Response;
  try {
    agentRes = await fetch(`${baseUrl}/api/agent`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: task }),
      signal: AbortSignal.timeout(60_000),
    });
  } catch (err) {
    return NextResponse.json({
      ok: false,
      error: "Failed to reach /api/agent",
      detail: String(err),
      hint: "Is the dev server running? Check NEXT_PUBLIC_BASE_URL in .env.local",
    }, { status: 502 });
  }

  const body = await agentRes.json() as AgentResponse;
  const wallMs = Date.now() - wallStart;

  // Build structured demo report
  const paymentSteps = body.steps?.filter(s =>
    s.status === "paying" || s.status === "payment_required" || s.action.includes("confirmed")
  ) ?? [];

  const successSteps = body.steps?.filter(s => s.status === "success") ?? [];
  const failedSteps = body.steps?.filter(s => s.status === "failed") ?? [];

  const txHash = body.txHash ?? null;
  const policyTxHash = body.proofs?.policyTxHash ?? null;
  const policyAgent = body.proofs?.policyAgent ?? null;

  const explorerLinks: Record<string, string> = {};
  if (txHash) {
    const hash = txHash.replace("stellar:", "");
    explorerLinks.stellarExpert = `https://stellar.expert/explorer/testnet/tx/${hash}`;
    explorerLinks.horizon = `https://horizon-testnet.stellar.org/transactions/${hash}`;
  }
  if (policyTxHash) {
    explorerLinks.sorobanPolicyTx = `https://stellar.expert/explorer/testnet/tx/${policyTxHash}`;
  }

  const paymentProven = txHash !== null && txHash !== "stellar:0000";

  return NextResponse.json({
    ok: agentRes.ok,
    demo: {
      task,
      startedAt,
      wallTimeMs: wallMs,
      status: agentRes.ok ? "success" : "failed",
    },
    payment: {
      proven: paymentProven,
      txHash,
      policyTxHash,
      policyAgent,
      totalCostUsd: body.cost ?? 0,
      tool: body.tool ?? null,
      explorerLinks,
    },
    execution: {
      sessionId: body.sessionId ?? null,
      totalSteps: body.steps?.length ?? 0,
      successSteps: successSteps.length,
      failedSteps: failedSteps.length,
      paymentSteps: paymentSteps.length,
      budget: body.summary ?? null,
    },
    steps: body.steps ?? [],
    result: body.result ?? null,
    // Surface any error from the agent
    ...(body.error ? { agentError: body.error, agentDetail: body.detail } : {}),
  }, {
    status: agentRes.ok ? 200 : agentRes.status,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "no-store",
    },
  });
}

// Allow CORS preflight
export async function OPTIONS(): Promise<NextResponse> {
  return new NextResponse(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
    },
  });
}
