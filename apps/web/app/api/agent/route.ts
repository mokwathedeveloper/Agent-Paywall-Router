import { NextRequest, NextResponse } from "next/server";
import { createSession, getSession, canSpend, recordSpend, addTransaction, getSpendingSummary } from "@/lib/db";
import { TOOL_PRICES, STELLAR_NETWORK } from "@/lib/constants";
import type { AgentStep, ToolName } from "@/lib/types";
import { generateText, tool } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";

import { scanPrompt, requireSafeInput } from "@/lib/services/security";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const body = await req.json().catch(() => ({})) as { prompt?: string; sessionId?: string };
  const { prompt, sessionId: reqSessionId } = body;

  if (!prompt) {
    return NextResponse.json({ error: "Missing 'prompt'" }, { status: 400 });
  }

  let sessionId = reqSessionId;
  if (!sessionId || !(await getSession(sessionId))) {
    const session = await createSession();
    sessionId = session.id;
  }

  const steps: AgentStep[] = [];
  let stepId = 0;
  const start = Date.now();

  function addStep(
    action: string,
    status: AgentStep["status"],
    toolName: string | null,
    cost: number,
    detail: string
  ): void {
    steps.push({
      id: ++stepId,
      action,
      status,
      tool: toolName,
      cost,
      latency: Date.now() - start,
      detail,
      timestamp: new Date().toISOString(),
    });
  }

  try {
    // ── Security Scan ──
    const security = scanPrompt(prompt);
    if (!security.safe) {
      addStep("Security Check", "failed", null, 0, security.reason!);
      return NextResponse.json({ error: "Security violation", steps }, { status: 403 });
    }
    addStep("Security Check", "success", null, 0, "Prompt verified safe");

    if (!process.env.OPENAI_API_KEY) {
      addStep("Initializing LLM Agent", "failed", null, 0, "OPENAI_API_KEY is not configured");
      return NextResponse.json(
        { error: "Server misconfiguration: OPENAI_API_KEY missing", steps },
        { status: 503 }
      );
    }
    addStep("Initializing LLM Agent", "success", null, 0, "Using OpenAI (GPT-4o-mini)");

    // Define tools for the AI SDK
    const tools: any = {
      search: tool({
        description: "Search the web for real-time information, news, or facts.",
        parameters: z.object({
          query: z.string().describe("The search query"),
        }),
        execute: async ({ query }: { query: string }) => {
          return await executeToolWithPayment("search", { query }, sessionId!, addStep);
        },
      } as any),
      summarize: tool({
        description: "Summarize a given text into key points.",
        parameters: z.object({
          text: z.string().describe("The text to summarize"),
        }),
        execute: async ({ text }: { text: string }) => {
          return await executeToolWithPayment("summarize", { text }, sessionId!, addStep);
        },
      } as any),
      analyze: tool({
        description: "Analyze sentiment, entities, and themes in a text.",
        parameters: z.object({
          text: z.string().describe("The text to analyze"),
        }),
        execute: async ({ text }: { text: string }) => {
          return await executeToolWithPayment("analyze", { text }, sessionId!, addStep);
        },
      } as any),
    };

    const model = openai("gpt-4o-mini");

    let finalResult: any = null;
    let lastToolUsed: ToolName = "search";
    let totalCost = 0;

    const { text, toolResults } = await generateText({
      model,
      system:
        "You are a helpful AI agent with access to paid tools on the Stellar network. " +
        "You can search, summarize, and analyze information. " +
        "Always try to provide a comprehensive answer by chaining tools if necessary. " +
        "Each tool call costs real USDC via x402.",
      prompt,
      tools,
      maxSteps: 5, // Allow multi-step reasoning
    } as any);

    finalResult = text || "Task completed successfully.";
    if (toolResults.length > 0) {
      lastToolUsed = toolResults[toolResults.length - 1].toolName as ToolName;
      totalCost = toolResults.reduce(
        (sum, r) => sum + (TOOL_PRICES[r.toolName as ToolName] || 0),
        0
      );
    }

    addStep("Done", "success", lastToolUsed, 0, "All tools executed and results aggregated");

    const spendingStep = steps.find(
      (s) => s.action === "SpendingPolicy.authorize" && s.status === "success" && s.detail.includes("policy_tx:")
    );
    const policyTxHash =
      spendingStep?.detail.match(/policy_tx:\s*([^\s]+)/)?.[1] ?? null;
    const policyAgent =
      spendingStep?.detail.match(/policy_agent:\s*([^\s]+)/)?.[1] ?? null;

    return NextResponse.json({
      sessionId,
      tool: lastToolUsed,
      cost: totalCost,
      txHash: steps.find(s => s.status === "success" && s.detail.startsWith("tx:"))?.detail.split("tx: ")[1] || "stellar:0000",
      result: finalResult,
      steps,
      summary: await getSpendingSummary(sessionId),
      proofs: {
        policyTxHash,
        policyAgent,
      },
    });
  } catch (err) {
    console.error("Agent execution error detail:", err);
    const message = String(err);
    addStep("Error", "failed", null, 0, String(err));
    if (message.includes("Budget exceeded")) {
      return NextResponse.json(
        {
          error: "Budget exceeded",
          detail: message,
          steps,
        },
        { status: 402 },
      );
    }

    if ((err as any)?.name === "SecurityViolation" || message.includes("Security violation")) {
      return NextResponse.json(
        {
          error: "Security violation",
          detail: message,
          steps,
        },
        { status: 403 }
      );
    }

    return NextResponse.json(
      {
        error: "Agent execution failed",
        detail: message,
        steps,
      },
      { status: 500 },
    );
  }
}

