"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, FileText, BarChart3, Zap, X } from "lucide-react";
import type { Tool } from "@/lib/store";

const ease = [0.22, 1, 0.36, 1] as const;

interface Props {
  catalog: Tool[];
}

function ToolIcon({ id, isMpp }: { id: string; isMpp: boolean }) {
  const color = isMpp ? "var(--indigo)" : id === "analyze" ? "var(--amber)" : id === "summarize" ? "var(--emerald)" : "var(--emerald)";
  const size = 20;
  if (id.includes("search")) return <Search size={size} color={color} />;
  if (id === "summarize") return <FileText size={size} color={color} />;
  return <BarChart3 size={size} color={color} />;
}

export function BazaarView({ catalog }: Props) {
  const [specTool, setSpecTool] = useState<Tool | null>(null);

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "var(--s6) var(--s8)" }}>
      <div style={{ marginBottom: "var(--s8)" }}>
        <h2 className="h2" style={{ marginBottom: "var(--s2)" }}>The Tool Bazaar</h2>
        <p className="body">Discover agent-native services available via x402 and MPP.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "var(--s5)" }}>
        {catalog.map((tool) => {
          const isMpp = tool.payment?.protocol === "mpp";
          const bgColor = isMpp ? "var(--indigo-dim)" : tool.id === "analyze" ? "var(--amber-dim)" : "var(--emerald-dim)";

          return (
            <motion.div
              key={tool.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                background: "var(--bg-surface)", border: "1px solid var(--border-dim)",
                borderRadius: "var(--r-xl)", padding: "var(--s6)",
                display: "flex", flexDirection: "column", gap: "var(--s4)",
                transition: "all 0.3s ease", cursor: "default",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--emerald)";
                e.currentTarget.style.transform = "translateY(-4px)";
                e.currentTarget.style.boxShadow = "0 8px 24px rgba(16,185,129,0.15)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--border-dim)";
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                <div style={{
                  width: 44, height: 44, borderRadius: "var(--r-lg)",
                  background: bgColor,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <ToolIcon id={tool.id} isMpp={isMpp} />
                </div>
                <div className="badge badge-neutral" style={{ fontSize: "0.6875rem" }}>
                  {isMpp ? "MPP" : "x402"}
                </div>
              </div>

              <div>
                <h3 className="h3" style={{ fontSize: "1.125rem", marginBottom: "var(--s1)" }}>{tool.name}</h3>
                <p className="body" style={{ fontSize: "0.875rem" }}>{tool.description}</p>
              </div>

              <div style={{
                marginTop: "auto", display: "flex", alignItems: "center",
                justifyContent: "space-between", paddingTop: "var(--s4)",
                borderTop: "1px solid var(--border-dim)",
              }}>
                <div>
                  <div className="caption" style={{ fontSize: "0.625rem" }}>Price</div>
                  <div className="cost" style={{ fontSize: "1.125rem" }}>${tool.priceUsd.toFixed(2)}</div>
                </div>
                <button className="btn btn-secondary" style={{ fontSize: "0.75rem" }} onClick={() => setSpecTool(tool)}>
                  View Spec
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div style={{
        marginTop: "var(--s10)", padding: "var(--s6)",
        background: "var(--bg-deep)", border: "1px solid var(--border-dim)",
        borderRadius: "var(--r-xl)", display: "flex", alignItems: "center", gap: "var(--s6)",
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: "50%", background: "var(--emerald-dim)",
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          <Zap size={24} color="var(--emerald)" />
        </div>
        <div>
          <h4 style={{ fontWeight: 600, marginBottom: 4 }}>Bazaar Discovery Active</h4>
          <p className="body" style={{ fontSize: "0.875rem", margin: 0 }}>
            Tools are dynamically discovered via <code>/api/catalog</code>.
            Any service implementing x402 or MPP on Stellar can be listed here.
          </p>
        </div>
      </div>

      {/* Spec Modal */}
      <AnimatePresence>
        {specTool && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setSpecTool(null)}
            style={{
              position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)",
              backdropFilter: "blur(8px)", zIndex: 100,
              display: "flex", alignItems: "center", justifyContent: "center", padding: "var(--s6)",
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.25, ease }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: "var(--bg-surface)", border: "1px solid var(--border)",
                borderRadius: "var(--r-xl)", width: "100%", maxWidth: 560,
                maxHeight: "80vh", overflow: "hidden",
                boxShadow: "0 24px 48px rgba(0,0,0,0.4)",
              }}
            >
              <div style={{
                padding: "var(--s5) var(--s6)", borderBottom: "1px solid var(--border-dim)",
                display: "flex", alignItems: "center", justifyContent: "space-between",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "var(--s3)" }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: "var(--r-md)",
                    background: "var(--emerald-dim)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}>
                    <Zap size={16} color="var(--emerald)" />
                  </div>
                  <div>
                    <h3 style={{ fontWeight: 700, fontSize: "1rem", margin: 0 }}>{specTool.name}</h3>
                    <span className="caption">{specTool.payment?.protocol === "mpp" ? "MPP" : "x402"} Protocol</span>
                  </div>
                </div>
                <button
                  onClick={() => setSpecTool(null)}
                  aria-label="Close"
                  style={{
                    width: 32, height: 32, borderRadius: "var(--r-full)",
                    background: "var(--bg-hover)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "var(--text-muted)", transition: "all 0.2s ease",
                  }}
                >
                  <X size={16} />
                </button>
              </div>

              <div style={{ padding: "var(--s6)", overflowY: "auto", maxHeight: "60vh" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "var(--s3)", marginBottom: "var(--s6)" }}>
                  {[
                    { label: "Method", value: specTool.method, mono: true },
                    { label: "Price", value: `$${specTool.priceUsd.toFixed(2)}`, cost: true },
                    { label: "Network", value: "Stellar", mono: false },
                  ].map((f) => (
                    <div key={f.label} style={{
                      padding: "var(--s3) var(--s4)", background: "var(--bg-card)",
                      borderRadius: "var(--r-lg)", border: "1px solid var(--border-dim)",
                    }}>
                      <div className="caption" style={{ fontSize: "0.5625rem", marginBottom: 2 }}>{f.label}</div>
                      {f.cost
                        ? <div className="cost" style={{ fontSize: "0.875rem" }}>{f.value}</div>
                        : <div style={{ fontWeight: 600, fontSize: "0.875rem", fontFamily: f.mono ? "var(--font-mono)" : undefined }}>{f.value}</div>}
                    </div>
                  ))}
                </div>

                <div style={{ marginBottom: "var(--s5)" }}>
                  <div className="caption" style={{ marginBottom: "var(--s2)" }}>Endpoint</div>
                  <code style={{
                    display: "block", padding: "var(--s3) var(--s4)",
                    background: "var(--bg-deep)", border: "1px solid var(--border-dim)",
                    borderRadius: "var(--r-md)", fontSize: "0.8125rem",
                    color: "var(--emerald)", fontFamily: "var(--font-mono)", wordBreak: "break-all",
                  }}>
                    {specTool.method} {specTool.url}
                  </code>
                </div>

                <div style={{ marginBottom: "var(--s5)" }}>
                  <div className="caption" style={{ marginBottom: "var(--s2)" }}>Description</div>
                  <p className="body" style={{ margin: 0, fontSize: "0.875rem" }}>{specTool.description}</p>
                </div>

                <div>
                  <div className="caption" style={{ marginBottom: "var(--s2)" }}>Payment Specification (x402 v2)</div>
                  <pre style={{
                    padding: "var(--s4)", background: "var(--bg-deep)",
                    border: "1px solid var(--border-dim)", borderRadius: "var(--r-lg)",
                    fontSize: "0.75rem", color: "var(--text-body)", fontFamily: "var(--font-mono)",
                    whiteSpace: "pre-wrap", wordBreak: "break-all", lineHeight: 1.6, margin: 0, overflow: "auto",
                  }}>
                    {JSON.stringify({
                      x402Version: 2,
                      resource: { url: specTool.url },
                      accepts: [{
                        scheme: "exact",
                        network: specTool.payment?.network ?? "stellar:testnet",
                        asset: specTool.payment?.currency ?? "USDC",
                        amount: String(Math.round(specTool.priceUsd * 10_000_000)),
                        payTo: "<STELLAR_RECEIVER_ADDRESS>",
                        facilitator: "https://x402.org/facilitator",
                        extra: { areFeesSponsored: true },
                      }],
                    }, null, 2)}
                  </pre>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
