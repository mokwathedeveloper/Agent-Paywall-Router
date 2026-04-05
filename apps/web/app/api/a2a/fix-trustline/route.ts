import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const { secretKey } = body as { secretKey?: string };

  if (!secretKey || !secretKey.startsWith("S") || secretKey.length !== 56) {
    return NextResponse.json(
      { ok: false, error: { code: "invalid_key", message: "Invalid Stellar secret key format." } },
      { status: 400 }
    );
  }

  try {
    const {
      TransactionBuilder,
      Networks,
      BASE_FEE,
      Operation,
      Asset,
      Keypair,
      Horizon,
    } = await import("@stellar/stellar-sdk");

    const horizon = new Horizon.Server("https://horizon-testnet.stellar.org");
    const sourceKeys = Keypair.fromSecret(secretKey);

    // USDC testnet asset
    const USDC = new Asset("USDC", "GBBD67V63LTZ6ORUC6KXW7ZJJEIKB3766SQRR2NJZSC6ZBCS2MVAUIB9");

    const account = await horizon.loadAccount(sourceKeys.publicKey());

    const tx = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: Networks.TESTNET,
    })
      .addOperation(Operation.changeTrust({ asset: USDC }))
      .setTimeout(30)
      .build();

    tx.sign(sourceKeys);

    const res = await horizon.submitTransaction(tx);
    if (!res.successful) {
      throw new Error("Stellar network rejected the trustline transaction.");
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      {
        ok: false,
        error: { code: "trustline_setup_failed", message: msg || "Trustline setup failed." },
      },
      { status: 500 }
    );
  }
}

