/**
 * GET /api/tools/search
 *
 * x402-protected web search endpoint.
 * Payment flow (Stellar testnet):
 *   1. No receipt → returns HTTP 402 + PAYMENT-REQUIRED header (x402 v2 spec)
 *   2. Agent signs USDC micropayment via @x402/stellar ExactStellarScheme
 *   3. Agent retries with x402-receipt header
 *   4. Server verifies receipt via x402.org/facilitator
 *   5. Server calls Soroban SpendingPolicy.authorize(agent, 100000 stroops)
 *   6. Server settles payment and returns search results + tx proofs
 *
 * Cost: $0.01 USDC (100,000 stroops) on Stellar testnet
 * Asset: CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA
 */
import { NextRequest, NextResponse } from "next/server";
import { search } from "@/lib/services/search";
import { verifyPaidOrReturn402 } from "@/lib/paywall/x402";
import { isSecurityViolationError, requireSafeInput, sanitizeLog } from "@/lib/services/security";
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

  const q = req.nextUrl.searchParams.get("q")?.trim();
  if (!q) {
    return NextResponse.json({ error: "Missing query parameter 'q'" }, { status: 400 });
  }

  // Validate length and character set before security scan (CWE-94 / CWE-117)
  if (q.length > 500 || /[\r\n]/.test(q)) {
    return NextResponse.json({ error: "Invalid query parameter 'q'" }, { status: 400 });
  }

  try {
    requireSafeInput(q);
  } catch (err) {
    if (isSecurityViolationError(err)) {
      return NextResponse.json({ error: "Security violation", detail: String(err) }, { status: 403 });
    }
    throw err;
  }

  // ─── ON-CHAIN REVENUE SPLITTING ───
  // We explicitly record the 70/30 split on Stellar via Soroban.
  // Payer (Agent) -> Provider (Receiver Wallet)
  try {
    const providerAddress = process.env.STELLAR_RECEIVER_ADDRESS || "";
    const policy = await authorizeSplitSpendingPolicyForVerifiedPayment(
      vr.paymentPayload, 
      "search", 
      providerAddress, 
      0.7 // 70% to provider
    );
    
    if (policy instanceof NextResponse) return policy;

    const result = await search(q);
    
    if (!result || !result.results || result.results.length === 0) {
      console.warn(`[search] No results found for query: "${sanitizeLog(q)}". Returning empty set.`);
    }

    return settlePaidToolJsonWithProofs(vr, "search", "$0.01", result as Record<string, unknown>, policy);
  } catch (err) {
    console.error("[search] Critical error in search handler:", err);
    
    // Return descriptive error to stop client retry loops
    return NextResponse.json({ 
      error: "Search service temporarily unavailable", 
      detail: err instanceof Error ? err.message : String(err) 
    }, { status: 503 });
  }
}
