# Agent Paywall Router

### Let AI Agents Pay for the Internet

> **Stellar Hacks: Agents 2026** · Built by Mokwa Moffat Ohuru

---

## The Problem

Every AI agent eventually hits a wall.

Not a technical wall — an economic one.

The modern web runs on paywalls: premium APIs, subscription data feeds, per-request intelligence services. When a human hits one, they pull out a credit card. When an AI agent hits one, it stops. It has no wallet, no payment protocol, no way to transact.

This is the **Last Mile problem for AI agents**: they can reason, plan, and execute — but they cannot *pay*.

---

## The Solution

**Agent Paywall Router** is a payment infrastructure layer that gives AI agents a real economic identity on Stellar.

When an agent hits a paywall, this system does not stop. It:

1. Reads the payment requirement from the HTTP 402 response
2. Signs a real USDC micropayment on Stellar testnet using the x402 protocol
3. Calls `authorize()` on a deployed Soroban smart contract to enforce spending limits on-chain
4. Retries the request with a signed payment receipt
5. Returns the unlocked data plus a verifiable transaction hash

This is not a simulation. Every payment produces a real Stellar transaction hash verifiable on any Stellar explorer.

---

## Real Demo: Agent Researches a Topic and Pays Per Step

Send this prompt:

```
"Search for Stellar blockchain micropayments and summarize the key points"
```

What actually happens:

```
✓  Security Check                     12ms   Prompt verified safe
✓  Initializing LLM Agent             14ms   Using OpenRouter (openai/gpt-4o-mini)
✓  Budget available for search        18ms   $0.01 available
⟳  Requesting search                  19ms   402 — Payment Required
⟳  Paying $0.01 USDC                  20ms   Signing via @x402/stellar
✓  search confirmed          $0.01  4821ms   tx: stellar:abc123...
✓  SpendingPolicy.authorize          6203ms   policy_tx: def456...
✓  Budget available for summarize    6210ms   $0.02 available
⟳  Paying $0.02 USDC                 6211ms   Signing via @x402/stellar
✓  summarize confirmed       $0.02 11432ms   tx: stellar:xyz987...
✓  Done                             11440ms   All tools executed
```

Total cost: **$0.03 USDC**. Two real Stellar transactions. One Soroban policy transaction. All verifiable on-chain.

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
│  Security scan · Budget gate · Tool selection · maxSteps:5 │
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

---

## How It Works

### x402 Payment Flow

```
1. Agent → GET /api/tools/search?q=stellar
           (no payment header)

2. Server ← 402 Payment Required
           PAYMENT-REQUIRED: base64({
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

3. Agent signs USDC transaction
           @x402/stellar ExactStellarScheme
           createEd25519Signer(STELLAR_PRIVATE_KEY)
           → Stellar testnet transaction submitted

4. Agent → GET /api/tools/search?q=stellar
           x402-receipt: <signed_payment_proof>

5. Server verifies receipt via x402.org/facilitator
           → Soroban authorize(agent, 100000) called
           → Spend recorded on-chain
           → Payment settled

6. Server ← 200 OK + data + proofs
           { results: [...], proofs: { paymentTxHash, policyTxHash } }
```

### Soroban Spending Policy

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

If the agent tries to exceed $5.00, the contract panics. The payment is rejected before it reaches the tool server.

---

## Running the Project

### Prerequisites

