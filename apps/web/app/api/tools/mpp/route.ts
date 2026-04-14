/**
 * MPP (Machine Payments Protocol) endpoint
 * Uses @stellar/mpp charge protocol — Stripe's machine payment standard on Stellar.
 * This runs alongside x402 to demonstrate both payment protocols.
 *
 * POST /api/tools/mpp
 * Body: { query: string }
 * Payment: 0.01 USDC via MPP charge
 */
import { NextRequest, NextResponse } from "next/server";
import { search } from "@/lib/services/search";
import { isSecurityViolationError, requireSafeInput } from "@/lib/services/security";

// MPP charge server — dynamically imported to avoid SSR issues
async function getMppx() {
  const { Mppx, stellar } = await import("@stellar/mpp/charge/server");
  const { USDC_SAC_TESTNET } = await import("@stellar/mpp");

  if (!process.env.STELLAR_PRIVATE_KEY || !process.env.STELLAR_RECEIVER_ADDRESS) {
    return null;
  }

  return Mppx.create({
    secretKey: process.env.STELLAR_PRIVATE_KEY,
    methods: [
      stellar.charge({
        recipient: process.env.STELLAR_RECEIVER_ADDRESS,
        currency: USDC_SAC_TESTNET,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        network: "testnet" as any,
      }),
    ],
  });
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const mppx = await getMppx();

    if (!mppx) {
      // Fail closed: without keys we can't charge/verify.
      return NextResponse.json(
        { error: "MPP not configured (missing STELLAR_PRIVATE_KEY / STELLAR_RECEIVER_ADDRESS)" },
        { status: 500 },
      );
    }

    // Run MPP charge handler
    const result = await mppx.charge({
      amount: "0.01",
      description: "MPP search — Agent Paywall Router",
    })(req);

    // 402 — return MPP challenge to client
    if (result.status === 402) {
      return result.challenge as unknown as NextResponse;
    }

    // Payment verified — execute search
    const body = await req.json().catch(() => ({})) as { query?: string };
    const rawQuery = String(body.query ?? "").replace(/[\r\n]/g, " ").slice(0, 500);
    try {
      requireSafeInput(rawQuery);
    } catch (err) {
      if (isSecurityViolationError(err)) {
        return NextResponse.json(
          { error: "Security violation", detail: String(err) },
          { status: 403 }
        );
      }
      throw err;
    }
    const searchResult = await search(rawQuery || "machine payments Stellar");

    return result.withReceipt(
      NextResponse.json({
        protocol: "mpp",
        tool: "search",
        cost: "$0.01",
        ...searchResult,
      })
    ) as unknown as NextResponse;

  } catch (err) {
    // Fail closed on any unexpected MPP failure.
    return NextResponse.json({ error: "MPP charge failed", detail: String(err) }, { status: 402 });
  }
}
