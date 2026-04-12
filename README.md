# Agent Paywall Router

### Let AI Agents Pay for the Internet

> **Stellar Hacks: Agents 2026** · Built by Mokwa Moffat Ohuru

![Next.js](https://img.shields.io/badge/Next.js-16.2.1-black?style=flat-square&logo=next.js)
![Stellar](https://img.shields.io/badge/Stellar-Testnet-7B2FBE?style=flat-square&logo=stellar)
![x402](https://img.shields.io/badge/x402-v2%20Coinbase-0052FF?style=flat-square)
![Soroban](https://img.shields.io/badge/Soroban-Rust%20Contract-orange?style=flat-square)
![MPP](https://img.shields.io/badge/MPP-Stripe-635BFF?style=flat-square)
![OpenRouter](https://img.shields.io/badge/LLM-OpenRouter%20%2F%20GPT--4o--mini-10B981?style=flat-square)
![Tests](https://img.shields.io/badge/Tests-54%20passing-brightgreen?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)

| Layer | Technology | Version |
|---|---|---|
| Blockchain | **Stellar Testnet** — USDC micropayments | — |
| Payment Protocol | **x402 v2** (Coinbase) — HTTP-native per-request payments | 2.8.0 |
| Machine Payments | **@stellar/mpp** (Stripe MPP) — session-based flows | experimental |
| Smart Contract | **Soroban** (Rust) — on-chain spending policy | deployed |
| Wallet | **Freighter** — browser wallet integration | 6.x |
| AI Orchestration | **Vercel AI SDK** + GPT-4o-mini via OpenRouter | 6.x |
| Web Framework | **Next.js** | 16.2.1 |
| MCP Server | **Model Context Protocol** — Claude/Cursor compatible | — |
| Database | **Supabase** / in-memory fallback | 2.x |
| Testing | **Jest** + ts-jest | 54 passing |

---

## The Problem

Every AI agent eventually hits a wall — not a technical wall, an economic one.

The modern web runs on paywalls: premium APIs, subscription data feeds, per-request intelligence services. When a human hits one, they pull out a credit card. When an AI agent hits one, it stops. It has no wallet, no payment protocol, no way to transact.

This is the **Last Mile problem for AI agents**: they can reason, plan, and execute — but they cannot *pay*.

Agents are permanently locked out of the most valuable data on the internet. They fall back to stale training data, hallucinate facts, or simply fail. Every agent framework today treats payment as an afterthought — a human step that breaks the autonomous loop.

---

## The Solution

**Agent Paywall Router** is a payment infrastructure layer that gives AI agents a real economic identity on Stellar.

When an agent hits a paywall, this system does not stop. It:

1. Reads the payment requirement from the HTTP 402 response
2. Signs a real USDC micropayment on Stellar testnet using the x402 protocol
3. Calls `authorize()` on a deployed Soroban smart contract to enforce spending limits on-chain
4. Retries the request with a signed payment receipt
5. Returns the unlocked data plus a verifiable transaction hash

**This is not a simulation.** Every payment produces a real Stellar transaction hash verifiable on any Stellar explorer.

---

## 🔗 On-Chain Proof

Every paid request generates a real, verifiable transaction on Stellar testnet.

| Tool | Amount | Transaction | Verified |
|---|---|---|---|
| Search API | $0.01 USDC | [b4560105...](https://stellar.expert/explorer/testnet/tx/b4560105d68f7e1fdb3f3ca9855a3ff97721d251dc8eb1c4d30185252e460425) | ✅ Apr 11, 2026 |
| Search API | $0.01 USDC | [39760c8c...](https://stellar.expert/explorer/testnet/tx/39760c8cedacbfa5596cb0337ba2b4b911885382337cf78c1e7fde9dd9d0fcea) | ✅ Apr 11, 2026 |
| Soroban Policy | on-chain | [90fc551e...](https://stellar.expert/explorer/testnet/tx/90fc551e37ff384a3033cf09ed888813798e55a967c908ad5dbe7138472df756) | ✅ Apr 11, 2026 |

Verify any transaction independently:

```bash
https://stellar.expert/explorer/testnet/tx/<hash>
https://horizon-testnet.stellar.org/transactions/<hash>
```

Soroban spending policy contract:

```
CABLFWICBLK5IX3EWQSVQGS6WIQ2V7YLNLA6HIPGLGEDCO4DKOQQSWOQ
```

[View contract on Stellar Expert ↗](https://stellar.expert/explorer/testnet/contract/CABLFWICBLK5IX3EWQSVQGS6WIQ2V7YLNLA6HIPGLGEDCO4DKOQQSWOQ)

---

## Live Demo

Send this prompt to the agent:

```
Search for Stellar blockchain news
```

What actually happens:

```
✓  Security Check                     12ms   Prompt verified safe
✓  Initializing LLM Agent             14ms   Using OpenRouter (openai/gpt-4o-mini)
✓  Service Discovery                  16ms   Found 4 services — cheapest: search at $0.01
✓  Budget available for search        18ms   $0.01 available
⟳  Requesting search                  19ms   402 — Payment Required
⟳  Paying $0.01 USDC                  20ms   Signing via @x402/stellar
✓  search confirmed          $0.01  4821ms   tx: stellar:71bd4c7b...
✓  SpendingPolicy.authorize          6203ms   policy_tx: dc170eee...
✓  Done                              6210ms   All tools executed
```

Total cost: **$0.01 USDC**. One real Stellar transaction. One Soroban policy transaction. Both verifiable on-chain.

The response includes:

```json
{
  "txHash": "stellar:71bd4c7bbb0a926c8b9165d8f47ad8944e1761759dd8839e9dab5562fc85d79a",
  "cost": 0.01,
  "tool": "search",
  "proofs": {
    "policyTxHash": "dc170eee68e5dcfef91ac0b739f49cc717ace0a89dc1722a1be29b54e7b...",
    "policyAgent": "G..."
  },
  "marketplace": {
    "servicesDiscovered": 4,
    "cheapestService": "search",
    "cheapestPriceUsd": 0.01,
    "txExplorerLink": "https://stellar.expert/explorer/testnet/tx/71bd4c7b..."
  }
}
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Agent Layer                          │
│  Browser UI  ·  curl  ·  Claude/Cursor (MCP)  ·  A2A Client│
└──────────────────────────┬──────────────────────────────────┘
                           │ POST /api/agent
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                   LLM Orchestration Engine                  │
│  GPT-4o-mini via OpenRouter/OpenAI · Vercel AI SDK         │
│  Security scan · Budget gate · Service discovery · maxSteps│
└──────────────────────────┬──────────────────────────────────┘
                           │ tool.execute()
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    Payment Router                           │
│  x402 client (@x402/fetch + @x402/stellar)                 │
│  ExactStellarScheme · Ed25519 signer · USDC micropayments  │
└──────────┬──────────────────────────────┬───────────────────┘
           │ GET/POST with x402-receipt   │ authorize()
           ▼                             ▼
┌──────────────────────┐    ┌────────────────────────────────┐
│   x402 Tool Server   │    │     Soroban Smart Contract     │
│  /api/tools/search   │    │  CABLFWICBLK5IX3EWQSVQGS6WIQ  │
│  /api/tools/summarize│    │  Per-agent spend tracking      │
│  /api/tools/analyze  │    │  $5.00 on-chain limit          │
│  /api/tools/mpp      │    │  Panics if limit exceeded      │
└──────────────────────┘    └────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────┐
│                    Stellar Testnet                          │
│  USDC · Settlement < 5s · Fee ~$0.00001                    │
│  Horizon API · Soroban RPC                                 │
└─────────────────────────────────────────────────────────────┘
```

- **Agent Layer** — any client that can send an HTTP request: browser, curl, Claude via MCP, or another autonomous agent via `ExternalAgentClient`
- **LLM Orchestration Engine** — GPT-4o-mini fetches the live service registry, selects the cheapest valid tool, and executes with a strict economic system prompt
- **Payment Router** — intercepts tool calls, handles the 402 challenge, signs USDC transactions on Stellar, and enforces the Soroban spending policy before every payment
- **Tool Servers** — x402-protected HTTP endpoints that return real data only after payment is verified and settled

---

## How It Works

### Request → 402 → Payment → Retry → Success

```
Step 1  Agent calls GET /api/tools/search?q=stellar
        No payment header — server returns 402

Step 2  Server responds with HTTP 402 + PAYMENT-REQUIRED header:
        base64({
          "x402Version": 2,
          "accepts": [{
            "scheme": "exact",
            "network": "stellar:testnet",
            "asset": "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA",
            "amount": "100000",
            "payTo": "G...",
            "facilitator": "https://x402.org/facilitator"
          }]
        })

Step 3  Agent signs a USDC transaction on Stellar testnet
        @x402/stellar ExactStellarScheme
        createEd25519Signer(STELLAR_PRIVATE_KEY, "stellar:testnet")
        Transaction submitted → settled in < 5 seconds

Step 4  Before settlement, server calls Soroban contract:
        authorize(agent_address, 100000)
        Contract checks cumulative spend vs $5.00 limit
        If exceeded → panics → payment rejected on-chain
        If approved → spend recorded permanently

Step 5  Agent retries GET /api/tools/search?q=stellar
        x402-receipt: <signed_payment_proof>
        Server verifies via x402.org/facilitator
        Settlement confirmed → tool executes

Step 6  Server returns 200 OK + data + proofs
        PAYMENT-RESPONSE header contains settlement proof
```

### Soroban Spending Policy

The Rust contract deployed on Stellar testnet enforces per-agent spending limits on-chain:

```rust
pub fn authorize(env: Env, agent: Address, amount: i128) -> i128 {
    let limit: i128 = env.storage().instance().get(&DataKey::Limit).unwrap();
    let spent: i128 = env.storage().persistent()
        .get(&DataKey::Spent(agent.clone())).unwrap_or(0);

    let new_total = spent + amount;
    if new_total > limit {
        panic!("spending limit exceeded");  // reverts on-chain
    }

    env.storage().persistent().set(&DataKey::Spent(agent.clone()), &new_total);
    new_total
}
```

If the agent tries to exceed $5.00, the contract panics. The payment is rejected before it reaches the tool server. The agent cannot drain its wallet.

---

## Quick Start

### Prerequisites

- Node.js 20+
- Two Stellar testnet wallets with USDC trustlines
- A free LLM key from [openrouter.ai](https://openrouter.ai) — no credit card required

### 1. Get a free LLM key

Go to [https://openrouter.ai](https://openrouter.ai) → sign up with Google or GitHub → create a key.

### 2. Fund Stellar testnet wallets

```bash
curl "https://friendbot.stellar.org?addr=<AGENT_PUBLIC_KEY>"
curl "https://friendbot.stellar.org?addr=<RECEIVER_PUBLIC_KEY>"
```

Add a USDC trustline to both wallets via [Stellar Lab](https://laboratory.stellar.org).
USDC issuer on testnet: `GBBD67V63LTZ6ORUC6KXW7ZJJEIKB3766SQRR2NJZSC6ZBCS2MVAUIB9`

### 3. Clone and install

```bash
git clone https://github.com/mokwathedeveloper/Agent-Paywall-Router.git
cd Agent-Paywall-Router
npm install
```

### 4. Configure environment

```bash
cp .env.example apps/web/.env.local
```

Edit `apps/web/.env.local`:

```env
STELLAR_PRIVATE_KEY=S...           # Agent wallet — pays for tools
STELLAR_RECEIVER_ADDRESS=G...      # Service wallet — receives payments
OPENROUTER_API_KEY=sk-or-...       # Free LLM key from openrouter.ai
NEXT_PUBLIC_BASE_URL=http://localhost:3000
FACILITATOR_URL=https://x402.org/facilitator
```

### 5. Start and run

```bash
cd apps/web && npm run dev
```

Then open [http://localhost:3000/workspace](http://localhost:3000/workspace) or run the CLI demo:

```bash
# From repo root — in a second terminal
npm run demo
```

**Verify on-chain** — take the `txHash` from any response:

```bash
https://stellar.expert/explorer/testnet/tx/<hash>
https://horizon-testnet.stellar.org/transactions/<hash>
```

---

## API Reference

| Endpoint | Method | Description | Cost |
|---|---|---|---|
| `/api/demo/run` | GET | End-to-end demo with payment proof | varies |
| `/api/agent` | POST | LLM orchestration — multi-step tool chaining | varies |
| `/api/services` | GET | Agent-optimised service registry (sorted by price) | free |
| `/api/tools/search` | GET | x402-protected web search | $0.01 USDC |
| `/api/tools/summarize` | POST | x402-protected LLM summarization | $0.02 USDC |
| `/api/tools/analyze` | POST | x402-protected sentiment analysis | $0.03 USDC |
| `/api/tools/mpp` | POST | MPP-protected search (Stripe MPP) | $0.01 USDC |
| `/api/catalog` | GET | Machine-readable tool discovery | free |
| `/api/mcp/tools` | GET | MCP tool discovery — Claude/Cursor compatible | free |
| `/api/mcp/execute` | POST | MCP tool execution with x402 receipt | varies |
| `/api/sessions` | POST/GET | Session management with spending limits | free |
| `/api/transactions` | GET | On-chain transaction ledger | free |
| `/api/health/onchain` | GET | Live Soroban contract spend verification | free |

---

## Why Stellar

**Micropayments are only viable if the fee is smaller than the payment.**

On Ethereum, a $0.01 payment costs $2–$15 in gas. That is not a micropayment — it is a tax.

On Stellar:

- **Fee: ~$0.00001** — 1000x cheaper than the cheapest tool in this system. 99.99% of every payment reaches the service provider.
- **Settlement: 3–5 seconds** — fast enough for a synchronous HTTP request cycle.
- **USDC native** — no wrapping, no bridges, no slippage.
- **Soroban** — programmable spending limits enforced on-chain, not in a database that can be reset.
- **x402** — HTTP-native payment standard. The 402 status code has existed since 1996. Stellar makes it finally usable.

---

## Soroban Spending Policy Contract

| | |
|---|---|
| Contract ID | `CABLFWICBLK5IX3EWQSVQGS6WIQ2V7YLNLA6HIPGLGEDCO4DKOQQSWOQ` |
| Network | Stellar Testnet |
| Limit | $5.00 per agent (50,000,000 stroops) |
| Explorer | [View on Stellar Expert ↗](https://stellar.expert/explorer/testnet/contract/CABLFWICBLK5IX3EWQSVQGS6WIQ2V7YLNLA6HIPGLGEDCO4DKOQQSWOQ) |

The contract tracks cumulative spend per agent address in persistent storage. It emits an on-chain event for every authorized payment. It cannot be bypassed — if the contract panics, the tool server never receives the payment and never returns data.

---

## MCP Support — Claude and Cursor Compatible

Any MCP-enabled AI system can discover and pay for tools without custom integration:

```bash
curl http://localhost:3000/api/mcp/tools
```

```json
{
  "tools": [
    {
      "name": "search",
      "description": "Real-time web search. Cost: $0.01 USDC on Stellar.",
      "price_stroops": "100000",
      "input_schema": { "type": "object", "properties": { "query": { "type": "string" } } }
    }
  ],
  "payment": { "network": "stellar:testnet", "asset": "USDC", "protocol": "x402" }
}
```

---

## Future Potential

**Multi-provider marketplace** — any service implementing x402 on Stellar can register in `/api/catalog`. Agents choose providers by price, latency, and reputation — real market competition between data services.

**Agent-to-agent commerce** — the `ExternalAgentClient` shows agents can be both buyers and sellers. An agent that earns USDC by providing a service can spend that USDC to consume other services. The economic loop closes without human intervention.

**Programmable spending policies** — the Soroban contract supports time-based limits, per-tool limits, multi-signature authorization, and DAO-governed policies. Any rule expressible in Rust can be enforced on-chain.

**Cross-agent trust** — every transaction is on-chain. Agents can verify each other's payment history before accepting requests. A reputation system built on Stellar transaction history requires no central authority.

The infrastructure for a machine economy exists. This project proves it works.

---

## Project Structure

```
apps/web/
├── app/api/
│   ├── agent/          # LLM orchestration + x402 payment execution
│   ├── demo/           # End-to-end demo entrypoint (GET /api/demo/run)
│   ├── services/       # Agent-optimised service registry (GET /api/services)
│   ├── catalog/        # Machine-readable tool discovery
│   ├── tools/          # x402-protected endpoints (search, summarize, analyze, mpp)
│   ├── mcp/            # Model Context Protocol server
│   ├── sessions/       # Session + budget management
│   ├── transactions/   # On-chain transaction ledger
│   ├── health/         # Health check + live Soroban verification
│   └── a2a/            # Agent-to-Agent commerce
├── lib/
│   ├── llm.ts              # Shared LLM resolver (OpenRouter / OpenAI)
│   ├── paywall/
│   │   ├── x402.ts         # x402 server — verify + settle
│   │   └── paid-x402-tool.ts  # Shared verify → policy → settle → proof
│   ├── onchain/
│   │   └── spending-policy.ts  # Soroban client (simulate → assemble → sign → submit)
│   ├── services/
│   │   ├── search.ts       # DuckDuckGo + Wikipedia (no API key)
│   │   ├── summarizer.ts   # LLM summarization
│   │   ├── analyzer.ts     # LLM sentiment + entity analysis
│   │   └── security.ts     # Prompt injection defense
│   ├── agents/
│   │   └── external-agent.ts  # ExternalAgentClient for A2A
│   ├── db.ts               # Supabase / in-memory storage
│   └── store.ts            # Zustand frontend state
contracts/
└── spending-policy/        # Soroban Rust contract + 6 passing tests
    └── src/lib.rs
scripts/
└── demo.js                 # CLI demo (node scripts/demo.js)
```

---

## Troubleshooting

| Error | Cause | Fix |
|---|---|---|
| HTTP 503 on `/api/agent` | No LLM key set | Add `OPENROUTER_API_KEY` to `.env.local` |
| `Missing STELLAR_PRIVATE_KEY` | Stellar keys not configured | Add both keys to `.env.local` |
| `SpendingPolicy.authorize() simulation failed` | Wallet has no XLM | Fund at [Friendbot](https://friendbot.stellar.org) |
| HTTP 504 on `/api/agent` | Stellar RPC slow | Retry — testnet can be slow |
| `trustline_missing` in A2A demo | No USDC trustline | Use "Establish USDC Trustline" button in A2A UI |
| `Unable to extract payer address` | x402 payload mismatch | Check `@x402/stellar` version |

---

## Testing

```bash
cd apps/web

npm test           # 54 unit tests — no server required
npx tsc --noEmit   # TypeScript check
```

---

## License

MIT — Mokwa Moffat Ohuru
