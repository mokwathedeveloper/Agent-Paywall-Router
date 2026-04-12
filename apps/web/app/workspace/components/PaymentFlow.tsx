"use client";

import { motion } from "framer-motion";
import { Send, Lock, DollarSign, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";

interface AgentStep {
  action: string;
  status: string;
  detail: string;
  cost: number;
}

interface Props {
  steps: AgentStep[];
  isExecuting: boolean;
}

interface FlowStep {
  id: string;
  label: string;
  sublabel: string;
  icon: React.ElementType;
  color: string;
  state: "pending" | "active" | "done" | "failed";
}

export function PaymentFlow({ steps, isExecuting }: Props) {
  if (steps.length === 0 && !isExecuting) return null;

  const has402       = steps.some(s => s.status === "payment_required");
  const hasPaying    = steps.some(s => s.status === "paying");
  const hasConfirmed = steps.some(s => s.action.includes("confirmed") && s.status === "success" && s.detail.includes("tx:"));
  const hasDone      = steps.some(s => s.action === "Done" && s.status === "success");
  const hasFailed    = steps.some(s => s.status === "failed");

  // Find cost from paying step
  const payingStep = steps.find(s => s.status === "paying");
  const cost = payingStep?.cost ?? 0;

  // Find tx hash from confirmed step
  const confirmedStep = steps.find(s => s.action.includes("confirmed") && s.detail.includes("tx:"));
  const txHash = confirmedStep?.detail.startsWith("tx: stellar:")
    ? confirmedStep.detail.replace("tx: stellar:", "").split(" ")[0]
    : null;

  const flowSteps: FlowStep[] = [
    {
      id: "request",
      label: "Request Sent",
      sublabel: "Agent calls tool endpoint",
      icon: Send,
      color: "var(--indigo)",
      state: steps.length > 0 ? "done" : "pending",
    },
    {
      id: "402",
      label: "402 Received",
      sublabel: "Payment Required",
      icon: Lock,
      color: "var(--amber)",
      state: hasFailed && !has402 ? "failed" : has402 ? "done" : steps.length > 0 ? "active" : "pending",
    },
    {
      id: "pay",
      label: "USDC Signed",
      sublabel: cost > 0 ? `$${cost.toFixed(2)} on Stellar` : "Signing payment",
      icon: DollarSign,
      color: "var(--indigo)",
      state: hasFailed && !hasPaying ? "failed" : hasConfirmed ? "done" : hasPaying ? "active" : "pending",
    },
    {
      id: "retry",
      label: "Request Retried",
      sublabel: "With payment receipt",
      icon: RefreshCw,
      color: "var(--emerald)",
      state: hasDone ? "done" : hasConfirmed ? "active" : "pending",
    },
    {
      id: "response",
      label: "Response Received",
      sublabel: txHash ? `tx: ${txHash.slice(0, 8)}…` : "Awaiting result",
      icon: CheckCircle2,
      color: "var(--emerald)",
      state: hasFailed ? "failed" : hasDone ? "done" : "pending",
    },
  ];

  return (
    <div style={{
      background: "var(--bg-surface)",
      border: "1px solid var(--border-dim)",
      borderRadius: "var(--r-xl)",
      overflow: "hidden",
    }}>
      <div style={{
        padding: "var(--s3) var(--s5)",
        background: "var(--bg-card)",
        borderBottom: "1px solid var(--border-dim)",
        display: "flex", alignItems: "center", gap: "var(--s2)",
      }}>
        <DollarSign size={13} color="var(--amber)" />
        <span style={{ fontSize: "0.8125rem", fontWeight: 600 }}>Payment Flow</span>
        <span style={{ fontSize: "0.6875rem", color: "var(--text-muted)", marginLeft: "auto" }}>
          x402 Protocol · Stellar Testnet
        </span>
      </div>

      <div style={{ padding: "var(--s4) var(--s5)" }}>
        {/* Flow steps */}
        <div style={{ display: "flex", alignItems: "center", gap: 0, overflowX: "auto", paddingBottom: "var(--s2)" }}>
          {flowSteps.map((step, i) => {
            const Icon = step.state === "failed" ? AlertCircle : step.icon;
            const color = step.state === "failed" ? "var(--rose)"
              : step.state === "done" ? "var(--emerald)"
              : step.state === "active" ? step.color
              : "var(--text-dim)";
            const bg = step.state === "failed" ? "var(--rose-dim)"
              : step.state === "done" ? "var(--emerald-dim)"
              : step.state === "active" ? `${step.color}18`
              : "var(--bg-hover)";

            return (
              <div key={step.id} style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "var(--s1)", minWidth: 80 }}
                >
                  <div style={{
                    width: 36, height: 36, borderRadius: "var(--r-full)",
                    background: bg, border: `2px solid ${color}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "all 0.3s ease",
                  }}>
                    <Icon
                      size={16}
                      color={color}
                      style={step.state === "active" ? { animation: "spin 1s linear infinite" } : undefined}
                    />
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: "0.625rem", fontWeight: 600, color, lineHeight: 1.2 }}>
                      {step.label}
                    </div>
                    <div style={{ fontSize: "0.5625rem", color: "var(--text-dim)", lineHeight: 1.3, marginTop: 1 }}>
                      {step.sublabel}
                    </div>
                  </div>
                </motion.div>

                {/* Connector line */}
                {i < flowSteps.length - 1 && (
                  <div style={{
                    width: 24, height: 2, flexShrink: 0,
                    background: flowSteps[i + 1].state === "pending" ? "var(--border-dim)" : "var(--emerald)",
                    transition: "background 0.3s ease",
                    marginBottom: 20,
                  }} />
                )}
              </div>
            );
          })}
        </div>

        {/* Error message */}
        {hasFailed && (
          <div style={{
            marginTop: "var(--s3)", padding: "var(--s3) var(--s4)",
            background: "var(--rose-dim)", border: "1px solid rgba(244,63,94,0.3)",
            borderRadius: "var(--r-lg)", fontSize: "0.8125rem",
            color: "var(--rose)", fontWeight: 600,
          }}>
            Payment failed. Agent stopped execution.
          </div>
        )}
      </div>
    </div>
  );
}
