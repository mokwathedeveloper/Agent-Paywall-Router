# Agent Paywall Router

### Let AI Agents Pay for the Internet

> **Stellar Hacks: Agents 2026** · Built by Mokwa Moffat Ohuru

---

## The Problem

Every AI agent eventually hits a wall.

Not a technical wall — an economic one.

The modern web runs on paywalls: premium APIs, subscription data feeds, per-request intelligence services. When a human hits one, they pull out a credit card. When an AI agent hits one, it stops. It has no wallet, no payment protocol, no way to transact.

This is the **Last Mile problem for AI agents**: they can reason, plan, and execute — but they cannot *pay*.

The result is that agents are permanently locked out of the most valuable data on the internet. They fall back to stale training data, hallucinate facts, or simply fail. Every agent framework in existence today treats payment as an afterthought — a human step that breaks the autonomous loop.

---

## The Solution

**Agent Paywall Router** is a payment infrastructure layer that gives AI agents a real economic identity on Stellar.

When an agent hits a paywall, this system does not stop. It:

1. Reads the payment requirement from the HTTP 402 response
2. Signs a real USDC micropayment on Stellar testnet using the x402 protocol
3. Calls `authorize()` on a deployed Soroban smart contract to enforce spending limits on-chain
4. Retries the request with a signed payment receipt
5. Returns the unlocked data plus a verifiable transaction hash

The agent never leaves its execution loop. The payment is invisible to the user. The transaction is permanent on-chain.

This is not a simulation. Every payment produces a real Stellar transaction hash that can be verified on any Stellar explorer.

---

## Real Demo: Agent Researches a Topic and Pays Per Step

Here is what actually happens when you send this prompt:

```
"Search for Stellar x402 protocol and summarize the key points"
```

**Step 1 — Security scan**
The prompt is scanned for injection patterns before any LLM call is made.

**Step 2 — LLM decides which tools to use**
GPT-4o-mini receives the prompt and a list of available paid tools. It decides to call `search` first, then `summarize` on the results.

**Step 3 — Agent hits the search paywall**
The agent calls `GET /api/tools/search?q=Stellar+x402+protocol`. The server responds with HTTP 402 and a `PAYMENT-REQUIRED` header containing the x402 payment specification:

```
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
```

**Step 4 — Agent pays $0.01 USDC on Stellar**
The `@x402/stellar` library signs a USDC transaction using the agent's Ed25519 keypair. The transaction is submitted to Stellar testnet and settled in under 5 seconds.

**Step 5 — Soroban spending policy enforced**
Before settlement, the system calls `authorize(agent_address, 100000)` on the deployed Soroban contract. The contract checks the agent's cumulative spend against the $5.00 limit. If the limit is exceeded, the transaction reverts on-chain. If approved, the spend is recorded permanently.

**Step 6 — Data unlocked**
The agent retries the request with the signed payment receipt. The server verifies the receipt, settles the payment, and returns the search results plus two transaction hashes: the x402 payment hash and the Soroban policy hash.

**Step 7 — Agent pays $0.02 USDC to summarize**
The same flow repeats for the summarize tool. The agent passes the search results as input, pays $0.02, and receives a structured summary with key points.

**Step 8 — Final response**
The agent returns the summary to the user along with the full execution trace, total cost ($0.03), and verifiable on-chain proof.

