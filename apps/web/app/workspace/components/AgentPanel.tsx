"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Loader2, Brain, Zap, CheckCircle2, ExternalLink, DollarSign, TrendingDown } from "lucide-react";
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

const ALL_SERVICES = [
  { id: "search",    name: "Web Search",         price: 0.01 },
  { id: "summarize", name: "Text Summarizer",     price: 0.02 },
  { id: "analyze",   name: "Sentiment Analyzer",  price: 0.03 },
];

// Live cost counter that animates up as payments happen
function LiveCostCounter({ steps }: { steps: AgentStep[] }) {
  const paid = steps.filter(s => s.status === "paying" || (s.action.includes("confirmed") && s.status === "success"));
  const total = paid.reduce((sum, s) => sum + (s.cost || 0), 0);
  const count = steps.filter(s => s.action.includes("confirmed") && s.status === "success").length;

  return (
    <div style={{
      display: "flex", alignItems: "center", gap: "var(--s4)",
      padding: "var(--s3) var(--s5)",
      background: "var(--bg-card)", border: "1px solid var(--border-dim)",
      borderRadius: "var(--r-lg)",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--s2)" }}>
        <DollarSign size={14} color="var(--emerald)" />
        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Spent so far</span>
      </div>
      <motion.span
        key={total}
        initial={{ scale: 1.3, color: "var(--emerald)" }}
        animate={{ scale: 1, color: "var(--text)" }}
        style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: "1.125rem" }}
      >
        ${total.toFixed(2)}
      </motion.span>
      <span style={{ fontSize: "0.75rem", color: "var(--text-dim)", marginLeft: "auto" }}>
        {count} payment{count !== 1 ? "s" : ""} confirmed
      </span>
    </div>
  );
}

// Service comparison table — shows WHY the agent picked the cheapest
function ServiceComparison({ selectedId, services }: { selectedId: string | null; services: ServiceEntry[] }) {
  const list = services.length > 0 ? services : ALL_SERVICES.map(s => ({
    id: s.id, name: s.name, description: "", protocol: "x402" as const,
    endpoint: "", method: "GET" as const, inputParam: "q",
    stellarNetwork: "stellar:testnet" as const, spendingPolicyContract: "",
    priceUsd: s.price,
  }));

  return (
    <div style={{
      background: "var(--bg-surface)", border: "1px solid var(--border-dim)",
      borderRadius: "var(--r-xl)", overflow: "hidden",
    }}>
      <div style={{
        padding: "var(--s3) var(--s5)", background: "var(--bg-card)",
        borderBottom: "1px solid var(--border-dim)",
        display: "flex", alignItems: "center", gap: "var(--s2)",
      }}>
        <Brain size={13} color="var(--indigo)" />
        <span style={{ fontWeight: 600, fontSize: "0.8125rem" }}>Agent Decision</span>
        <span style={{ fontSize: "0.6875rem", color: "var(--text-muted)", marginLeft: "auto" }}>
          Comparing {list.length} services by price
        </span>
      </div>
      <div style={{ padding: "var(--s4) var(--s5)", display: "flex", flexDirection: "column", gap: "var(--s2)" }}>
        {list.map((svc, i) => {
          const isSelected = svc.id === selectedId || (i === 0 && !selectedId);
          const isCheapest = i === 0 || svc.priceUsd === Math.min(...list.map(s => s.priceUsd));
          return (
            <div key={svc.id} style={{
              display: "flex", alignItems: "center", gap: "var(--s3)",
              padding: "var(--s3) var(--s4)",
              background: isSelected ? "var(--emerald-dim)" : "var(--bg-card)",
              border: `1px solid ${isSelected ? "rgba(16,185,129,0.3)" : "var(--border-dim)"}`,
              borderRadius: "var(--r-lg)",
              transition: "all 0.2s ease",
            }}>
              <span style={{
                fontFamily: "var(--font-mono)", fontSize: "0.75rem",
                color: isSelected ? "var(--emerald)" : "var(--text-muted)",
                fontWeight: isSelected ? 700 : 400, minWidth: 40,
              }}>
                ${svc.priceUsd.toFixed(2)}
              </span>
              <span style={{ flex: 1, fontSize: "0.875rem", fontWeight: isSelected ? 600 : 400 }}>
                {svc.name}
              </span>
              {isSelected && isCheapest && (
                <span style={{
                  fontSize: "0.5625rem", fontWeight: 700, color: "var(--emerald)",
                  background: "rgba(16,185,129,0.15)", padding: "2px 8px",
                  borderRadius: "var(--r-full)", letterSpacing: "0.04em",
                }}>
                  ✓ SELECTED — CHEAPEST
                </span>
              )}
              {!isSelected && (
                <span style={{ fontSize: "0.6875rem", color: "var(--text-dim)" }}>
                  +${(svc.priceUsd - list[0].priceUsd).toFixed(2)} more
                </span>
              )}
            </div>
          );
        })}
        <div style={{
          marginTop: "var(--s1)", fontSize: "0.75rem", color: "var(--indigo)",
          display: "flex", alignItems: "center", gap: "var(--s2)",
        }}>
          <TrendingDown size={12} />
          Agent chose cheapest option — saved ${(list[list.length - 1]?.priceUsd - list[0]?.priceUsd || 0).toFixed(2)} vs most expensive
        </div>
      </div>
    </div>
  );
}

