"use client";

import { useEffect, useCallback, useState } from "react";
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

const WalletConnect = dynamic(() => import("./WalletConnect"), { ssr: false, loading: () => null });

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
            if (!cancelled && existing?.id) {
              // Strip the nested summary before setting session
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
          localStorage.removeItem("agentpay_session_id");
        }
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

      try {
        const data = await executeAgentTask(prompt, session.id);
        for (let i = 0; i < data.steps.length; i++) {
          await new Promise((r) => setTimeout(r, 400));
          setSteps(data.steps.slice(0, i + 1));
        }
        setLastResult({ text: data.result, toolOutputs: data.toolOutputs ?? [] });
        if (data.summary) setSummary(data.summary);
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
                <PromptBox onSubmit={handleExecute} isExecuting={isExecuting} />
              </div>
              <div className="timeline-area" ref={(el) => {
                if (el && lastResult) el.scrollTop = el.scrollHeight;
              }}>
                {steps.length === 0 && !isExecuting ? (
                  <EmptyState />
                ) : (
                  <Timeline steps={steps} />
                )}
                {lastResult !== null && !isExecuting && <ResultPanel result={lastResult} />}
              </div>
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
    { id: "workspace", icon: LayoutDashboard, label: "Workspace" },
    { id: "bazaar", icon: Search, label: "Bazaar" },
    { id: "payments", icon: CreditCard, label: "Payments" },
    { id: "settings", icon: Settings, label: "Settings" },
  ];

  return (
    <aside className={`workspace-sidebar${sidebarOpen ? " open" : ""}`}>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--s3)", padding: "var(--s3)", marginBottom: "var(--s6)" }}>
        <div style={{
          width: 32, height: 32, borderRadius: "var(--r-md)", background: "var(--emerald)",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 2px 8px rgba(16,185,129,0.3)",
        }}>
          <Zap size={16} color="#ffffff" strokeWidth={2.5} />
        </div>
        <span style={{ fontWeight: 700, fontSize: "1rem", letterSpacing: "-0.01em" }}>AgentPay</span>
      </div>

      <nav style={{ display: "flex", flexDirection: "column", gap: "var(--s1)", flex: 1 }}>
        {navItems.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => setActiveView(id)}
            style={{
              display: "flex", alignItems: "center", gap: "var(--s3)",
              padding: "var(--s3) var(--s4)", borderRadius: "var(--r-md)",
              fontSize: "0.9375rem", fontWeight: activeView === id ? 500 : 400,
              color: activeView === id ? "var(--text)" : "var(--text-body)",
              background: activeView === id ? "var(--bg-hover)" : "transparent",
              transition: "all var(--normal) var(--ease)", width: "100%", textAlign: "left",
            }}
          >
            <Icon size={18} color={activeView === id ? "var(--emerald)" : "var(--text-muted)"} />
            {label}
          </button>
        ))}
        <Link href="/workspace/a2a" style={{ textDecoration: "none" }}>
          <button style={{
            display: "flex", alignItems: "center", gap: "var(--s3)",
            padding: "var(--s3) var(--s4)", borderRadius: "var(--r-md)",
            fontSize: "0.9375rem", fontWeight: 400, color: "var(--text-body)",
            background: "transparent", transition: "all var(--normal) var(--ease)",
            width: "100%", textAlign: "left",
          }}>
            <Zap size={18} color="var(--text-muted)" /> A2A Demo
          </button>
        </Link>
      </nav>

      <div style={{
        padding: "var(--s4)", background: "var(--bg-surface)",
        border: "1px solid var(--border-dim)", borderRadius: "var(--r-lg)", marginTop: "auto",
      }}>
        <div className="caption" style={{ marginBottom: "var(--s2)" }}>Current Session</div>
        <code style={{ color: "var(--text-body)", fontSize: "0.75rem", wordBreak: "break-all", fontFamily: "var(--font-mono)" }}>
          {sessionId ?? "Initializing…"}
        </code>
      </div>

      <Link href="/" className="btn btn-ghost" style={{ marginTop: "var(--s4)", justifyContent: "flex-start", padding: "var(--s2) 0", color: "var(--text-muted)" }}>
        <ArrowLeft size={14} /> Back to website
      </Link>
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

