import { SPENDING_POLICY_CONTRACT_ID, TOOL_PRICES_TOKEN_UNITS } from "@/lib/constants";
import type { ToolName } from "@/lib/types";

function looksLikeStellarAddress(value: string): boolean {
  return typeof value === "string" && /^[GM][a-zA-Z0-9]{55}$/.test(value);
}

function findByPreferredKeys(obj: unknown, depth = 0): string | null {
  if (depth > 6 || !obj) return null;
  const payerKeys = new Set(["from", "payer", "sourceaccount", "source", "sender", "account", "client", "initiator"]);
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
      if (payerKeys.has(k.toLowerCase()) && typeof v === "string" && looksLikeStellarAddress(v)) return v;
      const found = findByPreferredKeys(v, depth + 1);
      if (found) return found;
    }
  }
  return null;
}

function findAnyStellarAddress(obj: unknown, depth = 0): string | null {
  if (depth > 8 || !obj) return null;
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

export function extractPayerAddressFromPaymentPayload(paymentPayload: unknown): string | null {
  if (!paymentPayload) return null;
  const preferred = findByPreferredKeys(paymentPayload);
  if (preferred) return preferred;
  return findAnyStellarAddress(paymentPayload);
}

export async function authorizeSpendingPolicyForPayer(toolName: ToolName, payerAddress: string) {
  if (!process.env.STELLAR_PRIVATE_KEY) throw new Error("Missing STELLAR_PRIVATE_KEY.");
  if (!payerAddress) throw new Error("Payer address is required.");

  const amountTokenUnits = TOOL_PRICES_TOKEN_UNITS[toolName];
  const { Keypair, Contract, TransactionBuilder, Horizon, rpc, Networks, BASE_FEE, nativeToScVal } = await import("@stellar/stellar-sdk");

  const adminKeypair = Keypair.fromSecret(process.env.STELLAR_PRIVATE_KEY);
  const adminAddress = adminKeypair.publicKey();
  const horizon = new Horizon.Server("https://horizon-testnet.stellar.org");
  
  const account = await horizon.loadAccount(adminAddress);
  const contract = new Contract(SPENDING_POLICY_CONTRACT_ID);
  const unsignedTx = new TransactionBuilder(account, { fee: BASE_FEE, networkPassphrase: Networks.TESTNET })
    .addOperation(contract.call("authorize", nativeToScVal(payerAddress, { type: "address" }), nativeToScVal(BigInt(amountTokenUnits), { type: "i128" })))
    .setTimeout(30)
    .build();

  const rpcServer = new rpc.Server("https://soroban-testnet.stellar.org", { timeout: 20000 });
  const sim = await rpcServer.simulateTransaction(unsignedTx);

  if (!sim || !rpc.Api.isSimulationSuccess(sim)) {
    throw new Error(`SpendingPolicy.authorize() simulation failed.`);
  }

  const assembledTx = (rpc.assembleTransaction(unsignedTx, sim) as any).build();
  assembledTx.sign(adminKeypair);

  const res = await horizon.submitTransaction(assembledTx);
  if (!res.successful) throw new Error(`SpendingPolicy.authorize() transaction failed.`);

  return { policyTxHash: res.hash, policyAgent: payerAddress };
}

export async function authorizeSplitSpendingPolicy(
  toolName: ToolName,
  payerAddress: string | null,
  providerAddress: string,
  _providerPercentage: number
) {
  if (!process.env.STELLAR_PRIVATE_KEY) throw new Error("Missing STELLAR_PRIVATE_KEY.");

  const finalPayer = payerAddress || process.env.STELLAR_RECEIVER_ADDRESS || "";
  const finalProvider = providerAddress || process.env.STELLAR_RECEIVER_ADDRESS || "";

  if (!looksLikeStellarAddress(finalPayer) || !looksLikeStellarAddress(finalProvider)) {
    return authorizeSpendingPolicyForPayer(toolName, finalPayer || finalProvider);
  }

  // Always fall back directly to authorize() — record_split_payment is not in the deployed contract.
  // This avoids consuming the account sequence number on a doomed simulation attempt.
  return authorizeSpendingPolicyForPayer(toolName, finalPayer);
}

export async function decodeX402PaymentTxHashFromHeaders(headers: Record<string, string>) {
  const paymentResponse = headers["PAYMENT-RESPONSE"] ?? headers["X-PAYMENT-RESPONSE"] ?? headers["payment-response"];
  if (!paymentResponse) return null;
  const { decodePaymentResponseHeader } = await import("@x402/fetch");
  const decoded = decodePaymentResponseHeader(paymentResponse);
  return decoded.transaction ? `stellar:${decoded.transaction}` : null;
}
