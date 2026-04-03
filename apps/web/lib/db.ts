/**
 * Database abstraction layer.
 * Uses Supabase when configured, falls back to in-memory for local dev.
 */
import { supabase, isSupabaseConfigured, type DBSession, type DBTransaction } from "./supabase";
import { DEFAULT_SPENDING_LIMIT, SESSION_TTL_MS } from "./constants";

// ─── In-memory fallback ───
const memSessions = new Map<string, DBSession>();
const memTransactions: DBTransaction[] = [];
const sessionLocks = new Map<string, Promise<void>>();

function genId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

// ─── Sessions ───

export async function createSession(limit: number = DEFAULT_SPENDING_LIMIT): Promise<DBSession> {
  const session: DBSession = {
    id: genId("sess"),
    spending_limit: limit,
    used_amount: 0,
    expires_at: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
    created_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from("sessions").insert(session);
    if (error) console.error("Supabase insert session error:", error.message);
  }

  memSessions.set(session.id, session);
  return session;
}

export async function getSession(id: string): Promise<DBSession | null> {
  if (isSupabaseConfigured && supabase) {
    const { data } = await supabase.from("sessions").select("*").eq("id", id).single();
    if (data) return data as DBSession;
  }
  return memSessions.get(id) || null;
}

export async function getAllSessions(): Promise<DBSession[]> {
  if (isSupabaseConfigured && supabase) {
    const { data } = await supabase.from("sessions").select("*").order("created_at", { ascending: false });
    if (data) return data as DBSession[];
  }
  return Array.from(memSessions.values());
}

export async function canSpend(sessionId: string, amount: number): Promise<boolean> {
  const session = await getSession(sessionId);
  if (!session) return false;
  if (new Date(session.expires_at) < new Date()) return false;
  return session.used_amount + amount <= session.spending_limit;
}

async function withSessionLock<T>(sessionId: string, fn: () => Promise<T>): Promise<T> {
  const prev = sessionLocks.get(sessionId) ?? Promise.resolve();

  let release!: () => void;
  const next = new Promise<void>((res) => {
    release = res;
  });

  const newLock = prev.then(() => next);
  sessionLocks.set(sessionId, newLock);
  await prev;

  try {
    return await fn();
  } finally {
    release();
    if (sessionLocks.get(sessionId) === newLock) {
      sessionLocks.delete(sessionId);
    }
  }
}

export async function recordSpend(sessionId: string, amount: number): Promise<boolean> {
  // Atomic "consume budget" - fail closed if insufficient budget.
  const now = new Date();

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.rpc("increment_spend", {
      session_id: sessionId,
      spend_amount: amount,
    });

    if (typeof data === "boolean" && data) return true;
    if (!error) return false;

    // Fallback (for older DBs without the RPC): optimistic compare-and-set.
    const session = await getSession(sessionId);
    if (!session) return false;
    if (new Date(session.expires_at) < now) return false;
    if (session.used_amount + amount > session.spending_limit) return false;

    const oldUsed = session.used_amount;
    const newUsed = oldUsed + amount;
    const { error: updateErr } = await supabase
      .from("sessions")
      .update({ used_amount: newUsed })
      .eq("id", sessionId)
      .eq("used_amount", oldUsed);

    if (updateErr) throw updateErr;
    return true;
  }

  return await withSessionLock(sessionId, async () => {
    const mem = memSessions.get(sessionId);
    if (!mem) return false;
    if (new Date(mem.expires_at) < now) return false;
    if (mem.used_amount + amount > mem.spending_limit) return false;

    mem.used_amount += amount;
    return true;
  });

}

export async function getSpendingSummary(sessionId: string) {
  const session = await getSession(sessionId);
  if (!session) return null;

  const txs = await getTransactions(sessionId);
  const successTxs = txs.filter((t) => t.status === "success");

  return {
    sessionId,
    limit: session.spending_limit,
    used: session.used_amount,
    remaining: session.spending_limit - session.used_amount,
    percentage: Math.round((session.used_amount / session.spending_limit) * 100),
    transactionCount: successTxs.length,
    expiresAt: session.expires_at,
  };
}

// ─── Transactions ───

export async function addTransaction(
  tx: Omit<DBTransaction, "id" | "created_at">
): Promise<DBTransaction> {
  const transaction: DBTransaction = {
    ...tx,
    id: genId("tx"),
    created_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured && supabase) {
    // Omit id — Supabase generates UUID automatically; use returned id
    const { data, error } = await supabase
      .from("transactions")
      .insert({ ...tx })
      .select("id")
      .single();
    if (error) console.error("Supabase insert tx error:", error.message);
    else if (data) transaction.id = data.id;
  }

  memTransactions.push(transaction);
  return transaction;
}

export async function getTransactions(sessionId?: string): Promise<DBTransaction[]> {
  if (isSupabaseConfigured && supabase) {
    let query = supabase.from("transactions").select("*").order("created_at", { ascending: false });
    if (sessionId) query = query.eq("session_id", sessionId);
    const { data } = await query;
    if (data) return data as DBTransaction[];
  }

  if (sessionId) return memTransactions.filter((t) => t.session_id === sessionId);
  return [...memTransactions];
}

export async function getTransactionById(id: string): Promise<DBTransaction | null> {
  if (isSupabaseConfigured && supabase) {
    const { data } = await supabase.from("transactions").select("*").eq("id", id).single();
    if (data) return data as DBTransaction;
  }
  return memTransactions.find((t) => t.id === id) || null;
}

// ─── Seed demo data ───

let seeded = false;
export async function seedDemoData() {
  if (seeded) return;
  seeded = true;

  const session = await createSession(5.0);

  const demos = [
    { tool: "search", endpoint: "/api/tools/search", amount: 0.01 },
    { tool: "summarize", endpoint: "/api/tools/summarize", amount: 0.02 },
    { tool: "search", endpoint: "/api/tools/search", amount: 0.01 },
    { tool: "analyze", endpoint: "/api/tools/analyze", amount: 0.03 },
  ];

  for (const d of demos) {
    await addTransaction({
      session_id: session.id,
      endpoint: d.endpoint,
      tool_name: d.tool,
      amount: d.amount,
      status: "success",
      tx_hash: `stellar:${Array.from({ length: 64 }, () => "0123456789abcdef"[Math.floor(Math.random() * 16)]).join("")}`,
      request_payload: { tool: d.tool, demo: true },
    });
  }
}
