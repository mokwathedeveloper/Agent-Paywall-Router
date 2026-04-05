import { SPENDING_POLICY_CONTRACT_ID, TOOL_PRICES_TOKEN_UNITS } from "@/lib/constants";
import type { ToolName } from "@/lib/types";

function looksLikeStellarAddress(value: string): boolean {
  // Stellar public keys are typically 56 chars base32 starting with `G` or `M` etc.
  // For this demo we expect `G...` keys.
  return /^[GM][a-zA-Z0-9]{55}$/.test(value);
}

function findByPreferredKeys(obj: unknown, depth = 0): string | null {
  if (depth > 6) return null;
  if (!obj) return null;

  const payerKeys = new Set([
    "from",
    "payer",
    "sourceaccount",
    "source",
    "sender",
    "account",
    "client",
    "initiator",
  ]);

  if (typeof obj === "string") return null;

  if (Array.isArray(obj)) {
    for (const item of obj) {
      const found = findByPreferredKeys(item, depth + 1);
      if (found) return found;
    }
    return null;
  }

  if (typeof obj === "object") {
    const o = obj as Record<string, unknown>;
    for (const [k, v] of Object.entries(o)) {
      const keyLower = k.toLowerCase();
      if (payerKeys.has(keyLower) && typeof v === "string" && looksLikeStellarAddress(v)) {
        return v;
      }

      const found = findByPreferredKeys(v, depth + 1);
      if (found) return found;
    }
  }

  return null;
}

function findAnyStellarAddress(obj: unknown, depth = 0): string | null {
  if (depth > 8) return null;
  if (!obj) return null;
  if (typeof obj === "string") return looksLikeStellarAddress(obj) ? obj : null;

  if (Array.isArray(obj)) {
    for (const item of obj) {
      const found = findAnyStellarAddress(item, depth + 1);
      if (found) return found;
    }
    return null;
  }

  if (typeof obj === "object") {
    for (const v of Object.values(obj as Record<string, unknown>)) {
      const found = findAnyStellarAddress(v, depth + 1);
      if (found) return found;
    }
  }

  return null;
}

export function extractPayerAddressFromPaymentPayload(paymentPayload: any): string {
  const preferred = findByPreferredKeys(paymentPayload);
  const fallback = preferred ?? findAnyStellarAddress(paymentPayload);
  if (!fallback) {
    throw new Error("Unable to extract payer address from x402 payment payload.");
  }
  return fallback;
}

export async function authorizeSpendingPolicyForPayer(toolName: ToolName, payerAddress: string) {
  if (!process.env.STELLAR_PRIVATE_KEY) {
    throw new Error("Missing STELLAR_PRIVATE_KEY for SpendingPolicy authorization.");
  }

  const amountTokenUnits = TOOL_PRICES_TOKEN_UNITS[toolName];

  const {
    Keypair,
    Contract,
    TransactionBuilder,
    Horizon,
    rpc,
    Networks,
    BASE_FEE,
    nativeToScVal,
  } = await import("@stellar/stellar-sdk");

  const adminKeypair = Keypair.fromSecret(process.env.STELLAR_PRIVATE_KEY);
  const adminAddress = adminKeypair.publicKey();

  const horizon = new Horizon.Server("https://horizon-testnet.stellar.org");
  const account = await horizon.loadAccount(adminAddress);

  const contract = new Contract(SPENDING_POLICY_CONTRACT_ID);

  // Contract now requires admin auth, but we still pass `payerAddress` to attribute spend per-agent.
  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(
      contract.call(
        "authorize",
        nativeToScVal(payerAddress, { type: "address" }),
        nativeToScVal(amountTokenUnits, { type: "i128" })
      )
    )
    .setTimeout(30)
    .build();

  tx.sign(adminKeypair);
  // Preflight simulation so we can surface the on-chain panic reason (fail-closed).
  const rpcServer = new rpc.Server("https://soroban-testnet.stellar.org", { timeout: 15000 });
  const sim = await rpcServer.simulateTransaction(tx);
  if (!rpc.Api.isSimulationSuccess(sim)) {
    const details =
      (sim as any)?.result?.error?.message ||
      (sim as any)?.result?.error ||
      JSON.stringify((sim as any)?.result ?? sim);
    throw new Error(`SpendingPolicy.authorize() simulation failed: ${details}`);
  }

  const res = await horizon.submitTransaction(tx);
  if (!res.successful) {
    const details =
      (res as any)?.resultXdr ||
      (res as any)?.resultMeta ||
      JSON.stringify(res);
    throw new Error(`SpendingPolicy.authorize() transaction failed: ${details}`);
  }

  return {
    policyTxHash: res.hash,
    policyAgent: payerAddress,
  };
}

export async function decodeX402PaymentTxHashFromHeaders(headers: Record<string, string>) {
  const paymentResponse =
    headers["PAYMENT-RESPONSE"] ?? headers["X-PAYMENT-RESPONSE"] ?? headers["payment-response"];
  if (!paymentResponse) return null;

  const { decodePaymentResponseHeader } = await import("@x402/fetch");
  const decoded = decodePaymentResponseHeader(paymentResponse);
  const txHash = decoded.transaction;
  return txHash ? `stellar:${txHash}` : null;
}

