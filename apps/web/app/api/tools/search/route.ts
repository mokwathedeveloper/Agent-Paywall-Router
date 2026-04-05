import { NextRequest, NextResponse } from "next/server";
import { search } from "@/lib/services/search";
import { verifyPaidOrReturn402 } from "@/lib/paywall/x402";
import { isSecurityViolationError, requireSafeInput } from "@/lib/services/security";
import {
  authorizeSpendingPolicyForVerifiedPayment,
  paidX402EarlyResponse,
  settlePaidToolJsonWithProofs,
} from "@/lib/paywall/paid-x402-tool";

export async function GET(req: NextRequest): Promise<NextResponse> {
  const verify = await verifyPaidOrReturn402(req);
  const early = paidX402EarlyResponse(verify);
  if (early) return early;

  const vr = verify.result as {
    type: "payment-verified";
    paymentPayload: unknown;
    paymentRequirements: unknown;
  };

  const q = req.nextUrl.searchParams.get("q") ?? "AI agent payments";
  try {
    requireSafeInput(q);
  } catch (err) {
    if (isSecurityViolationError(err)) {
      return NextResponse.json({ error: "Security violation", detail: String(err) }, { status: 403 });
    }
    throw err;
  }

  const policy = await authorizeSpendingPolicyForVerifiedPayment(vr.paymentPayload, "search");
  if (policy instanceof NextResponse) return policy;

  const result = await search(q);
  return settlePaidToolJsonWithProofs(vr, "search", "$0.01", result as Record<string, unknown>, policy);
}
