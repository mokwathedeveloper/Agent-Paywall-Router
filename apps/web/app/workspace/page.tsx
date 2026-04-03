"use client";

import { useEffect, useCallback, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, FileText, BarChart3, Send, Zap, ArrowLeft, Wallet,
  Clock, CheckCircle2, AlertCircle, Loader2, Lock, DollarSign,
  CreditCard, Settings, LayoutDashboard, ExternalLink, Copy, Menu, X,
} from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";
const WalletConnect = dynamic(() => import("./WalletConnect"), { ssr: false, loading: () => null });
import {
  useAppStore,
  createSessionAPI,
  executeAgentTask,
  fetchTransactions,
  fetchTools,
  type AgentStep,
  type Tool,
  type Transaction,
} from "@/lib/store";

export default function WorkspacePage() {
  const {
    session,
    summary,
    steps,
    catalog,
    isExecuting,
    transactions,
    activeView,
    setSession,
    setSummary,
    setSteps,
    setCatalog,
    setIsExecuting,
    setLastResult,
    setTransactions,
    setActiveView,
    clearSteps,
  } = useAppStore();

  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Initialize session — guarded against infinite loop
  useEffect(() => {
    if (session) return;
    let cancelled = false;
    createSessionAPI(5.0).then((s) => {
      if (cancelled || !s?.id) return;
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
    }).catch(console.error);
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load transactions and tools once on mount
  useEffect(() => {
    fetchTransactions().then((data) => {
      if (data?.transactions) setTransactions(data.transactions);
    }).catch(console.error);
    
    fetchTools().then((tools) => {
      if (tools) setCatalog(tools);
    }).catch(console.error);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleExecute = useCallback(
    async (prompt: string) => {
      if (!session || isExecuting) return;
      clearSteps();
      setIsExecuting(true);

      try {
        const data = await executeAgentTask(prompt, session.id);
        // Animate steps one by one
        for (let i = 0; i < data.steps.length; i++) {
          await new Promise((r) => setTimeout(r, 400));
          setSteps(data.steps.slice(0, i + 1));
        }
        setLastResult(data.result);
        if (data.summary) setSummary(data.summary);

        // Refresh transactions
        const txData = await fetchTransactions();
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
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 40 }}
        />
      )}

      {/* Sidebar */}
      <aside className={`workspace-sidebar${sidebarOpen ? " open" : ""}`}>
        {/* Logo */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--s3)",
          padding: "var(--s3)",
          marginBottom: "var(--s6)",
        }}>
          <div style={{
            width: 32,
            height: 32,
            borderRadius: "var(--r-md)",
            background: "var(--emerald)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 2px 8px rgba(16,185,129,0.3)",
          }}>
            <Zap size={16} color="#ffffff" strokeWidth={2.5} />
          </div>
          <span style={{ fontWeight: 700, fontSize: "1rem", letterSpacing: "-0.01em" }}>AgentPay</span>
        </div>

        {/* Nav items */}
        <nav style={{ display: "flex", flexDirection: "column", gap: "var(--s1)", flex: 1 }}>
          <SidebarItem
            icon={LayoutDashboard}
            label="Workspace"
            active={activeView === "workspace"}
            onClick={() => setActiveView("workspace")}
          />
          <SidebarItem
            icon={Search}
            label="Bazaar"
            active={activeView === "bazaar"}
            onClick={() => setActiveView("bazaar")}
          />
          <SidebarItem
            icon={CreditCard}
            label="Payments"
            active={activeView === "payments"}
            onClick={() => setActiveView("payments")}
          />
          <Link href="/workspace/a2a" style={{ textDecoration: "none" }}>
            <SidebarItem
              icon={Zap}
              label="A2A Demo"
              active={false}
              onClick={() => {}}
            />
          </Link>
          <SidebarItem
            icon={Settings}
            label="Settings"
            active={activeView === "settings"}
            onClick={() => setActiveView("settings")}
          />
        </nav>

        {/* Session info */}
        <div style={{
          padding: "var(--s4)",
          background: "var(--bg-surface)",
          border: "1px solid var(--border-dim)",
          borderRadius: "var(--r-lg)",
          marginTop: "auto",
        }}>
          <div className="caption" style={{ marginBottom: "var(--s2)" }}>
            Current Session
          </div>
          <code className="text-mono" style={{ color: "var(--text-body)", fontSize: "0.75rem", wordBreak: "break-all" }}>
            {session?.id || "Initializing..."}
          </code>
        </div>

        {/* Back to landing */}
        <Link
          href="/"
          className="btn btn-ghost"
          style={{ marginTop: "var(--s4)", justifyContent: "flex-start", padding: "var(--s2) 0", color: "var(--text-muted)" }}
        >
          <ArrowLeft size={14} /> Back to website
        </Link>
      </aside>

      {/* Main Content */}
      <main className="workspace-main">
        {/* Top bar */}
        <div style={{
          padding: "var(--s4) var(--s6)",
          borderBottom: "1px solid var(--border-dim)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "rgba(9,9,11,0.6)",
          backdropFilter: "blur(12px)",
          zIndex: 10,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--s3)" }}>
            <button className="menu-toggle" onClick={() => setSidebarOpen(o => !o)}>
              {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
            <h2 className="h3 topbar-title">
              {activeView === "workspace" ? "Agent Execution" : 
               activeView === "bazaar" ? "Tool Bazaar" :
               activeView === "payments" ? "Payment Ledger" : "Settings"}
            </h2>
          </div>
          <div className="badge badge-emerald">
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--emerald)" }} />
            Stellar Testnet
          </div>
        </div>

        {activeView === "workspace" ? (
          <WorkspaceView
            steps={steps}
            isExecuting={isExecuting}
            onExecute={handleExecute}
          />
        ) : activeView === "bazaar" ? (
          <BazaarView catalog={catalog} />
        ) : activeView === "payments" ? (
          <PaymentsView transactions={transactions} />
        ) : (
          <SettingsView />
        )}
      </main>

      {/* Right Drawer */}
      <aside className="workspace-drawer" style={{ gap: "var(--s5)" }}>
        <BudgetDrawer summary={summary} />
        <ToolsPanel catalog={catalog} />
      </aside>
    </div>
  );
}

/* ─── Bazaar View ─── */
function BazaarView({ catalog }: { catalog: Tool[] }) {
  const [specTool, setSpecTool] = useState<Tool | null>(null);

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "var(--s6) var(--s8)" }}>
      <div style={{ marginBottom: "var(--s8)" }}>
        <h2 className="h2" style={{ marginBottom: "var(--s2)" }}>The Tool Bazaar</h2>
        <p className="body">Discover agent-native services available via x402 and MPP.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "var(--s5)" }}>
        {catalog.map((tool) => {
          const isMpp = tool.payment?.protocol === "mpp";
          return (
            <motion.div
              key={tool.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border-dim)",
                borderRadius: "var(--r-xl)",
                padding: "var(--s6)",
                display: "flex",
                flexDirection: "column",
                gap: "var(--s4)",
                transition: "all 0.3s ease",
                cursor: "default",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--emerald)";
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.style.boxShadow = "0 8px 24px rgba(16,185,129,0.15)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--border-dim)";
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                <div style={{
                  width: 44, height: 44, borderRadius: "var(--r-lg)",
                  background: isMpp ? "var(--indigo-dim)" : "var(--emerald-dim)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  {tool.id.includes("search") ? <Search size={20} color={isMpp ? "var(--indigo)" : "var(--emerald)"} /> :
                   tool.id === "summarize" ? <FileText size={20} color="var(--emerald)" /> :
                   <BarChart3 size={20} color="var(--amber)" />}
                </div>
                <div className="badge badge-neutral" style={{ fontSize: "0.6875rem" }}>
                  {isMpp ? "MPP" : "x402"}
                </div>
              </div>

              <div>
                <h3 className="h3" style={{ fontSize: "1.125rem", marginBottom: "var(--s1)" }}>{tool.name}</h3>
                <p className="body" style={{ fontSize: "0.875rem", color: "var(--text-body)" }}>{tool.description}</p>
              </div>

              <div style={{ marginTop: "auto", display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "var(--s4)", borderTop: "1px solid var(--border-dim)" }}>
                <div>
                  <div className="caption" style={{ fontSize: "0.625rem" }}>Price</div>
                  <div className="cost" style={{ fontSize: "1.125rem" }}>${tool.priceUsd.toFixed(2)}</div>
                </div>
                <button
                  className="btn btn-secondary"
                  style={{ fontSize: "0.75rem" }}
                  onClick={() => setSpecTool(tool)}
                >
                  View Spec
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Info Banner */}
      <div style={{
        marginTop: "var(--s10)",
        padding: "var(--s6)",
        background: "var(--bg-deep)",
        border: "1px solid var(--border-dim)",
        borderRadius: "var(--r-xl)",
        display: "flex",
        alignItems: "center",
        gap: "var(--s6)",
      }}>
        <div style={{ width: 48, height: 48, borderRadius: "50%", background: "var(--emerald-dim)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Zap size={24} color="var(--emerald)" />
        </div>
        <div>
          <h4 style={{ fontWeight: 600, marginBottom: 4 }}>Bazaar Discovery Active</h4>
          <p className="body" style={{ fontSize: "0.875rem", margin: 0 }}>
            Tools are dynamically discovered via <code>/api/catalog</code>. 
            Any service implementing the x402 or MPP protocol on Stellar can be listed here.
          </p>
        </div>
      </div>

      {/* ─── Spec Modal ─── */}
      <AnimatePresence>
        {specTool && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSpecTool(null)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.7)",
              backdropFilter: "blur(8px)",
              zIndex: 100,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "var(--s6)",
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border)",
                borderRadius: "var(--r-2xl)",
                width: "100%",
                maxWidth: 560,
                maxHeight: "80vh",
                overflow: "hidden",
                boxShadow: "0 24px 48px rgba(0,0,0,0.4)",
              }}
            >
              {/* Modal Header */}
              <div style={{
                padding: "var(--s5) var(--s6)",
                borderBottom: "1px solid var(--border-dim)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "var(--s3)" }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: "var(--r-md)",
                    background: "var(--emerald-dim)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <Zap size={16} color="var(--emerald)" />
                  </div>
                  <div>
                    <h3 style={{ fontWeight: 700, fontSize: "1rem", margin: 0 }}>{specTool.name}</h3>
                    <span className="caption">{specTool.payment?.protocol === "mpp" ? "MPP" : "x402"} Protocol</span>
                  </div>
                </div>
                <button
                  onClick={() => setSpecTool(null)}
                  style={{
                    width: 32, height: 32, borderRadius: "var(--r-full)",
                    background: "var(--bg-hover)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "var(--text-muted)",
                    transition: "all 0.2s ease",
                  }}
                >
                  <X size={16} />
                </button>
              </div>

              {/* Modal Body */}
              <div style={{ padding: "var(--s6)", overflowY: "auto", maxHeight: "60vh" }}>
                {/* Quick Info */}
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr 1fr",
                  gap: "var(--s3)",
                  marginBottom: "var(--s6)",
                }}>
                  <div style={{
                    padding: "var(--s3) var(--s4)",
                    background: "var(--bg-card)",
                    borderRadius: "var(--r-lg)",
                    border: "1px solid var(--border-dim)",
                  }}>
                    <div className="caption" style={{ fontSize: "0.5625rem", marginBottom: 2 }}>Method</div>
                    <div style={{ fontWeight: 600, fontSize: "0.875rem", fontFamily: "var(--font-mono)" }}>{specTool.method}</div>
                  </div>
                  <div style={{
                    padding: "var(--s3) var(--s4)",
                    background: "var(--bg-card)",
                    borderRadius: "var(--r-lg)",
                    border: "1px solid var(--border-dim)",
                  }}>
                    <div className="caption" style={{ fontSize: "0.5625rem", marginBottom: 2 }}>Price</div>
                    <div className="cost" style={{ fontSize: "0.875rem" }}>${specTool.priceUsd.toFixed(2)}</div>
                  </div>
                  <div style={{
                    padding: "var(--s3) var(--s4)",
                    background: "var(--bg-card)",
                    borderRadius: "var(--r-lg)",
                    border: "1px solid var(--border-dim)",
                  }}>
                    <div className="caption" style={{ fontSize: "0.5625rem", marginBottom: 2 }}>Network</div>
                    <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>Stellar</div>
                  </div>
                </div>

                {/* Endpoint */}
                <div style={{ marginBottom: "var(--s5)" }}>
                  <div className="caption" style={{ marginBottom: "var(--s2)" }}>Endpoint</div>
                  <code style={{
                    display: "block",
                    padding: "var(--s3) var(--s4)",
                    background: "var(--bg-deep)",
                    border: "1px solid var(--border-dim)",
                    borderRadius: "var(--r-md)",
                    fontSize: "0.8125rem",
                    color: "var(--emerald)",
                    fontFamily: "var(--font-mono)",
                    wordBreak: "break-all",
                  }}>
                    {specTool.method} {specTool.url}
                  </code>
                </div>

                {/* Description */}
                <div style={{ marginBottom: "var(--s5)" }}>
                  <div className="caption" style={{ marginBottom: "var(--s2)" }}>Description</div>
                  <p className="body" style={{ margin: 0, fontSize: "0.875rem" }}>{specTool.description}</p>
                </div>

                {/* Payment Spec JSON */}
                <div>
                  <div className="caption" style={{ marginBottom: "var(--s2)" }}>Payment Specification (x402 v2)</div>
                  <pre style={{
                    padding: "var(--s4)",
                    background: "var(--bg-deep)",
                    border: "1px solid var(--border-dim)",
                    borderRadius: "var(--r-lg)",
                    fontSize: "0.75rem",
                    color: "var(--text-body)",
                    fontFamily: "var(--font-mono)",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-all",
                    lineHeight: 1.6,
                    margin: 0,
                    overflow: "auto",
                  }}>
{JSON.stringify({
  x402Version: 2,
  resource: { url: specTool.url },
  accepts: [{
    scheme: "exact",
    network: specTool.payment?.network || "stellar:testnet",
    asset: specTool.payment?.currency || "USDC",
    amount: String(Math.round(specTool.priceUsd * 10_000_000)),
    payTo: "<STELLAR_RECEIVER_ADDRESS>",
    facilitator: "https://x402.org/facilitator",
    extra: { areFeesSponsored: true },
  }],
}, null, 2)}
                  </pre>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Sidebar Item ─── */
function SidebarItem({
  icon: Icon,
  label,
  active,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--s3)",
        padding: "var(--s3) var(--s4)",
        borderRadius: "var(--r-md)",
        fontSize: "0.9375rem",
        fontWeight: active ? 500 : 400,
        color: active ? "var(--text)" : "var(--text-body)",
        background: active ? "var(--bg-hover)" : "transparent",
        transition: "all var(--normal) var(--ease)",
        width: "100%",
        textAlign: "left",
      }}
    >
      <Icon size={18} color={active ? "var(--emerald)" : "var(--text-muted)"} />
      {label}
    </button>
  );
}

