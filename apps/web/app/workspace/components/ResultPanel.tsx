"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Copy, ExternalLink } from "lucide-react";

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

interface ToolResult {
  results?: SearchResult[];
  summary?: string;
  keyPoints?: string[];
  sentiment?: "positive" | "neutral" | "negative";
  themes?: string[];
}

interface ResultStep {
  tool: string;
  result: ToolResult;
}

interface AgentResult extends ToolResult {
  plan?: string;
  steps?: ResultStep[];
}

const ease = [0.22, 1, 0.36, 1] as const;

function ToolOutput({ res, toolName }: { res: ToolResult; toolName?: string }) {
  return (
    <div style={{ marginBottom: toolName ? "var(--s6)" : 0 }}>
      {toolName && (
        <div style={{ display: "flex", alignItems: "center", gap: "var(--s2)", marginBottom: "var(--s3)" }}>
          <span className="badge badge-neutral" style={{ textTransform: "uppercase", fontSize: "0.625rem" }}>
            {toolName} Output
          </span>
        </div>
      )}

      {Array.isArray(res.results) && res.results.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "var(--s3)" }}>
          {res.results.map((r, i) => (
            <div key={i} style={{
              padding: "var(--s4)", background: "var(--bg-card)",
              borderRadius: "var(--r-lg)", border: "1px solid var(--border-dim)",
            }}>
              <div style={{
                display: "flex", alignItems: "flex-start",
                justifyContent: "space-between", gap: "var(--s3)", marginBottom: "var(--s2)",
              }}>
                <span style={{ fontWeight: 600, fontSize: "0.9375rem", lineHeight: 1.3 }}>{r.title}</span>
                <a href={r.url} target="_blank" rel="noopener noreferrer" style={{ flexShrink: 0, marginTop: 2 }}>
                  <ExternalLink size={13} color="var(--emerald)" />
                </a>
              </div>
              <p className="body" style={{ margin: 0, fontSize: "0.8125rem" }}>{r.snippet}</p>
            </div>
          ))}
        </div>
      )}

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

      {typeof res.sentiment === "string" && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--s2)" }}>
          <span className={`badge badge-${res.sentiment === "positive" ? "emerald" : res.sentiment === "negative" ? "rose" : "amber"}`}>
            Sentiment: {res.sentiment}
          </span>
          {Array.isArray(res.themes) && res.themes.map((t) => (
            <span key={t} className="badge badge-indigo">{t}</span>
          ))}
        </div>
      )}

      {!res.results && !res.summary && !res.sentiment && (
        <pre style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-body)", whiteSpace: "pre-wrap" }}>
          {JSON.stringify(res, null, 2)}
        </pre>
      )}
    </div>
  );
}

export function ResultPanel({ result }: { result: unknown }) {
  const data = result as AgentResult;
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease }}
      style={{
        background: "var(--bg-surface)",
        border: "1px solid var(--border-glow)",
        borderRadius: "var(--r-xl)",
        overflow: "hidden",
      }}
    >
      <div style={{
        padding: "var(--s4) var(--s5)", borderBottom: "1px solid var(--border-dim)",
        background: "var(--bg-card)", display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--s2)" }}>
          <CheckCircle2 size={14} color="var(--emerald)" />
          <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "var(--emerald)" }}>Insights Unlocked</span>
        </div>
        <button onClick={handleCopy} className="btn btn-ghost" style={{ fontSize: "0.75rem", padding: "4px var(--s3)", gap: "var(--s1)" }}>
          <Copy size={12} />{copied ? "Copied" : "Copy"}
        </button>
      </div>

      <div style={{ padding: "var(--s5)" }}>
        {data.plan && (
          <div style={{
            marginBottom: "var(--s6)", padding: "var(--s4)",
            background: "var(--bg-deep)", borderRadius: "var(--r-lg)", border: "1px solid var(--border-dim)",
          }}>
            <div className="caption" style={{ marginBottom: "var(--s2)" }}>Agent Strategy</div>
            <p className="body" style={{ margin: 0, fontSize: "0.875rem", fontStyle: "italic" }}>
              &quot;{data.plan}&quot;
            </p>
          </div>
        )}

        {Array.isArray(data.steps)
          ? data.steps.map((s) => <ToolOutput key={s.tool} res={s.result} toolName={s.tool} />)
          : <ToolOutput res={data} />}
      </div>
    </motion.div>
  );
}