/**
 * Helper to execute a tool with budget checks and x402 payment.
 * Reused by the AI SDK tool definitions.
 */
async function executeToolWithPayment(
  toolName: ToolName,
  args: Record<string, string>,
  sessionId: string,
  addStep: (action: string, status: AgentStep["status"], tool: string | null, cost: number, detail: string) => void
): Promise<{ data: unknown; txHash: string }> {
  const price = TOOL_PRICES[toolName] || 0.01;

  // Fail-closed scan on tool inputs (defense in depth).
  // This prevents the model from sending malicious payloads into paid LLM tools.
  const toolInput = toolName === "search" ? args.query ?? args.text ?? "" : args.text ?? "";
  requireSafeInput(String(toolInput));

  // 1. Session budget gate (non-mutating)
  const budgetOk = await canSpend(sessionId, price);
  if (!budgetOk) {
    addStep(`Budget check for ${toolName}`, "failed", toolName, price, "Insufficient budget");
    throw new Error(`Budget exceeded for ${toolName}`);
  }
  addStep(`Budget available for ${toolName}`, "success", toolName, 0, `$${price} available`);

  // 2. Payment & Call
  addStep(`Requesting ${toolName}`, "payment_required", toolName, 0, "402 — Payment Required");
  addStep(`Paying $${price} USDC`, "paying", toolName, price, "Signing via @x402/stellar");

  let toolResultTxHash: string | null = null;
  try {
    const toolResult = await callToolWithPayment(toolName, args, sessionId, price);
    toolResultTxHash = toolResult.txHash;
    addStep(`${toolName} confirmed`, "success", toolName, price, `tx: ${toolResult.txHash}`);

    const policyTxHashFromTool: string | null = (toolResult as any)?.data?.proofs?.policyTxHash
      ? String((toolResult as any).data.proofs.policyTxHash)
      : (toolResult as any)?.proofs?.policyTxHash
        ? String((toolResult as any).proofs.policyTxHash)
        : null;

    const policyAgentFromTool: string | null = (toolResult as any)?.data?.proofs?.policyAgent
      ? String((toolResult as any).data.proofs.policyAgent)
      : (toolResult as any)?.proofs?.policyAgent
        ? String((toolResult as any).proofs.policyAgent)
        : null;

    if (policyTxHashFromTool && policyAgentFromTool) {
      addStep(
        "SpendingPolicy.authorize",
        "success",
        toolName,
        0,
        `policy_tx: ${policyTxHashFromTool} policy_agent: ${policyAgentFromTool}`
      );
    }

    // 3. Record the session spend only after successful tool execution.
    const recorded = await recordSpend(sessionId, price);
    if (!recorded) {
      throw new Error(`Budget reservation failed after successful ${toolName} execution`);
    }

    await addTransaction({
      session_id: sessionId,
      endpoint: `/api/tools/${toolName}`,
      tool_name: toolName,
      amount: price,
      status: "success",
      tx_hash: toolResult.txHash,
      request_payload: { args, toolName, policyTxHash: policyTxHashFromTool },
    });

    return toolResult;
  } catch (err) {
    addStep(`${toolName} failed`, "failed", toolName, price, String(err));

    await addTransaction({
      session_id: sessionId,
      endpoint: `/api/tools/${toolName}`,
      tool_name: toolName,
      amount: price,
      status: "failed",
      tx_hash: toolResultTxHash,
      request_payload: { args, toolName, policyTxHash: null, error: String(err) },
    });

    throw err;
  }
}

