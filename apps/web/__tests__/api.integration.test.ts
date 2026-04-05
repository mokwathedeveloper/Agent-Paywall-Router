/**
 * Integration Tests: API Routes
 * Hits the live Next.js dev server at localhost:3000.
 * Run: npm test -- --testPathPattern=api.integration
 *
 * Requires the dev server to be running: npm run dev
 */

const BASE = "http://localhost:3000";
const canPay = Boolean(process.env.STELLAR_PRIVATE_KEY && process.env.STELLAR_RECEIVER_ADDRESS);
const hasReceiver = Boolean(process.env.STELLAR_RECEIVER_ADDRESS);

async function fetchWithX402(url: string, init?: RequestInit) {
  const { wrapFetchWithPayment, x402Client } = await import("@x402/fetch");
  const { ExactStellarScheme, createEd25519Signer } = await import("@x402/stellar");
  const { STELLAR_NETWORK } = await import("@/lib/constants");

  const client = new x402Client();
  const signer = createEd25519Signer(process.env.STELLAR_PRIVATE_KEY as string, STELLAR_NETWORK);
  client.register("stellar:*", new ExactStellarScheme(signer));

  const fetchWithPayment = wrapFetchWithPayment(fetch, client);
  return fetchWithPayment(url, init);
}

// ─── Catalog ─────────────────────────────────────────────────────────────────

describe("GET /api/catalog", () => {
  it("returns machine-readable service catalog", async () => {
    const res = await fetch(`${BASE}/api/catalog`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.name).toBe("Agent Paywall Router");
    expect(body.protocols).toContain("x402");
    expect(body.protocols).toContain("mpp");
  });

  it("catalog includes all tools with payment specs", async () => {
    const res = await fetch(`${BASE}/api/catalog`);
    const body = await res.json();
    const ids = body.tools.map((t: { id: string }) => t.id);
    expect(ids).toContain("search");
    expect(ids).toContain("summarize");
    expect(ids).toContain("analyze");
    expect(ids).toContain("mpp-search");
    body.tools.filter((t: { id: string }) => t.id !== "mpp-search").forEach((t: Record<string, unknown>) => {
      expect(t.payment).toBeDefined();
      expect(t.priceUsd).toBeDefined();
    });
  });

  it("catalog includes Soroban spending policy", async () => {
    const res = await fetch(`${BASE}/api/catalog`);
    const body = await res.json();
    expect(body.spendingPolicy.contract).toMatch(/^C/);
    expect(body.spendingPolicy.limitUsd).toBe(5);
  });

  it("catalog includes on-chain proof transactions", async () => {
    const res = await fetch(`${BASE}/api/catalog`);
    const body = await res.json();
    expect(body.onChainProof.sampleTransactions.length).toBeGreaterThan(0);
    body.onChainProof.sampleTransactions.forEach((tx: { hash: string; memo: string }) => {
      expect(tx.hash).toHaveLength(64);
      expect(tx.memo).toMatch(/^x402:/);
    });
  });

  it("catalog has CORS header for external agents", async () => {
    const res = await fetch(`${BASE}/api/catalog`);
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });
});

// ─── Health ──────────────────────────────────────────────────────────────────

describe("GET /api/health", () => {
  it("returns 200 with healthy status", async () => {
    const res = await fetch(`${BASE}/api/health`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("healthy");
    expect(body.service).toBe("agent-paywall-router");
    expect(body.network).toBe("stellar:testnet");
    expect(["supabase", "in-memory"]).toContain(body.database);
    expect(body.sorobanContract).toBeDefined();
    expect(body.sorobanContract).toMatch(/^C/);
    expect(body.contractExplorer).toContain("stellar.expert");
  });
});

// ─── Tools List ──────────────────────────────────────────────────────────────

describe("GET /api/tools", () => {
  it("returns at least 3 registered tools including search, summarize, analyze", async () => {
    const res = await fetch(`${BASE}/api/tools`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.tools.length).toBeGreaterThanOrEqual(3);
    const names = body.tools.map((t: { name: string }) => t.name);
    expect(names).toContain("search");
    expect(names).toContain("summarize");
    expect(names).toContain("analyze");
  });

  it("each tool has name, endpoint, price_usd", async () => {
    const res = await fetch(`${BASE}/api/tools`);
    const body = await res.json();
    body.tools.forEach((t: Record<string, unknown>) => {
      expect(t.name).toBeDefined();
      expect(t.endpoint).toBeDefined();
      expect(t.price_usd).toBeDefined();
    });
  });

  it("catalog includes Soroban contract ID", async () => {
    const res = await fetch(`${BASE}/api/tools`);
    const body = await res.json();
    expect(body.spendingPolicyContract).toBeDefined();
    expect(body.spendingPolicyContract).toMatch(/^C/);
  });

  it("catalog includes MPP tool", async () => {
    const res = await fetch(`${BASE}/api/tools`);
    const body = await res.json();
    const names = body.tools.map((t: { name: string }) => t.name);
    expect(names).toContain("mpp-search");
  });
});

// ─── Sessions ────────────────────────────────────────────────────────────────

describe("POST /api/sessions", () => {
  it("creates a session with default limit", async () => {
    const res = await fetch(`${BASE}/api/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.id).toMatch(/^sess_/);
    expect(body.spending_limit).toBe(5);
    expect(body.used_amount).toBe(0);
  });

  it("creates a session with custom spending limit", async () => {
    const res = await fetch(`${BASE}/api/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ spendingLimit: 10.0 }),
    });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.spending_limit).toBe(10);
  });
});

