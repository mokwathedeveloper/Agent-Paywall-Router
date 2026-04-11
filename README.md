# Agent Paywall Router

> **Stellar Hacks: Agents 2026** — Built by Mokwa Moffat Ohuru

An agent-native payment infrastructure that solves the **Last Mile problem for AI agents: how to pay for things.**

When an AI agent hits a paywall, it stops. This system makes it continue — autonomously paying with real USDC on Stellar, enforcing on-chain spending limits via a Soroban smart contract, and returning verifiable transaction proof.

**The Stripe for AI Agents.**

---

## What Makes This Different

Most "agent payment" demos simulate payments. This one does not.

Every tool call in this system:
1. Hits a real HTTP 402 paywall
2. Signs a real USDC transaction on Stellar testnet via x402
3. Calls `authorize()` on a deployed Soroban spending policy contract
4. Returns a real, verifiable transaction hash

No mocks. No fallbacks. No fake hashes.

---

## Architecture

```
User Prompt
    │
    ▼
POST /api/agent  (LLM orchestration — GPT-4o-mini via Vercel AI SDK)
    │
    ├── Security scan (prompt injection detection)
    ├── Session budget check (in-memory or Supabase)
    │
    ▼
GET /api/tools/search?q=...   (x402 paywall)
    │
    ├── 402 Payment Required  ◄── x402 server returns payment spec
    ├── Agent signs USDC tx   ◄── @x402/stellar ExactStellarScheme
    ├── Soroban authorize()   ◄── on-chain spending limit enforced
    └── 200 OK + data + proofs
    │
    ▼
Response: { result, txHash, policyTxHash, steps, cost }
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| AI Orchestration | Vercel AI SDK 6.x + GPT-4o-mini |
| Payment Protocol | x402 v2 (Coinbase) |
| Machine Payments | @stellar/mpp (Stripe MPP) |
| Blockchain | Stellar Testnet — USDC micropayments |
| Smart Contract | Soroban (Rust) — spending policy |
| Web Framework | Next.js 16 (Turbopack) |
| MCP Server | Model Context Protocol — Claude/Cursor compatible |
| Database | Supabase (optional) / in-memory fallback |
| Testing | Jest — 54 passing tests |

---

## Soroban Spending Policy Contract

A Rust smart contract deployed on Stellar testnet enforces per-agent spending limits on-chain.

| | |
|---|---|
| Contract ID | `CABLFWICBLK5IX3EWQSVQGS6WIQ2V7YLNLA6HIPGLGEDCO4DKOQQSWOQ` |
| Network | Stellar Testnet |
| Explorer | [View on Stellar Expert](https://stellar.expert/explorer/testnet/contract/CABLFWICBLK5IX3EWQSVQGS6WIQ2V7YLNLA6HIPGLGEDCO4DKOQQSWOQ) |

Before every payment, the agent calls `authorize(agent, amount)`. If cumulative spend exceeds $5.00, the transaction reverts on-chain.

---

## Quick Start

### Prerequisites

- Node.js 20+
- A Stellar testnet wallet with XLM + USDC trustline ([fund here](https://friendbot.stellar.org))
- An OpenAI API key

### 1. Clone and install

```bash
git clone https://github.com/mokwathedeveloper/Agent-Paywall-Router.git
cd Agent-Paywall-Router
npm install
```

### 2. Configure environment

```bash
cp .env.example apps/web/.env.local
```

Edit `apps/web/.env.local` and fill in all values:

```env
# Agent wallet — pays for tools (needs USDC trustline + balance)
STELLAR_PRIVATE_KEY=S...

# Service wallet — receives payments
STELLAR_RECEIVER_ADDRESS=G...

# Required for LLM orchestration
OPENAI_API_KEY=sk-...

# Base URL of this app
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# x402 facilitator
FACILITATOR_URL=https://x402.org/facilitator
```

> **Get testnet USDC:** Go to [Stellar Lab](https://laboratory.stellar.org), create a testnet account, fund with Friendbot, then add a USDC trustline to the issuer `GBBD67V63LTZ6ORUC6KXW7ZJJEIKB3766SQRR2NJZSC6ZBCS2MVAUIB9`.

### 3. Run

```bash
cd apps/web
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Live Demo

### Option A — Browser UI

