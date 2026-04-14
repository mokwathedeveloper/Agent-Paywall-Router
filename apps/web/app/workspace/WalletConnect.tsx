"use client";

import { useState, useEffect } from "react";
import { Loader2, Wallet, ExternalLink, LogOut, AlertTriangle } from "lucide-react";

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
  const [hasExtension, setHasExtension] = useState<boolean | null>(null);

  useEffect(() => {
    setMounted(true);
    
    // Check for wallet extensions
    const checkExtensions = async () => {
      // Check for Freighter
      const freighter = await import("@stellar/freighter-api").then(m => m.isConnected()).catch(() => ({ isConnected: false }));
      // Check for MetaMask (ethereum)
      const ethereum = typeof window !== "undefined" && !!(window as any).ethereum;
      
      setHasExtension(freighter.isConnected || ethereum);
    };

    checkExtensions();

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
      <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>Connect Wallet</div>
      <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)", margin: 0 }}>
        Initializing wallet connection...
      </p>
    </div>
  );

  const connect = async () => {
    setConnecting(true);
    setError(null);
    try {
      // Dynamic import to avoid SSR issues and only load when needed
      const freighterApi = await import("@stellar/freighter-api");
      const { requestAccess, isConnected, getNetwork } = freighterApi;

      // Detect extensions with retries for injection lag
      let status = await isConnected();
      if (!status.isConnected) {
        await new Promise(r => setTimeout(r, 800));
        status = await isConnected();
      }

      // If Freighter isn't found, check if MetaMask exists (even if we prefer Freighter for Stellar)
      const hasMetaMask = typeof window !== "undefined" && !!(window as any).ethereum;

      if (!status.isConnected && !hasMetaMask) {
        setHasExtension(false);
        setError("Wallet extension not detected. Please install Freighter or MetaMask to continue.");
        return;
      }

      // Project uses Stellar x402, so we primarily use Freighter
      if (!status.isConnected) {
        setError("Freighter not detected. While MetaMask was found, this project requires a Stellar-compatible wallet like Freighter.");
        return;
      }

      const result = await requestAccess();
      if (result.error) {
        const msg = typeof result.error === "object"
          ? (result.error as { message?: string }).message ?? JSON.stringify(result.error)
          : String(result.error);
        
        if (msg.toLowerCase().includes("declin") || msg.toLowerCase().includes("reject")) {
          setError("Connection cancelled by user.");
        } else {
          setError(`Connection failed: ${msg}`);
        }
        return;
      }

      if (!result.address) {
        setError("No account address returned from wallet. Please unlock your wallet and try again.");
        return;
      }

      const networkResult = await getNetwork();
      const network = networkResult.network ?? "TESTNET";

      const w: WalletState = { address: result.address, network };
      setWallet(w);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(w));
      setHasExtension(true);
    } catch (err) {
      console.error("Wallet connection error:", err);
      setError(err instanceof Error ? err.message : "An unexpected error occurred while connecting.");
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
            : <Wallet size={14} color={hasExtension === false ? "var(--rose)" : "var(--text-muted)"} />
          }
          <span style={{ 
            fontWeight: 600, 
            fontSize: "0.875rem", 
            color: wallet ? "var(--emerald)" : hasExtension === false ? "var(--rose)" : "var(--text)" 
          }}>
            {wallet ? "Wallet Connected" : hasExtension === false ? "Extension Missing" : "Connect Wallet"}
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

      {/* Content */}
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
      ) : hasExtension === false ? (
        <div style={{ 
          background: "var(--rose-dim)", 
          padding: "var(--s3)", 
          borderRadius: "var(--r-md)",
          display: "flex",
          gap: "var(--s2)",
          alignItems: "flex-start"
        }}>
          <AlertTriangle size={14} color="var(--rose)" style={{ flexShrink: 0, marginTop: 2 }} />
          <p style={{ fontSize: "0.75rem", color: "var(--rose)", margin: 0, lineHeight: 1.4 }}>
            Wallet extension not detected. Please install <a href="https://freighter.app" target="_blank" rel="noopener noreferrer" style={{ textDecoration: "underline", fontWeight: 600 }}>Freighter</a> to use this app on Stellar.
          </p>
        </div>
      ) : (
        <p style={{ fontSize: "0.8125rem", color: "var(--text-muted)", margin: 0 }}>
          Connect your wallet to sign transactions and view your account on-chain.
        </p>
      )}

      {/* Error Message (General) */}
      {error && !error.includes("not detected") && (
        <div style={{ fontSize: "0.75rem", color: "var(--rose)", display: "flex", alignItems: "center", gap: "var(--s2)" }}>
          <AlertTriangle size={12} />
          {error}
        </div>
      )}

      {/* Action button */}
      {wallet ? (
        <button onClick={disconnect} className="btn btn-secondary" style={{ fontSize: "0.8125rem", gap: "var(--s2)" }}>
          <LogOut size={13} /> Disconnect
        </button>
      ) : (
        <button 
          onClick={connect} 
          disabled={connecting || hasExtension === false} 
          className="btn btn-primary" 
          style={{ 
            fontSize: "0.8125rem",
            opacity: hasExtension === false ? 0.6 : 1,
            cursor: hasExtension === false ? "not-allowed" : "pointer"
          }}
        >
          {connecting
            ? <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Connecting…</>
            : hasExtension === false ? "Extension Required" : <><Wallet size={14} /> Connect Wallet</>
          }
        </button>
      )}
    </div>
  );
}
