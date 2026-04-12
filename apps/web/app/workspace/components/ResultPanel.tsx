"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Copy, ExternalLink, Search, FileText, BarChart3, AlertCircle } from "lucide-react";

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
}

interface ToolData {
  results?: SearchResult[];
  query?: string;
  totalResults?: number;
  searchTime?: number;
  summary?: string;
  keyPoints?: string[];
  originalLength?: number;
  summaryLength?: number;
  confidence?: number;
  sentiment?: "positive" | "neutral" | "negative";
  themes?: string[];
  entities?: string[];
  topic?: string;
  readabilityScore?: number;
  wordCount?: number;
  proofs?: unknown;
  tool?: string;
  cost?: unknown;
}

interface ToolOutput {
  tool: string;
  result: ToolData;
}

interface ResultPayload {
  text: string;
  toolOutputs: ToolOutput[];
}

const ease = [0.22, 1, 0.36, 1] as const;

const TOOL_ICONS: Record<string, React.ElementType> = {
  search: Search,
  summarize: FileText,
  analyze: BarChart3,
};

const TOOL_COLORS: Record<string, string> = {
  search: "var(--indigo)",
  summarize: "var(--emerald)",
  analyze: "var(--amber)",
};

function SearchOutput({ data }: { data: ToolData }) {
  if (!Array.isArray(data.results) || data.results.length === 0) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--s3)" }}>
      {data.results.map((r, i) => (
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
      {data.searchTime && (
        <div style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>
          {data.totalResults} results · {data.searchTime}ms
        </div>
      )}
    </div>
  );
}

function SummarizeOutput({ data }: { data: ToolData }) {
  if (!data.summary) return null;
  return (
    <div>
      <p className="body" style={{ marginBottom: "var(--s4)", lineHeight: 1.7 }}>{data.summary}</p>
      {Array.isArray(data.keyPoints) && data.keyPoints.length > 0 && (
        <div>
          <div className="caption" style={{ marginBottom: "var(--s2)" }}>Key Points</div>
          <ul style={{ display: "flex", flexDirection: "column", gap: "var(--s2)", paddingLeft: "var(--s4)", margin: 0 }}>
            {data.keyPoints.map((kp, i) => (
              <li key={i} style={{ fontSize: "0.875rem", color: "var(--text-body)", lineHeight: 1.5 }}>{kp}</li>
            ))}
          </ul>
        </div>
      )}
      {data.confidence && (
        <div style={{ marginTop: "var(--s3)", fontSize: "0.75rem", color: "var(--text-dim)" }}>
          Confidence: {Math.round(data.confidence * 100)}%
          {data.originalLength && ` · ${data.originalLength} → ${data.summaryLength} chars`}
        </div>
      )}
    </div>
  );
}

function AnalyzeOutput({ data }: { data: ToolData }) {
  if (!data.sentiment && !data.topic) return null;
  const sentimentColor = data.sentiment === "positive" ? "var(--emerald)" : data.sentiment === "negative" ? "var(--rose)" : "var(--amber)";
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--s4)" }}>
      {data.topic && (
        <div>
          <div className="caption" style={{ marginBottom: "var(--s1)" }}>Topic</div>
          <p className="body" style={{ margin: 0 }}>{data.topic}</p>
        </div>
      )}
      {data.summary && (
        <div>
          <div className="caption" style={{ marginBottom: "var(--s1)" }}>Summary</div>
          <p className="body" style={{ margin: 0, lineHeight: 1.7 }}>{data.summary}</p>
        </div>
      )}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--s2)" }}>
        {data.sentiment && (
          <span style={{
            padding: "3px 10px", borderRadius: "var(--r-full)", fontSize: "0.75rem",
            fontWeight: 600, background: `${sentimentColor}18`, color: sentimentColor,
            border: `1px solid ${sentimentColor}40`,
          }}>
            {data.sentiment} sentiment
          </span>
        )}
        {Array.isArray(data.themes) && data.themes.map(t => (
          <span key={t} className="badge badge-indigo">{t}</span>
        ))}
        {Array.isArray(data.entities) && data.entities.map(e => (
          <span key={e} className="badge badge-neutral">{e}</span>
        ))}
      </div>
      {(data.readabilityScore || data.wordCount) && (
        <div style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>
          {data.wordCount && `${data.wordCount} words`}
          {data.readabilityScore && ` · Readability: ${data.readabilityScore}/100`}
        </div>
      )}
    </div>
  );
}

