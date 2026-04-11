# Agent Paywall Router — Web App

> Next.js 16 application powering the Agent Paywall Router platform.

## Quick Start

```bash
# From repo root
npm install

# Copy and fill in environment variables
cp ../../.env.example .env.local

# Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Required Environment Variables

| Variable | Description |
|---|---|
| `STELLAR_PRIVATE_KEY` | Agent wallet secret key (starts with `S`) — pays for tools |
| `STELLAR_RECEIVER_ADDRESS` | Service wallet public key (starts with `G`) — receives payments |
| `NEXT_PUBLIC_BASE_URL` | Full URL of this app (e.g. `http://localhost:3000`) |
| `OPENAI_API_KEY` | OpenAI key for LLM orchestration (GPT-4o-mini) |
| `FACILITATOR_URL` | x402 facilitator (default: `https://x402.org/facilitator`) |
| `SUPABASE_URL` | Optional — Supabase for persistent storage |
| `SUPABASE_SERVICE_ROLE_KEY` | Optional — Supabase service role key |

Without Supabase, the app runs in **in-memory mode** (data resets on restart). All payment flows still work.

## Key Routes

| Route | Description |
|---|---|
| `/` | Landing page |
| `/workspace` | Main agent workspace UI |
| `/workspace/a2a` | Agent-to-Agent commerce demo |
| `POST /api/agent` | LLM orchestration engine |
| `GET /api/catalog` | Machine-readable tool discovery |
| `GET /api/tools/search` | x402-protected search tool |
| `POST /api/tools/summarize` | x402-protected summarize tool |
| `POST /api/tools/analyze` | x402-protected analyze tool |
| `POST /api/tools/mpp` | MPP-protected search tool |
| `GET /api/mcp/tools` | MCP tool discovery |
| `POST /api/mcp/execute` | MCP tool execution |
| `GET /api/health/onchain` | Live Soroban contract verification |

## Running Tests

```bash
# Unit + integration tests (54 tests)
npm test

# Type check
npx tsc --noEmit
```

## Payment Protocols

- **x402** — HTTP-native per-request micropayments via Stellar USDC
- **MPP** — Stripe Machine Payments Protocol on Stellar

## On-Chain Contract

| | |
|---|---|
| Contract | `CABLFWICBLK5IX3EWQSVQGS6WIQ2V7YLNLA6HIPGLGEDCO4DKOQQSWOQ` |
| Network | Stellar Testnet |
| Explorer | [View on Stellar Expert](https://stellar.expert/explorer/testnet/contract/CABLFWICBLK5IX3EWQSVQGS6WIQ2V7YLNLA6HIPGLGEDCO4DKOQQSWOQ) |
