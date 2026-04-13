"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, FileText, BarChart3, Zap, X, Trophy, Plus, Globe, Shield, Coins, ArrowRight, Star } from "lucide-react";
import type { Tool } from "@/lib/store";

const ease = [0.22, 1, 0.36, 1] as const;

interface ServiceEntry {
  id: string;
  name: string;
  description: string;
  priceUsd: number;
  protocol: string;
  endpoint: string;
  method: string;
  rating?: number;
  ratingCount?: number;
  providerSplitPercentage?: number;
}

interface Props {
  catalog: Tool[];
}

function ToolIcon({ id, isMpp }: { id: string; isMpp: boolean }) {
  const color = isMpp ? "var(--indigo)" : id === "analyze" ? "var(--amber)" : "var(--emerald)";
  const size = 20;
  if (id.includes("search") || id.includes("weather")) return <Search size={size} color={color} />;
  if (id === "summarize") return <FileText size={size} color={color} />;
  return <BarChart3 size={size} color={color} />;
}

export function BazaarView({ catalog }: Props) {
  const [specTool, setSpecTool] = useState<Tool | null>(null);
  const [services, setServices] = useState<ServiceEntry[]>([]);
  const [bestValueId, setBestValueId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/services")
      .then(r => r.json())
      .then(d => {
        setServices(d.services ?? []);
        setBestValueId(d.bestValue?.id ?? null);
      })
      .catch(() => null);
  }, []);

  const allServices = [...catalog];
  services.forEach(s => {
    if (!allServices.find(t => t.id === s.id)) {
      allServices.push({
        id: s.id,
        name: s.name,
        description: s.description,
        priceUsd: s.priceUsd,
        url: s.endpoint,
        method: s.method as any,
        protocol: s.protocol,
        payment: { protocol: s.protocol as any, version: "2.0.0", network: "stellar:testnet", currency: "USDC" },
        rating: s.rating,
        ratingCount: s.ratingCount,
        providerSplitPercentage: s.providerSplitPercentage,
      } as any);
    } else {
      const existing = allServices.find(t => t.id === s.id) as any;
      if (existing) {
         existing.rating = s.rating;
         existing.ratingCount = s.ratingCount;
         existing.providerSplitPercentage = s.providerSplitPercentage;
      }
    }
  });