// ─── Call Tool with Real x402 Payment ───────────────────────────────────────

async function callToolWithPayment(
  tool: string,
  args: Record<string, string>,
  _sessionId: string,
  _price: number
): Promise<{ data: unknown; txHash: string }> {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  if (!baseUrl) {
    throw new Error("Missing NEXT_PUBLIC_BASE_URL. Set it in .env.local (e.g. http://localhost:3000).");
  }
  const targetUrl = tool === "search"
    ? `${baseUrl}/api/tools/search?q=${encodeURIComponent(args.query ?? args.text ?? "")}`
    : `${baseUrl}/api/tools/${tool}`;

  // Check for required environment variables
  if (!process.env.STELLAR_PRIVATE_KEY || !process.env.STELLAR_RECEIVER_ADDRESS) {
    throw new Error("Missing STELLAR_PRIVATE_KEY or STELLAR_RECEIVER_ADDRESS. Real payments are required.");
  }

  try {
    const { wrapFetchWithPayment, x402Client } = await import("@x402/fetch");
    const { ExactStellarScheme, createEd25519Signer } = await import("@x402/stellar");
    const { decodePaymentResponseHeader } = await import("@x402/fetch");

    const client = new x402Client();
    const signer = createEd25519Signer(process.env.STELLAR_PRIVATE_KEY, STELLAR_NETWORK);
    client.register("stellar:*", new ExactStellarScheme(signer));
    const fetchWithPayment = wrapFetchWithPayment(fetch, client);

    const res = await fetchWithPayment(targetUrl, {
      method: tool === "search" ? "GET" : "POST",
      headers: { "Content-Type": "application/json" },
      body: tool === "search" ? undefined : JSON.stringify({ text: args.text || args.query }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Tool call failed with status ${res.status}: ${errorText}`);
    }

    const data = await res.json();
    const paymentResponse = res.headers.get("PAYMENT-RESPONSE") ?? res.headers.get("X-PAYMENT-RESPONSE");
    if (!paymentResponse) {
      throw new Error("Payment succeeded but no PAYMENT-RESPONSE header was returned.");
    }

    const decoded = decodePaymentResponseHeader(paymentResponse);
    const txHash = decoded.transaction;
    if (!txHash) throw new Error("PAYMENT-RESPONSE did not include a transaction id/hash.");

    return { data, txHash: `stellar:${txHash}` };
  } catch (e) {
    console.error("Real x402 payment failed:", String(e));
    throw new Error(`On-chain payment failed: ${String(e)}`);
  }
}

// On-chain spending policy enforcement moved into each paid tool endpoint.
