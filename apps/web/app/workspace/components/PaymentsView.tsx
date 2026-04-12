"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Search, FileText, BarChart3, Zap,
  CheckCircle2, AlertCircle, Clock, CreditCard, ExternalLink, Loader2,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import type { DBTransaction } from "@/lib/types";

const TOOL_ICON: Record<string, React.ElementType> = {
  search: Search, summarize: FileText, analyze: BarChart3,
};
const TOOL_COLOR: Record<string, string> = {
  search: "var(--indigo)", summarize: "var(--emerald)", analyze: "var(--amber)",
};

export function PaymentsView() {
  const { session } = useAppStore();
  const [transactions, setTransactions] = useState<DBTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    setLoading(true);
    const url = showAll
      ? "/api/transactions"
      : session?.id
      ? `/api/transactions?sessionId=${session.id}`
      : "/api/transactions";

    fetch(url)
      .then(r => r.json())
      .then(d => setTransactions(d.transactions ?? []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [showAll, session?.id]);

  const successTxs = transactions.filter(t => t.status === "success");
  const totalSpent = successTxs.reduce((s, t) => s + t.amount, 0);
  const successRate = transactions.length
    ? Math.round((successTxs.length / transactions.length) * 100)
    : 0;

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 300, gap: "var(--s3)", color: "var(--text-muted)" }}>
        <Loader2 size={20} style={{ animation: "spin 1s linear infinite" }} />
        <span className="body">Loading transactions…</span>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "var(--s6) var(--s8)" }}>

      {/* Header with session toggle */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--s6)", flexWrap: "wrap", gap: "var(--s3)" }}>
        <div>
          <h2 className="h3" style={{ marginBottom: "var(--s1)" }}>Payment Ledger</h2>
          <div style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>
            {showAll
              ? "All sessions · Stellar Testnet"
              : `Session: ${session?.id ?? "—"} · Stellar Testnet`
            }
          </div>
        </div>
        <button
          onClick={() => setShowAll(v => !v)}
          className="btn btn-secondary"
          style={{ fontSize: "0.75rem" }}
        >
          {showAll ? "Show current session" : "Show all sessions"}
        </button>
      </div>

      {/* Summary strip */}
      <div style={{ display: "flex", gap: "var(--s3)", marginBottom: "var(--s6)", flexWrap: "wrap" }}>
        {[
          { label: "Transactions", value: transactions.length },
          { label: "Total Spent", value: `$${totalSpent.toFixed(4)}` },
          { label: "Success Rate", value: `${successRate}%` },
        ].map(s => (
          <div key={s.label} style={{
            flex: 1, minWidth: 120,
            background: "var(--bg-surface)", border: "1px solid var(--border-dim)",
            borderRadius: "var(--r-lg)", padding: "var(--s4) var(--s5)",
          }}>
            <div className="caption" style={{ marginBottom: "var(--s1)" }}>{s.label}</div>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: "1.125rem", fontWeight: 700 }}>{s.value}</div>
          </div>
        ))}
      </div>

      {transactions.length === 0 ? (
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "center", height: 200, gap: "var(--s3)", color: "var(--text-muted)",
        }}>
          <CreditCard size={32} strokeWidth={1.5} />
          <p className="body">No transactions yet. Run an agent task to see payments here.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--s2)" }}>
          <div className="caption" style={{ marginBottom: "var(--s3)" }}>
            Transaction History · {transactions.length} record{transactions.length !== 1 ? "s" : ""}
          </div>
          {transactions.map((tx, i) => {
            const Icon = TOOL_ICON[tx.tool_name] ?? Zap;
            const color = TOOL_COLOR[tx.tool_name] ?? "var(--text-muted)";
            const cleanHash = tx.tx_hash?.replace("stellar:", "") ?? null;
            const isCurrentSession = tx.session_id === session?.id;

            return (
              <motion.div
                key={tx.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: Math.min(i * 0.02, 0.3) }}
                style={{
                  display: "flex", alignItems: "center", gap: "var(--s4)",
                  padding: "var(--s4) var(--s5)",
                  background: "var(--bg-surface)",
                  border: `1px solid ${isCurrentSession && showAll ? "rgba(16,185,129,0.2)" : "var(--border-dim)"}`,
                  borderRadius: "var(--r-lg)",
                  transition: "border-color 150ms ease, background 150ms ease",
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.background = "var(--bg-card)"; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = isCurrentSession && showAll ? "rgba(16,185,129,0.2)" : "var(--border-dim)"; e.currentTarget.style.background = "var(--bg-surface)"; }}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: "var(--r-md)",
                  background: `${color}18`,
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>
                  <Icon size={16} color={color} />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: "0.9375rem", textTransform: "capitalize", marginBottom: 2 }}>
                    {tx.tool_name}
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-dim)", fontFamily: "var(--font-mono)" }}>
                    {showAll && <span style={{ color: isCurrentSession ? "var(--emerald)" : "var(--text-dim)" }}>{tx.session_id} · </span>}
                    {tx.created_at
                      ? new Date(tx.created_at).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
                      : "—"}
                  </div>
                </div>

                <div className="col-hide-mobile" style={{ flex: 1, minWidth: 0 }}>
                  {cleanHash ? (
                    <a
                      href={`https://stellar.expert/explorer/testnet/tx/${cleanHash}`}
                      target="_blank" rel="noopener noreferrer"
                      style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
                    >
                      <code style={{
                        fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--emerald)",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        maxWidth: 160, display: "block",
                      }}>
                        {cleanHash.slice(0, 16)}…
                      </code>
                      <ExternalLink size={11} color="var(--emerald)" style={{ flexShrink: 0 }} />
                    </a>
                  ) : (
                    <span style={{ color: "var(--text-dim)", fontSize: "0.75rem" }}>—</span>
                  )}
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "var(--s3)", flexShrink: 0 }}>
                  <span className={`badge badge-${tx.status === "success" ? "emerald" : tx.status === "failed" ? "rose" : "amber"}`}>
                    {tx.status === "success"
                      ? <CheckCircle2 size={10} />
                      : tx.status === "failed"
                        ? <AlertCircle size={10} />
                        : <Clock size={10} />}
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
