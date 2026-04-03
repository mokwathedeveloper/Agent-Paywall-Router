import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Agent Paywall Router — Agents that can pay for actions",
  description:
    "An agent-native payment layer for paid web actions. Per-request micropayments via Stellar x402 protocol.",
  keywords: ["x402", "Stellar", "AI agent", "micropayments", "paywall", "USDC"],
  openGraph: {
    title: "Agent Paywall Router",
    description: "Per-request micropayments for AI agents via x402 + Stellar",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
