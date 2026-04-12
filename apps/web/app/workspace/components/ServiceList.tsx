"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Search, FileText, BarChart3, Zap, Trophy, RefreshCw } from "lucide-react";

export interface ServiceEntry {
  id: string;
  name: string;
  description: string;
  priceUsd: number;
  protocol: "x402" | "mpp";
  endpoint: string;
  method: "GET" | "POST";
  inputParam: string;
  stellarNetwork: string;
  spendingPolicyContract: string;
}

const ICONS: Record<string, React.ElementType> = {
  search: Search,
  "mpp-search": Zap,
  summarize: FileText,
  analyze: BarChart3,
};

const COLORS: Record<string, string> = {
  search: "var(--indigo)",
  "mpp-search": "var(--indigo)",
  summarize: "var(--emerald)",
  analyze: "var(--amber)",
};

interface Props {
  onSelect?: (service: ServiceEntry) => void;
  selectedId?: string | null;
  onServicesLoaded?: (services: ServiceEntry[]) => void;
}

export function ServiceList({ onSelect, selectedId, onServicesLoaded }: Props) {
  const [services, setServices] = useState<ServiceEntry[]>([]);
  const [cheapestId, setCheapestId] = useState<string | null>(null);
  const [agentHint, setAgentHint] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    setError(null);
    fetch("/api/services")
      .then(r => r.json())
      .then(d => {
        setServices(d.services ?? []);
        setCheapestId(d.cheapest?.id ?? null);
        setAgentHint(d.agentHint ?? "");
        onServicesLoaded?.(d.services ?? []);
      })
      .catch(() => setError("Failed to load services"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "var(--s3)", padding: "var(--s6)", color: "var(--text-muted)" }}>
        <RefreshCw size={14} style={{ animation: "spin 1s linear infinite" }} />
        <span className="body" style={{ fontSize: "0.875rem" }}>Discovering services from marketplace…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "var(--s4)", background: "var(--rose-dim)", borderRadius: "var(--r-lg)", fontSize: "0.875rem", color: "var(--rose)" }}>
        {error} — <button onClick={load} style={{ color: "var(--rose)", textDecoration: "underline", background: "none", border: "none", cursor: "pointer", fontSize: "0.875rem" }}>retry</button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--s4)" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div className="caption" style={{ marginBottom: 2 }}>Service Marketplace</div>
          <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
            {services.length} services · sorted cheapest first
          </div>
        </div>
        <button onClick={load} className="btn btn-ghost" style={{ fontSize: "0.75rem", gap: "var(--s1)" }}>
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      {/* Service cards */}
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--s2)" }}>
        {services.map((svc, i) => {
          const Icon = ICONS[svc.id] ?? Zap;
          const color = COLORS[svc.id] ?? "var(--text-muted)";
          const isCheapest = svc.id === cheapestId;
          const isSelected = svc.id === selectedId;

          return (
            <motion.div
              key={svc.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2, delay: i * 0.05 }}
              onClick={() => onSelect?.(svc)}
              style={{
                display: "flex", alignItems: "center", gap: "var(--s4)",
                padding: "var(--s4) var(--s5)",
                background: isSelected ? "var(--bg-elevated)" : "var(--bg-surface)",
                border: `1px solid ${isSelected ? "var(--emerald)" : isCheapest ? "rgba(16,185,129,0.25)" : "var(--border-dim)"}`,
                borderRadius: "var(--r-lg)",
                cursor: onSelect ? "pointer" : "default",
                transition: "all 0.2s ease",
              }}
              onMouseEnter={e => { if (onSelect) e.currentTarget.style.borderColor = "var(--border)"; }}
              onMouseLeave={e => { if (onSelect) e.currentTarget.style.borderColor = isSelected ? "var(--emerald)" : isCheapest ? "rgba(16,185,129,0.25)" : "var(--border-dim)"; }}
            >
              {/* Icon */}
              <div style={{
                width: 36, height: 36, borderRadius: "var(--r-md)",
                background: `${color}18`, display: "flex", alignItems: "center",
                justifyContent: "center", flexShrink: 0,
              }}>
                <Icon size={16} color={color} />
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "var(--s2)", marginBottom: 2 }}>
                  <span style={{ fontWeight: 600, fontSize: "0.9375rem" }}>{svc.name}</span>
                  {isCheapest && (
                    <span style={{
                      display: "inline-flex", alignItems: "center", gap: 3,
                      padding: "1px 6px", borderRadius: "var(--r-full)",
                      background: "var(--emerald-dim)", border: "1px solid rgba(16,185,129,0.3)",
                      fontSize: "0.5625rem", fontWeight: 700, color: "var(--emerald)",
                    }}>
                      <Trophy size={8} /> CHEAPEST
                    </span>
                  )}
                  <span className="badge badge-neutral" style={{ fontSize: "0.5625rem" }}>
                    {svc.protocol.toUpperCase()}
                  </span>
                </div>
                <div style={{ fontSize: "0.8125rem", color: "var(--text-body)", marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {svc.description}
                </div>
                <code style={{ fontSize: "0.6875rem", color: "var(--text-dim)", fontFamily: "var(--font-mono)" }}>
                  {svc.method} {svc.endpoint.replace(/^https?:\/\/[^/]+/, "")}
                </code>
              </div>

              {/* Price */}
              <div style={{ flexShrink: 0, textAlign: "right" }}>
                <div className="cost" style={{ fontSize: "1rem" }}>${svc.priceUsd.toFixed(2)}</div>
                <div style={{ fontSize: "0.625rem", color: "var(--text-dim)", marginTop: 2 }}>USDC</div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Agent hint */}
      {agentHint && (
        <div style={{
          padding: "var(--s3) var(--s4)",
          background: "var(--indigo-dim)", border: "1px solid rgba(99,102,241,0.2)",
          borderRadius: "var(--r-lg)", fontSize: "0.75rem", color: "var(--text-body)", lineHeight: 1.6,
        }}>
          <span style={{ fontWeight: 600, color: "var(--indigo)" }}>Agent Strategy: </span>
          {agentHint}
        </div>
      )}
    </div>
  );
}