/* ─── Empty State ─── */
function EmptyState() {
  const suggestions = [
    "Search for latest Stellar news",
    "Summarize the x402 protocol whitepaper",
    "Analyze sentiment of AI payment trends",
  ];
  const { isExecuting } = useAppStore();
  const { setSteps, setIsExecuting, setLastResult, setSummary, setTransactions, session, clearSteps } = useAppStore();

  const handleSuggestion = useCallback(async (prompt: string) => {
    if (!session || isExecuting) return;
    clearSteps();
    setIsExecuting(true);
    setLastResult(null);
    try {
      const data = await executeAgentTask(prompt, session.id);
      for (let i = 0; i < data.steps.length; i++) {
        await new Promise((r) => setTimeout(r, 400));
        setSteps(data.steps.slice(0, i + 1));
      }
      setLastResult({ text: data.result, toolOutputs: data.toolOutputs ?? [] });
      if (data.summary) setSummary(data.summary);
      const txData = await fetchTransactions(session.id);
      setTransactions(txData.transactions);
    } catch (err) {
      console.error(err);
    } finally {
      setIsExecuting(false);
    }
  }, [session, isExecuting, clearSteps, setIsExecuting, setSteps, setLastResult, setSummary, setTransactions]);

  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", height: "100%", color: "var(--text-muted)",
      gap: "var(--s5)", paddingBottom: "var(--s16)", textAlign: "center",
    }}>
      <div style={{
        width: 80, height: 80, borderRadius: "var(--r-xl)",
        background: "var(--bg-surface)", border: "1px solid var(--border-dim)",
        display: "flex", alignItems: "center", justifyContent: "center",
        transform: "rotate(-3deg)",
      }}>
        <Zap size={32} strokeWidth={1.5} color="var(--text-body)" />
      </div>
      <div>
        <h3 className="h3" style={{ marginBottom: "var(--s2)", color: "var(--text)" }}>Awaiting Orders</h3>
        <p className="body">
          Type a request above to initiate the agent.<br />
          It will handle tool discovery and payments automatically.
        </p>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--s2)", width: "100%", maxWidth: 400 }}>
        <div className="caption" style={{ marginBottom: "var(--s1)" }}>Try a suggestion</div>
        {suggestions.map((s) => (
          <button
            key={s}
            onClick={() => handleSuggestion(s)}
            disabled={isExecuting}
            style={{
              padding: "var(--s3) var(--s4)", background: "var(--bg-surface)",
              border: "1px solid var(--border-dim)", borderRadius: "var(--r-lg)",
              fontSize: "0.875rem", color: "var(--text-body)", textAlign: "left",
              transition: "all var(--normal) var(--ease)", cursor: "pointer",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border-dim)"; e.currentTarget.style.color = "var(--text-body)"; }}
          >
            {s}
          </button>
        ))}
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
    <div style={{ flex: 1, overflowY: "auto", padding: "var(--s8) var(--s10)" }}>
      <div style={{ marginBottom: "var(--s8)" }}>
        <h2 className="h2" style={{ marginBottom: "var(--s2)" }}>Configuration</h2>
        <p className="body">Active session settings and network parameters.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "var(--s4)", maxWidth: 900 }}>
        {fields.map((f) => (
          <div key={f.label} style={{
            background: "var(--bg-surface)", border: "1px solid var(--border-dim)",
            borderRadius: "var(--r-xl)", padding: "var(--s5)",
            display: "flex", flexDirection: "column", gap: "var(--s3)",
            transition: "border-color var(--normal) var(--ease)",
          }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--border)")}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border-dim)")}
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

      <div style={{ marginTop: "var(--s8)", maxWidth: 900 }}>
        <div className="caption" style={{ marginBottom: "var(--s4)", display: "flex", alignItems: "center", gap: "var(--s2)" }}>
          <Wallet size={13} /> Wallet Connection
        </div>
        <WalletConnect />
      </div>

      <div style={{ marginTop: "var(--s5)", maxWidth: 900 }}>
        <div className="caption" style={{ marginBottom: "var(--s4)", display: "flex", alignItems: "center", gap: "var(--s2)" }}>
          <Zap size={13} /> Payment Protocols
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--s3)" }}>
          {[
            { label: "x402", desc: "HTTP-native per-request payments", color: "var(--emerald)" },
            { label: "MPP", desc: "Machine Payments Protocol by Stripe", color: "var(--indigo)" },
          ].map((p) => (
            <div key={p.label} style={{
              background: "var(--bg-surface)", border: "1px solid var(--border-dim)",
              borderRadius: "var(--r-lg)", padding: "var(--s4)",
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--s1)" }}>
                <span style={{ fontWeight: 700, fontSize: "0.9375rem", color: p.color }}>{p.label}</span>
                <span className="badge badge-emerald" style={{ fontSize: "0.5625rem" }}>Active</span>
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{p.desc}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{
        marginTop: "var(--s8)", maxWidth: 900,
        padding: "var(--s4) var(--s5)", background: "var(--emerald-dim)",
        border: "1px solid rgba(16,185,129,0.2)", borderRadius: "var(--r-lg)",
        display: "flex", alignItems: "center", gap: "var(--s3)",
      }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--emerald)", flexShrink: 0, animation: "pulse-dot 2s ease infinite" }} />
        <span style={{ fontSize: "0.8125rem", color: "var(--emerald)", fontWeight: 500 }}>
          Connected to Stellar Testnet · x402 Protocol v2 · USDC micropayments active
        </span>
      </div>

      <div style={{ marginTop: "var(--s5)", maxWidth: 900 }}>
        <a
          href={`https://stellar.expert/explorer/testnet/contract/${SPENDING_POLICY_CONTRACT_ID}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "inline-flex", alignItems: "center", gap: "var(--s2)",
            fontSize: "0.8125rem", color: "var(--emerald)",
          }}
        >
          <AlertCircle size={13} /> View Soroban Spending Policy on Stellar Expert
        </a>
      </div>
    </div>
  );
}
