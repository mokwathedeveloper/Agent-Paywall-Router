/**
 * POST /api/tools/summarize
 *
 * x402-protected LLM summarization endpoint.
 * Payment flow (Stellar testnet):
 *   1. No receipt → returns HTTP 402 + PAYMENT-REQUIRED header (x402 v2 spec)
 *   2. Agent signs USDC micropayment via @x402/stellar ExactStellarScheme
 *   3. Agent retries with x402-receipt header
 *   4. Server verifies receipt via x402.org/facilitator
 *   5. Server calls Soroban SpendingPolicy.authorize(agent, 200000 stroops)
 *   6. Server settles payment and returns summary + tx proofs
 *
 * Cost: $0.02 USDC (200,000 stroops) on Stellar testnet
 * Asset: CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA
 */
import { NextRequest, NextResponse } from "next/server";
import { summarize } from "@/lib/services/summarizer";
import { verifyPaidOrReturn402 } from "@/lib/paywall/x402";
import { isSecurityViolationError, requireSafeInput } from "@/lib/services/security";
import {
  authorizeSpendingPolicyForVerifiedPayment,
  paidX402EarlyResponse,
  settlePaidToolJsonWithProofs,
} from "@/lib/paywall/paid-x402-tool";

export async function POST(req: NextRequest): Promise<NextResponse> {
  const verify = await verifyPaidOrReturn402(req);
  const early = paidX402EarlyResponse(verify);
  if (early) return early;

  const vr = verify.result as {
    type: "payment-verified";
    paymentPayload: unknown;
    paymentRequirements: unknown;
  };

  const { text } = await req.json().catch(() => ({ text: "" })) as { text?: string };
  try {
    requireSafeInput(String(text ?? ""));
  } catch (err) {
    if (isSecurityViolationError(err)) {
      return NextResponse.json({ error: "Security violation", detail: String(err) }, { status: 403 });
    }
    throw err;
  }

  const policy = await authorizeSpendingPolicyForVerifiedPayment(vr.paymentPayload, "summarize");
  if (policy instanceof NextResponse) return policy;

  const result = await summarize(text ?? "Provide a summary.");
  return settlePaidToolJsonWithProofs(
    vr,
    "summarize",
    "$0.02",
    result as unknown as Record<string, unknown>,
    policy
  );
}