1. Open [http://localhost:3000/workspace](http://localhost:3000/workspace)
2. Type a prompt: `Search for Stellar blockchain news and summarize the key points`
3. Watch the execution timeline — each step shows the 402 challenge, payment, and Soroban authorization
4. Click the transaction hash to verify on Stellar Expert

### Option B — curl

```bash
curl -s -X POST "http://localhost:3000/api/agent" \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Search for Stellar x402 protocol and summarize the key points"}' \
  | jq '{txHash, cost, tool, steps: [.steps[] | {action, status, detail}]}'
```

Expected response shape:
```json
{
  "txHash": "stellar:abc123...",
  "cost": 0.03,
  "tool": "summarize",
  "steps": [
    { "action": "Security Check", "status": "success", "detail": "Prompt verified safe" },
    { "action": "Budget available for search", "status": "success", "detail": "$0.01 available" },
    { "action": "Requesting search", "status": "payment_required", "detail": "402 — Payment Required" },
    { "action": "Paying $0.01 USDC", "status": "paying", "detail": "Signing via @x402/stellar" },
    { "action": "search confirmed", "status": "success", "detail": "tx: stellar:abc123..." },
    { "action": "SpendingPolicy.authorize", "status": "success", "detail": "policy_tx: def456..." },
    { "action": "Done", "status": "success", "detail": "All tools executed and results aggregated" }
  ]
}
```

### Option C — MCP (Claude / Cursor / Codex)

```bash
# Discover tools
curl http://localhost:3000/api/mcp/tools

# Execute with payment receipt
curl -X POST http://localhost:3000/api/mcp/execute \
  -H "Content-Type: application/json" \
  -H "x402-receipt: <your_receipt>" \
  -d '{"tool":"search","arguments":{"query":"Stellar payments"}}'
```

### Option D — Agent-to-Agent (A2A)

Open [http://localhost:3000/workspace/a2a](http://localhost:3000/workspace/a2a), enter a funded testnet secret key, and click **Start A2A Flow**. A second autonomous agent will discover tools, pay for them, and return results — no human clicks required.

---

## API Reference

| Endpoint | Method | Description |
|---|---|---|
| `/api/agent` | POST | LLM orchestration — multi-step tool chaining with x402 payments |
| `/api/catalog` | GET | Machine-readable tool discovery (x402 + MPP specs) |
| `/api/tools/search` | GET | x402-protected web search ($0.01 USDC) |
| `/api/tools/summarize` | POST | x402-protected text summarization ($0.02 USDC) |
| `/api/tools/analyze` | POST | x402-protected sentiment analysis ($0.03 USDC) |
| `/api/tools/mpp` | POST | MPP-protected search (Stripe Machine Payments Protocol) |
| `/api/mcp/tools` | GET | MCP tool discovery — Claude/Cursor compatible |
| `/api/mcp/execute` | POST | MCP tool execution with x402 receipt |
| `/api/sessions` | POST/GET | Session management with spending limits |
| `/api/transactions` | GET | On-chain transaction ledger |
| `/api/health` | GET | Service health check |
| `/api/health/onchain` | GET | Live Soroban contract spend verification |

---

## Payment Flow (x402)

```
Agent → GET /api/tools/search?q=stellar
      ← 402 Payment Required
           PAYMENT-REQUIRED: base64({"x402Version":2,"accepts":[{
             "scheme":"exact",
             "network":"stellar:testnet",
             "asset":"CBIELTK6...",
             "amount":"100000",
             "payTo":"G...",
             "facilitator":"https://x402.org/facilitator"
           }]})

Agent → signs USDC transaction via @x402/stellar ExactStellarScheme
      → calls Soroban authorize(agent, 100000)
      → GET /api/tools/search?q=stellar
           x402-receipt: <signed_payment_proof>
      ← 200 OK + search results + PAYMENT-RESPONSE header
           { tool: "search", results: [...], proofs: { paymentTxHash, policyTxHash } }
```

---

## Security

- **Prompt injection detection** — pattern-based scanner on all inputs (word-boundary aware)
- **Tool input validation** — second scan on LLM-generated tool arguments
- **On-chain spending limits** — Soroban contract enforces $5.00 per-agent cap
- **Fail-closed payments** — missing env vars throw immediately, no silent fallbacks
- **Tool output isolation** — LLM instructed to treat tool responses as untrusted data

---

## Testing

```bash
cd apps/web

# Unit tests (54 passing — no server required)
npm test

# Type check
npx tsc --noEmit

# Lint
npx eslint app/ lib/ --ext .ts,.tsx
```

---

## Project Structure

```
apps/web/
├── app/
│   ├── api/
│   │   ├── agent/          # LLM orchestration engine
│   │   ├── catalog/        # Tool discovery (x402 + MPP specs)
│   │   ├── tools/          # x402-protected tool endpoints
│   │   │   ├── search/
│   │   │   ├── summarize/
│   │   │   ├── analyze/
│   │   │   └── mpp/        # Stripe MPP endpoint
│   │   ├── mcp/            # Model Context Protocol server
│   │   ├── sessions/       # Session + budget management
│   │   ├── transactions/   # On-chain ledger
│   │   ├── health/         # Health + Soroban verification
│   │   └── a2a/            # Agent-to-Agent commerce
│   └── workspace/          # React UI
├── lib/
│   ├── paywall/
│   │   ├── x402.ts         # x402 server (verify + settle)
│   │   └── paid-x402-tool.ts  # Shared tool payment flow
│   ├── onchain/
│   │   └── spending-policy.ts  # Soroban contract client
│   ├── services/
│   │   ├── search.ts       # DuckDuckGo + Wikipedia
│   │   ├── summarizer.ts   # LLM summarization
│   │   ├── analyzer.ts     # LLM sentiment analysis
│   │   └── security.ts     # Prompt injection defense
│   ├── agents/
│   │   └── external-agent.ts  # ExternalAgentClient (A2A)
│   ├── db.ts               # Supabase / in-memory storage
│   └── store.ts            # Zustand frontend state
contracts/
└── spending-policy/        # Soroban Rust contract
    └── src/lib.rs
```

---

## Troubleshooting

**Agent returns 503**
→ `OPENAI_API_KEY` is not set in `.env.local`

**Payment fails with "Missing STELLAR_PRIVATE_KEY"**
→ Add `STELLAR_PRIVATE_KEY` to `.env.local`

**Soroban authorize() fails**
→ Your agent wallet may not have enough XLM for fees. Fund at [Friendbot](https://friendbot.stellar.org)

**"Unable to extract payer address"**
→ The x402 payment payload structure changed. Check `@x402/stellar` version compatibility.

**Agent times out (504)**
→ Stellar testnet RPC is slow. Retry — the 25s timeout is intentional to prevent hanging requests.

**"hackathon" or "Stellar Hacks" blocked by security scanner**
→ Fixed — word-boundary regex now allows these terms.

---

## License

MIT — Mokwa Moffat Ohuru
