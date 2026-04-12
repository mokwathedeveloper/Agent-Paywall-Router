"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Loader2, Brain, Zap } from "lucide-react";
import { ServiceList, type ServiceEntry } from "./ServiceList";
import { PaymentFlow } from "./PaymentFlow";
import { TransactionView } from "./TransactionView";

interface AgentStep {
  id: number;
  action: string;
  status: string;
  detail: string;
  cost: number;
  latency: number;
}

interface AgentResult {
  txHash: string | null;
  cost: number;
  tool: string;
  result: string;
  steps: AgentStep[];
  proofs: { policyTxHash: string | null; policyAgent: string | null };
  marketplace: {
    servicesDiscovered: number;
    cheapestService: string;
    cheapestPriceUsd: number;
    txExplorerLink: string | null;
  } | null;
}

const SUGGESTIONS = [
  "Search for latest Stellar news",
  "Summarize the x402 protocol",
  "Analyze sentiment of AI payment trends",
];

export function AgentPanel({ sessionId }: { sessionId: string | null }) {
  const [prompt, setPrompt] = useState("");
  const [isExecuting, setIsExecuting] = useState(false);
  const [steps, setSteps] = useState<AgentStep[]>([]);
  const [result, setResult] = useState<AgentResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState<ServiceEntry | null>(null);

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

      const data = await res.json();

      if (!res.ok) {
        setError(data.detail || data.error || "Agent execution failed");
        // Still show steps if available
        if (data.steps) setSteps(data.steps);
        return;
      }

      // Animate steps in
      for (let i = 0; i < data.steps.length; i++) {
        await new Promise(r => setTimeout(r, 350));
        setSteps(data.steps.slice(0, i + 1));
      }

      setResult(data);
    } catch (err) {
      setError(String(err));
    } finally {
      setIsExecuting(false);
    }
  }, [sessionId, isExecuting]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    run(prompt);
    setPrompt("");
  };

  // Extract proof data from result
  const policyTxHash = result?.proofs?.policyTxHash ?? null;
  const policyAgent = result?.proofs?.policyAgent ?? null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--s6)" }}>

      {/* Section 1: Service Marketplace */}
      <div style={{
        background: "var(--bg-surface)", border: "1px solid var(--border-dim)",
        borderRadius: "var(--r-xl)", overflow: "hidden",
      }}>
        <div style={{
          padding: "var(--s4) var(--s5)", background: "var(--bg-card)",
          borderBottom: "1px solid var(--border-dim)",
          display: "flex", alignItems: "center", gap: "var(--s2)",
        }}>
          <Zap size={14} color="var(--emerald)" />
          <span style={{ fontWeight: 600, fontSize: "0.875rem" }}>Available Services</span>
          <span style={{ fontSize: "0.6875rem", color: "var(--text-muted)", marginLeft: "auto" }}>
            Live from /api/services
          </span>
        </div>
        <div style={{ padding: "var(--s5)" }}>
          <ServiceList
            onSelect={setSelectedService}
            selectedId={selectedService?.id ?? null}
          />
        </div>
      </div>

      {/* Section 2: Agent Reasoning */}
      {selectedService && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            padding: "var(--s4) var(--s5)",
            background: "var(--indigo-dim)", border: "1px solid rgba(99,102,241,0.25)",
            borderRadius: "var(--r-lg)", display: "flex", alignItems: "flex-start", gap: "var(--s3)",
          }}
        >
          <Brain size={16} color="var(--indigo)" style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <div style={{ fontWeight: 600, fontSize: "0.875rem", marginBottom: 4 }}>
              Agent will select: <span style={{ color: "var(--indigo)" }}>{selectedService.name}</span>
            </div>
            <div style={{ fontSize: "0.8125rem", color: "var(--text-body)" }}>
              Selected because it is the cheapest available option at{" "}
              <span className="cost" style={{ fontSize: "0.75rem" }}>${selectedService.priceUsd.toFixed(2)}</span>
              {" "}USDC · {selectedService.protocol.toUpperCase()} protocol · Stellar Testnet
            </div>
          </div>
        </motion.div>
      )}

      {/* Section 3: Prompt Input */}
      <div style={{
        background: "var(--bg-surface)", border: "1px solid var(--border-dim)",
        borderRadius: "var(--r-xl)", overflow: "hidden",
      }}>
        <div style={{
          padding: "var(--s4) var(--s5)", background: "var(--bg-card)",
          borderBottom: "1px solid var(--border-dim)",
          display: "flex", alignItems: "center", gap: "var(--s2)",
        }}>
          <Brain size={14} color="var(--indigo)" />
          <span style={{ fontWeight: 600, fontSize: "0.875rem" }}>Run Agent</span>
        </div>
        <div style={{ padding: "var(--s5)", display: "flex", flexDirection: "column", gap: "var(--s4)" }}>
          <form onSubmit={handleSubmit} style={{ display: "flex", gap: "var(--s3)" }}>
            <input
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="e.g. Search for Stellar blockchain news"
              disabled={isExecuting || !sessionId}
              style={{
                flex: 1, padding: "var(--s3) var(--s4)",
                background: "var(--bg-card)", border: "1px solid var(--border)",
                borderRadius: "var(--r-lg)", fontSize: "0.9375rem", color: "var(--text)",
                outline: "none",
              }}
              onFocus={e => { e.currentTarget.style.borderColor = "var(--emerald)"; }}
              onBlur={e => { e.currentTarget.style.borderColor = "var(--border)"; }}
            />
            <button
              type="submit"
              disabled={isExecuting || !prompt.trim() || !sessionId}
              style={{
                padding: "var(--s3) var(--s5)",
                background: isExecuting ? "var(--bg-hover)" : "var(--emerald)",
                color: isExecuting ? "var(--text-muted)" : "#fff",
                borderRadius: "var(--r-lg)", display: "flex", alignItems: "center",
                gap: "var(--s2)", fontSize: "0.875rem", fontWeight: 600,
                transition: "all 0.2s ease", flexShrink: 0,
              }}
            >
              {isExecuting
                ? <><Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Running…</>
                : <><Send size={16} /> Run Agent</>
              }
            </button>
          </form>

          {/* Suggestions */}
          {!isExecuting && steps.length === 0 && (
            <div style={{ display: "flex", gap: "var(--s2)", flexWrap: "wrap" }}>
              {SUGGESTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => { setPrompt(s); run(s); }}
                  disabled={!sessionId}
                  style={{
                    padding: "var(--s2) var(--s3)",
                    background: "var(--bg-card)", border: "1px solid var(--border-dim)",
                    borderRadius: "var(--r-lg)", fontSize: "0.75rem", color: "var(--text-body)",
                    cursor: "pointer", transition: "all 0.15s ease",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border-dim)"; e.currentTarget.style.color = "var(--text-body)"; }}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Section 4: Payment Flow Visualization */}
      <AnimatePresence>
        {(steps.length > 0 || isExecuting) && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <PaymentFlow steps={steps} isExecuting={isExecuting} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Section 5: Transaction Proof */}
      <AnimatePresence>
        {result?.txHash && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <TransactionView
              txHash={result.txHash}
              policyTxHash={policyTxHash}
              policyAgent={policyAgent}
              cost={result.cost}
              tool={result.tool}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Section 6: Result Output */}
      <AnimatePresence>
        {result?.result && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{
              background: "var(--bg-surface)", border: "1px solid var(--border-glow)",
              borderRadius: "var(--r-xl)", overflow: "hidden",
            }}
          >
            <div style={{
              padding: "var(--s3) var(--s5)", background: "var(--bg-card)",
              borderBottom: "1px solid var(--border-dim)",
              display: "flex", alignItems: "center", gap: "var(--s2)",
            }}>
              <Zap size={13} color="var(--emerald)" />
              <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--emerald)" }}>
                Result
              </span>
              {result.marketplace && (
                <span style={{ fontSize: "0.6875rem", color: "var(--text-muted)", marginLeft: "auto" }}>
                  {result.marketplace.servicesDiscovered} services discovered · cheapest used
                </span>
              )}
            </div>
            <div style={{ padding: "var(--s5)" }}>
              <p className="body" style={{ margin: 0, whiteSpace: "pre-wrap", lineHeight: 1.7 }}>
                {typeof result.result === "string" ? result.result : JSON.stringify(result.result, null, 2)}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Section 7: Error State */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{
              padding: "var(--s4) var(--s5)",
              background: "var(--rose-dim)", border: "1px solid rgba(244,63,94,0.3)",
              borderRadius: "var(--r-xl)", color: "var(--rose)",
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: "var(--s1)" }}>
              Payment failed. Agent stopped execution.
            </div>
            <div style={{ fontSize: "0.8125rem", opacity: 0.8 }}>{error}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
