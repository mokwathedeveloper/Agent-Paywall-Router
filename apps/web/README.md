# Agent Paywall Router — Web App

> Next.js 16 · Vercel AI SDK · x402 · Stellar Testnet · Soroban

## Quick Start

```bash
# From repo root
npm install

# Copy env template
cp ../../.env.example .env.local
# Fill in your values (see below)

# Start dev server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `STELLAR_PRIVATE_KEY` | ✅ | Agent wallet secret key (starts with `S`) — pays for tools |
| `STELLAR_RECEIVER_ADDRESS` | ✅ | Service wallet public key (starts with `G`) — receives payments |
| `NEXT_PUBLIC_BASE_URL` | ✅ | Full URL of this app (`http://localhost:3000`) |
| `OPENROUTER_API_KEY` | ✅* | Free LLM key — get one at [openrouter.ai](https://openrouter.ai) |
| `OPENAI_API_KEY` | ✅* | Alternative to OpenRouter |
| `FACILITATOR_URL` | — | x402 facilitator (default: `https://x402.org/facilitator`) |
| `SUPABASE_URL` | — | Optional persistent storage |
| `SUPABASE_SERVICE_ROLE_KEY` | — | Optional persistent storage |

*One of `OPENROUTER_API_KEY` or `OPENAI_API_KEY` is required. OpenRouter is free.

### Get a free LLM key (OpenRouter)

1. Go to [https://openrouter.ai](https://openrouter.ai)
2. Sign up with Google or GitHub — no credit card
3. Go to [https://openrouter.ai/keys](https://openrouter.ai/keys) → Create Key
4. Add to `.env.local`: `OPENROUTER_API_KEY=sk-or-...`

### Get Stellar testnet wallets with USDC

```bash
# Fund agent wallet (pays for tools)
curl "https://friendbot.stellar.org?addr=<YOUR_AGENT_PUBLIC_KEY>"

# Fund receiver wallet (receives payments)
curl "https://friendbot.stellar.org?addr=<YOUR_RECEIVER_PUBLIC_KEY>"
```

Add USDC trustline to both wallets via [Stellar Lab](https://laboratory.stellar.org).
USDC issuer on testnet: `GBBD67V63LTZ6ORUC6KXW7ZJJEIKB3766SQRR2NJZSC6ZBCS2MVAUIB9`

---

## Running the Demo

```bash
# From repo root — server must be running first
npm run demo
```

Or via API:
```bash
curl -s "http://localhost:3000/api/demo/run" | jq .
```

Or via curl directly to the agent:
```bash
curl -s -X POST "http://localhost:3000/api/agent" \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Search for Stellar blockchain and summarize the key points"}' \
  | jq '{txHash, cost, tool}'
```

---

## API Routes

| Route | Method | Description |
|---|---|---|
| `/api/demo/run` | GET | End-to-end demo with payment proof |
| `/api/agent` | POST | LLM orchestration engine |
| `/api/tools/search` | GET | x402-protected search ($0.01 USDC) |
| `/api/tools/summarize` | POST | x402-protected summarize ($0.02 USDC) |
| `/api/tools/analyze` | POST | x402-protected analyze ($0.03 USDC) |
| `/api/tools/mpp` | POST | MPP-protected search ($0.01 USDC) |
| `/api/catalog` | GET | Machine-readable tool discovery |
| `/api/mcp/tools` | GET | MCP tool discovery |
| `/api/health` | GET | Service health |
| `/api/health/onchain` | GET | Live Soroban contract verification |

---

## Tests

```bash
# Unit tests (54 passing — no server required)
npm test

# Type check
npx tsc --noEmit
```

---

## Soroban Contract

| | |
|---|---|
| Contract ID | `CABLFWICBLK5IX3EWQSVQGS6WIQ2V7YLNLA6HIPGLGEDCO4DKOQQSWOQ` |
| Network | Stellar Testnet |
| Explorer | [View on Stellar Expert](https://stellar.expert/explorer/testnet/contract/CABLFWICBLK5IX3EWQSVQGS6WIQ2V7YLNLA6HIPGLGEDCO4DKOQQSWOQ) |
