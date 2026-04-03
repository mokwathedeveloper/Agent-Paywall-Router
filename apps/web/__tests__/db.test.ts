/**
 * Unit Tests: Database Layer (lib/db.ts)
 * Tests the in-memory fallback path (no Supabase required).
 */

// Mock Supabase so all tests run against in-memory store
jest.mock("@/lib/supabase", () => ({
  supabase: null,
  isSupabaseConfigured: false,
}));

import {
  createSession,
  getSession,
  getAllSessions,
  canSpend,
  recordSpend,
  getSpendingSummary,
  addTransaction,
  getTransactions,
  getTransactionById,
} from "@/lib/db";

// ─── Sessions ───────────────────────────────────────────────────────────────

describe("createSession", () => {
  it("creates a session with correct defaults", async () => {
    const session = await createSession(5.0);
    expect(session.id).toMatch(/^sess_/);
    expect(session.spending_limit).toBe(5.0);
    expect(session.used_amount).toBe(0);
    expect(new Date(session.expires_at).getTime()).toBeGreaterThan(Date.now());
  });

  it("creates a session with custom spending limit", async () => {
    const session = await createSession(10.0);
    expect(session.spending_limit).toBe(10.0);
  });

  it("generates unique IDs for each session", async () => {
    const a = await createSession();
    const b = await createSession();
    expect(a.id).not.toBe(b.id);
  });
});

describe("getSession", () => {
  it("returns session by ID", async () => {
    const created = await createSession(3.0);
    const fetched = await getSession(created.id);
    expect(fetched).not.toBeNull();
    expect(fetched!.id).toBe(created.id);
    expect(fetched!.spending_limit).toBe(3.0);
  });

  it("returns null for unknown session ID", async () => {
    const result = await getSession("nonexistent_id");
    expect(result).toBeNull();
  });
});

describe("getAllSessions", () => {
  it("returns all created sessions", async () => {
    const before = (await getAllSessions()).length;
    await createSession();
    await createSession();
    const after = await getAllSessions();
    expect(after.length).toBeGreaterThanOrEqual(before + 2);
  });
});

// ─── Budget Enforcement ──────────────────────────────────────────────────────

describe("canSpend", () => {
  it("returns true when within budget", async () => {
    const session = await createSession(5.0);
    expect(await canSpend(session.id, 0.01)).toBe(true);
  });

  it("returns true for exact budget amount", async () => {
    const session = await createSession(0.01);
    expect(await canSpend(session.id, 0.01)).toBe(true);
  });

  it("returns false when amount exceeds budget", async () => {
    const session = await createSession(0.005);
    expect(await canSpend(session.id, 0.01)).toBe(false);
  });

  it("returns false for unknown session", async () => {
    expect(await canSpend("bad_session", 0.01)).toBe(false);
  });

  it("returns false for expired session", async () => {
    const session = await createSession(5.0);
    // Manually expire the session in memory
    const s = await getSession(session.id);
    if (s) s.expires_at = new Date(Date.now() - 1000).toISOString();
    expect(await canSpend(session.id, 0.01)).toBe(false);
  });

  it("returns false when cumulative spend exceeds limit", async () => {
    const session = await createSession(0.02);
    await recordSpend(session.id, 0.01);
    await recordSpend(session.id, 0.01);
    expect(await canSpend(session.id, 0.01)).toBe(false);
  });
});

describe("recordSpend", () => {
  it("deducts amount from session budget", async () => {
    const session = await createSession(5.0);
    const ok = await recordSpend(session.id, 0.01);
    expect(ok).toBe(true);
    const updated = await getSession(session.id);
    expect(updated!.used_amount).toBe(0.01);
  });

  it("returns false and does not deduct when over budget", async () => {
    const session = await createSession(0.005);
    const ok = await recordSpend(session.id, 0.01);
    expect(ok).toBe(false);
    const unchanged = await getSession(session.id);
    expect(unchanged!.used_amount).toBe(0);
  });

  it("accumulates multiple spends correctly", async () => {
    const session = await createSession(5.0);
    await recordSpend(session.id, 0.01);
    await recordSpend(session.id, 0.02);
    await recordSpend(session.id, 0.03);
    const updated = await getSession(session.id);
    expect(updated!.used_amount).toBeCloseTo(0.06);
  });
});