/* ─── Workspace View ─── */
function WorkspaceView({
  steps,
  isExecuting,
  onExecute,
}: {
  steps: AgentStep[];
  isExecuting: boolean;
  onExecute: (prompt: string) => void;
}) {
  const { lastResult } = useAppStore();

  return (
    <div style={{
      flex: 1,
      display: "flex",
      flexDirection: "column",
      minHeight: 0,
    }}>
      {/* Prompt Input Area */}
      <div style={{ padding: "var(--s6)", borderBottom: "1px solid var(--border-dim)", flexShrink: 0 }}>
        <PromptBox onSubmit={onExecute} isExecuting={isExecuting} />
      </div>

      {/* Timeline + Result Area */}
      <div className="timeline-area">
        {steps.length === 0 && !isExecuting ? (
          <EmptyState />
        ) : (
          <Timeline steps={steps} />
        )}
        {lastResult !== null && !isExecuting && (
          <ResultPanel result={lastResult} />
        )}
      </div>
    </div>
  );
}

/* ─── Prompt Box ─── */
function PromptBox({ onSubmit, isExecuting }: { onSubmit: (prompt: string) => void; isExecuting: boolean }) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const input = form.elements.namedItem("prompt") as HTMLInputElement;
    if (input.value.trim()) {
      onSubmit(input.value.trim());
      input.value = "";
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--r-xl)",
        padding: "4px 4px 4px var(--s5)",
        display: "flex",
        alignItems: "center",
        boxShadow: "0 4px 12px rgba(0,0,0,0.1), inset 0 2px 4px rgba(0,0,0,0.2)",
        transition: "border-color var(--normal) var(--ease)",
      }}
      onFocus={(e) => {
        e.currentTarget.style.borderColor = "var(--border-strong)";
      }}
      onBlur={(e) => {
        e.currentTarget.style.borderColor = "var(--border)";
      }}
    >
      <input
        name="prompt"
        type="text"
        placeholder="Give the agent a task (e.g. 'Search for modern AI payment trends')"
        disabled={isExecuting}
        style={{
          flex: 1,
          background: "transparent",
          border: "none",
          outline: "none",
          fontSize: "1rem",
          color: "var(--text)",
          padding: "var(--s3) 0",
        }}
      />
      <button
        type="submit"
        disabled={isExecuting}
        style={{
          background: isExecuting ? "var(--bg-hover)" : "var(--emerald)",
          color: isExecuting ? "var(--text-muted)" : "#fff",
          padding: "var(--s3) var(--s5)",
          borderRadius: "var(--r-lg)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginLeft: "var(--s3)",
          transition: "all var(--normal) var(--ease)",
          boxShadow: isExecuting ? "none" : "0 2px 8px rgba(16,185,129,0.3)",
        }}
      >
        {isExecuting ? (
          <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
        ) : (
          <Send size={18} />
        )}
      </button>
    </form>
  );
}

