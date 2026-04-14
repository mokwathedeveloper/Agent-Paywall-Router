/**
 * ExternalAgentClient
 *
 * An autonomous agent that discovers and pays for tools using x402 on Stellar testnet.
 * This is NOT a simulation — every executeTool() call:
 *   1. Hits the real x402 paywall (HTTP 402)
 *   2. Signs a real USDC transaction on Stellar testnet via Ed25519 keypair
 *   3. Submits the transaction to Stellar network
 *   4. Retries the request with the signed x402 receipt
 *   5. Returns the unlocked tool result
 */
import { STELLAR_NETWORK } from "../constants";

export class ExternalAgentClient {
  private baseUrl: string;
  private privateKey: string;

  constructor(baseUrl: string, privateKey: string) {
    this.baseUrl = baseUrl;
    this.privateKey = privateKey;
  }

  /**
   * Discovery Phase — calls GET /api/mcp/tools
   * Returns the list of available paid tools with x402 payment specs.
   */
  async discoverTools() {
    console.log("[Stellar/x402] Discovering tools via MCP — network: stellar:testnet");
    const res = await fetch(`${this.baseUrl}/api/mcp/tools`);
    const data = await res.json();
    console.log(`[Stellar/x402] Discovered ${data.tools?.length ?? 0} tools`);
    return data.tools;
  }

  /**
   * Execution Phase — real x402 payment flow on Stellar testnet.
   *
   * Flow:
   *   GET/POST tool endpoint (no receipt)
   *   → 402 Payment Required + PAYMENT-REQUIRED header
   *   → sign USDC tx via ExactStellarScheme (Ed25519)
   *   → submit to Stellar testnet
   *   → retry with x402-receipt header
   *   → 200 OK + tool result
   */
  async executeTool(toolName: string, args: Record<string, string>) {
    console.log(`[Stellar/x402] Initiating payment for tool: ${toolName} — network: ${STELLAR_NETWORK}`);

    const { wrapFetchWithPayment, x402Client } = await import("@x402/fetch");
    const { ExactStellarScheme, createEd25519Signer } = await import("@x402/stellar");

    const client = new x402Client();
    const signer = createEd25519Signer(this.privateKey, STELLAR_NETWORK);
    client.register("stellar:*", new ExactStellarScheme(signer));
    const fetchWithPayment = wrapFetchWithPayment(fetch, client);

    const targetUrl = toolName === "search"
      ? `${this.baseUrl}/api/tools/search?q=${encodeURIComponent(args.query || args.text || "")}`
      : `${this.baseUrl}/api/tools/${toolName}`;

    console.log(`[Stellar/x402] Requesting ${targetUrl} — will auto-pay on 402`);

    const res = await fetchWithPayment(targetUrl, {
      method: toolName === "search" ? "GET" : "POST",
      headers: { "Content-Type": "application/json" },
      body: toolName === "search" ? undefined : JSON.stringify(args),
    });

    if (!res.ok) {
      // If we got here, wrapFetchWithPayment already tried paying if it was a 402.
      // Any error now is likely a permanent failure (400, 500, etc.) and we should stop.
      const errorBody = await res.json().catch(() => ({}));
      const message = errorBody.detail || errorBody.error || `HTTP ${res.status}`;
      
      console.error(`[Stellar/x402] Tool execution failed permanently: ${message}`);
      throw new Error(`${toolName.charAt(0).toUpperCase() + toolName.slice(1)} provider error: ${message}`);
    }

    const result = await res.json();
    const paymentTxHash = result?.proofs?.paymentTxHash ?? null;
    const policyTxHash = result?.proofs?.policyTxHash ?? null;

    if (paymentTxHash) {
      const hash = String(paymentTxHash).replace("stellar:", "");
      console.log(`[Stellar/x402] Payment confirmed — tx: ${paymentTxHash}`);
      console.log(`[Stellar/x402] Verify: https://stellar.expert/explorer/testnet/tx/${hash}`);
    }
    if (policyTxHash) {
      console.log(`[Stellar/x402] Soroban policy tx: ${policyTxHash}`);
      console.log(`[Stellar/x402] Policy verify: https://stellar.expert/explorer/testnet/tx/${policyTxHash}`);
    }

    return result;
  }
}
