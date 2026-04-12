"use client";

import { useState, useEffect } from "react";
import { motion, type Easing } from "framer-motion";
import {
  ArrowRight, Zap, Search, FileText, BarChart3,
  CheckCircle2, Lock, DollarSign, Unlock, ExternalLink, Terminal,
} from "lucide-react";
import Link from "next/link";

const ease: Easing = [0.22, 1, 0.36, 1];

export default function LandingPage() {
  return (
    <div style={{ background: "var(--bg-deep)", minHeight: "100vh" }}>
      <Nav />
      <main id="main-content">
        <Hero />
        <BentoFeatures />
        <Pricing />
        <Proof />
        <BottomCTA />
      </main>
      <Footer />
    </div>
  );
}

function Nav() {
  return (
    <nav style={{
      position: "fixed", top: 0, left: 0, right: 0, zIndex: 100,
      background: "rgba(9,9,11,0.85)",
      backdropFilter: "blur(16px) saturate(160%)",
      WebkitBackdropFilter: "blur(16px) saturate(160%)",
      borderBottom: "1px solid var(--border-dim)",
    }}>
      <div className="container" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 56 }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: "var(--s2)" }}>
          <div style={{
            width: 26, height: 26, borderRadius: "var(--r-sm)",
            background: "var(--emerald)", display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Zap size={14} color="#fff" strokeWidth={2.5} />
          </div>
          <span style={{ fontWeight: 700, fontSize: "0.9375rem", letterSpacing: "-0.01em" }}>AgentPay</span>
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--s3)" }}>
          <Link href="https://github.com/mokwathedeveloper/Agent-Paywall-Router" target="_blank" rel="noopener noreferrer" className="btn btn-ghost" aria-label="View source code on GitHub">
            <span className="hide-mobile">GitHub</span> <ExternalLink size={13} aria-hidden="true" />
          </Link>
          <Link href="/workspace" className="btn btn-primary" style={{ fontSize: "0.8125rem", padding: "8px 18px" }}>
            Open App <ArrowRight size={13} />
          </Link>
        </div>
      </div>
    </nav>
  );
}