function ToolSection({ output }: { output: ToolOutput }) {
  const Icon = TOOL_ICONS[output.tool] ?? Search;
  const color = TOOL_COLORS[output.tool] ?? "var(--text-muted)";
  const data = output.result as ToolData;

  return (
    <div style={{ marginBottom: "var(--s6)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--s2)", marginBottom: "var(--s3)" }}>
        <div style={{
          width: 22, height: 22, borderRadius: "var(--r-sm)",
          background: `${color}18`, display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <Icon size={12} color={color} />
        </div>
        <span className="badge badge-neutral" style={{ textTransform: "uppercase", fontSize: "0.625rem" }}>
          {output.tool} output
        </span>
      </div>
      {output.tool === "search" && <SearchOutput data={data} />}
      {output.tool === "summarize" && <SummarizeOutput data={data} />}
      {output.tool === "analyze" && <AnalyzeOutput data={data} />}
    </div>
  );
}

export function ResultPanel({ result }: { result: unknown }) {
  const [copied, setCopied] = useState(false);

  // Normalise into { text, toolOutputs }
  const payload: ResultPayload =
    typeof result === "object" && result !== null && "text" in result
      ? (result as ResultPayload)
      : { text: String(result ?? ""), toolOutputs: [] };

  const hasToolOutputs = Array.isArray(payload.toolOutputs) && payload.toolOutputs.length > 0;
  const hasText = typeof payload.text === "string" && payload.text.trim().length > 0;
  const hasContent = hasToolOutputs || hasText;

  const handleCopy = () => {
    const content = hasText
      ? payload.text
      : hasToolOutputs
      ? JSON.stringify(payload.toolOutputs, null, 2)
      : "";
    if (content) navigator.clipboard.writeText(content);
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
        border: `1px solid ${hasContent ? "var(--border-glow)" : "var(--border-dim)"}`,
        borderRadius: "var(--r-xl)",
        overflow: "hidden",
      }}
    >
      {/* Header — message changes based on whether result exists */}
      <div style={{
        padding: "var(--s4) var(--s5)", borderBottom: "1px solid var(--border-dim)",
        background: "var(--bg-card)", display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--s2)" }}>
          {hasContent
            ? <CheckCircle2 size={14} color="var(--emerald)" />
            : <AlertCircle size={14} color="var(--amber)" />
          }
          <span style={{
            fontSize: "0.8125rem", fontWeight: 600,
            color: hasContent ? "var(--emerald)" : "var(--amber)",
          }}>
            {hasContent
              ? "Payment successful. Result:"
              : "Payment successful. No result was returned."
            }
          </span>
        </div>
        {hasContent && (
          <button
            onClick={handleCopy}
            className="btn btn-ghost"
            style={{ fontSize: "0.75rem", padding: "4px var(--s3)", gap: "var(--s1)" }}
          >
            <Copy size={12} />{copied ? "Copied" : "Copy"}
          </button>
        )}
      </div>

      <div style={{ padding: "var(--s5)" }}>
        {/* Case 1: has structured tool outputs */}
        {hasToolOutputs && payload.toolOutputs.map((o, i) => (
          <ToolSection key={`${o.tool}-${i}`} output={o} />
        ))}

        {/* Case 2: has LLM text */}
        {hasText && (
          <div style={hasToolOutputs ? {
            marginTop: "var(--s2)", paddingTop: "var(--s4)",
            borderTop: "1px solid var(--border-dim)",
          } : {}}>
            {hasToolOutputs && (
              <div className="caption" style={{ marginBottom: "var(--s3)" }}>Agent Summary</div>
            )}
            <p className="body" style={{ margin: 0, whiteSpace: "pre-wrap", lineHeight: 1.7 }}>
              {payload.text}
            </p>
          </div>
        )}

        {/* Case 3: no content at all */}
        {!hasContent && (
          <div style={{
            padding: "var(--s5)", textAlign: "center",
            color: "var(--text-muted)", fontSize: "0.875rem",
          }}>
            Request completed successfully, but no data was returned.
          </div>
        )}
      </div>
    </motion.div>
  );
}
