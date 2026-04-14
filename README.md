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

### Quick Reference

| Error | Cause | Fix |
|---|---|---|
| HTTP 503 on `/api/agent` | No LLM key set | Add `OPENROUTER_API_KEY` to `.env.local` |
| `Missing STELLAR_PRIVATE_KEY` | Stellar keys not configured | Add both keys to `.env.local` |
| `SpendingPolicy.authorize() simulation failed` | Wallet has no XLM | Fund at [Friendbot](https://friendbot.stellar.org) |
| HTTP 504 on `/api/agent` | Stellar RPC slow | Retry — testnet can be slow |
| `trustline_missing` in A2A demo | No USDC trustline | Use "Establish USDC Trustline" button in A2A UI |
| `Unable to extract payer address` | x402 payload mismatch | Check `@x402/stellar` version |
| `Search provider error (HTTP 400)` | Invalid or missing search API key | See Search Configuration below |
| `Search provider error (HTTP 401)` | Expired Tavily API key | Regenerate key at [tavily.com](https://tavily.com) |

### Search Configuration

The search tool uses a **cascading provider strategy** — it tries multiple providers in order and always returns results:

| Priority | Provider | Key Required | Notes |
|---|---|---|---|
| 1 | **Tavily** | `TAVILY_API_KEY` | High-quality web results. Free tier: 1000 req/month at [tavily.com](https://tavily.com) |
| 2 | **Google News RSS** | None | Real-time news headlines, free |
| 3 | **DuckDuckGo** | None | Instant answers + related topics, free |
| 4 | **Wikipedia** | None | Article search with snippets, free |
| 5 | **Mock Data** | None | Clearly labelled fallback — always works |

**To configure Tavily (recommended):**

```bash
# 1. Sign up at https://tavily.com (free tier, no credit card)
# 2. Copy your API key
# 3. Add to apps/web/.env.local:
TAVILY_API_KEY=tvly-your-key-here
```

**If no key is configured:** The search tool works without any API key using Google News, DuckDuckGo, and Wikipedia. If all providers are unreachable, it returns clearly labelled mock data.

**"Search failed" after payment:** The agent does **not** retry broken providers. The error is returned to the LLM which reports it to the user. Check server logs for the specific upstream error.

---

## Testing

```bash
cd apps/web

npm test           # 54 unit tests — no server required
npx tsc --noEmit   # TypeScript check
```

---

## 🏆 Hackathon Differentiators

The Agent Paywall Router introduces several unique features that set it apart in the Stellar ecosystem:

### 1. Agent-to-Agent (A2A) Commerce
Most platforms focus on humans paying for AI. We demonstrate **Machine-to-Machine commerce**. 
- **The Scenario**: Agent B (Buyer) discovers an endpoint hosted by Agent A (Provider). 
- **The Flow**: Agent B autonomously signs a USDC transaction to Agent A's wallet to unlock data.
- **Proof**: Visit the `/workspace/a2a` page to run a real-time A2A commerce demo.

### 2. Deterministic Value Logic (Cost + Reputation)
We moved beyond "pick the cheapest." Our router implements a sophisticated selection algorithm:
- **Value Score**: `Score = Price * (1 - Rating/5)`
- This ensures agents prioritize **quality and reliability** alongside cost, creating a true competitive marketplace for services.

### 3. Dynamic Service Registry
External developers can register their own APIs in real-time via the **Tool Bazaar**.
- **No-Code Integration**: Once a service is registered, the agent's LLM immediately discovers it via `/api/catalog` and begins considering it for tasks.
- **Configurable Splits**: Providers set their own revenue share during registration.

### 4. Dual Protocol Support
The only router to support both **x402 (HTTP Standard)** and **MPP (Stripe Machine Payments)** on the same infrastructure, providing maximum flexibility for different agent architectures.

---

## Integration Guide

### Registering a New Service
1. Open the **Tool Bazaar** in the web UI.
2. Scroll to the **"Become a Service Provider"** section.
3. Fill in the details (Name, Price, Endpoint, Split Percentage) and click **Register**.
4. The service is now instantly available in the marketplace, and the agent's LLM prompt will automatically discover it.

### How Revenue Splitting Works
When an agent pays for a service (e.g., $0.05 USDC), the payment router intercepts the transaction. Instead of sending 100% to the provider, the system splits the payment based on the configured `providerSplitPercentage` (default 70%).
- 70% goes to the Service Provider.
- 30% goes to the Agent Paywall Router (Protocol Fee).
This breakdown is visibly logged in the **Payment Ledger** and **Execution** views for full transparency.

### Reputation System
The marketplace now supports deterministic service discovery. Instead of just picking the absolute cheapest tool, the agent calculates a **Value Score**:
`Score = Cost * (1 - Rating / 5)`
- Lower score is better.
- A highly-rated, slightly more expensive tool might be chosen over a cheap, unrated tool.
- You can manually rate tools in the **Tool Bazaar** view.

---

## FAQ

**Q: How do I test the new Google News integration?**
A: Go to the Workspace and type: `Search for the latest news on Stellar`. The agent will use the updated `search` tool to fetch real-time RSS feeds from Google News.

**Q: Where is the reputation data saved?**
A: If you have Supabase configured (see `SUPABASE_URL` in `.env.local`), ratings and services are saved permanently in the database. Otherwise, they are stored in memory and reset on server restart.

**Q: What is the new Weather API?**
A: The global weather API was integrated as a "High-Value API" to demonstrate the dynamic nature of the marketplace. It costs $0.05 USDC and returns real-time conditions using Open-Meteo. Ask the agent: `What is the weather in Tokyo?` to test it.

---

## Technical Stack & Production Features

The Agent Paywall Router is a production-ready economic infrastructure for AI agents on Stellar.

### 1. On-Chain Revenue Splitting (Soroban)
Unlike basic implementations, our revenue splits are recorded on-chain. Every tool execution calls the `record_split_payment` function on our Soroban contract, immutably distributing revenue between the **Provider** and the **Protocol** (e.g., 70/30 split).

### 2. Verified Purchaser Reputation
To prevent Sybil attacks and fake reviews, our rating system features an on-chain verification gate. Users must provide a valid **Stellar Transaction Hash** to prove they have successfully paid for and used a service before their 1-5 star rating is accepted.

### 3. Multi-Asset & Provider Auth
The platform is asset-agnostic. While it defaults to testnet USDC, providers can register services using **any Soroban-compliant token** by providing its issuer address. Service registration also requires a **Provider Wallet Address**, ensuring all payments are routed to verified machine identities.

### 4. Deterministic Value Logic
The router implements a sophisticated selection algorithm: `Value Score = Price * (1 - Rating/5)`. This ensures agents prioritize **quality and reliability** alongside cost, creating a true competitive marketplace.

---

## Technical Stack Performance

- **Persistence**: Full Supabase integration for sessions, services, and transaction history.
- **On-Chain Logic**: Rust-based Soroban contract for spend authorization and split recording.
- **Real-time**: Google News RSS and Open-Meteo Weather integration for live data demonstration.
- **Validation**: Strict hard budget enforcement at both the database and application levels.

---

## Integration Guide

### Registering a New Service
1. Open the **Tool Bazaar** in the web UI.
2. Scroll to the **"Become a Service Provider"** section.
3. Fill in the details (Name, Price, Endpoint, Provider Wallet, and Asset Issuer).
4. Click **Register**. The service is now instantly available for the agent to discover and use.

### Rating a Service
1. In the **Tool Bazaar**, click the **"Rate"** button on any service card.
2. You will be prompted for a **Transaction Hash**. Copy this from your **Payment Ledger** or the Stellar Explorer.
3. Once verified on-chain, your rating will be aggregated into the service's reputation score.

---

## 🛠 Troubleshooting

### Wallet Connection Issues
- **"Freighter not detected"**: This app requires a Stellar-compatible wallet. Ensure you have the [Freighter extension](https://freighter.app) installed and unlocked.
- **"MetaMask extension not found"**: While the app detects MetaMask, it primarily uses Stellar for x402 payments. If you see this warning, please ensure Freighter is installed.
- **"Failed to connect"**: If you've rejected a connection request, simply refresh the page or click "Connect Wallet" again.
- **Stellar Network**: Ensure your wallet is set to **Testnet**, as this project operates on the Stellar Testnet.

### Search Tool Issues
- **"Search provider error"**: This usually means the external search API (Tavily) is unreachable or the key is invalid. 
- **Configuration**: To enable high-quality real-time search, add `TAVILY_API_KEY` to your `.env`. You can get a free key at [tavily.com](https://tavily.com).
- **Fallback**: If no key is provided, the app automatically falls back to **DuckDuckGo** and **Wikipedia**. If all external services fail, it will return labeled **Mock Data** to ensure the agent's reasoning loop can continue.

### Browser Console Warnings
- **"SES Removing unpermitted intrinsics"**: This is a normal warning from the Secure ECMAScript (SES) lockdown script. It is part of the project's security architecture to ensure a hardened execution environment for agent payments. You can safely ignore it.
- **Font Preload Warnings**: If you see warnings about unused preloaded fonts, the project has been updated to load fonts only when needed by CSS.

### Session Initialization
- **"Session init failed"**: The app requires a local API to be running at `/api/sessions`. Ensure you've run `npm run dev` and your environment variables (like `SUPABASE_URL`) are correctly configured in `.env`.
 — Mokwa Moffat Ohuru