// ─── Spending Summary ────────────────────────────────────────────────────────

describe("getSpendingSummary", () => {
  it("returns correct summary structure", async () => {
    const session = await createSession(5.0);
    await recordSpend(session.id, 0.01);
    const summary = await getSpendingSummary(session.id);
    expect(summary).not.toBeNull();
    expect(summary!.sessionId).toBe(session.id);
    expect(summary!.limit).toBe(5.0);
    expect(summary!.used).toBeCloseTo(0.01);
    expect(summary!.remaining).toBeCloseTo(4.99);
    expect(summary!.percentage).toBe(0); // rounds to 0 for small amounts
  });

  it("returns null for unknown session", async () => {
    const result = await getSpendingSummary("nonexistent");
    expect(result).toBeNull();
  });

  it("calculates percentage correctly at 50% usage", async () => {
    const session = await createSession(2.0);
    await recordSpend(session.id, 1.0);
    const summary = await getSpendingSummary(session.id);
    expect(summary!.percentage).toBe(50);
  });
});

// ─── Transactions ────────────────────────────────────────────────────────────

describe("addTransaction", () => {
  it("creates a transaction with correct fields", async () => {
    const session = await createSession(5.0);
    const tx = await addTransaction({
      session_id: session.id,
      endpoint: "/api/tools/search",
      tool_name: "search",
      amount: 0.01,
      status: "success",
      tx_hash: "stellar:abc123",
      request_payload: { prompt: "test" },
    });
    expect(tx.id).toBeDefined();
    expect(tx.tool_name).toBe("search");
    expect(tx.amount).toBe(0.01);
    expect(tx.status).toBe("success");
    expect(tx.tx_hash).toBe("stellar:abc123");
    expect(tx.created_at).toBeDefined();
  });
});

describe("getTransactions", () => {
  it("returns all transactions when no sessionId provided", async () => {
    const session = await createSession(5.0);
    await addTransaction({ session_id: session.id, endpoint: "/api/tools/search", tool_name: "search", amount: 0.01, status: "success", tx_hash: null, request_payload: {} });
    const txs = await getTransactions();
    expect(txs.length).toBeGreaterThan(0);
  });

  it("filters transactions by sessionId", async () => {
    const s1 = await createSession(5.0);
    const s2 = await createSession(5.0);
    await addTransaction({ session_id: s1.id, endpoint: "/api/tools/search", tool_name: "search", amount: 0.01, status: "success", tx_hash: null, request_payload: {} });
    await addTransaction({ session_id: s2.id, endpoint: "/api/tools/analyze", tool_name: "analyze", amount: 0.03, status: "success", tx_hash: null, request_payload: {} });

    const s1Txs = await getTransactions(s1.id);
    expect(s1Txs.every((t) => t.session_id === s1.id)).toBe(true);
  });

  it("returns empty array for session with no transactions", async () => {
    const session = await createSession(5.0);
    const txs = await getTransactions(session.id);
    expect(txs).toEqual([]);
  });
});

describe("getTransactionById", () => {
  it("returns transaction by ID", async () => {
    const session = await createSession(5.0);
    const tx = await addTransaction({ session_id: session.id, endpoint: "/api/tools/summarize", tool_name: "summarize", amount: 0.02, status: "success", tx_hash: "stellar:xyz", request_payload: {} });
    const found = await getTransactionById(tx.id);
    expect(found).not.toBeNull();
    expect(found!.id).toBe(tx.id);
  });

  it("returns null for unknown transaction ID", async () => {
    const result = await getTransactionById("nonexistent_tx");
    expect(result).toBeNull();
  });
});