```json
{
  "result": "Stellar's x402 protocol enables per-request HTTP micropayments...",
  "txHash": "stellar:abc123...",
  "cost": 0.03,
  "steps": [
    { "action": "Security Check", "status": "success" },
    { "action": "Budget available for search", "status": "success", "detail": "$0.01 available" },
    { "action": "Requesting search", "status": "payment_required", "detail": "402 — Payment Required" },
    { "action": "Paying $0.01 USDC", "status": "paying", "detail": "Signing via @x402/stellar" },
    { "action": "search confirmed", "status": "success", "detail": "tx: stellar:abc123..." },
    { "action": "SpendingPolicy.authorize", "status": "success", "detail": "policy_tx: def456..." },
    { "action": "Paying $0.02 USDC", "status": "paying", "detail": "Signing via @x402/stellar" },
    { "action": "summarize confirmed", "status": "success", "detail": "tx: stellar:ghi789..." },
    { "action": "Done", "status": "success" }
  ],
  "proofs": {
    "policyTxHash": "def456...",
    "policyAgent": "G..."
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
│  GPT-4o-mini via Vercel AI SDK · maxSteps: 5               │
│  Security scan · Budget gate · Tool selection              │
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

**Four layers, each with a distinct responsibility:**

- **Agent Layer** — any client that can send an HTTP request: browser, curl, Claude via MCP, or another autonomous agent
- **LLM Orchestration Engine** — GPT-4o-mini decides which tools to call, in what order, and with what inputs. It operates under a strict economic system prompt: minimize cost, never duplicate calls, never fabricate data
- **Payment Router** — intercepts tool calls, handles the 402 challenge, signs USDC transactions on Stellar, and enforces the Soroban spending policy before every payment
- **Tool Servers** — x402-protected HTTP endpoints that return real data only after payment is verified and settled

---

## How It Works — Step by Step

### The x402 Payment Flow

```
1. Agent → GET /api/tools/search?q=stellar
           (no payment header)

2. Server ← 402 Payment Required
           PAYMENT-REQUIRED: base64(x402 spec)
           {amount: "100000", asset: USDC, network: stellar:testnet}

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

6. Server ← 200 OK
           { results: [...], proofs: { paymentTxHash, policyTxHash } }
           PAYMENT-RESPONSE: <settlement_proof>
```

### The Soroban Spending Policy

The Rust contract at `contracts/spending-policy/src/lib.rs` maintains a persistent spend counter per agent address. Before every payment:

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

### Agent-to-Agent Commerce (A2A)

A second autonomous agent (`ExternalAgentClient`) can discover tools, pay for them, and consume results — with no human involvement:

```
External Agent → GET /api/mcp/tools        (discover available tools + prices)
              ← { tools: [...], payment: { protocol: "x402", network: "stellar:testnet" } }

External Agent → GET /api/tools/search     (attempt access)
              ← 402 + payment spec

External Agent → signs USDC tx on Stellar  (autonomous payment)
              → GET /api/tools/search with receipt
              ← 200 + data + tx proof
```

This is accessible at `/workspace/a2a` — enter any funded Stellar testnet secret key and watch a second agent execute the full payment flow autonomously.

---

## Running the Project

### Prerequisites

- Node.js 20+
- Two Stellar testnet wallets (one pays, one receives)
- USDC trustline on both wallets
- OpenAI API key

### 1. Get testnet wallets with USDC

```bash
# Fund wallet 1 (agent — pays for tools)
curl "https://friendbot.stellar.org?addr=<YOUR_AGENT_PUBLIC_KEY>"

# Fund wallet 2 (service — receives payments)
curl "https://friendbot.stellar.org?addr=<YOUR_RECEIVER_PUBLIC_KEY>"
```

Then add a USDC trustline to both wallets via [Stellar Lab](https://laboratory.stellar.org).
USDC issuer on testnet: `GBBD67V63LTZ6ORUC6KXW7ZJJEIKB3766SQRR2NJZSC6ZBCS2MVAUIB9`

### 2. Clone and install

```bash
git clone https://github.com/mokwathedeveloper/Agent-Paywall-Router.git
cd Agent-Paywall-Router
npm install
```

### 3. Configure environment

```bash
cp .env.example apps/web/.env.local
```

Edit `apps/web/.env.local`:

```env
# Agent wallet secret key (starts with S — this wallet pays for tools)
STELLAR_PRIVATE_KEY=S...

