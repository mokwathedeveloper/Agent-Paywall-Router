/**
 * GET /api/tools/weather
 *
 * x402-protected real-time weather endpoint.
 * Cost: $0.05 USDC (500,000 stroops) on Stellar testnet
 */
import { NextRequest, NextResponse } from "next/server";
import { getWeather } from "@/lib/services/weather";
import { verifyPaidOrReturn402 } from "@/lib/paywall/x402";
import { isSecurityViolationError, requireSafeInput } from "@/lib/services/security";
import {
  authorizeSplitSpendingPolicyForVerifiedPayment,
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

  const location = req.nextUrl.searchParams.get("location");
  if (!location) {
    return NextResponse.json({ error: "Missing 'location' parameter" }, { status: 400 });
  }

  try {
    requireSafeInput(location);
  } catch (err) {
    if (isSecurityViolationError(err)) {
      return NextResponse.json({ error: "Security violation", detail: String(err) }, { status: 403 });
    }
    throw err;
  }

  // ─── ON-CHAIN REVENUE SPLITTING ───
  const providerAddress = process.env.STELLAR_RECEIVER_ADDRESS || "";
  const policy = await authorizeSplitSpendingPolicyForVerifiedPayment(
    vr.paymentPayload, 
    "weather", 
    providerAddress, 
    0.8 // 80% to provider
  );
  if (policy instanceof NextResponse) return policy;

  const result = await getWeather(location);
  return settlePaidToolJsonWithProofs(vr, "weather", "$0.05", result as Record<string, unknown>, policy);
}