describe("GET /api/sessions", () => {
  it("returns sessions list", async () => {
    const res = await fetch(`${BASE}/api/sessions`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body)).toBe(true);
  });

  it("returns 404 for unknown session ID", async () => {
    const res = await fetch(`${BASE}/api/sessions?id=nonexistent_id`);
    expect(res.status).toBe(404);
  });
});

// ─── Tool Endpoints — 402 Paywall ────────────────────────────────────────────

describe("GET /api/tools/search — paywall", () => {
  it("returns 402 when no payment header provided", async () => {
    if (!hasReceiver) return;
    const res = await fetch(`${BASE}/api/tools/search?q=test`);
    expect(res.status).toBe(402);
    const body = await res.json();
    expect(body.error).toBe("Payment Required");
  });

  it("402 response includes PAYMENT-REQUIRED header", async () => {
    if (!hasReceiver) return;
    const res = await fetch(`${BASE}/api/tools/search?q=test`);
    expect(res.headers.get("PAYMENT-REQUIRED")).not.toBeNull();
  });

  it("PAYMENT-REQUIRED header is valid base64 JSON", async () => {
    if (!hasReceiver) return;
    const res = await fetch(`${BASE}/api/tools/search?q=test`);
    const header = res.headers.get("PAYMENT-REQUIRED")!;
    const decoded = JSON.parse(Buffer.from(header, "base64").toString());
    expect(decoded.x402Version).toBe(2);
    expect(decoded.accepts).toHaveLength(1);
    expect(decoded.accepts[0].scheme).toBe("exact");
    expect(decoded.accepts[0].network).toBe("stellar:testnet");
    expect(decoded.accepts[0].amount).toBe("100000");
  });

  it("returns 200 with results when x402-receipt header provided", async () => {
    if (!canPay) return;

    const res = await fetchWithX402(`${BASE}/api/tools/search?q=AI+trends`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.tool).toBe("search");
    expect(body.results).toBeDefined();
    expect(Array.isArray(body.results)).toBe(true);
  });
});

describe("POST /api/tools/summarize — paywall", () => {
  it("returns 402 without payment header", async () => {
    if (!hasReceiver) return;
    const res = await fetch(`${BASE}/api/tools/summarize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "test" }),
    });
    expect(res.status).toBe(402);
  });

  it("PAYMENT-REQUIRED header has correct amount (200000)", async () => {
    if (!hasReceiver) return;
    const res = await fetch(`${BASE}/api/tools/summarize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "test" }),
    });
    const header = res.headers.get("PAYMENT-REQUIRED")!;
    const decoded = JSON.parse(Buffer.from(header, "base64").toString());
    expect(decoded.accepts[0].amount).toBe("200000");
  });

  it("returns 200 with summary when payment header provided", async () => {
    if (!canPay) return;

    const res = await fetchWithX402(`${BASE}/api/tools/summarize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "AI agents use x402 to pay for data access on Stellar." }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.tool).toBe("summarize");
    expect(body.summary).toBeDefined();
    expect(body.keyPoints).toBeDefined();
  });
});

describe("POST /api/tools/analyze — paywall", () => {
  it("returns 402 without payment header", async () => {
    if (!hasReceiver) return;
    const res = await fetch(`${BASE}/api/tools/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "test" }),
    });
    expect(res.status).toBe(402);
  });

  it("PAYMENT-REQUIRED header has correct amount (300000)", async () => {
    if (!hasReceiver) return;
    const res = await fetch(`${BASE}/api/tools/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "test" }),
    });
    const header = res.headers.get("PAYMENT-REQUIRED")!;
    const decoded = JSON.parse(Buffer.from(header, "base64").toString());
    expect(decoded.accepts[0].amount).toBe("300000");
  });

  it("returns 200 with analysis when payment header provided", async () => {
    if (!canPay) return;

    const res = await fetchWithX402(`${BASE}/api/tools/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "Stellar enables efficient micropayments for AI agents." }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.tool).toBe("analyze");
    expect(body.sentiment).toBeDefined();
    expect(body.entities).toBeDefined();
    expect(body.themes).toBeDefined();
  });
});

