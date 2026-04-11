import { create } from "zustand";
import { 
  type AgentStep, 
  type DBTransaction as Transaction, 
  type SpendingSummary,
  type DBSession
} from "./types";

export interface Tool {
  id: string;
  name: string;
  description: string;
  method: string;
  url: string;
  priceUsd: number;
  protocol: string;
  payment: {
    protocol: string;
    version: string;
    accepts?: unknown[];
    network?: string;
    currency?: string;
    amount_usd?: string;
  };
}

interface AppState {
  session: DBSession | null;
  summary: SpendingSummary | null;
  steps: AgentStep[];
  catalog: Tool[];
  isExecuting: boolean;
  transactions: Transaction[];
  activeView: string;
  lastResult: unknown;

  setSession: (session: DBSession | null) => void;
  setSummary: (summary: SpendingSummary | null) => void;
  setSteps: (steps: AgentStep[]) => void;
  clearSteps: () => void;
  setCatalog: (catalog: Tool[]) => void;
  setIsExecuting: (isExecuting: boolean) => void;
  setTransactions: (transactions: Transaction[]) => void;
  setActiveView: (activeView: string) => void;
  setLastResult: (lastResult: unknown) => void;
}

export const useAppStore = create<AppState>((set) => ({
  session: null,
  summary: null,
  steps: [],
  catalog: [],
  isExecuting: false,
  transactions: [],
  activeView: "workspace",
  lastResult: null as unknown,

  setSession: (session) => set({ session }),
  setSummary: (summary) => set({ summary }),
  setSteps: (steps) => set({ steps }),
  clearSteps: () => set({ steps: [] }),
  setCatalog: (catalog) => set({ catalog }),
  setIsExecuting: (isExecuting) => set({ isExecuting }),
  setTransactions: (transactions) => set({ transactions }),
  setActiveView: (activeView) => set({ activeView }),
  setLastResult: (lastResult: unknown) => set({ lastResult }),
}));

export async function createSessionAPI(limit: number = 5.0): Promise<DBSession> {
  const res = await fetch("/api/sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ spendingLimit: limit }),
  });
  if (!res.ok) throw new Error("Failed to create session");
  return res.json();
}

export async function fetchTransactions(sessionId?: string): Promise<{ transactions: Transaction[] }> {
  const url = sessionId ? `/api/transactions?sessionId=${sessionId}` : "/api/transactions";
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch transactions");
  return res.json();
}

export async function fetchTools(): Promise<Tool[]> {
  const res = await fetch("/api/catalog");
  if (!res.ok) throw new Error("Failed to fetch catalog");
  const data = await res.json();
  return data.tools;
}

export async function executeAgentTask(prompt: string, sessionId: string) {
  const res = await fetch("/api/agent", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, sessionId }),
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    console.error("[store.ts] Agent execution failed on server:", {
      status: res.status,
      error: errorBody.error,
      detail: errorBody.detail,
      step: errorBody.step,
      stack: errorBody.stack,
    });
    const message = errorBody.detail || errorBody.error || "Agent execution failed";
    throw new Error(message);
  }

  return res.json();
}

export type { AgentStep, Transaction };
