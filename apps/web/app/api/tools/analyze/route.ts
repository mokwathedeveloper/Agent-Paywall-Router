import { NextRequest, NextResponse } from "next/server";
import { analyze } from "@/lib/services/analyzer";
import { verifyPaidOrReturn402, settlePaymentForTool } from "@/lib/paywall/x402";
import { isSecurityViolationError, requireSafeInput } from "@/lib/services/security";
import {
  authorizeSpendingPolicyForPayer,
  decodeX402PaymentTxHashFromHeaders,
  extractPayerAddressFromPaymentPayload,
} from "@/lib/onchain/spending-policy";

export async function POST(req: NextRequest): Promise<NextResponse> {
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

  const { text } = await req.json().catch(() => ({ text: "" })) as { text?: string };
  try {
    requireSafeInput(String(text ?? ""));
  } catch (err) {
    if (isSecurityViolationError(err)) {
      return NextResponse.json({ error: "Security violation", detail: String(err) }, { status: 403 });
    }
    throw err;
  }
  // Enforce on-chain spending policy per payer identity before settling and returning results.
  let policy: { policyTxHash: string; policyAgent: string };
  try {
    const payerAddress = extractPayerAddressFromPaymentPayload(vr.paymentPayload);
    policy = await authorizeSpendingPolicyForPayer("analyze", payerAddress);
  } catch (err: any) {
    const msg = String(err?.message ?? err);
    if (msg.toLowerCase().includes("spending limit exceeded") || msg.toLowerCase().includes("budget")) {
      return NextResponse.json({ error: "Budget exceeded" }, { status: 402 });
    }
    throw err;
  }

  const settled = await settlePaymentForTool(vr.paymentPayload, vr.paymentRequirements, {
    tool: "analyze",
  });

  const paymentTxHash = await decodeX402PaymentTxHashFromHeaders(settled.headers);
  const result = await analyze(text ?? "Sample text");

  return NextResponse.json(
    {
      tool: "analyze",
      cost: "$0.03",
      ...result,
      proofs: {
        policyTxHash: policy.policyTxHash,
        policyAgent: policy.policyAgent,
        paymentTxHash,
      },
    },
    {
      status: 200,
      headers: settled.headers,
    },
  );
}
