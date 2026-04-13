"use client";

import { useEffect, useCallback, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, FileText, BarChart3, Zap, ArrowLeft, Wallet,
  DollarSign, CreditCard, Settings, LayoutDashboard,
  Menu, X, Clock, CheckCircle2, AlertCircle,
} from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";

import { PromptBox } from "./components/PromptBox";
import { Timeline } from "./components/Timeline";
import { ResultPanel } from "./components/ResultPanel";
import { BudgetDrawer } from "./components/BudgetDrawer";
import { BazaarView } from "./components/BazaarView";
import { PaymentsView } from "./components/PaymentsView";
import { AgentReasoningPanel } from "./components/AgentReasoningPanel";
import { AgentPanel } from "./components/AgentPanel";

const WalletConnect = dynamic(() => import("./WalletConnect"), { ssr: false, loading: () => null });
const WalletConnectSidebar = dynamic(() => import("./WalletConnect"), { ssr: false, loading: () => null });

import {
  useAppStore,
  createSessionAPI,
  executeAgentTask,
  fetchTransactions,
  fetchTools,
  type Tool,
} from "@/lib/store";
import { SPENDING_POLICY_CONTRACT_ID } from "@/lib/constants";

export default function WorkspacePage() {
  const {
    session, summary, steps, catalog, isExecuting, activeView,
    setSession, setSummary, setSteps, setCatalog, setIsExecuting,
    setLastResult, setTransactions, setActiveView, clearSteps, lastResult,
  } = useAppStore();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [marketplace, setMarketplace] = useState<{
    servicesDiscovered: number;
    bestValueService: string;
    bestValuePriceUsd: number;
    txExplorerLink: string | null;
    policyExplorerLink: string | null;
  } | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const timelineRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setMounted(true); }, []);

  // Auto-scroll timeline
  useEffect(() => {
    if (timelineRef.current) {
      timelineRef.current.scrollTop = timelineRef.current.scrollHeight;
    }
  }, [steps, lastResult, isExecuting]);

  // Initialize session — reuse persisted session or create new one
  useEffect(() => {
    if (session) return;
    let cancelled = false;

    async function init() {
      const storedId = localStorage.getItem("agentpay_session_id");

      if (storedId) {
        try {
          const res = await fetch(`/api/sessions?id=${storedId}`);
          if (res.ok) {
            const existing = await res.json();
            // Validate session is still usable: not expired, has remaining budget
            const isExpired = existing?.expires_at && new Date(existing.expires_at) < new Date();
            const hasNoBudget = existing?.spending_limit != null &&
              existing?.used_amount != null &&
              existing.used_amount >= existing.spending_limit;

            if (!cancelled && existing?.id && !isExpired && !hasNoBudget) {
              const { summary: existingSummary, ...sessionData } = existing;
              setSession(sessionData);
              if (existingSummary) {
                setSummary(existingSummary);
              } else {
                setSummary({
                  sessionId: existing.id,
                  limit: existing.spending_limit,
                  used: existing.used_amount,
                  remaining: existing.spending_limit - existing.used_amount,
                  percentage: Math.round((existing.used_amount / existing.spending_limit) * 100),
                  transactionCount: 0,
                  expiresAt: existing.expires_at,
                });
              }
              const txData = await fetchTransactions(storedId);
              if (!cancelled) setTransactions(txData.transactions);
              return;
            }
          }
        } catch {
          // stored session gone — fall through to create new
        }
        // Session expired, exhausted, or invalid — clear it and create fresh
        localStorage.removeItem("agentpay_session_id");
      }

      const s = await createSessionAPI(5.0);
      if (cancelled || !s?.id) return;
      localStorage.setItem("agentpay_session_id", s.id);
      localStorage.removeItem("agentpay_session_spent");
      setSession(s);
      setSummary({
        sessionId: s.id,
        limit: s.spending_limit,
        used: s.used_amount,
        remaining: s.spending_limit - s.used_amount,
        percentage: 0,
        transactionCount: 0,
        expiresAt: s.expires_at,
      });
    }

    init().catch((err: unknown) => { if (!cancelled) setInitError(String(err)); });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load tools once
  useEffect(() => {
    fetchTools()
      .then((tools) => { if (tools) setCatalog(tools); })
      .catch(console.error);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleExecute = useCallback(
    async (prompt: string) => {
      if (!session || isExecuting) return;
      clearSteps();
      setIsExecuting(true);
      setLastResult(null);
      setMarketplace(null);
      setTxHash(null);

      try {
        const data = await executeAgentTask(prompt, session.id);
        for (let i = 0; i < data.steps.length; i++) {
          await new Promise((r) => setTimeout(r, 400));
          setSteps(data.steps.slice(0, i + 1));
        }
        setLastResult({ text: data.result ?? "", toolOutputs: data.toolOutputs ?? [] });
        if (data.summary) setSummary(data.summary);
        if (data.marketplace) setMarketplace(data.marketplace);
        if (data.txHash) setTxHash(data.txHash);
        const txData = await fetchTransactions(session.id);
        setTransactions(txData.transactions);
      } catch (err) {
        console.error("Execution failed:", err);
      } finally {
        setIsExecuting(false);
      }
    },
    [session, isExecuting, clearSteps, setIsExecuting, setSteps, setLastResult, setSummary, setTransactions]
  );

  return (
    <div className="workspace-layout">
      {!mounted ? null : (
        <>
          {sidebarOpen && (
            <div
              onClick={() => setSidebarOpen(false)}
              style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 40 }}
            />
          )}

          <Sidebar
            activeView={activeView}
            setActiveView={setActiveView}
            sessionId={session?.id ?? null}
            sidebarOpen={sidebarOpen}
          />

          <main className="workspace-main">
            <TopBar
              activeView={activeView}
              sidebarOpen={sidebarOpen}
              onToggleSidebar={() => setSidebarOpen((o) => !o)}
            />

            {initError && (
              <div style={{
                margin: "var(--s4) var(--s6)", padding: "var(--s3) var(--s5)",
                background: "var(--rose-dim)", border: "1px solid rgba(244,63,94,0.3)",
                borderRadius: "var(--r-lg)", fontSize: "0.875rem", color: "var(--rose)",
              }}>
                Session init failed: {initError}. Using in-memory fallback.
              </div>
            )}

            <AnimatePresence mode="wait">
              {activeView === "workspace" && (
                <motion.div key="workspace" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
                  <div style={{ padding: "var(--s6)", borderBottom: "1px solid var(--border-dim)", flexShrink: 0 }}>
                    <PromptBox
                      onSubmit={handleExecute}
                      isExecuting={isExecuting}
                      sessionReady={!!session}
                    />
                  </div>
                  <div className="timeline-area" ref={timelineRef}>
                    {steps.length === 0 && !isExecuting ? (
                      <EmptyState onSuggestion={handleExecute} />
                    ) : steps.length === 0 && isExecuting ? (
                      <ExecutingState />
                    ) : (
                      <>
                        <AgentReasoningPanel
                          marketplace={marketplace}
                          txHash={txHash}
                          isExecuting={isExecuting}
                          steps={steps}
                        />
                        <Timeline steps={steps} />
                      </>
                    )}
                    {lastResult !== null && <ResultPanel result={lastResult} />}
                    <div style={{ minHeight: "var(--s12)", flexShrink: 0 }} />
                  </div>
                </motion.div>
              )}
              {activeView === "demo" && (
                <motion.div key="demo" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  style={{ flex: 1, overflowY: "auto", padding: "var(--s6) var(--s8)" }}>
                  <div style={{ marginBottom: "var(--s6)" }}>
                    <h2 className="h2" style={{ marginBottom: "var(--s2)" }}>Live Demo</h2>
                    <p className="body">Agent discovers services, selects cheapest, pays autonomously, returns verifiable proof.</p>
                  </div>
                  <AgentPanel sessionId={session?.id ?? null} />
                </motion.div>
              )}
              {activeView === "bazaar" && (
                <motion.div key="bazaar" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ flex: 1, minHeight: 0 }}>
                  <BazaarView catalog={catalog} />
                </motion.div>
              )}
              {activeView === "payments" && (
                <motion.div key="payments" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ flex: 1, minHeight: 0 }}>
                  <PaymentsView />
                </motion.div>
              )}
              {activeView === "settings" && (
                <motion.div key="settings" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ flex: 1, minHeight: 0 }}>
                  <SettingsView session={session} />
                </motion.div>
              )}
            </AnimatePresence>
          </main>

          <aside className="workspace-drawer" style={{ gap: "var(--s5)" }}>
            <BudgetDrawer summary={summary} />
            <ToolsPanel catalog={catalog} />
          </aside>
        </>
      )}
    </div>
  );
}

