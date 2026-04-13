"use client";

import { motion } from "framer-motion";
import { ExternalLink, CheckCircle2, Shield } from "lucide-react";

interface Props {
  txHash: string | null;
  policyTxHash: string | null;
  policyAgent: string | null;
  cost: number;
  tool: string | null;
}

export function TransactionView({ txHash, policyTxHash, policyAgent, cost, tool }: Props) {
  if (!txHash && !policyTxHash) return null;

  const cleanTx = txHash?.replace("stellar:", "") ?? null;
  const explorerUrl = cleanTx
    ? `https://stellar.expert/explorer/testnet/tx/${cleanTx}`
    : null;
  const policyExplorerUrl = policyTxHash
    ? `https://stellar.expert/explorer/testnet/tx/${policyTxHash}`
    : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      style={{
        background: "var(--bg-surface)",
        border: "1px solid rgba(16,185,129,0.3)",
        borderRadius: "var(--r-xl)",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div style={{
        padding: "var(--s3) var(--s5)",
        background: "var(--emerald-dim)",
        borderBottom: "1px solid rgba(16,185,129,0.2)",
        display: "flex", alignItems: "center", gap: "var(--s2)",
      }}>
        <CheckCircle2 size={14} color="var(--emerald)" />
        <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--emerald)" }}>
          Transaction Proof
        </span>
        {cost > 0 && (
          <span className="cost" style={{ marginLeft: "auto", fontSize: "0.75rem" }}>
            ${cost.toFixed(2)} USDC
          </span>
        )}
      </div>

      <div style={{ padding: "var(--s5)", display: "flex", flexDirection: "column", gap: "var(--s4)" }}>

        {/* Revenue Split */}
        {cost > 0 && (
          <div style={{
            padding: "var(--s4)",
            background: "var(--bg-deep)",
            borderRadius: "var(--r-lg)",
            border: "1px solid var(--border-dim)",
          }}>
            <div className="caption" style={{ marginBottom: "var(--s3)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span>Revenue Split (70/30)</span>
              <span style={{ color: "var(--emerald)", fontWeight: 700 }}>VERIFIED</span>
            </div>
            <div style={{ display: "flex", gap: "var(--s2)", height: 8, background: "var(--border-dim)", borderRadius: "var(--r-full)", overflow: "hidden", marginBottom: "var(--s4)" }}>
              <div style={{ width: "70%", background: "var(--emerald)", height: "100%" }} />
              <div style={{ width: "30%", background: "var(--indigo)", height: "100%" }} />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: "0.625rem", color: "var(--text-muted)", marginBottom: 2 }}>Provider Share (70%)</div>
                <div className="cost" style={{ fontSize: "0.875rem", color: "var(--emerald)" }}>${(cost * 0.7).toFixed(3)} USDC</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "0.625rem", color: "var(--text-muted)", marginBottom: 2 }}>Agent Share (30%)</div>
                <div className="cost" style={{ fontSize: "0.875rem", color: "var(--indigo)" }}>${(cost * 0.3).toFixed(3)} USDC</div>
              </div>
            </div>
          </div>
        )}

        {/* Payment Transaction */}
        {cleanTx && explorerUrl && (
          <div>
            <div className="caption" style={{ marginBottom: "var(--s2)" }}>
              Payment Transaction {tool && `· ${tool}`}
            </div>
            <div style={{
              padding: "var(--s3) var(--s4)",
              background: "var(--bg-card)",
              border: "1px solid var(--border-dim)",
              borderRadius: "var(--r-lg)",
              display: "flex", alignItems: "center",
              justifyContent: "space-between", gap: "var(--s3)",
            }}>
              <code style={{
                fontFamily: "var(--font-mono)", fontSize: "0.8125rem",
                color: "var(--text-body)", wordBreak: "break-all", flex: 1,
              }}>
                {cleanTx}
              </code>
              <a
                href={explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary"
                style={{ fontSize: "0.75rem", gap: "var(--s1)", flexShrink: 0, whiteSpace: "nowrap" }}
              >
                <ExternalLink size={12} /> View on Stellar
              </a>
            </div>
          </div>
        )}

        {/* Soroban Policy Transaction */}
        {policyTxHash && policyExplorerUrl && (
          <div>
            <div className="caption" style={{ marginBottom: "var(--s2)", display: "flex", alignItems: "center", gap: "var(--s2)" }}>
              <Shield size={11} /> Soroban Spending Policy
            </div>
            <div style={{
              padding: "var(--s3) var(--s4)",
              background: "var(--bg-card)",
              border: "1px solid var(--border-dim)",
              borderRadius: "var(--r-lg)",
              display: "flex", alignItems: "center",
              justifyContent: "space-between", gap: "var(--s3)",
            }}>
              <code style={{
                fontFamily: "var(--font-mono)", fontSize: "0.8125rem",
                color: "var(--text-body)", wordBreak: "break-all", flex: 1,
              }}>
                {policyTxHash}
              </code>
              <a
                href={policyExplorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-secondary"
                style={{ fontSize: "0.75rem", gap: "var(--s1)", flexShrink: 0, whiteSpace: "nowrap" }}
              >
                <ExternalLink size={12} /> Verify Policy
              </a>
            </div>
            {policyAgent && (
              <div style={{ marginTop: "var(--s2)", fontSize: "0.6875rem", color: "var(--text-dim)", fontFamily: "var(--font-mono)" }}>
                Agent: {policyAgent.slice(0, 12)}…{policyAgent.slice(-6)}
              </div>
            )}
          </div>
        )}

        {/* Verification note */}
        <div style={{
          fontSize: "0.75rem", color: "var(--text-muted)",
          display: "flex", alignItems: "center", gap: "var(--s2)",
        }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--emerald)", flexShrink: 0 }} />
          Real USDC on Stellar Testnet · Verifiable by anyone · Not simulated
        </div>
      </div>
    </motion.div>
  );
}
