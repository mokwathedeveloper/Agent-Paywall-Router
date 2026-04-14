/**
 * Shared flow for x402-verified paid tools (search / summarize / analyze).
 * Keeps verify → policy → settle → proofs in one place to avoid drift across routes.
 */
import { NextResponse } from "next/server";
import { settlePaymentForTool, verifyPaidOrReturn402 } from "@/lib/paywall/x402";
import type { ToolName } from "@/lib/types";
import {
  authorizeSpendingPolicyForPayer,
  authorizeSplitSpendingPolicy,
  decodeX402PaymentTxHashFromHeaders,
  extractPayerAddressFromPaymentPayload,
} from "@/lib/onchain/spending-policy";

export type X402VerifyBundle = Awaited<ReturnType<typeof verifyPaidOrReturn402>>;

/** If payment is not verified, returns the HTTP response to send; otherwise null. */
export function paidX402EarlyResponse(verify: X402VerifyBundle): NextResponse | null {
  const vr = verify.result as { type?: string; response?: { body: BodyInit; status: number; headers: HeadersInit } };
  if (vr.type === "payment-error") {
    return new NextResponse(vr.response!.body, {
      status: vr.response!.status,
      headers: vr.response!.headers,
    });
  }
  if (vr.type !== "payment-verified") {
    return NextResponse.json({ error: "Payment Required" }, { status: 402 });
  }
  return null;
}

/** Matches Soroban contract panic and related simulation/submit failures. */
export function isOnChainBudgetExceededMessage(msg: string): boolean {
  const m = msg.toLowerCase();
  return (
    m.includes("spending limit exceeded") ||
    m.includes("on-chain limit") ||
    (m.includes("limit") && m.includes("exceed"))
  );
}

export type SpendingPolicyProof = { policyTxHash: string; policyAgent: string };

export async function authorizeSpendingPolicyForVerifiedPayment(
  paymentPayload: unknown,
  toolName: ToolName
): Promise<SpendingPolicyProof | NextResponse> {
  try {
    const payerAddress = extractPayerAddressFromPaymentPayload(paymentPayload);
    if (!payerAddress) {
      throw new Error("Payer address required.");
    }
    return await authorizeSpendingPolicyForPayer(toolName, payerAddress);
  } catch (err: unknown) {
    const msg = String((err as { message?: string })?.message ?? err);
    if (isOnChainBudgetExceededMessage(msg)) {
      return NextResponse.json({ error: "Budget exceeded" }, { status: 402 });
    }
    throw err;
  }
}

/** 
 * Extended version that calls record_split_payment on Soroban.
 * Used for production-grade revenue splits.
 */
export async function authorizeSplitSpendingPolicyForVerifiedPayment(
  paymentPayload: unknown,
  toolName: ToolName,
  providerAddress: string,
  providerPercentage: number
): Promise<SpendingPolicyProof | NextResponse> {
  try {
    const payerAddress = extractPayerAddressFromPaymentPayload(paymentPayload);
    return await authorizeSplitSpendingPolicy(toolName, payerAddress, providerAddress, providerPercentage);
  } catch (err: unknown) {
    const msg = String((err as { message?: string })?.message ?? err);
    if (isOnChainBudgetExceededMessage(msg)) {
      return NextResponse.json({ error: "Budget exceeded" }, { status: 402 });
    }
    throw err;
  }
}

export async function settlePaidToolJsonWithProofs(
  vr: { paymentPayload: unknown; paymentRequirements: unknown },
  toolName: ToolName,
  costDisplay: string,
  toolPayload: Record<string, unknown>,
  policy: SpendingPolicyProof
): Promise<NextResponse> {
  const settled = await settlePaymentForTool(
    vr.paymentPayload,
    vr.paymentRequirements,
    { tool: toolName }
  );

  const paymentTxHash = await decodeX402PaymentTxHashFromHeaders(settled.headers);

  console.log(`[Stellar/x402] Tool unlocked: ${toolName}`);
  console.log(`[Stellar/x402] Cost:          ${costDisplay} USDC`);
  console.log(`[Stellar/x402] Payment tx:    ${paymentTxHash ?? "(hash not in headers)"}`);
  console.log(`[Stellar/x402] Policy tx:     ${policy.policyTxHash}`);
  console.log(`[Stellar/x402] Policy agent:  ${policy.policyAgent}`);
  if (paymentTxHash) {
    const hash = paymentTxHash.replace("stellar:", "");
    console.log(`[Stellar/x402] Verify:        https://stellar.expert/explorer/testnet/tx/${hash}`);
  }

  return NextResponse.json(
    {
      tool: toolName,
      cost: costDisplay,
      ...toolPayload,
      proofs: {
        policyTxHash: policy.policyTxHash,
        policyAgent: policy.policyAgent,
        paymentTxHash,
      },
    },
    {
      status: 200,
      headers: settled.headers,
    }
  );
}