function Hero() {
  return (
    <section style={{ paddingTop: "var(--s24)", paddingBottom: "var(--s24)", marginTop: 56 }}>
      <div className="container">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease }} style={{ marginBottom: "var(--s5)" }}>
          <span className="badge badge-emerald" style={{ fontSize: "0.6875rem" }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--emerald)", display: "inline-block" }} />
            Stellar x402 Protocol
          </span>
        </motion.div>

        <motion.h1 className="display" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease, delay: 0.05 }} style={{ maxWidth: 720, marginBottom: "var(--s6)" }}>
          Your agents can<br />
          <span className="gradient-text">buy things now.</span>
        </motion.h1>

        <motion.p className="body-lg" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease, delay: 0.12 }} style={{ maxWidth: 540, marginBottom: "var(--s10)" }}>
          Per-request micropayments for AI agents. Hit a paywall, pay a cent,
          get the data. Settled on Stellar in under 5 seconds.
        </motion.p>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease, delay: 0.2 }} className="hero-ctas" style={{ marginBottom: "var(--s20)" }}>
          <Link href="/workspace" className="btn btn-primary btn-lg">
            Try the demo <ArrowRight size={15} />
          </Link>
          <Link href="https://github.com/mokwathedeveloper/Agent-Paywall-Router" target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-lg">
            Source code
          </Link>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 40, rotate: -1 }} animate={{ opacity: 1, y: 0, rotate: -1.5 }} transition={{ duration: 0.8, ease, delay: 0.3 }}
          style={{ maxWidth: 520, marginLeft: "auto", marginRight: "var(--s10)" }}>
          <div className="hero-receipt">
            <ReceiptCard />
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function ReceiptCard() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const i = setInterval(() => setTick((t) => (t + 1) % 5), 2200);
    return () => clearInterval(i);
  }, []);

  const lines = [
    { icon: Terminal, label: "agent.execute('search trends')", color: "var(--text-muted)" },
    { icon: Lock, label: "402 Payment Required", color: "var(--amber)" },
    { icon: DollarSign, label: "Paid $0.01 USDC → Stellar", color: "var(--indigo)" },
    { icon: Unlock, label: "Access granted", color: "var(--emerald)" },
    { icon: CheckCircle2, label: "3 results returned · 247ms", color: "var(--emerald)" },
  ];

  return (
    <div className="card" style={{ padding: "var(--s5) var(--s6)", background: "var(--bg-surface)", border: "1px solid var(--border)", boxShadow: "0 24px 48px rgba(0,0,0,0.4)" }}>
      <div style={{ display: "flex", gap: 6, marginBottom: "var(--s4)", paddingBottom: "var(--s3)", borderBottom: "1px solid var(--border-dim)" }}>
        {[0,1,2].map(i => <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: "#3B3B3F" }} />)}
        <span style={{ marginLeft: "auto", fontSize: "0.6875rem", color: "var(--text-dim)", fontFamily: "var(--font-mono)" }}>agent-session</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {lines.map((l, i) => {
          const visible = i <= tick;
          const isActive = i === tick;
          return (
            <motion.div key={l.label} initial={false} animate={{ opacity: visible ? 1 : 0.15, x: visible ? 0 : 4 }} transition={{ duration: 0.3, ease }}
              style={{ display: "flex", alignItems: "center", gap: "var(--s3)", padding: "6px var(--s3)", borderRadius: "var(--r-sm)", background: isActive ? "rgba(255,255,255,0.02)" : "transparent" }}>
              <l.icon size={13} color={visible ? l.color : "var(--text-dim)"} strokeWidth={2} />
              <span style={{ fontSize: "0.8125rem", fontFamily: "var(--font-mono)", color: visible ? (i < tick ? "var(--text-muted)" : "var(--text)") : "var(--text-dim)", fontWeight: isActive ? 500 : 400 }}>
                {l.label}
              </span>
              {i === 2 && visible && <span className="cost" style={{ marginLeft: "auto", fontSize: "0.6875rem" }}>$0.01</span>}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function BentoFeatures() {
  return (
    <section style={{ paddingBottom: "var(--s24)" }}>
      <div className="container">
        <motion.p className="caption" initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} style={{ marginBottom: "var(--s4)" }}>
          How it works
        </motion.p>
        <motion.h2 className="h1" initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, ease }} style={{ marginBottom: "var(--s12)", maxWidth: 500 }}>
          Three things happen when your agent needs data.
        </motion.h2>

        <div className="grid-bento">
          <motion.div className="card bento-tall" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, ease }}
            style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div>
              <div style={{ width: 40, height: 40, borderRadius: "var(--r-md)", background: "var(--amber-dim)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "var(--s5)" }}>
                <Lock size={18} color="var(--amber)" />
              </div>
              <h3 className="h3" style={{ marginBottom: "var(--s2)" }}>The agent hits a paywall</h3>
              <p className="body">
                Your agent requests premium data. The server responds with{" "}
                <code style={{ background: "var(--bg-elevated)", padding: "2px 8px", borderRadius: 6, fontFamily: "var(--font-mono)", fontSize: "0.8125rem" }}>402 Payment Required</code>
                {" "}— price and wallet address in the response header.
              </p>
            </div>
            <div style={{ marginTop: "var(--s6)", padding: "var(--s4)", background: "var(--bg-deep)", borderRadius: "var(--r-md)", fontFamily: "var(--font-mono)", fontSize: "0.75rem", lineHeight: 1.8, color: "var(--text-muted)" }}>
              <span style={{ color: "var(--amber)" }}>HTTP/1.1 402 Payment Required</span><br />
              <span style={{ color: "var(--text-dim)" }}>X-Payment-Amount:</span> 0.01<br />
              <span style={{ color: "var(--text-dim)" }}>X-Payment-Asset:</span> USDC<br />
              <span style={{ color: "var(--text-dim)" }}>X-Payment-Network:</span> stellar:testnet
            </div>
          </motion.div>

          <motion.div className="card" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, ease, delay: 0.08 }}>
            <div style={{ width: 40, height: 40, borderRadius: "var(--r-md)", background: "var(--indigo-dim)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "var(--s5)" }}>
              <DollarSign size={18} color="var(--indigo)" />
            </div>
            <h3 className="h3" style={{ marginBottom: "var(--s2)" }}>Instant payment</h3>
            <p className="body">The agent signs a USDC transaction on Stellar. Fees under $0.00001. Settlement in under 5 seconds.</p>
          </motion.div>

          <motion.div className="card" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, ease, delay: 0.15 }}>
            <div style={{ width: 40, height: 40, borderRadius: "var(--r-md)", background: "var(--emerald-dim)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "var(--s5)" }}>
              <Unlock size={18} color="var(--emerald)" />
            </div>
            <h3 className="h3" style={{ marginBottom: "var(--s2)" }}>Data unlocked</h3>
            <p className="body">Payment verified. The endpoint returns data with a full transaction receipt your agent can audit.</p>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  const tools = [
    { name: "Search", desc: "Query premium data sources", price: "0.01", icon: Search, color: "var(--indigo)" },
    { name: "Summarize", desc: "Distill long-form content", price: "0.02", icon: FileText, color: "var(--emerald)" },
    { name: "Analyze", desc: "Sentiment & entity extraction", price: "0.03", icon: BarChart3, color: "var(--amber)" },
  ];

  return (
    <section style={{ padding: "var(--s24) 0", borderTop: "1px solid var(--border-dim)", borderBottom: "1px solid var(--border-dim)" }}>
      <div className="container">
        <div className="grid-pricing">
          <motion.div initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, ease }}>
            <p className="caption" style={{ marginBottom: "var(--s3)" }}>Pricing</p>
            <h2 className="h2" style={{ marginBottom: "var(--s4)" }}>Pay per action.<br />Not per month.</h2>
            <p className="body" style={{ maxWidth: 360 }}>
              Every tool has a transparent, per-use price. No subscriptions, no credit packs, no minimums.
            </p>
          </motion.div>

          <div style={{ display: "flex", flexDirection: "column", gap: "var(--s3)" }}>
            {tools.map((t, i) => (
              <motion.div key={t.name} initial={{ opacity: 0, x: 16 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, ease, delay: i * 0.08 }}
                style={{ display: "flex", alignItems: "center", gap: "var(--s4)", padding: "var(--s4) var(--s5)", border: "1px solid var(--border-dim)", borderRadius: "var(--r-lg)", background: "var(--bg-surface)", transition: "border-color 200ms ease" }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--border-strong)")}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--border-dim)")}>
                <div style={{ width: 36, height: 36, borderRadius: "var(--r-md)", background: `${t.color}15`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <t.icon size={16} color={t.color} />
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: "0.9375rem", marginBottom: 1 }}>{t.name}</div>
                  <div style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>{t.desc}</div>
                </div>
                <span className="cost" style={{ fontSize: "0.8125rem" }}>${t.price}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Proof() {
  const stats = [
    { label: "Protocol", value: "x402 v2" },
    { label: "Network", value: "Stellar" },
    { label: "Asset", value: "USDC" },
    { label: "Settlement", value: "< 5s" },
    { label: "Tx Fee", value: "~$0.00001" },
  ];

  return (
    <section style={{ padding: "var(--s16) 0" }}>
      <div className="container">
        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "var(--s8)", padding: "var(--s8) 0" }}>
          {stats.map((s) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 8 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4, ease }}>
              <div className="caption" style={{ marginBottom: "var(--s1)" }}>{s.label}</div>
              <div style={{ fontSize: "1.125rem", fontWeight: 600 }}>{s.value}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function BottomCTA() {
  return (
    <section style={{ padding: "var(--s24) 0", borderTop: "1px solid var(--border-dim)" }}>
      <div className="container" style={{ maxWidth: 600 }}>
        <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, ease }} style={{ textAlign: "center" }}>
          <h2 className="h1" style={{ marginBottom: "var(--s4)" }}>Ready to see it work?</h2>
          <p className="body-lg" style={{ marginBottom: "var(--s8)", maxWidth: 440, margin: "0 auto var(--s8)" }}>
            Open the workspace, type a prompt, and watch your agent pay for data in real time.
          </p>
          <Link href="/workspace" className="btn btn-primary btn-lg">
            Open workspace <ArrowRight size={15} />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer style={{ padding: "var(--s6) 0", borderTop: "1px solid var(--border-dim)" }}>
      <div className="container" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "var(--s3)" }}>
        <span style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>© 2026 AgentPay · Stekker Hackathon</span>
        <span style={{ fontSize: "0.75rem", color: "var(--text-dim)" }}>Stellar · x402 · USDC</span>
      </div>
    </footer>
  );
}