// ─── Agent Orchestration ─────────────────────────────────────────────────────

describe("POST /api/agent", () => {
  it("returns 400 when prompt is missing", async () => {
    const res = await fetch(`${BASE}/api/agent`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Missing 'prompt'");
  });

  it("routes search prompt to search tool", async () => {
    const res = await fetch(`${BASE}/api/agent`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "search for AI trends" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.tool).toBe("search");
  });

  it("routes summarize prompt to summarize tool", async () => {
    const res = await fetch(`${BASE}/api/agent`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "summarize this article about payments" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.tool).toBe("summarize");
  });

  it("routes analyze prompt to analyze tool", async () => {
    const res = await fetch(`${BASE}/api/agent`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "analyze sentiment of this text" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.tool).toBe("analyze");
  });

  it("returns full response shape on success", async () => {
    const res = await fetch(`${BASE}/api/agent`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "find latest blockchain news" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("sessionId");
    expect(body).toHaveProperty("tool");
    expect(body).toHaveProperty("cost");
    expect(body).toHaveProperty("txHash");
    expect(body).toHaveProperty("result");
    expect(body).toHaveProperty("steps");
    expect(body).toHaveProperty("summary");
    expect(Array.isArray(body.steps)).toBe(true);
    expect(body.steps.length).toBeGreaterThan(0);
  });

  it("txHash starts with stellar:", async () => {
    const res = await fetch(`${BASE}/api/agent`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "search for micropayments" }),
    });
    const body = await res.json();
    expect(body.txHash).toMatch(/^stellar:/);
  });

  it("cost matches tool price", async () => {
    const res = await fetch(`${BASE}/api/agent`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "search for something" }),
    });
    const body = await res.json();
    expect(body.cost).toBe(0.01); // search = $0.01
  });

  it("reuses existing valid sessionId", async () => {
    const sessionRes = await fetch(`${BASE}/api/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    const session = await sessionRes.json();

    const agentRes = await fetch(`${BASE}/api/agent`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "search test", sessionId: session.id }),
    });
    const body = await agentRes.json();
    expect(body.sessionId).toBe(session.id);
  });

  it("returns 402 when session budget is exhausted", async () => {
    // Create a session with $0.005 — below any tool price
    const sessionRes = await fetch(`${BASE}/api/sessions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ spendingLimit: 0.005 }),
    });
    const session = await sessionRes.json();

    const res = await fetch(`${BASE}/api/agent`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "search for AI", sessionId: session.id }),
    });
    expect(res.status).toBe(402);
    const body = await res.json();
    expect(body.error).toBe("Budget exceeded");
  });

  it("steps array contains required step actions", async () => {
    const res = await fetch(`${BASE}/api/agent`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "search for Stellar" }),
    });
    const body = await res.json();
    const actions = body.steps.map((s: { action: string }) => s.action);
    expect(actions.some((a: string) => a.includes("Analyzing"))).toBe(true);
    expect(actions.some((a: string) => a.includes("Budget"))).toBe(true);
    expect(actions.some((a: string) => a.includes("Soroban") || a.includes("auth") || a.includes("Budget"))).toBe(true);
    expect(actions.some((a: string) => a.includes("Done"))).toBe(true);
  });
});

// ─── Transactions ────────────────────────────────────────────────────────────

describe("GET /api/transactions", () => {
  it("returns transactions list with total and totalSpent", async () => {
    const res = await fetch(`${BASE}/api/transactions`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty("transactions");
    expect(body).toHaveProperty("total");
    expect(body).toHaveProperty("totalSpent");
    expect(Array.isArray(body.transactions)).toBe(true);
    expect(typeof body.total).toBe("number");
    expect(typeof body.totalSpent).toBe("number");
  });

  it("totalSpent only counts successful transactions", async () => {
    const res = await fetch(`${BASE}/api/transactions`);
    const body = await res.json();
    const manualTotal = body.transactions
      .filter((t: { status: string; amount: number }) => t.status === "success")
      .reduce((sum: number, t: { amount: number }) => sum + t.amount, 0);
    expect(body.totalSpent).toBeCloseTo(manualTotal, 5);
  });

  it("filters by sessionId when provided", async () => {
    // Run an agent task to create a known session
    const agentRes = await fetch(`${BASE}/api/agent`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: "search for filter test" }),
    });
    const agent = await agentRes.json();

    const res = await fetch(`${BASE}/api/transactions?sessionId=${agent.sessionId}`);
    const body = await res.json();
    expect(body.transactions.every((t: { session_id: string }) => t.session_id === agent.sessionId)).toBe(true);
  });
});