export function AgentPanel({ sessionId }: { sessionId: string | null }) {
  const [prompt, setPrompt] = useState("");
  const [isExecuting, setIsExecuting] = useState(false);
  const [steps, setSteps] = useState<AgentStep[]>([]);
  const [result, setResult] = useState<AgentResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState<ServiceEntry | null>(null);
  const [services, setServices] = useState<ServiceEntry[]>([]);
  const [stepCount, setStepCount] = useState(0);
  const txRef = useRef<HTMLDivElement>(null);

  // Scroll to tx proof when it appears
  useEffect(() => {
    if (result?.txHash && txRef.current) {
      setTimeout(() => txRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 300);
    }
  }, [result?.txHash]);

  const run = useCallback(async (input: string) => {
    if (!input.trim() || !sessionId || isExecuting) return;
    setIsExecuting(true);
    setSteps([]);
    setResult(null);
    setError(null);
    setStepCount(0);

    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: input, sessionId }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.detail || data.error || "Agent execution failed");
        if (data.steps) setSteps(data.steps);
        return;
      }

      // Animate steps in with live counter
      for (let i = 0; i < data.steps.length; i++) {
        await new Promise(r => setTimeout(r, 300));
        setSteps(data.steps.slice(0, i + 1));
        setStepCount(i + 1);
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

  const policyTxHash = result?.proofs?.policyTxHash ?? null;
  const policyAgent = result?.proofs?.policyAgent ?? null;
  const cleanTx = result?.txHash?.replace("stellar:", "") ?? null;
  const explorerUrl = cleanTx ? `https://stellar.expert/explorer/testnet/tx/${cleanTx}` : null;

  // Calculate savings
  const maxPrice = Math.max(...ALL_SERVICES.map(s => s.price));
  const usedPrice = result?.cost ?? 0;
  const saved = usedPrice > 0 ? maxPrice - usedPrice : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--s5)" }}>

      {/* ── SECTION 1: Service Marketplace ── */}
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
          <span style={{ fontWeight: 600, fontSize: "0.875rem" }}>Service Marketplace</span>
          <span style={{ fontSize: "0.6875rem", color: "var(--text-muted)", marginLeft: "auto" }}>
            Live · /api/services
          </span>
        </div>
        <div style={{ padding: "var(--s5)" }}>
          <ServiceList
            onSelect={setSelectedService}
            selectedId={selectedService?.id ?? null}
            onServicesLoaded={setServices}
          />
        </div>
      </div>

      {/* ── SECTION 2: Agent Decision (comparison table) ── */}
      <ServiceComparison
        selectedId={selectedService?.id ?? (services[0]?.id ?? null)}
        services={services}
      />

      {/* ── SECTION 3: Prompt Input ── */}
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
          {isExecuting && (
            <span style={{
              marginLeft: "auto", fontSize: "0.6875rem", color: "var(--amber)",
              fontWeight: 600, display: "flex", alignItems: "center", gap: "var(--s1)",
            }}>
              <Loader2 size={11} style={{ animation: "spin 1s linear infinite" }} />
              Step {stepCount} · executing…
            </span>
          )}
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
                outline: "none", transition: "border-color 0.15s ease",
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
                boxShadow: isExecuting ? "none" : "0 2px 8px rgba(16,185,129,0.3)",
              }}
            >
              {isExecuting
                ? <><Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Running…</>
                : <><Send size={16} /> Run Agent</>
              }
            </button>
          </form>

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
                  onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--emerald)"; e.currentTarget.style.color = "var(--text)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--border-dim)"; e.currentTarget.style.color = "var(--text-body)"; }}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── SECTION 4: Live Cost Counter (shows during execution) ── */}
      <AnimatePresence>
        {steps.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <LiveCostCounter steps={steps} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── SECTION 5: Payment Flow ── */}
      <AnimatePresence>
        {(steps.length > 0 || isExecuting) && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <PaymentFlow steps={steps} isExecuting={isExecuting} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── SECTION 6: TRANSACTION PROOF (most important — shown first after completion) ── */}
      <AnimatePresence>
        {result?.txHash && (
          <motion.div
            ref={txRef}
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            {/* Big WOW banner */}
            <div style={{
              padding: "var(--s4) var(--s5)",
              background: "linear-gradient(135deg, rgba(16,185,129,0.15) 0%, rgba(16,185,129,0.05) 100%)",
              border: "1px solid rgba(16,185,129,0.4)",
              borderRadius: "var(--r-xl)",
              marginBottom: "var(--s3)",
              display: "flex", alignItems: "center", justifyContent: "space-between",
              gap: "var(--s4)", flexWrap: "wrap",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "var(--s3)" }}>
                <CheckCircle2 size={20} color="var(--emerald)" />
                <div>
                  <div style={{ fontWeight: 700, fontSize: "1rem", color: "var(--emerald)" }}>
                    Real payment confirmed on Stellar
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 2 }}>
                    {result.cost > 0 && `$${result.cost.toFixed(2)} USDC · `}
                    {result.tool} · Testnet · Not simulated
                  </div>
                </div>
              </div>
              {explorerUrl && (
                <a
                  href={explorerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-flex", alignItems: "center", gap: "var(--s2)",
                    padding: "var(--s3) var(--s5)",
                    background: "var(--emerald)", color: "#fff",
                    borderRadius: "var(--r-lg)", fontSize: "0.875rem", fontWeight: 600,
                    textDecoration: "none", flexShrink: 0,
                    boxShadow: "0 2px 12px rgba(16,185,129,0.4)",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = "#0EA572"; }}
                  onMouseLeave={e => { e.currentTarget.style.background = "var(--emerald)"; }}
                >
                  <ExternalLink size={14} /> Verify on Stellar Explorer
                </a>
              )}
            </div>

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

      {/* ── SECTION 7: Result + Savings ── */}
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
                Insights Unlocked
              </span>
              {saved > 0 && (
                <span style={{
                  marginLeft: "auto", fontSize: "0.6875rem",
                  display: "flex", alignItems: "center", gap: "var(--s1)",
                  color: "var(--emerald)",
                }}>
                  <TrendingDown size={11} />
                  Saved ${saved.toFixed(2)} vs most expensive option
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

      {/* ── SECTION 8: Error State ── */}
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
