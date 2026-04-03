"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

export default function WalletConnect() {
  const [address, setAddress] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connect = async () => {
    setConnecting(true);
    setError(null);
    try {
      const { requestAccess, isConnected } = await import("@stellar/freighter-api");

      // Check if Freighter extension is present
      const status = await isConnected();
      if (!status.isConnected) {
        setError("Freighter extension not detected. Make sure it is installed and enabled for localhost.");
        return;
      }

      // requestAccess opens the Freighter popup and returns the address
      const result = await requestAccess();

      if (result.error) {
        // error is { code, message } in v6
        const msg = typeof result.error === "object"
          ? (result.error as { message?: string }).message ?? JSON.stringify(result.error)
          : String(result.error);
        setError(msg.includes("User declined") || msg.includes("reject") ? "Connection cancelled." : msg);
        return;
      }

      if (result.address) {
        setAddress(result.address);
      } else {
        setError("No address returned. Please try again.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unexpected error. Check console.");
      console.error("WalletConnect error:", err);
    } finally {
      setConnecting(false);
    }
  };

  return (
    <div style={{
      background: "var(--bg-surface)",
      border: `1px solid ${address ? "rgba(16,185,129,0.3)" : "var(--border-dim)"}`,
      borderRadius: "var(--r-xl)",
      padding: "var(--s5)",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: "var(--s4)",
      flexWrap: "wrap",
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        {address ? (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: "var(--s2)", marginBottom: "var(--s1)" }}>
              <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--emerald)", animation: "pulse-dot 2s ease infinite" }} />
              <span style={{ fontWeight: 600, fontSize: "0.875rem", color: "var(--emerald)" }}>Freighter Connected</span>
            </div>
            <code style={{ fontFamily: "var(--font-mono)", fontSize: "0.75rem", color: "var(--text-body)", wordBreak: "break-all" }}>
              {address}
            </code>
          </>
        ) : (
          <>
            <div style={{ fontWeight: 600, fontSize: "0.875rem", marginBottom: "var(--s1)" }}>Connect Freighter Wallet</div>
            <div style={{ fontSize: "0.8125rem", color: "var(--text-muted)" }}>
              Fund your agent directly from your Stellar wallet
            </div>
          </>
        )}
        {error && (
          <div style={{ marginTop: "var(--s2)", fontSize: "0.75rem", color: "var(--rose)" }}>
            {error}
          </div>
        )}
      </div>
      <button
        onClick={address ? () => { setAddress(null); setError(null); } : connect}
        disabled={connecting}
        className="btn btn-secondary"
        style={{ flexShrink: 0, fontSize: "0.8125rem" }}
      >
        {connecting
          ? <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
          : address ? "Disconnect" : "Connect Wallet"
        }
      </button>
    </div>
  );
}
