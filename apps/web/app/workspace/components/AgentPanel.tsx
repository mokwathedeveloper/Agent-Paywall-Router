"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Send, Loader2 } from "lucide-react";
import { AgentReasoningPanel } from "./AgentReasoningPanel";
import { ResultPanel } from "./ResultPanel";
import { Timeline } from "./Timeline";
import type { AgentStep } from "@/lib/types";
import { useAppStore, fetchTransactions } from "@/lib/store";

interface AgentResult {
  txHash: string | null;
  cost: number;
  tool: string;
  result: string;
  toolOutputs?: any[];
  steps: AgentStep[];
  summary?: import("@/lib/types").SpendingSummary;
  proofs: { policyTxHash: string | null; policyAgent: string | null };
  marketplace: {
    servicesDiscovered: number;
    bestValueService: string;
    bestValuePriceUsd: number;
    txExplorerLink: string | null;
    policyExplorerLink: string | null;
  } | null;
}

const SUGGESTIONS = [
  "Search for latest Stellar news",
  "Summarize the x402 protocol",
  "Analyze sentiment of AI payment trends",
];

export function AgentPanel({ sessionId }: { sessionId: string | null }) {
  const { setSummary, setTransactions } = useAppStore();
  const [prompt, setPrompt] = useState("");
  const [isExecuting, setIsExecuting] = useState(false);
  const [steps, setSteps] = useState<AgentStep[]>([]);
  const [result, setResult] = useState<AgentResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [steps, result, error]);

  const run = useCallback(async (input: string) => {
    if (!input.trim() || !sessionId || isExecuting) return;
    setIsExecuting(true);
    setSteps([]);
    setResult(null);
    setError(null);

    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: input, sessionId }),
      });

      const data = await res.json() as AgentResult;

      if (!res.ok) {
        setError((data as any).detail || (data as any).error || "Agent execution failed");
        if (data.steps) setSteps(data.steps);
        // Sync even on error
        const txData = await fetchTransactions(sessionId);
        setTransactions(txData.transactions);
        return;
      }

      for (let i = 0; i < data.steps.length; i++) {
        await new Promise(r => setTimeout(r, 300));
        setSteps(data.steps.slice(0, i + 1));
      }

      setResult(data);

      if (data.summary) {
        setSummary(data.summary);
      }
      const txData = await fetchTransactions(sessionId);
      setTransactions(txData.transactions);

    } catch (err) {
      setError(String(err));
    } finally {
      setIsExecuting(false);
    }
  }, [sessionId, isExecuting, setSummary, setTransactions]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    run(prompt);
    setPrompt("");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: "var(--s6)" }}>
      <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", gap: "var(--s4)" }}>
        <div className="card" style={{ padding: "var(--s5)" }}>
          <form onSubmit={handleSubmit} style={{ display: "flex", gap: "var(--s3)" }}>
            <input
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="Ask the agent to do something..."
              disabled={isExecuting || !sessionId}
              style={{
                flex: 1, padding: "var(--s3) var(--s4)",
                background: "var(--bg-card)", border: "1px solid var(--border)",
                borderRadius: "var(--r-lg)", fontSize: "1rem", color: "var(--text)",
              }}
            />
            <button
              type="submit"
              disabled={isExecuting || !prompt.trim() || !sessionId}
              className="btn btn-primary"
              style={{ minWidth: "140px" }}
            >
              {isExecuting ? <Loader2 className="spin" size={18} /> : <Send size={18} />}
              {isExecuting ? "Executing..." : "Run Agent"}
            </button>
          </form>
          <div style={{ display: "flex", gap: "var(--s2)", flexWrap: "wrap", marginTop: "var(--s4)" }}>
            {SUGGESTIONS.map(s => (
              <button
                key={s}
                onClick={() => { setPrompt(s); run(s); }}
                disabled={isExecuting || !sessionId}
                className="badge badge-neutral"
                style={{ cursor: "pointer", padding: "6px 12px" }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div 
        ref={scrollRef}
        style={{ 
          flex: 1, 
          overflowY: "auto", 
          display: "flex", 
          flexDirection: "column", 
          gap: "var(--s6)",
          paddingRight: "var(--s2)"
        }}
      >
        {(steps.length > 0 || isExecuting) && (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--s6)" }}>
            <AgentReasoningPanel 
              marketplace={result?.marketplace ?? null}
              txHash={result?.txHash ?? null}
              isExecuting={isExecuting}
              steps={steps}
            />
            <Timeline steps={steps} />
          </div>
        )}

        {result && (
          <div style={{ marginTop: "var(--s4)" }}>
            <ResultPanel result={{ text: result.result, toolOutputs: result.toolOutputs }} />
          </div>
        )}

        {error && (
          <div className="card" style={{ background: "var(--rose-dim)", borderColor: "var(--rose)", color: "var(--rose)" }}>
            <div style={{ fontWeight: 700, marginBottom: "var(--s2)" }}>Execution Error</div>
            <p className="body" style={{ color: "var(--rose)", opacity: 0.9 }}>{error}</p>
          </div>
        )}
        <div style={{ minHeight: "var(--s12)", flexShrink: 0 }} />
      </div>
    </div>
  );
}