/* ─── Sidebar ─── */
function Sidebar({
  activeView, setActiveView, sessionId, sidebarOpen,
}: {
  activeView: string;
  setActiveView: (v: string) => void;
  sessionId: string | null;
  sidebarOpen: boolean;
}) {
  const navItems = [
    { id: "workspace", icon: LayoutDashboard, label: "Execution" },
    { id: "demo", icon: Zap, label: "Live Demo" },
    { id: "bazaar", icon: Search, label: "Tool Bazaar" },
    { id: "payments", icon: CreditCard, label: "Payment Ledger" },
    { id: "settings", icon: Settings, label: "Configuration" },
  ];

  return (
    <aside className={`workspace-sidebar${sidebarOpen ? " open" : ""}`} style={{
      background: "var(--bg-surface)",
      borderRight: "1px solid var(--border-dim)",
      display: "flex",
      flexDirection: "column",
      gap: "var(--s8)"
    }}>
      {/* Brand Section */}
      <div style={{ display: "flex", alignItems: "center", gap: "var(--s3)", padding: "var(--s2) var(--s1)" }}>
        <div style={{
          width: 36, height: 36, borderRadius: "var(--r-md)", background: "var(--emerald)",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 4px 12px rgba(16,185,129,0.25)",
        }}>
          <Zap size={20} color="#ffffff" strokeWidth={2.5} />
        </div>
        <div>
          <div style={{ fontWeight: 800, fontSize: "1.125rem", letterSpacing: "-0.02em", lineHeight: 1.1 }}>AgentPay</div>
          <div style={{ fontSize: "0.625rem", fontWeight: 600, color: "var(--emerald)", letterSpacing: "0.05em", marginTop: 2 }}>ROUTER V2</div>
        </div>
      </div>

      {/* Navigation Group */}
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--s6)" }}>
        <div className="caption" style={{ fontSize: "0.625rem", paddingLeft: "var(--s4)", color: "var(--text-dim)" }}>MAIN NAVIGATION</div>
        <nav style={{ display: "flex", flexDirection: "column", gap: "var(--s1)" }}>
          {navItems.map(({ id, icon: Icon, label }) => {
            const isActive = activeView === id;
            return (
              <button
                key={id}
                onClick={() => setActiveView(id)}
                style={{
                  display: "flex", alignItems: "center", gap: "var(--s3)",
                  padding: "var(--s3) var(--s4)", borderRadius: "var(--r-lg)",
                  fontSize: "0.875rem", fontWeight: isActive ? 600 : 500,
                  color: isActive ? "var(--text)" : "var(--text-muted)",
                  background: isActive ? "var(--bg-hover)" : "transparent",
                  transition: "all 0.2s var(--ease)", width: "100%", textAlign: "left",
                  position: "relative"
                }}
              >
                {isActive && (
                  <motion.div layoutId="active-pill" style={{
                    position: "absolute", left: 0, width: 3, height: 16,
                    background: "var(--emerald)", borderRadius: "0 4px 4px 0"
                  }} />
                )}
                <Icon size={18} color={isActive ? "var(--emerald)" : "var(--text-dim)"} strokeWidth={isActive ? 2.5 : 2} />
                {label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Experiment Group */}
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--s6)" }}>
        <div className="caption" style={{ fontSize: "0.625rem", paddingLeft: "var(--s4)", color: "var(--text-dim)" }}>ADVANCED</div>
        <Link href="/workspace/a2a" style={{ textDecoration: "none" }}>
          <button style={{
            display: "flex", alignItems: "center", gap: "var(--s3)",
            padding: "var(--s3) var(--s4)", borderRadius: "var(--r-lg)",
            fontSize: "0.875rem", fontWeight: 500, color: "var(--text-muted)",
            background: "transparent", transition: "all 0.2s var(--ease)",
            width: "100%", textAlign: "left",
          }}>
            <div style={{
              width: 18, height: 18, borderRadius: "4px", background: "var(--indigo-dim)",
              display: "flex", alignItems: "center", justifyContent: "center"
            }}>
              <Zap size={12} color="var(--indigo)" />
            </div>
            A2A Payment Flow
          </button>
        </Link>
      </div>

      {/* Footer Utility Section */}
      <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: "var(--s4)" }}>
        <div style={{
          padding: "var(--s4)", background: "var(--bg-card)",
          border: "1px solid var(--border-dim)", borderRadius: "var(--r-xl)",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--s2)" }}>
            <span className="caption" style={{ fontSize: "0.5625rem" }}>Active Session</span>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--emerald)", animation: "pulse-dot 2s infinite" }} />
          </div>
          <code style={{ 
            color: "var(--text-body)", fontSize: "0.6875rem", 
            wordBreak: "break-all", fontFamily: "var(--font-mono)",
            background: "rgba(0,0,0,0.2)", padding: "4px 8px", borderRadius: "4px", display: "block"
          }}>
            {sessionId?.slice(0, 16) ?? "Initializing…"}...
          </code>
        </div>

        <WalletConnectSidebar />

        <Link href="/" className="btn btn-ghost" style={{ 
          justifyContent: "flex-start", padding: "var(--s2) var(--s1)", 
          color: "var(--text-dim)", fontSize: "0.75rem", gap: "var(--s2)" 
        }}>
          <ArrowLeft size={14} /> Exit Workspace
        </Link>
      </div>
    </aside>
  );
}

