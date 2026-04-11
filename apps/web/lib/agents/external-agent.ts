/**
 * ExternalAgentClient
 * 
 * Simulates an external AI agent that discovers and pays for tools
 * using the MCP protocol and x402 on Stellar.
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
   * 1. Discovery Phase
   */
  async discoverTools() {
    console.log("[ExternalAgent] Discovering tools via MCP...");
    const res = await fetch(`${this.baseUrl}/api/mcp/tools`);
    const data = await res.json();
    return data.tools;
  }

  /**
   * 2. Execution Phase (with x402 payment flow)
   */
  async executeTool(toolName: string, args: Record<string, string>) {
    console.log(`[ExternalAgent] Requesting execution for ${toolName}...`);

    const { wrapFetchWithPayment, x402Client } = await import("@x402/fetch");
    const { ExactStellarScheme, createEd25519Signer } = await import("@x402/stellar");

    const client = new x402Client();
    const signer = createEd25519Signer(this.privateKey, STELLAR_NETWORK);
    client.register("stellar:*", new ExactStellarScheme(signer));
    const fetchWithPayment = wrapFetchWithPayment(fetch, client);

    const targetUrl = toolName === "search"
      ? `${this.baseUrl}/api/tools/search?q=${encodeURIComponent(args.query || args.text || "")}`
      : `${this.baseUrl}/api/tools/${toolName}`;

    const res = await fetchWithPayment(targetUrl, {
      method: toolName === "search" ? "GET" : "POST",
      headers: { "Content-Type": "application/json" },
      body: toolName === "search" ? undefined : JSON.stringify(args)
    });

    if (!res.ok) {
      throw new Error(`Tool execution failed with status ${res.status}`);
    }

    return await res.json();
  }

  // payForTool is no longer needed as fetchWithPayment handles it

}
