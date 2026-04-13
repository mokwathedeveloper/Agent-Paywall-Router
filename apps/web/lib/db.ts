/**
 * Database abstraction layer.
 * Uses Supabase when configured, falls back to in-memory for local dev.
 */
import { supabase, isSupabaseConfigured, type DBSession, type DBTransaction, type DBService } from "./supabase";
import { DEFAULT_SPENDING_LIMIT, SESSION_TTL_MS, TOOL_PRICES, SPENDING_POLICY_CONTRACT_ID } from "./constants";

// ─── In-memory fallback ───
// WARNING: In-memory storage resets on every server restart.
// Set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY for persistent storage.
if (!isSupabaseConfigured && process.env.NODE_ENV === "production") {
  console.warn(
    "[db] WARNING: Running in-memory storage in production. " +
    "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY for persistent data."
  );
}
const memSessions = new Map<string, DBSession>();
const memTransactions: DBTransaction[] = [];
const memServices = new Map<string, DBService>();
const sessionLocks = new Map<string, Promise<void>>();

function genId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

// ─── Services ───

const DEFAULT_SERVICES: DBService[] = [
  {
    id: "search",
    name: "Web Search",
    description: "Real-time web search via DuckDuckGo + Wikipedia. Use for unknown facts, news, current events.",
    price_usd: TOOL_PRICES.search,
    protocol: "x402",
    endpoint: "/api/tools/search",
    method: "GET",
    input_param: "q",
    stellar_network: "stellar:testnet",
    spending_policy_contract: SPENDING_POLICY_CONTRACT_ID,
    is_external: false,
    rating: 4.8,
    rating_count: 120,
    provider_split_percentage: 0.7,
  },
  {
    id: "summarize",
    name: "Text Summarizer",
    description: "Extracts key points and summary from long text. Use only after retrieving content that needs condensing.",
    price_usd: TOOL_PRICES.summarize,
    protocol: "x402",
    endpoint: "/api/tools/summarize",
    method: "POST",
    input_param: "text",
    stellar_network: "stellar:testnet",
    spending_policy_contract: SPENDING_POLICY_CONTRACT_ID,
    is_external: false,
    rating: 4.5,
    rating_count: 85,
    provider_split_percentage: 0.7,
  },
  {
    id: "analyze",
    name: "Sentiment Analyzer",
    description: "Sentiment analysis, entity extraction, theme detection. Use for deeper insight on retrieved content.",
    price_usd: TOOL_PRICES.analyze,
    protocol: "x402",
    endpoint: "/api/tools/analyze",
    method: "POST",
    input_param: "text",
    stellar_network: "stellar:testnet",
    spending_policy_contract: SPENDING_POLICY_CONTRACT_ID,
    is_external: false,
    rating: 4.2,
    rating_count: 50,
    provider_split_percentage: 0.7,
  },
  {
    id: "weather",
    name: "Global Weather API",
    description: "Real-time global weather data including temperature, conditions, and forecasts.",
    price_usd: 0.05,
    protocol: "x402",
    endpoint: "/api/tools/weather",
    method: "GET",
    input_param: "location",
    stellar_network: "stellar:testnet",
    spending_policy_contract: SPENDING_POLICY_CONTRACT_ID,
    is_external: false,
    rating: 5.0,
    rating_count: 10,
    provider_split_percentage: 0.8, // Configurable split: 80% to provider
  },
];

// Initialize default services
DEFAULT_SERVICES.forEach(s => memServices.set(s.id, s));

export async function getAllServices(): Promise<DBService[]> {
  if (isSupabaseConfigured && supabase) {
    const { data } = await supabase.from("services").select("*").order("price_usd", { ascending: true });
    if (data && data.length > 0) return data as DBService[];
  }
  return Array.from(memServices.values()).sort((a, b) => a.price_usd - b.price_usd);
}

export async function addService(service: Omit<DBService, "id" | "created_at" | "rating" | "rating_count">): Promise<DBService> {
  const id = genId("svc");
  const newService: DBService = { 
    ...service, 
    id, 
    rating: 0, 
    rating_count: 0, 
    created_at: new Date().toISOString() 
  };

  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from("services").insert(newService);
    if (error) console.error("[db] Supabase insert service error:", error.message);
  }

  memServices.set(id, newService);
  return newService;
}

