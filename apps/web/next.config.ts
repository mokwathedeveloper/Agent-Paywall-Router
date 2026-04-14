import type { NextConfig } from "next";

const securityHeaders = [
  // Clickjacking protection
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  // XSS protection
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Referrer policy
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Cross-Origin Opener Policy — fixes COOP warning
  { key: "Cross-Origin-Opener-Policy", value: "same-origin-allow-popups" },
  // Permissions policy
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  // Basic CSP — allows Stellar/x402 external calls, blocks inline scripts from unknown origins
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // Next.js requires unsafe-eval in dev
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob: https:",
      "connect-src 'self' https://horizon-testnet.stellar.org https://soroban-testnet.stellar.org https://x402.org https://openrouter.ai https://api.openai.com https://api.duckduckgo.com https://en.wikipedia.org https://api.tavily.com https://news.google.com https://api.open-meteo.com https://geocoding-api.open-meteo.com",
      "frame-ancestors 'none'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "@stellar/stellar-sdk",
    "@x402/stellar",
    "@x402/fetch",
    "@x402/core",
  ],
  turbopack: {},
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
