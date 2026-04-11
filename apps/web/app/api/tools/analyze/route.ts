/**
 * POST /api/tools/analyze
 *
 * x402-protected sentiment + entity analysis endpoint.
 * Payment flow (Stellar testnet):
 *   1. No receipt → returns HTTP 402 + PAYMENT-REQUIRED header (x402 v2 spec)
 *   2. Agent signs USDC micropayment via @x402/stellar ExactStellarScheme
 *   3. Agent retries with x402-receipt header
 *   4. Server verifies receipt via x402.org/facilitator
 *   5. Server calls Soroban SpendingPolicy.authorize(agent, 300000 stroops)
 *   6. Server settles payment and returns analysis + tx proofs
 *
 * Cost: $0.03 USDC (300,000 stroops) on Stellar testnet
 * Asset: CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA
 */
import { NextRequest, NextResponse } from "next/server";
import { analyze } from "@/lib/services/analyzer";
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

  const policy = await authorizeSpendingPolicyForVerifiedPayment(vr.paymentPayload, "analyze");
  if (policy instanceof NextResponse) return policy;

  const result = await analyze(text ?? "Sample text");
  return settlePaidToolJsonWithProofs(
    vr,
    "analyze",
    "$0.03",
    result as unknown as Record<string, unknown>,
    policy
  );
}