export async function rateService(id: string, newRating: number): Promise<DBService | null> {
  if (newRating < 1 || newRating > 5) return null;

  if (isSupabaseConfigured && supabase) {
    // In a real app, we'd use an RPC for atomic updates or a separate ratings table
    const { data: service } = await supabase.from("services").select("*").eq("id", id).single();
    if (!service) return null;

    const totalScore = (service.rating * service.rating_count) + newRating;
    const newCount = service.rating_count + 1;
    const updatedRating = totalScore / newCount;

    const { data, error } = await supabase
      .from("services")
      .update({ rating: updatedRating, rating_count: newCount })
      .eq("id", id)
      .select()
      .single();
    
    if (!error && data) {
      memServices.set(id, data as DBService);
      return data as DBService;
    }
  }

  // In-memory update
  const service = memServices.get(id);
  if (!service) return null;

  const totalScore = (service.rating * service.rating_count) + newRating;
  service.rating_count += 1;
  service.rating = totalScore / service.rating_count;
  
  return service;
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
    if (error) {
      console.error("[db] Supabase insert session error:", error.message, error.code);
      throw new Error(`Failed to persist session to Supabase: ${error.message}`);
    }
    console.log("[db] Session persisted to Supabase:", session.id);
  }

  memSessions.set(session.id, session);
  return session;
}

export async function getSession(id: string): Promise<DBSession | null> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from("sessions").select("*").eq("id", id).single();
    if (error && error.code !== "PGRST116") {
      console.error("[db] Supabase getSession error:", error.message);
    }
    if (data) return data as DBSession;
    return null;
  }
  // In-memory: if session missing (server restarted), recover it if it looks like a real session ID
  if (!memSessions.has(id)) {
    // Only recover IDs that match our generated format (sess_xxxxxxxx)
    // Unknown/garbage IDs return null as expected
    if (/^sess_[a-z0-9]{8}$/.test(id)) {
      const recovered: DBSession = {
        id,
        spending_limit: DEFAULT_SPENDING_LIMIT,
        used_amount: 0,
        expires_at: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
        created_at: new Date().toISOString(),
      };
      memSessions.set(id, recovered);
      console.log(`[db] Session ${id} recovered in memory after restart`);
    } else {
      return null;
    }
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
  // Sync in-memory cache from Supabase so recordSpend has accurate data
  if (isSupabaseConfigured && !memSessions.has(sessionId)) {
    memSessions.set(sessionId, session);
  }
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

  // HARD LIMIT CHECK
  const sessionForCheck = await getSession(sessionId);
  if (!sessionForCheck) throw new Error("Session not found");
  if (sessionForCheck.used_amount + amount > sessionForCheck.spending_limit) {
    throw new Error(`Budget exceeded: ${sessionForCheck.used_amount.toFixed(2)} + ${amount.toFixed(2)} > ${sessionForCheck.spending_limit.toFixed(2)}`);
  }

  if (isSupabaseConfigured && supabase) {
    // Try the RPC first (atomic increment)
    const { data: rpcData, error: rpcError } = await supabase.rpc("increment_spend", {
      session_id: sessionId,
      spend_amount: amount,
    });

    if (rpcError) {
      console.error(`[db] recordSpend RPC error for session ${sessionId}:`, rpcError.message);
    }

    if (!rpcError && typeof rpcData === "boolean") {
      if (!rpcData) console.warn(`[db] recordSpend RPC returned false for session ${sessionId} (budget exceeded or expired)`);
      return rpcData;
    }

    // RPC not available or failed — use direct update with fresh read
    console.log(`[db] Falling back to manual update for session ${sessionId}`);
    const session = await getSession(sessionId);
    if (!session) return false;
    if (new Date(session.expires_at) < now) return false;
    if (session.used_amount + amount > session.spending_limit) return false;

    const newUsed = session.used_amount + amount;
    const { error: updateErr } = await supabase
      .from("sessions")
      .update({ used_amount: newUsed })
      .eq("id", sessionId);

    if (updateErr) {
      console.error(`[db] recordSpend manual update error for session ${sessionId}:`, updateErr.message);
      return false;
    }
    // Keep in-memory cache in sync
    memSessions.set(sessionId, { ...session, used_amount: newUsed });
    return true;
  }

  return await withSessionLock(sessionId, async () => {
    let mem = memSessions.get(sessionId);
    // Session missing from memory (server restarted) — recreate it so spend is tracked
    if (!mem && /^sess_[a-z0-9]{8}$/.test(sessionId)) {
      mem = {
        id: sessionId,
        spending_limit: DEFAULT_SPENDING_LIMIT,
        used_amount: 0,
        expires_at: new Date(Date.now() + SESSION_TTL_MS).toISOString(),
        created_at: new Date().toISOString(),
      };
      memSessions.set(sessionId, mem);
      console.log(`[db] Session ${sessionId} recreated in memory after restart`);
    }
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
    const { data, error } = await supabase
      .from("transactions")
      .insert({ ...tx })
      .select("id")
      .single();
    if (error) {
      console.error("[db] Supabase insert tx error:", error.message, error.code);
    } else if (data) {
      transaction.id = data.id;
    }
    memTransactions.push(transaction);
    return transaction;
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
