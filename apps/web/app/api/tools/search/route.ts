import { NextRequest, NextResponse } from "next/server";
import { search } from "@/lib/services/search";
import { verifyPaidOrReturn402, settlePaymentForTool } from "@/lib/paywall/x402";
import { isSecurityViolationError, requireSafeInput } from "@/lib/services/security";

export async function GET(req: NextRequest): Promise<NextResponse> {
  // x402 paywall verification and settlement (fail-closed).
  const verify = await verifyPaidOrReturn402(req);
  const vr: any = verify.result;

  if (vr.type === "payment-error") {
    return new NextResponse(vr.response.body, {
      status: vr.response.status,
      headers: vr.response.headers,
    });
  }

  if (vr.type !== "payment-verified") {
    return NextResponse.json({ error: "Payment Required" }, { status: 402 });
  }

  const q = req.nextUrl.searchParams.get("q") ?? "AI agent payments";
  try {
    requireSafeInput(q);
  } catch (err) {
    if (isSecurityViolationError(err)) {
      return NextResponse.json(
        { error: "Security violation", detail: String(err) },
        { status: 403 }
      );
    }
    throw err;
  }
  const result = await search(q);

  const settled = await settlePaymentForTool(vr.paymentPayload, vr.paymentRequirements, {
    // Transport context for scheme handlers (optional)
    tool: "search",
  });

  return NextResponse.json(
    { tool: "search", cost: "$0.01", ...result },
    {
      status: 200,
      headers: settled.headers,
    },
  );
}