/* ─── Timeline ─── */
function Timeline({ steps }: { steps: AgentStep[] }) {
  const stepIcons: Record<string, React.ElementType> = {
    calling: Search,
    payment_required: Lock,
    paying: DollarSign,
    success: CheckCircle2,
    failed: AlertCircle,
    pending: Clock,
  };

  const stepColors: Record<string, string> = {
    calling: "var(--indigo)",
    payment_required: "var(--amber)",
    paying: "var(--indigo)",
    success: "var(--emerald)",
    failed: "var(--rose)",
    pending: "var(--text-muted)",
  };

  const isDone = steps.length > 0 && steps[steps.length - 1].action === "Done" && steps[steps.length - 1].status === "success";
  const hasFailed = steps.some(s => s.status === "failed");

  return (
    <div style={{ display: "flex", flexDirection: "column", position: "relative" }}>
      {/* Connecting vertical line */}
      <div style={{
        position: "absolute",
        top: 24,
        bottom: 24,
        left: 23,
        width: 2,
        background: "var(--border-dim)",
        zIndex: 0,
      }} />

      <AnimatePresence mode="popLayout">
        {steps.map((step, i) => {
          const Icon = stepIcons[step.status] || Clock;
          const color = stepColors[step.status] || "var(--text-muted)";
          const isLast = i === steps.length - 1;

          return (
            <motion.div
              key={`${step.id}-${step.action}`}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "var(--s6)",
                paddingBottom: isLast ? 0 : "var(--s8)",
                position: "relative",
                zIndex: 1,
              }}
            >
              {/* Icon / Node */}
              <div style={{
                width: 48,
                height: 48,
                borderRadius: "var(--r-full)",
                background: "var(--bg-deep)",
                border: `2px solid ${color}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                boxShadow: `0 0 0 4px var(--bg-deep)`,
              }}>
                {step.status === "paying" && !isLast ? (
                  <Loader2 size={20} color={color} style={{ animation: "spin 1s linear infinite" }} />
                ) : (
                  <Icon size={20} color={color} />
                )}
              </div>

              {/* Content Card */}
              <div style={{
                flex: 1,
                minWidth: 0,
                background: "var(--bg-surface)",
                border: "1px solid var(--border)",
                borderRadius: "var(--r-xl)",
                padding: "var(--s4) var(--s5)",
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              }}>
                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: "var(--s1)",
                }}>
                  <span style={{ fontWeight: 600, fontSize: "1rem" }}>{step.action}</span>
                  <div style={{ display: "flex", alignItems: "center", gap: "var(--s3)" }}>
                    {step.cost > 0 && <span className="cost">${step.cost.toFixed(2)}</span>}
                    <span className="mono" style={{ color: "var(--text-dim)", fontSize: "0.75rem" }}>
                      {step.latency}ms
                    </span>
                  </div>
                </div>
                <p className="body" style={{ margin: 0, color: "var(--text-body)" }}>
                  {step.detail}
                </p>
                {step.action === "Payment confirmed" && step.detail.includes("stellar:") && (() => {
                  const hash = step.detail.replace("tx: stellar:", "");
                  return (
                    <a
                      href={`https://stellar.expert/explorer/testnet/tx/${hash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: "var(--s2)", fontSize: "0.75rem", color: "var(--emerald)" }}
                    >
                      <ExternalLink size={11} /> View on Stellar Explorer
                    </a>
                  );
                })()}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {/* Completion banner */}
      {isDone && (
        <motion.div
          initial={{ opacity: 0, y: 12, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          style={{
            marginTop: "var(--s6)",
            padding: "var(--s4) var(--s5)",
            background: "var(--emerald-dim)",
            border: "1px solid rgba(16,185,129,0.3)",
            borderRadius: "var(--r-xl)",
            display: "flex",
            alignItems: "center",
            gap: "var(--s3)",
          }}
        >
          <CheckCircle2 size={18} color="var(--emerald)" style={{ flexShrink: 0 }} />
          <span style={{ fontWeight: 600, fontSize: "0.9375rem", color: "var(--emerald)" }}>Payment complete — result below</span>
        </motion.div>
      )}

      {hasFailed && !isDone && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          style={{
            marginTop: "var(--s6)",
            padding: "var(--s4) var(--s5)",
            background: "var(--rose-dim)",
            border: "1px solid rgba(244,63,94,0.3)",
            borderRadius: "var(--r-xl)",
            display: "flex",
            alignItems: "center",
            gap: "var(--s3)",
          }}
        >
          <AlertCircle size={18} color="var(--rose)" style={{ flexShrink: 0 }} />
          <div style={{ fontWeight: 600, fontSize: "0.9375rem", color: "var(--rose)" }}>Agent execution failed — check the steps above</div>
        </motion.div>
      )}
    </div>
  );
}

interface ResultStep {
  tool: string;
  result: {
    results?: Array<{ title: string; url: string; snippet: string }>;
    summary?: string;
    keyPoints?: string[];
    sentiment?: string;
    themes?: string[];
  };
}

interface AgentResult {
  plan?: string;
  steps?: ResultStep[];
  results?: Array<{ title: string; url: string; snippet: string }>;
  summary?: string;
  keyPoints?: string[];
  sentiment?: string;
  themes?: string[];
}

/* ─── Result Panel ─── */
function ResultPanel({ result }: { result: unknown }) {
  const data = result as AgentResult;
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const renderSingleResult = (res: AgentResult, toolName?: string) => {
    return (
      <div key={toolName || "direct"} style={{ marginBottom: toolName ? "var(--s6)" : 0 }}>
        {toolName && (
          <div style={{ display: "flex", alignItems: "center", gap: "var(--s2)", marginBottom: "var(--s3)" }}>
            <span className="badge badge-neutral" style={{ textTransform: "uppercase", fontSize: "0.625rem" }}>{toolName} Output</span>
          </div>
        )}
        
        {/* Search results */}
        {Array.isArray(res.results) && res.results.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--s3)" }}>
            {res.results.map((r, i) => (
              <div key={i} style={{
                padding: "var(--s4)",
                background: "var(--bg-card)",
                borderRadius: "var(--r-lg)",
                border: "1px solid var(--border-dim)",
              }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "var(--s3)", marginBottom: "var(--s2)" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ fontWeight: 600, fontSize: "0.9375rem", lineHeight: 1.3 }}>{r.title}</span>
                  </div>
                  <a href={r.url} target="_blank" rel="noopener noreferrer" style={{ flexShrink: 0, marginTop: 2 }}>
                    <ExternalLink size={13} color="var(--emerald)" />
                  </a>
                </div>
                <p className="body" style={{ margin: 0, fontSize: "0.8125rem" }}>{r.snippet}</p>
              </div>
            ))}
          </div>
        )}

        {/* Summary result */}
        {typeof res.summary === "string" && !Array.isArray(res.results) && (
          <div>
            <p className="body" style={{ marginBottom: "var(--s4)" }}>{res.summary}</p>
            {Array.isArray(res.keyPoints) && (
              <ul style={{ display: "flex", flexDirection: "column", gap: "var(--s2)", paddingLeft: "var(--s4)" }}>
                {res.keyPoints.map((kp, i) => (
                  <li key={i} style={{ fontSize: "0.875rem", color: "var(--text-body)" }}>{kp}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Analysis result */}
        {typeof res.sentiment === "string" && (
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--s4)" }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--s2)" }}>
              <span className={`badge badge-${res.sentiment === "positive" ? "emerald" : res.sentiment === "negative" ? "rose" : "amber"}`}>
                Sentiment: {res.sentiment}
              </span>
              {Array.isArray(res.themes) && res.themes.map((t) => (
                <span key={t} className="badge badge-indigo">{t}</span>
              ))}
            </div>
          </div>
        )}
        
        {/* Fallback */}
        {!res.results && !res.summary && !res.sentiment && (
          <pre style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-body)", whiteSpace: "pre-wrap" }}>
            {JSON.stringify(res, null, 2)}
          </pre>
        )}
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border-glow)",
        borderRadius: "var(--r-xl)",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div style={{
        padding: "var(--s4) var(--s5)",
        borderBottom: "1px solid var(--border-dim)",
        background: "var(--bg-card)",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--s2)" }}>
          <CheckCircle2 size={14} color="var(--emerald)" />
          <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--emerald)" }}>Insights Unlocked</span>
        </div>
        <button onClick={handleCopy} className="btn btn-ghost" style={{ fontSize: "0.75rem", padding: "4px var(--s3)", gap: "var(--s1)" }}>
          <Copy size={12} />{copied ? "Copied" : "Copy"}
        </button>
      </div>

      {/* Content */}
      <div style={{ padding: "var(--s5)" }}>
        {data.plan && (
          <div style={{ marginBottom: "var(--s6)", padding: "var(--s4)", background: "var(--bg-deep)", borderRadius: "var(--r-lg)", border: "1px solid var(--border-dim)" }}>
            <div className="caption" style={{ marginBottom: "var(--s2)" }}>Agent Strategy</div>
            <p className="body" style={{ margin: 0, fontSize: "0.875rem", fontStyle: "italic" }}>
              &quot;{data.plan}&quot;
            </p>
          </div>
        )}

        {Array.isArray(data.steps) ? (
          data.steps.map((s) => renderSingleResult(s.result, s.tool))
        ) : (
          renderSingleResult(data)
        )}
      </div>
    </motion.div>
  );
}

