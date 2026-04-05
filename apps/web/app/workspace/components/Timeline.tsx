"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Lock, DollarSign, CheckCircle2, AlertCircle,
  Clock, Loader2, ExternalLink,
} from "lucide-react";
import type { AgentStep } from "@/lib/types";

const STEP_ICONS: Record<string, React.ElementType> = {
  calling: Search,
  payment_required: Lock,
  paying: DollarSign,
  success: CheckCircle2,
  failed: AlertCircle,
  pending: Clock,
};

const STEP_COLORS: Record<string, string> = {
  calling: "var(--indigo)",
  payment_required: "var(--amber)",
  paying: "var(--indigo)",
  success: "var(--emerald)",
  failed: "var(--rose)",
  pending: "var(--text-muted)",
};

const ease = [0.22, 1, 0.36, 1] as const;

interface Props {
  steps: AgentStep[];
}

export function Timeline({ steps }: Props) {
  const isDone =
    steps.length > 0 &&
    steps[steps.length - 1].action === "Done" &&
    steps[steps.length - 1].status === "success";
  const hasFailed = steps.some((s) => s.status === "failed");

  return (
    <div style={{ display: "flex", flexDirection: "column", position: "relative" }}>
      {/* Connecting line */}
      <div style={{
        position: "absolute", top: 24, bottom: 24, left: 23,
        width: 2, background: "var(--border-dim)", zIndex: 0,
      }} />

      <AnimatePresence mode="popLayout">
        {steps.map((step, i) => {
          const Icon = STEP_ICONS[step.status] ?? Clock;
          const color = STEP_COLORS[step.status] ?? "var(--text-muted)";
          const isLast = i === steps.length - 1;
          const txHash = step.action === "Payment confirmed"
            ? step.detail.replace("tx: stellar:", "")
            : null;

          return (
            <motion.div
              key={`${step.id}-${step.action}`}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease }}
              style={{
                display: "flex", alignItems: "flex-start",
                gap: "var(--s6)", paddingBottom: isLast ? 0 : "var(--s8)",
                position: "relative", zIndex: 1,
              }}
            >
              <div style={{
                width: 48, height: 48, borderRadius: "var(--r-full)",
                background: "var(--bg-deep)", border: `2px solid ${color}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                flexShrink: 0, boxShadow: "0 0 0 4px var(--bg-deep)",
              }}>
                {step.status === "paying" && !isLast
                  ? <Loader2 size={20} color={color} style={{ animation: "spin 1s linear infinite" }} />
                  : <Icon size={20} color={color} />}
              </div>

              <div style={{
                flex: 1, minWidth: 0,
                background: "var(--bg-surface)", border: "1px solid var(--border)",
                borderRadius: "var(--r-xl)", padding: "var(--s4) var(--s5)",
                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              }}>
                <div style={{
                  display: "flex", alignItems: "center",
                  justifyContent: "space-between", marginBottom: "var(--s1)",
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
                {txHash && (
                  <a
                    href={`https://stellar.expert/explorer/testnet/tx/${txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: "inline-flex", alignItems: "center", gap: 4,
                      marginTop: "var(--s2)", fontSize: "0.75rem", color: "var(--emerald)",
                    }}
                  >
                    <ExternalLink size={11} /> View on Stellar Explorer
                  </a>
                )}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {isDone && (
        <motion.div
          initial={{ opacity: 0, y: 12, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.4, ease }}
          style={{
            marginTop: "var(--s6)", padding: "var(--s4) var(--s5)",
            background: "var(--emerald-dim)", border: "1px solid rgba(16,185,129,0.3)",
            borderRadius: "var(--r-xl)", display: "flex", alignItems: "center", gap: "var(--s3)",
          }}
        >
          <CheckCircle2 size={18} color="var(--emerald)" style={{ flexShrink: 0 }} />
          <span style={{ fontWeight: 600, fontSize: "0.9375rem", color: "var(--emerald)" }}>
            Payment complete — result below
          </span>
        </motion.div>
      )}

      {hasFailed && !isDone && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease }}
          style={{
            marginTop: "var(--s6)", padding: "var(--s4) var(--s5)",
            background: "var(--rose-dim)", border: "1px solid rgba(244,63,94,0.3)",
            borderRadius: "var(--r-xl)", display: "flex", alignItems: "center", gap: "var(--s3)",
          }}
        >
          <AlertCircle size={18} color="var(--rose)" style={{ flexShrink: 0 }} />
          <div style={{ fontWeight: 600, fontSize: "0.9375rem", color: "var(--rose)" }}>
            Agent execution failed — check the steps above
          </div>
        </motion.div>
      )}
    </div>
  );
}