- Node.js 20+
- Two Stellar testnet wallets with USDC trustlines
- A free LLM key from [openrouter.ai](https://openrouter.ai)

### 1. Get a free LLM key

Go to [https://openrouter.ai](https://openrouter.ai) → sign up with Google/GitHub → create a key.
No credit card required. Free credits included.

### 2. Get Stellar testnet wallets with USDC

```bash
# Fund both wallets with testnet XLM
curl "https://friendbot.stellar.org?addr=<AGENT_PUBLIC_KEY>"
curl "https://friendbot.stellar.org?addr=<RECEIVER_PUBLIC_KEY>"
```

Add USDC trustline to both via [Stellar Lab](https://laboratory.stellar.org).
USDC issuer: `GBBD67V63LTZ6ORUC6KXW7ZJJEIKB3766SQRR2NJZSC6ZBCS2MVAUIB9`

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
# Agent wallet — pays for tools
STELLAR_PRIVATE_KEY=S...

# Service wallet — receives payments
STELLAR_RECEIVER_ADDRESS=G...

# Free LLM key from openrouter.ai
OPENROUTER_API_KEY=sk-or-...

# Base URL
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# x402 facilitator
FACILITATOR_URL=https://x402.org/facilitator
```

### 5. Start the server

```bash
cd apps/web
npm run dev
```

### 6. Run the demo

**Option A — CLI (recommended)**

```bash
# In a second terminal, from repo root:
npm run demo
```

**Option B — API**

```bash
curl -s "http://localhost:3000/api/demo/run" | jq .
```

**Option C — Browser**

Open [http://localhost:3000/workspace](http://localhost:3000/workspace)

**Option D — curl direct**

```bash
curl -s -X POST "http://localhost:3000/api/agent" \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Search for Stellar blockchain and summarize the key points"}' \
  | jq '{txHash, cost, tool}'
```

**Verify on-chain** — take the `txHash` from the response:
- `https://stellar.expert/explorer/testnet/tx/<hash>`
- `https://horizon-testnet.stellar.org/transactions/<hash>`

---

## API Reference

| Endpoint | Method | Description | Cost |
|---|---|---|---|
| `/api/demo/run` | GET | End-to-end demo with payment proof | varies |
| `/api/agent` | POST | LLM orchestration — multi-step tool chaining | varies |
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

## Tech Stack

| Layer | Technology |
|---|---|
| Web Framework | Next.js 16.2.1 |
| AI Orchestration | Vercel AI SDK 6.x |
| LLM | OpenRouter (free) or OpenAI — GPT-4o-mini |
| Payment Protocol | x402 v2 (Coinbase) |
| Machine Payments | @stellar/mpp (Stripe MPP) |
| Blockchain | Stellar Testnet |
| Smart Contract | Soroban (Rust) |
| Frontend State | Zustand 5.x |
| Animations | Framer Motion 12.x |
| Database | Supabase / in-memory fallback |
| Testing | Jest + ts-jest — 54 passing |

---

## Why Stellar

**Micropayments are only viable if the fee is smaller than the payment.**

On Ethereum, a $0.01 payment costs $2–$15 in gas. That is not a micropayment.

On Stellar:

- **Fee: ~$0.00001** — 1000x cheaper than the cheapest tool in this system
- **Settlement: 3–5 seconds** — fast enough for a synchronous HTTP request
- **USDC native** — no wrapping, no bridges, no slippage
- **Soroban** — programmable spending limits enforced on-chain
- **x402** — HTTP-native payment standard for machine-to-machine transactions

A $0.01 search query with a $0.00001 fee means 99.99% of the payment reaches the service provider.

---

## Soroban Spending Policy Contract

| | |
|---|---|
| Contract ID | `CABLFWICBLK5IX3EWQSVQGS6WIQ2V7YLNLA6HIPGLGEDCO4DKOQQSWOQ` |
| Network | Stellar Testnet |
| Limit | $5.00 per agent (50,000,000 stroops) |
| Explorer | [View on Stellar Expert](https://stellar.expert/explorer/testnet/contract/CABLFWICBLK5IX3EWQSVQGS6WIQ2V7YLNLA6HIPGLGEDCO4DKOQQSWOQ) |

---

## MCP Support

Any MCP-enabled AI system (Claude, Cursor, Codex) can discover and pay for tools:

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

## Project Structure

```
apps/web/
├── app/api/
│   ├── agent/          # LLM orchestration + x402 payment execution
│   ├── demo/           # End-to-end demo entrypoint (GET /api/demo/run)
│   ├── catalog/        # Machine-readable tool discovery
│   ├── tools/          # x402-protected endpoints (search, summarize, analyze, mpp)
│   ├── mcp/            # Model Context Protocol server
│   ├── sessions/       # Session + budget management
│   ├── transactions/   # On-chain transaction ledger
│   ├── health/         # Health check + live Soroban verification
│   └── a2a/            # Agent-to-Agent commerce
├── lib/
│   ├── llm.ts          # Shared LLM resolver (OpenRouter / OpenAI)
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
└── spending-policy/        # Soroban Rust contract + 6 tests
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

## Future Potential

- **Multi-provider marketplace** — any service implementing x402 on Stellar can register in `/api/catalog`. Agents choose providers by price, latency, and reputation.
- **Agent-to-agent commerce** — the `ExternalAgentClient` shows agents can be both buyers and sellers. The economic loop closes without human intervention.
- **Programmable spending policies** — the Soroban contract supports time-based limits, per-tool limits, multi-sig authorization, and DAO-governed policies.

---

## Testing

```bash
cd apps/web

# Unit tests (54 passing — no server required)
npm test

# Type check
npx tsc --noEmit
```

---

## License

MIT — Mokwa Moffat Ohuru
