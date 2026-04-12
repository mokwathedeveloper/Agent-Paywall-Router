# Agent Paywall Router — Web App

> **Next.js 16** · Vercel AI SDK · x402 v2 · Stellar Testnet · Soroban · MPP

This is the Next.js application powering the Agent Paywall Router. It contains the LLM orchestration engine, x402 payment server, Soroban contract client, MCP server, and all API routes.

---

## Quick Start

```bash
# From repo root
npm install

# Copy env template
cp .env.example apps/web/.env.local
# Fill in your values — see Environment Variables below

# Start dev server
cd apps/web && npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `STELLAR_PRIVATE_KEY` | ✅ | Agent wallet secret key (starts with `S`) — pays for tools |
| `STELLAR_RECEIVER_ADDRESS` | ✅ | Service wallet public key (starts with `G`) — receives payments |
| `NEXT_PUBLIC_BASE_URL` | ✅ | Full URL of this app (e.g. `http://localhost:3000`) |
| `OPENROUTER_API_KEY` | ✅ | Free LLM key — get one at [openrouter.ai](https://openrouter.ai) |
| `OPENAI_API_KEY` | — | Alternative to OpenRouter (paid) |
| `FACILITATOR_URL` | — | x402 facilitator (default: `https://x402.org/facilitator`) |
| `SUPABASE_URL` | — | Optional — enables persistent storage |
| `SUPABASE_SERVICE_ROLE_KEY` | — | Optional — required with `SUPABASE_URL` |

> Without Supabase, the app runs in **in-memory mode** — all data resets on server restart. Payments still work.

### Get a free LLM key

1. Go to [https://openrouter.ai](https://openrouter.ai)
2. Sign up with Google or GitHub — no credit card required
3. Go to [https://openrouter.ai/keys](https://openrouter.ai/keys) → Create Key
4. Add to `.env.local`: `OPENROUTER_API_KEY=sk-or-...`

### Get Stellar testnet wallets with USDC

```bash
# Fund both wallets with testnet XLM
curl "https://friendbot.stellar.org?addr=<AGENT_PUBLIC_KEY>"
curl "https://friendbot.stellar.org?addr=<RECEIVER_PUBLIC_KEY>"
```

Add a USDC trustline to both wallets via [Stellar Lab](https://laboratory.stellar.org).
USDC issuer on testnet: `GBBD67V63LTZ6ORUC6KXW7ZJJEIKB3766SQRR2NJZSC6ZBCS2MVAUIB9`

---

## Running the Demo

```bash
# CLI demo — from repo root, server must be running
npm run demo

# API endpoint
curl -s "http://localhost:3000/api/demo/run" | jq .

# Direct agent call
curl -s -X POST "http://localhost:3000/api/agent" \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Search for Stellar blockchain news"}' \
  | jq '{txHash, cost, tool}'
```

---

## API Routes

| Route | Method | Description | Cost |
|---|---|---|---|
| `/api/demo/run` | GET | End-to-end demo with payment proof | varies |
| `/api/agent` | POST | LLM orchestration engine | varies |
| `/api/services` | GET | Agent-optimised service registry (sorted by price) | free |
| `/api/catalog` | GET | Full machine-readable tool discovery | free |
| `/api/tools/search` | GET | x402-protected web search | $0.01 USDC |
| `/api/tools/summarize` | POST | x402-protected LLM summarization | $0.02 USDC |
| `/api/tools/analyze` | POST | x402-protected sentiment analysis | $0.03 USDC |
| `/api/tools/mpp` | POST | MPP-protected search (Stripe MPP) | $0.01 USDC |
| `/api/mcp/tools` | GET | MCP tool discovery — Claude/Cursor compatible | free |
| `/api/mcp/execute` | POST | MCP tool execution with x402 receipt | varies |
| `/api/sessions` | POST/GET | Session management with spending limits | free |
| `/api/transactions` | GET | On-chain transaction ledger | free |
| `/api/health` | GET | Service health check | free |
| `/api/health/onchain` | GET | Live Soroban contract spend verification | free |
| `/api/a2a/run` | POST | Agent-to-Agent commerce execution | varies |

---

## Tests

```bash
npm test              # 54 unit tests — no server required
npx tsc --noEmit      # TypeScript check
npx eslint app/ lib/  # Lint check
```

---

## Soroban Contract

| | |
|---|---|
| Contract ID | `CABLFWICBLK5IX3EWQSVQGS6WIQ2V7YLNLA6HIPGLGEDCO4DKOQQSWOQ` |
| Network | Stellar Testnet |
| Limit | $5.00 per agent (50,000,000 stroops) |
| Explorer | [View on Stellar Expert ↗](https://stellar.expert/explorer/testnet/contract/CABLFWICBLK5IX3EWQSVQGS6WIQ2V7YLNLA6HIPGLGEDCO4DKOQQSWOQ) |
