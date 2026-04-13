/**
 * Database abstraction layer.
 * Uses Supabase when configured, falls back to in-memory for local dev.
 */
import { supabase, isSupabaseConfigured, type DBSession, type DBTransaction, type DBService } from "./supabase";
import { DEFAULT_SPENDING_LIMIT, SESSION_TTL_MS, TOOL_PRICES, SPENDING_POLICY_CONTRACT_ID, USDC_TESTNET_ADDRESS } from "./constants";

// ─── In-memory fallback ───
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
    provider_address: process.env.STELLAR_RECEIVER_ADDRESS || "",
    asset_address: USDC_TESTNET_ADDRESS,
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
    provider_address: process.env.STELLAR_RECEIVER_ADDRESS || "",
    asset_address: USDC_TESTNET_ADDRESS,
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
    provider_address: process.env.STELLAR_RECEIVER_ADDRESS || "",
    asset_address: USDC_TESTNET_ADDRESS,
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
    provider_split_percentage: 0.8,
    provider_address: process.env.STELLAR_RECEIVER_ADDRESS || "",
    asset_address: USDC_TESTNET_ADDRESS,
  },
];

// Seed memory
DEFAULT_SERVICES.forEach(s => memServices.set(s.id, s));

/**
 * Ensures default services exist in Supabase so their ratings can be persisted.
 */
async function syncDefaultServices() {
  if (!isSupabaseConfigured || !supabase) return;
  
  for (const service of DEFAULT_SERVICES) {
    const { data } = await supabase.from("services").select("id").eq("id", service.id).single();
    if (!data) {
      console.log(`[db] Seeding default service to Supabase: ${service.id}`);
      await supabase.from("services").insert(service);
    }
  }
}

let hasSynced = false;

export async function getAllServices(): Promise<DBService[]> {
  if (isSupabaseConfigured && supabase) {
    if (!hasSynced) {
      await syncDefaultServices();
      hasSynced = true;
    }
    const { data } = await supabase.from("services").select("*").order("price_usd", { ascending: true });
    if (data && data.length > 0) return data as DBService[];
  }
  return Array.from(memServices.values()).sort((a, b) => a.price_usd - b.price_usd);
}

export async function addService(service: Omit<DBService, "id" | "created_at" | "rating" | "rating_count">): Promise<DBService> {
  const id = genId("svc");
  const newService: DBService = { ...service, id, rating: 0, rating_count: 0, created_at: new Date().toISOString() };
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from("services").insert(newService);
    if (error) console.error("[db] Supabase insert service error:", error.message);
  }
  memServices.set(id, newService);
  return newService;
}

export async function rateService(id: string, newRating: number): Promise<DBService | null> {
  if (newRating < 1 || newRating > 5) return null;
  
  // Refresh memory/db first to get latest count
  if (isSupabaseConfigured && supabase) {
    const { data: service } = await supabase.from("services").select("*").eq("id", id).single();
    if (service) {
      const totalScore = (service.rating * service.rating_count) + newRating;
      const newCount = service.rating_count + 1;
      const updatedRating = totalScore / newCount;
      const { data, error } = await supabase.from("services").update({ rating: updatedRating, rating_count: newCount }).eq("id", id).select().single();
      if (!error && data) {
        memServices.set(id, data as DBService);
        return data as DBService;
      }
    }
  }

  const service = memServices.get(id);
  if (!service) return null;
  service.rating = (service.rating * service.rating_count + newRating) / (service.rating_count + 1);
  service.rating_count += 1;
  return service;
}

export async function deleteService(id: string): Promise<boolean> {
  if (isSupabaseConfigured && supabase) {
    const { error } = await supabase.from("services").delete().eq("id", id);
    if (error) return false;
  }
  if (DEFAULT_SERVICES.some(s => s.id === id)) return false;
  return memServices.delete(id);
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
    await supabase.from("sessions").insert(session);
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
  const next = new Promise<void>((res) => { release = res; });
  const newLock = prev.then(() => next);
  sessionLocks.set(sessionId, newLock);
  await prev;
  try { return await fn(); } finally {
    release();
    if (sessionLocks.get(sessionId) === newLock) sessionLocks.delete(sessionId);
  }
}

export async function recordSpend(sessionId: string, amount: number): Promise<boolean> {
  const now = new Date();
  if (isSupabaseConfigured && supabase) {
    const { data: rpcData, error: rpcError } = await supabase.rpc("increment_spend", { session_id: sessionId, spend_amount: amount });
    if (!rpcError && typeof rpcData === "boolean") return rpcData;
    const session = await getSession(sessionId);
    if (!session || new Date(session.expires_at) < now || session.used_amount + amount > session.spending_limit) return false;
    const newUsed = session.used_amount + amount;
    const { error } = await supabase.from("sessions").update({ used_amount: newUsed }).eq("id", sessionId);
    if (!error) memSessions.set(sessionId, { ...session, used_amount: newUsed });
    return !error;
  }
  return await withSessionLock(sessionId, async () => {
    const mem = memSessions.get(sessionId);
    if (!mem || new Date(mem.expires_at) < now || mem.used_amount + amount > mem.spending_limit) return false;
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

export async function addTransaction(tx: Omit<DBTransaction, "id" | "created_at">): Promise<DBTransaction> {
  const transaction: DBTransaction = { ...tx, id: genId("tx"), created_at: new Date().toISOString() };
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from("transactions").insert({ ...tx }).select("id").single();
    if (!error && data) transaction.id = data.id;
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