# Service wallet public key (starts with G — this wallet receives payments)
STELLAR_RECEIVER_ADDRESS=G...

# Required — the agent returns HTTP 503 without this
OPENAI_API_KEY=sk-...

# Base URL of this app
NEXT_PUBLIC_BASE_URL=http://localhost:3000

# x402 facilitator (default works for testnet)
FACILITATOR_URL=https://x402.org/facilitator
```

### 4. Start the server

```bash
cd apps/web
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 5. Run the demo

**Option A — CLI (recommended for judges)**

With the dev server running in one terminal, open a second terminal:

```bash
# Default task: search + summarize Stellar micropayments
npm run demo

# Custom task
npm run demo:analyze

# Any prompt
node scripts/demo.js "Search for Stellar DeFi and analyze the key themes"
```

Expected output:

```
════════════════════════════════════════════════════════════════════════
  Agent Paywall Router — Live Demo
  Stellar Hacks: Agents 2026
════════════════════════════════════════════════════════════════════════

  Checking server at http://localhost:3000...
  ✓ Server healthy — in-memory · stellar:testnet

────────────────────────────────────────────────────────────────────────
  Task
  "Search for Stellar blockchain micropayments and summarize the key points"
────────────────────────────────────────────────────────────────────────

  Execution Trace
────────────────────────────────────────────────────────────────────────
  ✓  Security Check                                    12ms
     Prompt verified safe
  ✓  Initializing LLM Agent                            14ms
     Using OpenAI (GPT-4o-mini)
  ✓  Budget available for search                       18ms
     $0.01 available
  ⟳  Requesting search                                 19ms
     402 — Payment Required
  ⟳  Paying $0.01 USDC  $0.01                         20ms
     Signing via @x402/stellar
  ✓  search confirmed  $0.01                           4821ms
     tx: stellar:abc123def456...
  ✓  SpendingPolicy.authorize                          6203ms
     policy_tx: ghi789... policy_agent: GABC...
  ✓  Budget available for summarize                    6210ms
     $0.02 available
  ⟳  Paying $0.02 USDC  $0.02                         6211ms
     Signing via @x402/stellar
  ✓  summarize confirmed  $0.02                        11432ms
     tx: stellar:xyz987...
  ✓  Done                                              11440ms
     All tools executed and results aggregated
────────────────────────────────────────────────────────────────────────

  Payment Proof
────────────────────────────────────────────────────────────────────────
  ✓ Real Stellar transaction confirmed

  Tool used:       summarize
  Total cost:      $0.03 USDC

  Payment tx:      stellar:abc123def456...
  Policy tx:       ghi789jkl012...
  Agent address:   GABC...

  Verify on-chain:
  https://stellar.expert/explorer/testnet/tx/abc123def456...
  https://horizon-testnet.stellar.org/transactions/abc123def456...
  https://stellar.expert/explorer/testnet/tx/ghi789jkl012...

════════════════════════════════════════════════════════════════════════
  SUCCESS  11891ms total
════════════════════════════════════════════════════════════════════════
```

**Option B — API endpoint**

```bash
# Default task
curl -s "http://localhost:3000/api/demo/run" | jq .

# Custom task
curl -s "http://localhost:3000/api/demo/run?task=Search+for+Stellar+DeFi+and+analyze" | jq .
```

The response includes `payment.txHash`, `payment.explorerLinks`, and the full `steps` array.

**Option C — Browser UI**

