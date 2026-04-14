import { NextRequest, NextResponse } from "next/server";
import { ExternalAgentClient } from "@/lib/agents/external-agent";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { secretKey } = body as { secretKey?: string };

  // Strict Stellar secret key validation: must be S + 55 base32 alphanumeric chars
  if (
    !secretKey ||
    typeof secretKey !== "string" ||
    !/^S[A-Z2-7]{55}$/.test(secretKey)
  ) {
    return NextResponse.json(
      { ok: false, error: { code: "invalid_key", message: "Invalid Stellar secret key format." } },
      { status: 400 }
    );
  }

  // Use only the trusted env var for baseUrl — never trust the Origin header (SSRF guard)
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

  try {
    const client = new ExternalAgentClient(baseUrl, secretKey);

    const tools = await client.discoverTools();
    const result = await client.executeTool("search", { query: "Stellar Hacks 2026" });

    return NextResponse.json({ ok: true, toolsCount: tools.length, result }, { status: 200 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);

    if (msg.toLowerCase().includes("checksum")) {
      return NextResponse.json(
        { ok: false, error: { code: "invalid_key", message: "The provided Stellar key is incorrectly formatted." } },
        { status: 400 }
      );
    }

    if (msg.toLowerCase().includes("trustline")) {
      return NextResponse.json(
        {
          ok: false,
          error: {
            code: "trustline_missing",
            message: "Your account needs a USDC trustline. Would you like to automatically establish it? (Costs 0.5 XLM reserve)",
          },
        },
        { status: 402 }
      );
    }

    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "execution_failed",
          message: msg || "A2A execution failed.",
        },
      },
      { status: 500 }
    );
  }
}

