import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

// Use next/font instead of @import in CSS — eliminates render-blocking font request
// preload: false avoids the "unused preloaded font" warning on pages that don't use it
const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
  preload: false,
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jetbrains",
  preload: false,
});

export const metadata: Metadata = {
  title: "Agent Paywall Router — Agents that can pay for actions",
  description:
    "An agent-native payment layer for paid web actions. Per-request micropayments via Stellar x402 protocol.",
  keywords: ["x402", "Stellar", "AI agent", "micropayments", "paywall", "USDC"],
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: "Agent Paywall Router",
    description: "Per-request micropayments for AI agents via x402 + Stellar",
    type: "website",
    url: "https://github.com/mokwathedeveloper/Agent-Paywall-Router",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