/* ─── Top Bar ─── */
function TopBar({
  activeView, sidebarOpen, onToggleSidebar,
}: {
  activeView: string;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
}) {
  const titles: Record<string, string> = {
    workspace: "Agent Execution",
    demo: "Live Demo",
    bazaar: "Tool Bazaar",
    payments: "Payment Ledger",
    settings: "Settings",
  };

  return (
    <div style={{
      padding: "var(--s4) var(--s6)", borderBottom: "1px solid var(--border-dim)",
      display: "flex", alignItems: "center", justifyContent: "space-between",
      background: "rgba(9,9,11,0.6)", backdropFilter: "blur(12px)", zIndex: 10,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--s3)" }}>
        <button className="menu-toggle" onClick={onToggleSidebar} aria-label="Toggle sidebar">
          {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
        </button>
        <h2 className="h3 topbar-title">{titles[activeView] ?? "Workspace"}</h2>
      </div>
      <div className="badge badge-emerald">
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--emerald)" }} />
        Stellar Testnet
      </div>
    </div>
  );
}

/* ─── Executing State ─── */
function ExecutingState() {
  const [elapsed, setElapsed] = useState(0);
  const [dot, setDot] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setElapsed(e => e + 1), 1000);
    const dots = setInterval(() => setDot(d => (d + 1) % 4), 500);
    return () => { clearInterval(timer); clearInterval(dots); };
  }, []);

  const stages = [
    { t: 0,  label: "Security scan…" },
    { t: 2,  label: "Initializing LLM agent…" },
    { t: 4,  label: "Fetching service marketplace…" },
    { t: 6,  label: "Agent selecting cheapest service…" },
    { t: 8,  label: "Requesting tool — awaiting 402…" },
    { t: 12, label: "Signing USDC payment on Stellar…" },
    { t: 18, label: "Waiting for Stellar settlement…" },
    { t: 24, label: "Verifying Soroban spending policy…" },
    { t: 30, label: "Retrying request with payment receipt…" },
    { t: 40, label: "Processing response…" },
  ];

  const currentStage = [...stages].reverse().find(s => elapsed >= s.t) ?? stages[0];
  const dots = ".".repeat(dot);

  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", height: "100%", gap: "var(--s6)",
      paddingBottom: "var(--s16)",
    }}>
      {/* Animated ring */}
      <div style={{ position: "relative", width: 80, height: 80 }}>
        <svg width="80" height="80" viewBox="0 0 80 80" style={{ transform: "rotate(-90deg)" }}>
          <circle cx="40" cy="40" r="34" fill="none" stroke="var(--bg-hover)" strokeWidth="6" />
          <circle
            cx="40" cy="40" r="34" fill="none"
            stroke="var(--emerald)" strokeWidth="6"
            strokeDasharray={`${Math.min(elapsed * 4, 213)} 213`}
            strokeLinecap="round"
            style={{ transition: "stroke-dasharray 1s ease" }}
          />
        </svg>
        <div style={{
          position: "absolute", inset: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Zap size={24} color="var(--emerald)" strokeWidth={1.5} />
        </div>
      </div>

      <div style={{ textAlign: "center" }}>
        <div style={{ fontWeight: 600, fontSize: "1rem", marginBottom: "var(--s2)" }}>
          {currentStage.label}{dots}
        </div>
        <div style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>
          {elapsed}s elapsed · Stellar payments take 3–5s each
        </div>
      </div>

      {/* Payment flow mini-steps */}
      <div style={{ display: "flex", alignItems: "center", gap: "var(--s2)", flexWrap: "wrap", justifyContent: "center" }}>
        {[
          { label: "Security",  done: elapsed >= 2 },
          { label: "LLM Init",  done: elapsed >= 4 },
          { label: "Discovery", done: elapsed >= 6 },
          { label: "402",       done: elapsed >= 10 },
          { label: "Payment",   done: elapsed >= 18 },
          { label: "Result",    done: false },
        ].map((s, i, arr) => (
          <div key={s.label} style={{ display: "flex", alignItems: "center", gap: "var(--s1)" }}>
            <div style={{
              padding: "3px 10px", borderRadius: "var(--r-full)",
              fontSize: "0.625rem", fontWeight: 600,
              background: s.done ? "var(--emerald-dim)" : "var(--bg-hover)",
              color: s.done ? "var(--emerald)" : "var(--text-dim)",
              border: `1px solid ${s.done ? "rgba(16,185,129,0.3)" : "transparent"}`,
              transition: "all 0.5s ease",
            }}>
              {s.label}
            </div>
            {i < arr.length - 1 && (
              <div style={{ width: 12, height: 1, background: s.done ? "var(--emerald)" : "var(--border-dim)", transition: "background 0.5s ease" }} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Empty State ─── */
function EmptyState({ onSuggestion: _onSuggestion }: { onSuggestion: (prompt: string) => void }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", height: "100%", color: "var(--text-muted)",
      gap: "var(--s4)", paddingBottom: "var(--s16)", textAlign: "center",
    }}>
      <div style={{
        width: 64, height: 64, borderRadius: "var(--r-xl)",
        background: "var(--bg-surface)", border: "1px solid var(--border-dim)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Zap size={28} strokeWidth={1.5} color="var(--text-body)" />
      </div>
      <div>
        <p className="body" style={{ color: "var(--text-muted)" }}>
          Type a prompt above to start the agent.
        </p>
      </div>
    </div>
  );
}

/* ─── Tools Panel ─── */
function ToolsPanel({ catalog }: { catalog: Tool[] }) {
  const ICON: Record<string, React.ElementType> = { search: Search, "mpp-search": Zap, summarize: FileText, analyze: BarChart3 };
  const COLOR: Record<string, string> = { search: "var(--indigo)", "mpp-search": "var(--indigo)", summarize: "var(--emerald)", analyze: "var(--amber)" };

  return (
    <div>
      <div style={{ height: 1, background: "var(--border-dim)", margin: "0 calc(-1 * var(--s6)) var(--s5)" }} />
      <div className="caption" style={{ marginBottom: "var(--s3)", display: "flex", alignItems: "center", gap: "var(--s2)" }}>
        <Zap size={13} /> Tools
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--s2)" }}>
        {catalog.map((t) => {
          const Icon = ICON[t.id] ?? Zap;
          const color = COLOR[t.id] ?? "var(--text-muted)";
          const protocol = t.payment?.protocol?.toUpperCase() ?? "X402";
          return (
            <div key={t.id} style={{
              display: "flex", alignItems: "center", gap: "var(--s3)",
              padding: "var(--s3) var(--s4)", borderRadius: "var(--r-md)",
              background: "var(--bg-surface)", border: "1px solid var(--border-dim)",
            }}>
              <div style={{
                width: 30, height: 30, borderRadius: "var(--r-sm)",
                background: `${color}18`,
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                <Icon size={14} color={color} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: "0.8125rem", fontWeight: 600, lineHeight: 1.2 }}>{t.name}</div>
                <div style={{ fontSize: "0.6875rem", color: "var(--text-dim)", marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {t.description}
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2, flexShrink: 0 }}>
                <span className="cost" style={{ fontSize: "0.625rem" }}>${t.priceUsd.toFixed(2)}</span>
                <span style={{ fontSize: "0.5rem", color: protocol === "MPP" ? "var(--indigo)" : "var(--text-dim)", fontWeight: 600, letterSpacing: "0.03em" }}>
                  {protocol}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Settings View ─── */
function SettingsView({ session }: { session: import("@/lib/types").DBSession | null }) {
  const fields = [
    { icon: Zap, label: "Network", value: "Stellar Testnet", color: "var(--emerald)" },
    { icon: Wallet, label: "Asset", value: "USDC", color: "var(--indigo)" },
    { icon: DollarSign, label: "Spending Limit", value: `$${session?.spending_limit?.toFixed(2) ?? "5.00"} per session`, color: "var(--amber)" },
    { icon: CreditCard, label: "Session ID", value: session?.id ?? "Initializing…", mono: true, color: "var(--text-muted)" },
    { icon: Clock, label: "Expires", value: session?.expires_at ? new Date(session.expires_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—", mono: true, color: "var(--text-muted)" },
    { icon: CheckCircle2, label: "Soroban Contract", value: SPENDING_POLICY_CONTRACT_ID, mono: true, color: "var(--emerald)" },
  ];

  return (
    <div style={{ 
      flex: 1, 
      overflowY: "auto", 
      padding: "var(--s12) var(--s8)",
      display: "flex",
      flexDirection: "column",
      alignItems: "center"
    }}>
      <div style={{ maxWidth: 900, width: "100%" }}>
        <div style={{ marginBottom: "var(--s10)", textAlign: "center" }}>
          <h2 className="h2" style={{ marginBottom: "var(--s2)", fontSize: "2.5rem" }}>Configuration</h2>
          <p className="body-lg">Active session settings and network parameters.</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "var(--s4)", marginBottom: "var(--s10)" }}>
          {fields.map((f) => (
            <div key={f.label} style={{
              background: "var(--bg-surface)", border: "1px solid var(--border-dim)",
              borderRadius: "var(--r-xl)", padding: "var(--s6)",
              display: "flex", flexDirection: "column", gap: "var(--s3)",
              transition: "all 0.2s var(--ease)",
            }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--border)";
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--border-dim)";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "var(--s2)" }}>
                <div style={{
                  width: 28, height: 28, borderRadius: "var(--r-sm)",
                  background: `${f.color}18`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <f.icon size={14} color={f.color} />
                </div>
                <span className="caption">{f.label}</span>
              </div>
              <div style={{
                fontFamily: f.mono ? "var(--font-mono)" : "var(--font)",
                fontSize: f.mono ? "0.8125rem" : "0.9375rem",
                fontWeight: 600, color: "var(--text)", wordBreak: "break-all", lineHeight: 1.4,
              }}>
                {f.value}
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginBottom: "var(--s10)" }}>
          <div className="caption" style={{ marginBottom: "var(--s4)", display: "flex", alignItems: "center", gap: "var(--s2)", justifyContent: "center" }}>
            <Wallet size={13} /> Wallet Connection
          </div>
          <div style={{ display: "flex", justifyContent: "center" }}>
            <div style={{ width: "100%", maxWidth: 500 }}>
              <WalletConnect />
            </div>
          </div>
        </div>

        <div style={{ marginBottom: "var(--s10)" }}>
          <div className="caption" style={{ marginBottom: "var(--s4)", display: "flex", alignItems: "center", gap: "var(--s2)", justifyContent: "center" }}>
            <Zap size={13} /> Payment Protocols
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--s4)" }}>
            {[
              { label: "x402", desc: "HTTP-native per-request payments", color: "var(--emerald)" },
              { label: "MPP", desc: "Machine Payments Protocol by Stripe", color: "var(--indigo)" },
            ].map((p) => (
              <div key={p.label} style={{
                background: "var(--bg-surface)", border: "1px solid var(--border-dim)",
                borderRadius: "var(--r-lg)", padding: "var(--s5)",
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--s2)" }}>
                  <span style={{ fontWeight: 700, fontSize: "1rem", color: p.color }}>{p.label}</span>
                  <span className="badge badge-emerald" style={{ fontSize: "0.5625rem" }}>Active</span>
                </div>
                <div style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>{p.desc}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{
          padding: "var(--s6)", background: "var(--emerald-dim)",
          border: "1px solid rgba(16,185,129,0.2)", borderRadius: "var(--r-xl)",
          display: "flex", alignItems: "center", gap: "var(--s4)", marginBottom: "var(--s6)"
        }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "var(--emerald)", flexShrink: 0, animation: "pulse-dot 2s ease infinite" }} />
          <span style={{ fontSize: "0.875rem", color: "var(--emerald)", fontWeight: 600 }}>
            Connected to Stellar Testnet · x402 Protocol v2 · USDC micropayments active
          </span>
        </div>

        <div style={{ textAlign: "center" }}>
          <a
            href={`https://stellar.expert/explorer/testnet/contract/${SPENDING_POLICY_CONTRACT_ID}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-flex", alignItems: "center", gap: "var(--s2)",
              fontSize: "0.875rem", color: "var(--emerald)", fontWeight: 500, textDecoration: "underline"
            }}
          >
            <AlertCircle size={14} /> View Soroban Spending Policy on Stellar Expert
          </a>
        </div>
      </div>
    </div>
  );
}