Open [http://localhost:3000/workspace](http://localhost:3000/workspace) and type a prompt.

**Option D — curl direct to agent**

```bash
curl -s -X POST "http://localhost:3000/api/agent" \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Search for Stellar blockchain and summarize the key points"}' \
  | jq '{txHash, cost, tool, steps: [.steps[] | {action, status, detail}]}'
```

**Verify the transaction** — take the `txHash` from the response and check it on:
- Stellar Expert: `https://stellar.expert/explorer/testnet/tx/<hash>`
- Horizon API: `https://horizon-testnet.stellar.org/transactions/<hash>`

### 6. Run tests

```bash
cd apps/web

# Unit tests (54 passing — no server required)
npm test

# Type check
npx tsc --noEmit
```

---

## API Reference

| Endpoint | Method | Description | Cost |
|---|---|---|---|
| `/api/demo/run` | GET | End-to-end demo — runs a full agent task with payment proof | varies |
| `/api/agent` | POST | LLM orchestration — multi-step tool chaining | varies |
| `/api/tools/search` | GET | x402-protected web search (DuckDuckGo + Wikipedia) | $0.01 USDC |
| `/api/tools/summarize` | POST | x402-protected LLM summarization | $0.02 USDC |
| `/api/tools/analyze` | POST | x402-protected sentiment + entity analysis | $0.03 USDC |
| `/api/tools/mpp` | POST | MPP-protected search (Stripe Machine Payments Protocol) | $0.01 USDC |
| `/api/catalog` | GET | Machine-readable tool discovery with x402 + MPP specs | free |
| `/api/mcp/tools` | GET | MCP tool discovery — Claude/Cursor compatible | free |
| `/api/mcp/execute` | POST | MCP tool execution with x402 receipt | varies |
| `/api/sessions` | POST/GET | Session management with spending limits | free |
| `/api/transactions` | GET | On-chain transaction ledger | free |
| `/api/health/onchain` | GET | Live Soroban contract spend verification | free |

---

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Web Framework | Next.js | 16.2.1 |
| AI Orchestration | Vercel AI SDK | 6.x |
| LLM | OpenAI GPT-4o-mini | — |
| Payment Protocol | x402 v2 (Coinbase) | 2.8.0 |
| Machine Payments | @stellar/mpp (Stripe MPP) | experimental |
| Blockchain | Stellar Testnet | — |
| Smart Contract | Soroban (Rust) | — |
| Frontend State | Zustand | 5.x |
| Animations | Framer Motion | 12.x |
| Database | Supabase / in-memory fallback | 2.x |
| Testing | Jest + ts-jest | 30.x |

---

## Why Stellar

**Micropayments are only viable if the fee is smaller than the payment.**

On Ethereum, a $0.01 payment costs $2–$15 in gas. That is not a micropayment — it is a tax.

On Stellar:

- **Transaction fee: ~$0.00001** — 1000x cheaper than the cheapest tool in this system
- **Settlement time: 3–5 seconds** — fast enough for a synchronous HTTP request cycle
- **USDC native support** — no wrapping, no bridges, no slippage
- **Soroban smart contracts** — programmable spending limits enforced on-chain, not in a database
- **x402 protocol** — HTTP-native payment standard designed specifically for machine-to-machine transactions

Stellar is the only blockchain where per-request micropayments are economically rational. A $0.01 search query with a $0.00001 fee means 99.99% of the payment reaches the service provider. That is the foundation of a real agent economy.

---

## Soroban Spending Policy Contract

Deployed on Stellar testnet. Enforces per-agent spending limits on-chain.

| | |
|---|---|
| Contract ID | `CABLFWICBLK5IX3EWQSVQGS6WIQ2V7YLNLA6HIPGLGEDCO4DKOQQSWOQ` |
| Network | Stellar Testnet |
| Explorer | [View on Stellar Expert](https://stellar.expert/explorer/testnet/contract/CABLFWICBLK5IX3EWQSVQGS6WIQ2V7YLNLA6HIPGLGEDCO4DKOQQSWOQ) |
| Limit | $5.00 per agent (50,000,000 stroops) |

The contract tracks cumulative spend per agent address in persistent storage. It cannot be bypassed — the payment flow calls `authorize()` before settlement, and if the contract panics, the tool server never receives the payment and never returns data.

---

## MCP Support — Claude and Cursor Compatible

Any MCP-enabled AI system can discover and pay for tools without any custom integration:

```bash
# Discover tools
curl http://localhost:3000/api/mcp/tools

# Response includes tool schemas, prices, and payment specs
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

This system demonstrates the foundation of a machine economy. The next steps are already visible in the architecture:

**Multi-provider tool marketplace** — the `/api/catalog` endpoint is designed to be extended. Any service implementing x402 on Stellar can register itself. Agents would then choose providers based on price, latency, and reputation — creating real market competition between data services.

**Agent-to-agent commerce** — the `ExternalAgentClient` shows that agents can be both buyers and sellers. An agent that earns USDC by providing a service can spend that USDC to consume other services. The economic loop closes without human intervention.

**Programmable spending policies** — the Soroban contract currently enforces a flat $5.00 limit. The same architecture supports time-based limits, per-tool limits, multi-signature authorization, and DAO-governed spending policies. Any rule that can be expressed in Rust can be enforced on-chain.

**Cross-agent trust** — because every transaction is on-chain, agents can verify each other's payment history before accepting requests. A reputation system built on Stellar transaction history requires no central authority.

The infrastructure for a machine economy exists. This project proves it works.

---

## Project Structure

```
apps/web/
├── app/
│   ├── api/
│   │   ├── agent/          # LLM orchestration + x402 payment execution
│   │   ├── demo/           # End-to-end demo entrypoint (GET /api/demo/run)
│   │   ├── catalog/        # Machine-readable tool discovery
│   │   ├── tools/          # x402-protected endpoints (search, summarize, analyze, mpp)
│   │   ├── mcp/            # Model Context Protocol server
│   │   ├── sessions/       # Session + budget management
│   │   ├── transactions/   # On-chain transaction ledger
│   │   ├── health/         # Health check + live Soroban verification
│   │   └── a2a/            # Agent-to-Agent commerce
│   └── workspace/          # React UI (landing, workspace, A2A demo)
├── lib/
│   ├── paywall/
│   │   ├── x402.ts         # x402 server — verify + settle payments
│   │   └── paid-x402-tool.ts  # Shared verify → policy → settle → proof flow
│   ├── onchain/
│   │   └── spending-policy.ts  # Soroban contract client (simulate → assemble → sign → submit)
│   ├── services/
│   │   ├── search.ts       # DuckDuckGo + Wikipedia (no API key required)
│   │   ├── summarizer.ts   # LLM summarization via OpenAI
│   │   ├── analyzer.ts     # Sentiment + entity analysis via OpenAI
│   │   └── security.ts     # Prompt injection defense (word-boundary patterns)
│   ├── agents/
│   │   └── external-agent.ts  # ExternalAgentClient for A2A commerce
│   ├── db.ts               # Supabase / in-memory storage abstraction
│   └── store.ts            # Zustand frontend state
contracts/
└── spending-policy/        # Soroban Rust contract + 6 passing tests
    └── src/lib.rs
scripts/
└── demo.js                 # CLI demo script (node scripts/demo.js)
```

---

## Troubleshooting

| Error | Cause | Fix |
|---|---|---|
| HTTP 503 on `/api/agent` | `OPENAI_API_KEY` not set | Add key to `.env.local` |
| `Missing STELLAR_PRIVATE_KEY` | Stellar keys not configured | Add both keys to `.env.local` |
| `Unable to extract payer address` | x402 payload structure mismatch | Check `@x402/stellar` version |
| `SpendingPolicy.authorize() simulation failed` | Soroban RPC unavailable or wallet has no XLM | Fund wallet at [Friendbot](https://friendbot.stellar.org) |
| HTTP 504 on `/api/agent` | Stellar RPC or OpenAI took > 25 seconds | Retry — testnet can be slow |
| `trustline_missing` in A2A demo | Agent wallet has no USDC trustline | Use the "Establish USDC Trustline" button in the A2A UI |

---

## License

MIT — Mokwa Moffat Ohuru
