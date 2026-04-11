import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "@stellar/stellar-sdk",
    "@x402/stellar",
    "@x402/fetch",
    "@x402/core",
  ],
  turbopack: {},
};

export default nextConfig;
