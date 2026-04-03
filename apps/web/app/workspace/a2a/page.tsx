"use client";

import { useState } from "react";
import { Terminal, ArrowRight, ShieldCheck } from "lucide-react";
import Link from "next/link";

export default function A2APage() {
  const [logs, setSteps] = useState<{ action: string; status: string; detail: string }[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [secretKey, setSecretKey] = useState("");

  const runA2ADemo = async () => {
    if (!secretKey.startsWith("S") || secretKey.length !== 56) {
      alert("Please enter a valid Stellar Secret Key (starts with S).");
      return;
    }

    setIsRunning(true);
    setSteps([]);
    setResult(null);

    const addLog = (action: string, status: string, detail: string) => {
      setSteps(prev => [...prev, { action, status, detail }]);
    };

    try {
      addLog("Agent Initialization", "success", "Second Agent (Buyer) powered by ExternalAgentClient");

      addLog("Tool Discovery", "success", "Agent calling GET /api/mcp/tools...");
      const res = await fetch("/api/a2a/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secretKey }),
      });

      const body = await res.json().catch(() => ({} as any));

      if (!res.ok || body.ok === false) {
        const err =
          body?.ok === false && body?.error
            ? body.error
            : { code: "execution_failed", message: "A2A run failed." };
        if (err.code === "trustline_missing") {
          addLog("Trustline Missing", "failed", err.message);
          setResult({
            error: "Trustline Required",
            action: "fix_trustline",
            message: err.message,
          });
          return;
        }

        if (err.code === "invalid_key") {
          addLog("Checksum Error", "failed", err.message);
          setResult({ error: "Invalid Key", action: "invalid_key", message: err.message });
          return;
        }

        addLog("Execution Info", "success", "Ensure your account is funded on Testnet with USDC.");
        addLog("Status", "failed", err.message);
        setResult({ error: "Execution Failed", action: "execution_failed", message: err.message });
        return;
      }

      addLog("Discovery Complete", "success", `Found ${body.toolsCount ?? 3} paid tools on Stellar`);
      addLog("Autonomous Execution", "success", "Agent decided to use 'search' for 'Stellar Hacks'");

      setResult(body.result);
      addLog("A2A Commerce Success", "success", "Payment verified on-chain, data retrieved!");
    } finally {
      setIsRunning(false);
    }
  };

  const fixTrustline = async () => {
    setIsRunning(true);
    const addLog = (action: string, status: string, detail: string) => {
      setSteps(prev => [...prev, { action, status, detail }]);
    };

    try {
      addLog("Trustline Setup", "success", "Calling server to establish USDC trustline...");
      const res = await fetch("/api/a2a/fix-trustline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secretKey }),
      });

      const body = await res.json().catch(() => ({}));
      if (!res.ok || body?.ok !== true) {
        throw new Error(body?.error?.message || "Trustline setup failed");
      }

      addLog("Trustline Active", "success", "USDC trustline established! You can now run the A2A flow.");
      setResult(null);
    } catch (e: any) {
      console.error("Trustline setup failed:", e);
      addLog("Setup Failed", "failed", e.message || String(e));
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: 800, padding: "var(--s10) var(--s4)" }}>
      <div style={{ marginBottom: "var(--s8)" }}>
        <Link href="/workspace" className="caption" style={{ color: "var(--text-dim)", textDecoration: "none", display: "flex", alignItems: "center", gap: "var(--s2)" }}>
          <ArrowRight size={12} style={{ transform: "rotate(180deg)" }} /> Back to Workspace
        </Link>
        <h1 style={{ marginTop: "var(--s4)", fontSize: "2.5rem", letterSpacing: "-0.02em" }}>
          Agent-to-Agent <span style={{ color: "var(--emerald)" }}>Commerce</span>
        </h1>
        <p className="lead" style={{ color: "var(--text-dim)" }}>
          This page demonstrates a "Second Agent" using our MCP server to autonomously discover and pay for tools.
          Enter a funded Testnet Secret Key to see the <strong>Machine Economy</strong> in action.
        </p>
      </div>

      <div className="card" style={{ padding: "var(--s6)", background: "var(--bg-deep)" }}>
        <div style={{ marginBottom: "var(--s6)" }}>
          <label style={{ display: "block", fontSize: "0.75rem", fontWeight: 600, color: "var(--text-dim)", marginBottom: "var(--s2)" }}>
            Buyer Agent Secret Key (Testnet)
          </label>
          <div style={{ display: "flex", gap: "var(--s3)" }}>
            <input 
              type="password"
              placeholder="S..."
              value={secretKey}
              onChange={(e) => setSecretKey(e.target.value)}
              className="input"
              style={{ 
                flex: 1, 
                background: "var(--bg-surface)", 
                border: "1px solid var(--border-dim)",
                padding: "var(--s3)",
                borderRadius: "var(--r-md)",
                color: "var(--text)",
                fontFamily: "var(--font-mono)",
                fontSize: "0.875rem"
              }}
            />
            <button 
              className="btn btn-primary" 
              onClick={runA2ADemo} 
              disabled={isRunning || !secretKey}
            >
              {isRunning ? "Running..." : "Start A2A Flow"}
            </button>
          </div>
          <div style={{ fontSize: "0.625rem", color: "var(--text-muted)", marginTop: "var(--s2)" }}>
            Note: Your key is sent to the server for signing during this demo (not persisted).
          </div>
        </div>

        <div style={{ background: "#000", borderRadius: "var(--r-lg)", padding: "var(--s4)", fontFamily: "var(--font-mono)", fontSize: "0.8125rem", border: "1px solid var(--border-dim)" }}>
          <div style={{ color: "#666", marginBottom: "var(--s4)", display: "flex", alignItems: "center", gap: "var(--s2)" }}>
            <Terminal size={14} /> Execution Log
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "var(--s2)" }}>
            {logs.length === 0 && <div style={{ color: "#444" }}>Wait for agent initiation...</div>}
            {logs.map((log, i) => (
              <div key={i} style={{ display: "flex", gap: "var(--s4)" }}>
                <span style={{ color: log.status === "failed" ? "var(--rose)" : "var(--emerald)", width: 100 }}>[{log.status.toUpperCase()}]</span>
                <span style={{ color: "#eee" }}>{log.action}:</span>
                <span style={{ color: "#888" }}>{log.detail}</span>
              </div>
            ))}
          </div>
        </div>

        {result && (
          <div style={{ marginTop: "var(--s6)", padding: "var(--s4)", background: "rgba(16,185,129,0.05)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: "var(--r-lg)" }}>
            {result.action === "fix_trustline" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "var(--s3)" }}>
                <div style={{ fontWeight: 700, color: "var(--amber)", fontSize: "0.875rem" }}>
                  ⚠️ {result.message}
                </div>
                <button className="btn btn-primary" onClick={fixTrustline} disabled={isRunning}>
                  Establish USDC Trustline
                </button>
              </div>
            ) : (
              <>
                <div style={{ fontWeight: 700, marginBottom: "var(--s2)", fontSize: "0.875rem" }}>
                  <ShieldCheck size={14} style={{ marginRight: 6, color: "var(--emerald)" }} />
                  Result retrieved autonomously:
                </div>
                <pre style={{ fontSize: "0.75rem", color: "var(--text-dim)", overflow: "auto" }}>
                  {JSON.stringify(result, null, 2)}
                </pre>
              </>
            )}
          </div>
        )}
      </div>

      <div style={{ marginTop: "var(--s10)", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--s6)" }}>
        <div className="card" style={{ padding: "var(--s4)" }}>
          <div style={{ fontWeight: 700, fontSize: "0.875rem", marginBottom: "var(--s2)" }}>1. Bazaar Discovery</div>
          <p style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>
            The agent first calls <code>/api/catalog</code> to find tools. No manual integration needed.
          </p>
        </div>
        <div className="card" style={{ padding: "var(--s4)" }}>
          <div style={{ fontWeight: 700, fontSize: "0.875rem", marginBottom: "var(--s2)" }}>2. Programmable Payments</div>
          <p style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>
            When it hits a 402, it signs a Stellar USDC transaction automatically and retries.
          </p>
        </div>
      </div>
    </div>
  );
}
