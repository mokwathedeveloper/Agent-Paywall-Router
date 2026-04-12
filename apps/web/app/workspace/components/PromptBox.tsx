"use client";

import { useState, useEffect } from "react";
import { Loader2, Send, AlertCircle } from "lucide-react";

interface Props {
  onSubmit: (prompt: string) => void;
  isExecuting: boolean;
  sessionReady: boolean;
}

export function PromptBox({ onSubmit, isExecuting, sessionReady }: Props) {
  const [value, setValue] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;

    if (!sessionReady) {
      setSubmitError("Session initializing — please wait a moment");
      return;
    }
    if (isExecuting) {
      setSubmitError("Agent is already running");
      return;
    }

    setSubmitError(null);
    onSubmit(trimmed);
    setValue("");
  };

  const isDisabled = isExecuting || !sessionReady;
  const effectiveExecuting = mounted && isExecuting;
  const effectiveReady = mounted && sessionReady;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--s2)" }}>
      <form
        onSubmit={handleSubmit}
        style={{
          background: "var(--bg-surface)",
          border: `1px solid ${effectiveExecuting ? "var(--amber)" : "var(--border)"}`,
          borderRadius: "var(--r-xl)",
          padding: "4px 4px 4px var(--s5)",
          display: "flex",
          alignItems: "center",
          boxShadow: "0 4px 12px rgba(0,0,0,0.1), inset 0 2px 4px rgba(0,0,0,0.2)",
          transition: "border-color 0.2s ease",
        }}
      >
        <input
          value={value}
          onChange={e => { setValue(e.target.value); setSubmitError(null); }}
          type="text"
          placeholder={
            !effectiveReady
              ? "Initializing session…"
              : effectiveExecuting
              ? "Agent is running…"
              : "Give the agent a task (e.g. 'Search for Stellar news')"
          }
          disabled={!mounted || isDisabled}
          aria-label="Agent prompt"
          style={{
            flex: 1,
            background: "transparent",
            border: "none",
            outline: "none",
            fontSize: "1rem",
            color: "var(--text)",
            padding: "var(--s3) 0",
            opacity: isDisabled ? 0.6 : 1,
          }}
        />
        <button
          type="submit"
          disabled={!mounted || isDisabled || !value.trim()}
          aria-label={effectiveExecuting ? "Executing…" : "Run agent"}
          style={{
            background: (!mounted || isDisabled) ? "var(--bg-hover)" : "var(--emerald)",
            color: (!mounted || isDisabled) ? "var(--text-muted)" : "#fff",
            padding: "var(--s3) var(--s5)",
            borderRadius: "var(--r-lg)",
            display: "flex",
            alignItems: "center",
            gap: "var(--s2)",
            marginLeft: "var(--s3)",
            transition: "all 0.2s ease",
            boxShadow: (!mounted || isDisabled) ? "none" : "0 2px 8px rgba(16,185,129,0.3)",
            fontSize: "0.875rem",
            fontWeight: 600,
            whiteSpace: "nowrap",
          }}
        >
          {effectiveExecuting
            ? <><Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Running…</>
            : !effectiveReady
            ? <><Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Loading…</>
            : <><Send size={16} /> Run Agent</>
          }
        </button>
      </form>

      {submitError && (
        <div style={{
          display: "flex", alignItems: "center", gap: "var(--s2)",
          fontSize: "0.8125rem", color: "var(--rose)",
          padding: "var(--s2) var(--s3)",
        }}>
          <AlertCircle size={13} />
          {submitError}
        </div>
      )}
    </div>
  );
}
