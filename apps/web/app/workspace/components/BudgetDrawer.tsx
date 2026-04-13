"use client";

import { useEffect, useRef, useState } from "react";
import { Wallet, Lock, AlertCircle, Loader2 } from "lucide-react";
import { useAppStore } from "@/lib/store";
import type { SpendingSummary } from "@/lib/types";

interface OnChainData {
  onChainSpentUsd?: number;
  contract?: string;
  verified?: boolean;
  warning?: string;
}

function OnChainVerifier() {
  const [data, setData] = useState<OnChainData | null>(null);
  const [loading, setLoading] = useState(false);
  const mountedRef = useRef(true);

  const verify = async (address: string) => {
    if (!mountedRef.current) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/health/onchain?address=${address}`);
      const json = await res.json() as OnChainData;
      if (mountedRef.current) setData(json);
    } catch {
      // Soroban RPC unavailable — silent
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  useEffect(() => {
    mountedRef.current = true;
    let interval: ReturnType<typeof setInterval> | null = null;
    // Fetch the real agent wallet address from the health endpoint
    fetch("/api/health")
      .then(r => r.json())
      .then((h: { agentWallet?: string }) => {
        const addr = h.agentWallet;
        if (addr && addr !== "not configured" && mountedRef.current) {
          verify(addr);
          interval = setInterval(() => verify(addr), 60_000);
        }
      })
      .catch(() => null);
    return () => {
      mountedRef.current = false;
      if (interval) clearInterval(interval);
    };
  }, []);

  const isVerified = data?.verified !== false;

  return (
    <div style={{
      marginTop: "var(--s4)", padding: "var(--s3) var(--s4)",
      background: isVerified ? "rgba(16,185,129,0.05)" : "rgba(245,158,11,0.05)",
      border: `1px solid ${isVerified ? "rgba(16,185,129,0.2)" : "rgba(245,158,11,0.2)"}`,
      borderRadius: "var(--r-lg)", display: "flex", flexDirection: "column", gap: "var(--s2)",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{
          display: "flex", alignItems: "center", gap: "var(--s2)",
          color: isVerified ? "var(--emerald)" : "var(--amber)",
          fontWeight: 600, fontSize: "0.75rem",
        }}>
          {isVerified ? <Lock size={12} /> : <AlertCircle size={12} />}
          {isVerified ? "On-chain Policy" : "Policy Sync Delayed"}
        </div>
        {loading && (
          <Loader2
            size={10}
            style={{ animation: "spin 1s linear infinite" }}
            color={isVerified ? "var(--emerald)" : "var(--amber)"}
          />
        )}
      </div>

      {!isVerified ? (
        <div style={{ fontSize: "0.625rem", color: "var(--text-dim)", fontStyle: "italic" }}>
          {data?.warning ?? "Stellar network busy…"}
        </div>
      ) : (
        <>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: "0.6875rem", color: "var(--text-dim)" }}>Verified Spend:</span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "0.8125rem", fontWeight: 700, color: "var(--text)" }}>
              ${(data?.onChainSpentUsd ?? 0).toFixed(4)}
            </span>
          </div>
          <div style={{ fontSize: "0.5625rem", color: "var(--text-muted)", fontFamily: "var(--font-mono)", overflow: "hidden", textOverflow: "ellipsis" }}>
            <a
              href={`https://stellar.expert/explorer/testnet/contract/${data?.contract}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "var(--emerald)", textDecoration: "none" }}
            >
              Contract: {data?.contract?.slice(0, 8)}…
            </a>
          </div>
        </>
      )}
    </div>
  );
}

interface Props {
  summary: SpendingSummary | null;
}

export function BudgetDrawer({ summary }: Props) {
  const { transactions } = useAppStore();
  const txTotal = transactions.filter((t) => t.status === "success").reduce((s, t) => s + t.amount, 0);

  const limit = summary?.limit ?? 5;
  const used = summary?.used ?? txTotal;
  const pct = Math.min(Math.round((used / limit) * 100), 100);
  const count = summary?.transactionCount ?? transactions.filter((t) => t.status === "success").length;

  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (pct / 100) * circumference;
  const ringColor = pct > 80 ? "var(--rose)" : pct > 50 ? "var(--amber)" : "var(--emerald)";
  const healthLabel = pct > 80 ? "Low" : pct > 50 ? "Mid" : "Healthy";
  const badgeVariant = pct > 80 ? "rose" : pct > 50 ? "amber" : "emerald";

  return (
    <div>
      <div title="Global session spending limit. Agent stops if exceeded." style={{ cursor: "help", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--s4)" }}>
        <div className="caption" style={{ display: "flex", alignItems: "center", gap: "var(--s2)" }}>
          <Wallet size={13} /> Budget
        </div>
        <span className={`badge badge-${badgeVariant}`} style={{ fontSize: "0.625rem" }}>
          {healthLabel}
        </span>
      </div>

      <div style={{
        display: "flex", alignItems: "center", gap: "var(--s5)",
        background: "var(--bg-deep)", padding: "var(--s4)",
        borderRadius: "var(--r-xl)", border: "1px solid var(--border-dim)", marginBottom: "var(--s3)",
      }}>
        <div style={{ position: "relative", width: 80, height: 80, flexShrink: 0 }}>
          <svg width="80" height="80" viewBox="0 0 100 100" style={{ transform: "rotate(-90deg)" }}>
            <circle cx="50" cy="50" r={radius} fill="transparent" stroke="var(--bg-hover)" strokeWidth="9" />
            <circle
              cx="50" cy="50" r={radius} fill="transparent"
              stroke={ringColor} strokeWidth="9"
              strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
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

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--s2)" }}>
        {[
          { label: "Remaining", value: `$${(limit - used).toFixed(2)}` },
          { label: "Transactions", value: String(count) },
        ].map((s) => (
          <div key={s.label} style={{
            background: "var(--bg-surface)", padding: "var(--s3) var(--s4)",
            borderRadius: "var(--r-lg)", border: "1px solid var(--border-dim)", textAlign: "center",
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