const handleRate = async (id: string, rating: number) => {
  const txHash = prompt("Please enter the Stellar Transaction Hash of your payment to verify your review:");
  if (!txHash) return;

  try {
    const res = await fetch("/api/services/rate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, rating, txHash })
    });
    if (res.ok) {
      alert("Verification successful! Thanks for rating.");
      const updatedServicesRes = await fetch("/api/services");
      const data = await updatedServicesRes.json();
      setServices(data.services ?? []);
      setBestValueId(data.bestValue?.id ?? null);
    } else {
      const error = await res.json();
      alert(`Verification failed: ${error.error}`);
    }
  } catch (err) {
    console.error(err);
  }
};

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to remove this service?")) return;
    try {
      const res = await fetch(`/api/services?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      if (res.ok) {
        setServices(services.filter(s => s.id !== id));
        if (bestValueId === id) setBestValueId(null);
      } else {
        const error = await res.json();
        alert(error.error || "Failed to delete");
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ height: "100%", display: "flex", flexDirection: "column", background: "var(--bg-deep)", position: "relative", overflow: "hidden" }}>
      {/* Sticky Header */}
      <div style={{ padding: "var(--s6) var(--s8)", borderBottom: "1px solid var(--border-dim)", background: "rgba(9, 9, 11, 0.8)", backdropFilter: "blur(12px)", position: "sticky", top: 0, zIndex: 10, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <h2 className="h2" style={{ marginBottom: "var(--s1)", fontSize: "1.5rem" }}>The Tool Bazaar</h2>
          <p className="body" style={{ color: "var(--text-muted)", fontSize: "0.875rem" }}>Agent-native marketplace for Stellar x402 services.</p>
        </div>
        {services.length > 0 && (
          <div style={{ padding: "var(--s3) var(--s5)", background: "var(--indigo-dim)", border: "1px solid rgba(99,102,241,0.2)", borderRadius: "var(--r-lg)", fontSize: "0.75rem", color: "var(--text-body)", maxWidth: "400px", display: "flex", gap: "var(--s3)", alignItems: "center" }}>
            <Zap size={16} color="var(--indigo)" style={{ flexShrink: 0 }} />
            <div>
              <span style={{ fontWeight: 700, color: "var(--indigo)" }}>AGENT HINT: </span>
              {`Selected ${services[0].name} ($${services[0].priceUsd.toFixed(2)}) as optimal entry point based on cost and reputation.`}
            </div>
          </div>
        )}
      </div>

      {/* Scrollable Area */}
      <div style={{ flex: 1, overflowY: "auto", padding: "var(--s8)", display: "flex", flexDirection: "column", gap: "var(--s16)" }}>
        
        {/* Tools Section */}
        <div>
          <div className="caption" style={{ marginBottom: "var(--s5)", display: "flex", alignItems: "center", gap: "var(--s2)" }}><Globe size={14} /> Available Services</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: "var(--s5)" }}>
            {allServices.sort((a: any, b: any) => {
               const scoreA = a.priceUsd * (1 - (a.rating || 0) / 5);
               const scoreB = b.priceUsd * (1 - (b.rating || 0) / 5);
               return scoreA - scoreB;
            }).map((tool: any) => {
              const isMpp = tool.payment?.protocol === "mpp";
              const bgColor = isMpp ? "var(--indigo-dim)" : tool.id === "analyze" ? "var(--amber-dim)" : "var(--emerald-dim)";
              const isDefault = ["search", "summarize", "analyze", "weather"].includes(tool.id);

              return (
                <motion.div key={tool.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card" style={{ display: "flex", flexDirection: "column", gap: "var(--s4)", cursor: "default" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                    <div style={{ width: 44, height: 44, borderRadius: "var(--r-lg)", background: bgColor, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <ToolIcon id={tool.id} isMpp={isMpp} />
                    </div>
                    <div style={{ display: "flex", gap: "var(--s2)", alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
                      {bestValueId === tool.id && <div title="Optimal score based on Cost * (1 - Rating/5)" style={{ display: "flex", alignItems: "center", gap: 3, padding: "2px 8px", borderRadius: "var(--r-full)", background: "var(--emerald-dim)", border: "1px solid rgba(16,185,129,0.3)", fontSize: "0.5625rem", fontWeight: 700, color: "var(--emerald)", letterSpacing: "0.04em", cursor: "help" }}><Trophy size={9} /> BEST VALUE</div>}
                      <div className="badge badge-neutral" style={{ fontSize: "0.6875rem" }}>{isMpp ? "MPP" : "x402"}</div>
                    </div>
                  </div>
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--s1)" }}>
                      <h3 className="h3" style={{ fontSize: "1.125rem", margin: 0 }}>{tool.name}</h3>
                      {tool.rating !== undefined && (
                        <div title={`Rated ${tool.rating.toFixed(1)} stars from ${tool.ratingCount} reviews`} style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--amber)", fontSize: "0.75rem", fontWeight: 600, cursor: "help" }}>
                          <Star size={12} fill="currentColor" />
                          <span>{tool.rating.toFixed(1)}</span>
                          <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>({tool.ratingCount})</span>
                        </div>
                      )}
                    </div>
                    <p className="body" style={{ fontSize: "0.875rem", height: "3.2em", overflow: "hidden" }}>{tool.description}</p>
                  </div>
                  <div style={{ marginTop: "auto", display: "flex", alignItems: "center", justifyContent: "space-between", paddingTop: "var(--s4)", borderTop: "1px solid var(--border-dim)" }}>
                    <div>
                      <div className="caption" style={{ fontSize: "0.625rem" }}>Price</div>
                      <div className="cost" style={{ fontSize: "1.125rem" }}>${tool.priceUsd.toFixed(2)}</div>
                    </div>
                    <div style={{ display: "flex", gap: "var(--s2)", alignItems: "center" }}>
                      <button className="btn btn-secondary" style={{ fontSize: "0.75rem", padding: "6px 12px" }} onClick={() => {
                        const r = prompt("Rate this service (1-5):");
                        if (r && parseInt(r) >= 1 && parseInt(r) <= 5) handleRate(tool.id, parseInt(r, 10));
                      }}>Rate</button>
                      <button className="btn btn-secondary" style={{ fontSize: "0.75rem", padding: "6px 12px" }} onClick={() => setSpecTool(tool)}>View Spec</button>
                      {!isDefault && (
                        <button title="Remove Service" className="btn btn-ghost" style={{ padding: "6px", color: "var(--rose)" }} onClick={() => handleDelete(tool.id)}>
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Discovery Info Box */}
        <div title="Score = Price * (1 - Rating / 5)" style={{ cursor: "help", padding: "var(--s6)", background: "var(--bg-surface)", border: "1px solid var(--border-dim)", borderRadius: "var(--r-xl)", display: "flex", alignItems: "center", gap: "var(--s6)" }}>
          <div style={{ width: 48, height: 48, borderRadius: "50%", background: "var(--emerald-dim)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Shield size={24} color="var(--emerald)" /></div>
          <div>
            <h4 style={{ fontWeight: 600, marginBottom: 4 }}>Deterministic Discovery Active</h4>
            <p className="body" style={{ fontSize: "0.875rem", margin: 0 }}>Tools are dynamically discovered via <code>/api/catalog</code>. Our agent logic balances <strong>Cost</strong> and <strong>Reputation Score</strong> to select the optimal service.</p>
          </div>
        </div>

        {/* Professional Centered Provider Form */}
        <div style={{ 
          display: "flex", 
          flexDirection: "column", 
          alignItems: "center", 
          padding: "var(--s16) var(--s8)",
          background: "linear-gradient(180deg, var(--bg-deep) 0%, var(--bg-card) 100%)",
          borderTop: "1px solid var(--border-dim)",
          textAlign: "center"
        }}>
          <div style={{ maxWidth: "640px", width: "100%" }}>
            <div className="badge badge-indigo" style={{ marginBottom: "var(--s4)", padding: "4px 12px" }}>PROVIDER PROGRAM</div>
            <h2 className="h2" style={{ marginBottom: "var(--s3)", fontSize: "2.25rem", letterSpacing: "-0.02em" }}>Become a Service Provider</h2>
            <p className="body-lg" style={{ marginBottom: "var(--s10)", color: "var(--text-body)" }}>
              Join the agent-to-agent economy. List your AI service, set your price, and receive automated USDC payments on Stellar.
            </p>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const data = Object.fromEntries(formData);
                try {
                  const res = await fetch("/api/services", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
                  if (res.ok) { alert("Service registered successfully!"); window.location.reload(); }
                } catch (err) { alert("Failed to register service."); }
              }}
              style={{ 
                display: "flex", 
                flexDirection: "column", 
                gap: "var(--s6)", 
                background: "var(--bg-surface)", 
                padding: "var(--s10)", 
                borderRadius: "var(--r-2xl)", 
                border: "1px solid var(--border-strong)", 
                boxShadow: "0 32px 64px -12px rgba(0,0,0,0.6)",
                textAlign: "left"
              }}
            >
              <div>
                <div className="caption" style={{ marginBottom: "var(--s2)", color: "var(--text-muted)" }}>Service Name</div>
                <input name="name" className="input" placeholder="e.g. GPT-4o Summarizer" style={{ fontSize: "1.125rem", fontWeight: 500 }} required />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--s4)" }}>
                <div>
                  <div className="caption" style={{ marginBottom: "var(--s2)" }}>Price (USDC)</div>
                  <div style={{ position: "relative" }}>
                    <div style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", color: "var(--emerald)", fontWeight: 600 }}>$</div>
                    <input name="price_usd" className="input" placeholder="0.05" style={{ paddingLeft: "2.5rem" }} required />
                  </div>
                </div>
                <div>
                  <div className="caption" style={{ marginBottom: "var(--s2)" }}>Protocol</div>
                  <select name="protocol" className="input" style={{ appearance: "none", cursor: "pointer" }}>
                    <option value="x402">x402 (Standard)</option>
                    <option value="mpp">MPP (Session)</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="caption" style={{ marginBottom: "var(--s2)" }}>API Endpoint URL</div>
                <input name="endpoint" className="input" placeholder="https://api.yourdomain.com/v1/task" style={{ fontFamily: "var(--font-mono)", fontSize: "0.875rem" }} required />
              </div>

              <div>
                <div className="caption" style={{ marginBottom: "var(--s2)" }}>Description</div>
                <textarea name="description" className="input" placeholder="What does your tool do? (shown to agents)" style={{ minHeight: "120px", resize: "none", lineHeight: 1.5 }} required />
              </div>
              
              <div>
                <div className="caption" style={{ marginBottom: "var(--s2)" }}>Provider Split Percentage (e.g., 0.7 for 70%)</div>
                <input name="provider_split_percentage" className="input" placeholder="0.7" defaultValue="0.7" style={{ fontFamily: "var(--font-mono)", fontSize: "0.875rem" }} required />
              </div>

              <button type="submit" className="btn btn-primary" style={{ padding: "var(--s4)", fontSize: "1rem", borderRadius: "var(--r-xl)", marginTop: "var(--s2)" }}>
                <Plus size={20} /> Register My Service
              </button>
            </form>
            
            <div style={{ marginTop: "var(--s8)", display: "flex", alignItems: "center", justifyContent: "center", gap: "var(--s2)", color: "var(--text-dim)", fontSize: "0.875rem" }}>
              <span>Need help?</span>
              <a 
                href="https://github.com/mokwathedeveloper/Agent-Paywall-Router#integration-guide" 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ 
                  color: "var(--emerald)", 
                  fontWeight: 600, 
                  display: "flex", 
                  alignItems: "center", 
                  gap: 4,
                  textDecoration: "underline",
                  cursor: "pointer",
                  position: "relative",
                  zIndex: 2
                }}
              >
                Read the Integration Guide <ArrowRight size={14} />
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Modal */}
      <AnimatePresence>
        {specTool && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSpecTool(null)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(12px)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: "var(--s6)" }}>
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} transition={{ duration: 0.25, ease }} onClick={(e) => e.stopPropagation()} style={{ background: "var(--bg-surface)", border: "1px solid var(--border-strong)", borderRadius: "var(--r-xl)", width: "100%", maxWidth: 640, maxHeight: "85vh", overflow: "hidden", boxShadow: "0 32px 64px rgba(0,0,0,0.5)" }}>
              <div style={{ padding: "var(--s6) var(--s8)", borderBottom: "1px solid var(--border-dim)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--bg-card)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "var(--s4)" }}>
                  <div style={{ width: 40, height: 40, borderRadius: "var(--r-md)", background: "var(--emerald-dim)", display: "flex", alignItems: "center", justifyContent: "center" }}><Coins size={20} color="var(--emerald)" /></div>
                  <div>
                    <h3 style={{ fontWeight: 700, fontSize: "1.25rem", margin: 0 }}>{specTool.name}</h3>
                    <span className="caption" style={{ color: "var(--emerald)" }}>{specTool.payment?.protocol === "mpp" ? "MPP" : "x402"} Verified Tool</span>
                  </div>
                </div>
                <button onClick={() => setSpecTool(null)} aria-label="Close" style={{ width: 36, height: 36, borderRadius: "var(--r-full)", background: "var(--bg-hover)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", transition: "all 0.2s ease" }}><X size={20} /></button>
              </div>
              <div style={{ padding: "var(--s8)", overflowY: "auto", maxHeight: "65vh" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "var(--s4)", marginBottom: "var(--s8)" }}>
                  {[ { label: "Method", value: specTool.method, mono: true }, { label: "Price", value: `$${specTool.priceUsd.toFixed(2)}`, cost: true }, { label: "Asset", value: "USDC (Testnet)", mono: false } ].map((f) => (
                    <div key={f.label} style={{ padding: "var(--s4)", background: "var(--bg-card)", borderRadius: "var(--r-lg)", border: "1px solid var(--border-dim)" }}>
                      <div className="caption" style={{ fontSize: "0.5625rem", marginBottom: 4 }}>{f.label}</div>
                      {f.cost ? <div className="cost" style={{ fontSize: "1rem" }}>{f.value}</div> : <div style={{ fontWeight: 700, fontSize: "1rem", fontFamily: f.mono ? "var(--font-mono)" : undefined }}>{f.value}</div>}
                    </div>
                  ))}
                </div>
                
                {/* Provider Split Display */}
                <div style={{ marginBottom: "var(--s6)", padding: "var(--s4)", background: "var(--bg-deep)", border: "1px solid var(--border-dim)", borderRadius: "var(--r-md)", display: "flex", alignItems: "center", gap: "var(--s4)" }}>
                   <div style={{ flex: 1 }}>
                     <div className="caption" style={{ marginBottom: "var(--s1)", color: "var(--text-muted)" }}>Economic Model</div>
                     <div style={{ fontSize: "0.875rem", color: "var(--text-body)" }}>
                       <span style={{ fontWeight: 600, color: "var(--emerald)" }}>{((specTool as any).providerSplitPercentage ?? 0.7) * 100}%</span> Revenue Split to Provider
                     </div>
                   </div>
                   <div style={{ flex: 1, borderLeft: "1px solid var(--border-dim)", paddingLeft: "var(--s4)" }}>
                     <div className="caption" style={{ marginBottom: "var(--s1)", color: "var(--text-muted)" }}>Reputation</div>
                     <div style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--amber)", fontSize: "0.875rem", fontWeight: 600 }}>
                        <Star size={14} fill="currentColor" />
                        <span>{(specTool as any).rating ? (specTool as any).rating.toFixed(1) : "New"}</span>
                        <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>({(specTool as any).ratingCount ?? 0} reviews)</span>
                      </div>
                   </div>
                </div>

                <div style={{ marginBottom: "var(--s6)" }}>
                  <div className="caption" style={{ marginBottom: "var(--s3)" }}>Endpoint</div>
                  <code style={{ display: "block", padding: "var(--s4)", background: "var(--bg-deep)", border: "1px solid var(--border-dim)", borderRadius: "var(--r-md)", fontSize: "0.875rem", color: "var(--emerald)", fontFamily: "var(--font-mono)", wordBreak: "break-all" }}>{specTool.method} {specTool.url}</code>
                </div>
                <div style={{ marginBottom: "var(--s8)" }}>
                  <div className="caption" style={{ marginBottom: "var(--s3)" }}>Description</div>
                  <p className="body-lg" style={{ margin: 0 }}>{specTool.description}</p>
                </div>
                <div>
                  <div className="caption" style={{ marginBottom: "var(--s3)" }}>x402 Protocol Implementation</div>
                  <pre style={{ padding: "var(--s5)", background: "var(--bg-deep)", border: "1px solid var(--border-dim)", borderRadius: "var(--r-xl)", fontSize: "0.8125rem", color: "var(--text-body)", fontFamily: "var(--font-mono)", whiteSpace: "pre-wrap", wordBreak: "break-all", lineHeight: 1.6, margin: 0 }}>
                    {JSON.stringify({ x402Version: 2, resource: { url: specTool.url }, accepts: [{ scheme: "exact", network: specTool.payment?.network ?? "stellar:testnet", asset: specTool.payment?.currency ?? "USDC", amount: String(Math.round(specTool.priceUsd * 10_000_000)), payTo: "<RECEIVER_ADDRESS>", facilitator: "https://x402.org/facilitator", extra: { areFeesSponsored: true } }] }, null, 2)}
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