import { NextRequest, NextResponse } from "next/server";
import { SPENDING_POLICY_CONTRACT_ID } from "@/lib/constants";

/**
 * GET /api/health/onchain?address=...
 *
 * Fetches the actual on-chain spend and limit from the Soroban spending policy contract.
 * This provides real-time verification that the programmable guardrails are active.
 */
export async function GET(req: NextRequest) {
  const address = req.nextUrl.searchParams.get("address");

  if (!address) {
    return NextResponse.json({ error: "Missing address" }, { status: 400 });
  }

  try {
    const { rpc, Contract, scValToNative } = await import("@stellar/stellar-sdk");
    // Default to testnet if not specified, and use a generous timeout
    const server = new rpc.Server("https://soroban-testnet.stellar.org", {
      timeout: 15000 // 15 seconds
    });
    const contract = new Contract(SPENDING_POLICY_CONTRACT_ID);

    // More reliable way: simulate a call to get_spent and get_limit
    const { TransactionBuilder, Networks, BASE_FEE, Account } = await import("@stellar/stellar-sdk");
    
    // Mock account for simulation
    const mockSource = "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF";
    const account = new Account(mockSource, "0");
    
    const txSpent = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: Networks.TESTNET })
      .addOperation(contract.call("get_spent", (await import("@stellar/stellar-sdk")).nativeToScVal(address, { type: "address" })))
      .setTimeout(30)
      .build();

    const txLimit = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: Networks.TESTNET })
      .addOperation(contract.call("get_limit"))
      .setTimeout(30)
      .build();

    // Use a Promise.race to ensure we don't hang the request forever if the RPC is slow
    const simulationPromise = Promise.all([
      server.simulateTransaction(txSpent),
      server.simulateTransaction(txLimit)
    ]);

    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error("Soroban RPC timeout (15s)")), 15000)
    );

    const [resSpent, resLimit] = await Promise.race([
      simulationPromise,
      timeoutPromise
    ]) as [Awaited<ReturnType<typeof server.simulateTransaction>>, Awaited<ReturnType<typeof server.simulateTransaction>>];

    let spentStroops = 0;
    let limitStroops = 0;

    if (rpc.Api.isSimulationSuccess(resSpent)) {
      spentStroops = Number(scValToNative(resSpent.result!.retval));
    }
    if (rpc.Api.isSimulationSuccess(resLimit)) {
      limitStroops = Number(scValToNative(resLimit.result!.retval));
    }

    return NextResponse.json({
      address,
      contract: SPENDING_POLICY_CONTRACT_ID,
      onChainSpentUsd: spentStroops / 10_000_000,
      onChainLimitUsd: limitStroops / 10_000_000,
      verified: true,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    console.warn("Soroban verification failed (graceful):", err);
    
    // If it's a timeout or network error, return a 200 with verified: false
    // so the frontend doesn't show a 500 error but a "verification pending/unknown" state
    return NextResponse.json({ 
      address,
      verified: false,
      warning: "On-chain verification currently unavailable (Soroban RPC Timeout)",
      onChainSpentUsd: 0,
      onChainLimitUsd: 0,
      timestamp: new Date().toISOString()
    }, { status: 200 });
  }
}
