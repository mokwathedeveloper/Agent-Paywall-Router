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
