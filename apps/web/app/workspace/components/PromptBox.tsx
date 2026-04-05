"use client";

import { Loader2, Send } from "lucide-react";

interface Props {
  onSubmit: (prompt: string) => void;
  isExecuting: boolean;
}

export function PromptBox({ onSubmit, isExecuting }: Props) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const input = e.currentTarget.elements.namedItem("prompt") as HTMLInputElement;
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
      onFocus={(e) => { e.currentTarget.style.borderColor = "var(--border-strong)"; }}
      onBlur={(e) => { e.currentTarget.style.borderColor = "var(--border)"; }}
    >
      <input
        name="prompt"
        type="text"
        placeholder="Give the agent a task (e.g. 'Search for modern AI payment trends')"
        disabled={isExecuting}
        aria-label="Agent prompt"
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
        aria-label={isExecuting ? "Executing…" : "Run agent"}
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
        {isExecuting
          ? <Loader2 size={18} style={{ animation: "spin 1s linear infinite" }} />
          : <Send size={18} />}
      </button>
    </form>
  );
}