/* ─── Empty State ─── */
function EmptyState() {
  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      height: "100%",
      color: "var(--text-muted)",
      gap: "var(--s5)",
      paddingBottom: "var(--s16)",
      textAlign: "center",
    }}>
      <div style={{
        width: 80,
        height: 80,
        borderRadius: "var(--r-xl)",
        background: "var(--bg-surface)",
        border: "1px solid var(--border-dim)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transform: "rotate(-3deg)",
      }}>
        <Zap size={32} strokeWidth={1.5} color="var(--text-body)" />
      </div>
      <div>
        <h3 className="h3" style={{ marginBottom: "var(--s2)", color: "var(--text)" }}>Awaiting Orders</h3>
        <p className="body">
          Type a request in the prompt box above to initiate the agent.<br/>
          It will seamlessly handle tool discovery and payments.
        </p>
      </div>
    </div>
  );
}

/* ─── On-Chain Verifier ─── */
function OnChainVerifier() {
  const [data, setData] = useState<{ onChainSpentUsd?: number; contract?: string; verified?: boolean; warning?: string } | null>(null);
  const [loading, setLoading] = useState(false);

  // For the hackathon demo, we use the receiver address as the 'agent' being tracked
  // or a sample address that has activity.
  const address = "GB77G4BRHXR6ZA7Z3KAPXXDJPD7QCLPZBILBFMQ6NYHJKVEJS47NLBAG";

  const verify = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/health/onchain?address=${address}`);
      const json = await res.json();
      setData(json);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    verify();
    // Poll less frequently to reduce Soroban RPC load.
    const interval = setInterval(verify, 60000);
    return () => clearInterval(interval);
  }, []);

  if (!data && !loading) return null;

  const isVerified = data?.verified !== false;

  return (
    <div style={{
      marginTop: "var(--s4)",
      padding: "var(--s3) var(--s4)",
      background: isVerified ? "rgba(16,185,129,0.05)" : "rgba(245,158,11,0.05)",
      border: `1px solid ${isVerified ? "rgba(16,185,129,0.2)" : "rgba(245,158,11,0.2)"}`,
      borderRadius: "var(--r-lg)",
      display: "flex",
      flexDirection: "column",
      gap: "var(--s2)",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ 
          display: "flex", 
          alignItems: "center", 
          gap: "var(--s2)", 
          color: isVerified ? "var(--emerald)" : "var(--amber)", 
          fontWeight: 600, 
          fontSize: "0.75rem" 
        }}>
          {isVerified ? <Lock size={12} /> : <AlertCircle size={12} />} 
          {isVerified ? "On-chain Policy" : "Policy Sync Delayed"}
        </div>
        {loading && <Loader2 size={10} style={{ animation: "spin 1s linear infinite" }} color={isVerified ? "var(--emerald)" : "var(--amber)"} />}
      </div>
      
      {!isVerified ? (
        <div style={{ fontSize: "0.625rem", color: "var(--text-dim)", fontStyle: "italic" }}>
          {data?.warning || "Stellar network busy..."}
        </div>
      ) : (
        <>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: "0.6875rem", color: "var(--text-dim)" }}>Verified Spend:</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.8125rem", fontWeight: 700, color: "var(--text)" }}>
              ${data?.onChainSpentUsd?.toFixed(4) || "0.0000"}
            </span>
          </div>

          <div style={{ fontSize: "0.5625rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)", overflow: "hidden", textOverflow: "ellipsis" }}>
            Contract: {data?.contract?.slice(0, 8)}...
          </div>
        </>
      )}
    </div>
  );
}

/* ─── Budget Drawer (Donut Chart) ─── */
function BudgetDrawer({
  summary,
}: {
  summary: { limit: number; used: number; remaining: number; percentage: number; transactionCount: number } | null;
}) {
  const { transactions } = useAppStore();
  const txTotal = transactions.filter(t => t.status === "success").reduce((s, t) => s + t.amount, 0);

  const limit = summary?.limit || 5;
  const used = summary?.used || txTotal;
  const pct = Math.min(Math.round((used / limit) * 100), 100);
  const count = summary?.transactionCount || transactions.filter(t => t.status === "success").length;

  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (pct / 100) * circumference;
  const ringColor = pct > 80 ? "var(--rose)" : pct > 50 ? "var(--amber)" : "var(--emerald)";

  return (
    <div>
      {/* Section label */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--s4)" }}>
        <div className="caption" style={{ display: "flex", alignItems: "center", gap: "var(--s2)" }}>
          <Wallet size={13} /> Budget
        </div>
        <span className={`badge badge-${pct > 80 ? "rose" : pct > 50 ? "amber" : "emerald"}`} style={{ fontSize: "0.625rem" }}>
          {pct > 80 ? "Low" : pct > 50 ? "Mid" : "Healthy"}
        </span>
      </div>

      {/* Donut + stats row */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--s5)",
        background: "var(--bg-deep)",
        padding: "var(--s4)",
        borderRadius: "var(--r-xl)",
        border: "1px solid var(--border-dim)",
        marginBottom: "var(--s3)",
      }}>
        <div style={{ position: "relative", width: 80, height: 80, flexShrink: 0 }}>
          <svg width="80" height="80" viewBox="0 0 100 100" style={{ transform: "rotate(-90deg)" }}>
            <circle cx="50" cy="50" r={radius} fill="transparent" stroke="var(--bg-hover)" strokeWidth="9" />
            <circle cx="50" cy="50" r={radius} fill="transparent" stroke={ringColor} strokeWidth="9"
              strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} strokeLinecap="round"
              style={{ transition: "stroke-dashoffset 1s ease-out, stroke 0.5s ease" }}
            />
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.8125rem", fontWeight: 700 }}>{pct}%</span>
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="caption" style={{ marginBottom: 2 }}>Spent</div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: "1.375rem", fontWeight: 700, lineHeight: 1, color: ringColor }}>
            ${used.toFixed(2)}
          </div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", marginTop: 3 }}>of ${limit.toFixed(2)}</div>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--s2)" }}>
        {[
          { label: "Remaining", value: `$${(limit - used).toFixed(2)}` },
          { label: "Transactions", value: String(count) },
        ].map(s => (
          <div key={s.label} style={{
            background: "var(--bg-surface)",
            padding: "var(--s3) var(--s4)",
            borderRadius: "var(--r-lg)",
            border: "1px solid var(--border-dim)",
            textAlign: "center",
          }}>
            <div className="caption" style={{ marginBottom: 2, fontSize: "0.625rem" }}>{s.label}</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "0.9375rem", fontWeight: 700 }}>{s.value}</div>
          </div>
        ))}
      </div>

      <OnChainVerifier />
    </div>
  );
}

/* ─── Tools Panel ─── */
function ToolsPanel({ catalog }: { catalog: Tool[] }) {
  const toolIcon: Record<string, React.ElementType> = { 
    search: Search, 
    "mpp-search": Zap, 
    summarize: FileText, 
    analyze: BarChart3 
  };
  
  const toolColor: Record<string, string> = { 
    search: "var(--indigo)", 
    "mpp-search": "var(--indigo)", 
    summarize: "var(--emerald)", 
    analyze: "var(--amber)" 
  };

  return (
    <div>
      {/* Divider */}
      <div style={{ height: 1, background: "var(--border-dim)", margin: "0 calc(-1 * var(--s6)) var(--s5)" }} />

      <div className="caption" style={{ marginBottom: "var(--s3)", display: "flex", alignItems: "center", gap: "var(--s2)" }}>
        <Zap size={13} /> Tools
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "var(--s2)" }}>
        {catalog.map((t) => {
          const Icon = toolIcon[t.id] || Zap;
          const color = toolColor[t.id] || "var(--text-muted)";
          const protocol = t.payment?.protocol?.toUpperCase() || "X402";
          
          return (
            <div key={t.id} style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--s3)",
              padding: "var(--s3) var(--s4)",
              borderRadius: "var(--r-md)",
              background: "var(--bg-surface)",
              border: "1px solid var(--border-dim)",
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
                <div style={{ fontSize: "0.6875rem", color: "var(--text-dim)", marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.description}</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2, flexShrink: 0 }}>
                <span className="cost" style={{ fontSize: "0.625rem" }}>${t.priceUsd.toFixed(2)}</span>
                <span style={{ fontSize: "0.5rem", color: protocol === "MPP" ? "var(--indigo)" : "var(--text-dim)", fontWeight: 600, letterSpacing: "0.03em" }}>{protocol}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Payments View ─── */
function PaymentsView({ transactions }: { transactions: Transaction[] }) {
  const normalizedTxs = transactions.map(t => ({
    ...t,
    tool: t.tool_name,
    hash: t.tx_hash,
    time: t.created_at,
  }));

  const totalSpent = normalizedTxs.filter(t => t.status === "success").reduce((s, t) => s + t.amount, 0);

  const toolIcon: Record<string, React.ElementType> = { search: Search, summarize: FileText, analyze: BarChart3 };
  const toolColor: Record<string, string> = { search: "var(--indigo)", summarize: "var(--emerald)", analyze: "var(--amber)" };

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "var(--s6) var(--s8)" }}>
      {/* Summary strip */}
      <div style={{ display: "flex", gap: "var(--s3)", marginBottom: "var(--s6)", flexWrap: "wrap" }}>
        {[
          { label: "Total Transactions", value: normalizedTxs.length },
          { label: "Total Spent", value: `$${totalSpent.toFixed(4)}` },
          { label: "Success Rate", value: `${normalizedTxs.length ? Math.round((normalizedTxs.filter(t => t.status === "success").length / normalizedTxs.length) * 100) : 0}%` },
        ].map(s => (
          <div key={s.label} style={{ flex: 1, minWidth: 120, background: "var(--bg-surface)", border: "1px solid var(--border-dim)", borderRadius: "var(--r-lg)", padding: "var(--s4) var(--s5)" }}>
            <div className="caption" style={{ marginBottom: "var(--s1)" }}>{s.label}</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "1.125rem", fontWeight: 700 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Transaction list */}
      {normalizedTxs.length === 0 ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 200, gap: "var(--s3)", color: "var(--text-muted)" }}>
          <CreditCard size={32} strokeWidth={1.5} />
          <p className="body">No transactions yet. Run an agent task to see payments here.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--s2)" }}>
          <div className="caption" style={{ marginBottom: "var(--s3)" }}>Transaction History · {normalizedTxs.length} records</div>
          {normalizedTxs.map((tx, i) => {
            const Icon = toolIcon[tx.tool] || Zap;
            const color = toolColor[tx.tool] || "var(--text-muted)";
            return (
              <motion.div
                key={tx.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: Math.min(i * 0.03, 0.3) }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--s4)",
                  padding: "var(--s4) var(--s5)",
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border-dim)",
                  borderRadius: "var(--r-lg)",
                  transition: "border-color 150ms ease, background 150ms ease",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "var(--bg-card)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border-dim)"; e.currentTarget.style.background = "var(--bg-surface)"; }}
              >
                {/* Tool icon */}
                <div style={{ width: 36, height: 36, borderRadius: "var(--r-md)", background: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Icon size={16} color={color} />
                </div>

                {/* Tool + time */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: "0.9375rem", textTransform: "capitalize", marginBottom: 2 }}>{tx.tool}</div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", fontFamily: "var(--font-mono)" }}>
                    {tx.time ? new Date(tx.time).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}
                  </div>
                </div>

                {/* Tx hash */}
                <div className="col-hide-mobile" style={{ flex: 1, minWidth: 0 }}>
                  {tx.hash ? (
                    <a href={`https://stellar.expert/explorer/testnet/tx/${tx.hash.replace("stellar:", "")}`} target="_blank" rel="noopener noreferrer"
                      style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <code style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--emerald)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 160, display: "block" }}>
                        {tx.hash.replace("stellar:", "").slice(0, 16)}…
                      </code>
                      <ExternalLink size={11} color="var(--emerald)" style={{ flexShrink: 0 }} />
                    </a>
                  ) : <span style={{ color: "var(--text-dim)", fontSize: "0.75rem" }}>—</span>}
                </div>

                {/* Status + amount */}
                <div style={{ display: "flex", alignItems: "center", gap: "var(--s3)", flexShrink: 0 }}>
                  <span className={`badge badge-${tx.status === "success" ? "emerald" : tx.status === "failed" ? "rose" : "amber"}`}>
                    {tx.status === "success" ? <CheckCircle2 size={10} /> : tx.status === "failed" ? <AlertCircle size={10} /> : <Clock size={10} />}
                    {tx.status}
                  </span>
                  <span className="cost">${tx.amount.toFixed(2)}</span>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ─── Settings View ─── */
