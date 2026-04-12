"use client";

import { useState, useEffect } from "react";
import { Loader2, Wallet, ExternalLink, LogOut } from "lucide-react";

interface WalletState {
  address: string;
  network: string;
}

const STORAGE_KEY = "agentpay_wallet";

export default function WalletConnect() {
  const [wallet, setWallet] = useState<WalletState | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setWallet(JSON.parse(stored));
    } catch { /* ignore */ }
  }, []);

  if (!mounted) return (
    <div style={{
      background: "var(--bg-surface)", border: "1px solid var(--border-dim)",
      borderRadius: "var(--r-xl)", padding: "var(--s5)",
      display: "flex", flexDirection: "column", gap: "var(--s4)",
    }}>
      <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>Connect Freighter Wallet</div>
      <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)", margin: 0 }}>
        Connect your Freighter wallet to view your Stellar account on-chain.
      </p>
    </div>
  );

  const connect = async () => {
    setConnecting(true);
    setError(null);
    try {
      const { requestAccess, isConnected, getNetwork } = await import("@stellar/freighter-api");

      // Retry isConnected up to 3 times — extension may not have injected yet
      let status = await isConnected();
      if (!status.isConnected) {
        await new Promise(r => setTimeout(r, 500));
        status = await isConnected();
      }
      if (!status.isConnected) {
        await new Promise(r => setTimeout(r, 1000));
        status = await isConnected();
      }

      if (!status.isConnected) {
        setError("Freighter not detected. Install it at freighter.app, unlock it, then try again.");
        return;
      }

      const result = await requestAccess();
      if (result.error) {
        const msg = typeof result.error === "object"
          ? (result.error as { message?: string }).message ?? JSON.stringify(result.error)
          : String(result.error);
        setError(msg.toLowerCase().includes("declin") || msg.toLowerCase().includes("reject")
          ? "Connection cancelled."
          : msg);
        return;
      }

      if (!result.address) {
        setError("No address returned. Try again.");
        return;
      }

      const networkResult = await getNetwork();
      const network = networkResult.network ?? "TESTNET";

      const w: WalletState = { address: result.address, network };
      setWallet(w);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(w));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error.");
    } finally {
      setConnecting(false);
    }
  };

  const disconnect = () => {
    setWallet(null);
    setError(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  const short = wallet
    ? `${wallet.address.slice(0, 6)}…${wallet.address.slice(-6)}`
    : null;

  return (
    <div style={{
      background: "var(--bg-surface)",
      border: `1px solid ${wallet ? "rgba(16,185,129,0.3)" : "var(--border-dim)"}`,
      borderRadius: "var(--r-xl)",
      padding: "var(--s5)",
      display: "flex",
      flexDirection: "column",
      gap: "var(--s4)",
    }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "var(--s2)" }}>
          {wallet
            ? <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--emerald)", animation: "pulse-dot 2s ease infinite" }} />
            : <Wallet size={14} color="var(--text-muted)" />
          }
          <span style={{ fontWeight: 600, fontSize: "0.875rem", color: wallet ? "var(--emerald)" : "var(--text)" }}>
            {wallet ? "Freighter Connected" : "Connect Freighter Wallet"}
          </span>
        </div>
        {wallet && (
          <span style={{
            fontSize: "0.625rem", fontWeight: 600, padding: "2px 8px",
            background: "var(--emerald-dim)", color: "var(--emerald)",
            borderRadius: "var(--r-full)", letterSpacing: "0.05em",
          }}>
            {wallet.network}
          </span>
        )}
      </div>

      {/* Address */}
      {wallet ? (
        <div style={{
          background: "var(--bg-card)", borderRadius: "var(--r-lg)",
          padding: "var(--s3) var(--s4)", display: "flex",
          alignItems: "center", justifyContent: "space-between", gap: "var(--s3)",
        }}>
          <code style={{ fontFamily: "var(--font-mono)", fontSize: "0.8125rem", color: "var(--text-body)" }}>
            {short}
          </code>
          <a
            href={`https://stellar.expert/explorer/testnet/account/${wallet.address}`}
            target="_blank" rel="noopener noreferrer"
            title="View on Stellar Expert"
          >
            <ExternalLink size={13} color="var(--emerald)" />
          </a>
        </div>
      ) : (
        <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)", margin: 0 }}>
          Connect your Freighter wallet to view your Stellar account on-chain.
        </p>
      )}

      {/* Error */}
      {error && (
        <div style={{ fontSize: "0.75rem", color: "var(--rose)", display: "flex", alignItems: "center", gap: "var(--s2)" }}>
          {error}
          {!error.includes("freighter.app") ? null : (
            <a href="https://freighter.app" target="_blank" rel="noopener noreferrer"
              style={{ color: "var(--emerald)", textDecoration: "underline" }}>
              Install
            </a>
          )}
        </div>
      )}

      {/* Action button */}
      {wallet ? (
        <button onClick={disconnect} className="btn btn-secondary" style={{ fontSize: "0.8125rem", gap: "var(--s2)" }}>
          <LogOut size={13} /> Disconnect
        </button>
      ) : (
        <button onClick={connect} disabled={connecting} className="btn btn-primary" style={{ fontSize: "0.8125rem" }}>
          {connecting
            ? <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Connecting…</>
            : <><Wallet size={14} /> Connect Wallet</>
          }
        </button>
      )}
    </div>
  );
}