function SettingsView() {
  const { session } = useAppStore();

  const fields = [
    { icon: Zap, label: "Network", value: "Stellar Testnet", color: "var(--emerald)" },
    { icon: Wallet, label: "Asset", value: "USDC", color: "var(--indigo)" },
    { icon: DollarSign, label: "Spending Limit", value: `$${session?.spending_limit?.toFixed(2) ?? "5.00"} per session`, color: "var(--amber)" },
    { icon: CreditCard, label: "Session ID", value: session?.id ?? "Initializing...", mono: true, color: "var(--text-muted)" },
    { icon: Clock, label: "Expires", value: session?.expires_at ? new Date(session.expires_at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—", mono: true, color: "var(--text-muted)" },
  ];

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "var(--s8) var(--s10)" }}>
      {/* Page header */}
      <div style={{ marginBottom: "var(--s8)" }}>
        <h2 className="h2" style={{ marginBottom: "var(--s2)" }}>Configuration</h2>
        <p className="body">Active session settings and network parameters.</p>
      </div>

      {/* Settings grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "var(--s4)", maxWidth: 900 }}>
        {fields.map((f) => (
          <div key={f.label} style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-dim)",
            borderRadius: "var(--r-xl)",
            padding: "var(--s5)",
            display: "flex",
            flexDirection: "column",
            gap: "var(--s3)",
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
              fontWeight: 600,
              color: "var(--text)",
              wordBreak: "break-all",
              lineHeight: 1.4,
            }}>
              {f.value}
            </div>
          </div>
        ))}
      </div>

      {/* Wallet Connect */}
      <div style={{ marginTop: "var(--s8)", maxWidth: 900 }}>
        <div className="caption" style={{ marginBottom: "var(--s4)", display: "flex", alignItems: "center", gap: "var(--s2)" }}>
          <Wallet size={13} /> Wallet Connection
        </div>
        <WalletConnect />
      </div>

      {/* MPP Protocol info */}
      <div style={{ marginTop: "var(--s5)", maxWidth: 900 }}>
        <div className="caption" style={{ marginBottom: "var(--s4)", display: "flex", alignItems: "center", gap: "var(--s2)" }}>
          <Zap size={13} /> Payment Protocols
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--s3)" }}>
          {[
            { label: "x402", desc: "HTTP-native per-request payments", badge: "Active", color: "var(--emerald)" },
            { label: "MPP", desc: "Machine Payments Protocol by Stripe", badge: "Active", color: "var(--indigo)" },
          ].map(p => (
            <div key={p.label} style={{
              background: "var(--bg-surface)",
              border: "1px solid var(--border-dim)",
              borderRadius: "var(--r-lg)",
              padding: "var(--s4)",
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--s1)" }}>
                <span style={{ fontWeight: 700, fontSize: "0.9375rem", color: p.color }}>{p.label}</span>
                <span className="badge badge-emerald" style={{ fontSize: "0.5625rem" }}>{p.badge}</span>
              </div>
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{p.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Network info strip */}
      <div style={{
        marginTop: "var(--s8)",
        maxWidth: 900,
        padding: "var(--s4) var(--s5)",
        background: "var(--emerald-dim)",
        border: "1px solid rgba(16,185,129,0.2)",
        borderRadius: "var(--r-lg)",
        display: "flex",
        alignItems: "center",
        gap: "var(--s3)",
      }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--emerald)", flexShrink: 0, animation: "pulse-dot 2s ease infinite" }} />
        <span style={{ fontSize: "0.8125rem", color: "var(--emerald)", fontWeight: 500 }}>
          Connected to Stellar Testnet · x402 Protocol v2 · USDC micropayments active
        </span>
      </div>
    </div>
  );
}
