# Technical Architecture

## Stack

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| Framework | Next.js | 16.2.1 | Fullstack — SSR, API routes, static pages |
| Language | TypeScript | 5.x | Type safety, SonarQube compliance |
| AI Orchestration | **Vercel AI SDK** | 6.x | Multi-step LLM tool reasoning |
| LLM Models | OpenAI GPT-4o-mini | — | Core intelligence |
| Protocols | **x402** + **MCP** | 2.8.0 | Micropayments and Agent Discovery |
| Database | Supabase (PostgreSQL) | 2.x | Persistent sessions and transactions |
| Blockchain | Stellar Testnet | — | USDC settlement & Soroban Policies |
| Testing | Jest + ts-jest | 30.x | Unit and integration tests |

---

## Directory Structure

```
Agent-Paywall-Router/
├── apps/
│   └── web/                            # Next.js fullstack application
│       ├── __tests__/                  # All test files
│       │   ├── db.test.ts              # Unit: database layer
│       │   ├── services.test.ts        # Unit: tool services
│       │   ├── mcp.test.ts             # Unit: MCP endpoints
│       │   └── api.integration.test.ts # Integration: all API routes
│       ├── app/
│       │   ├── api/
│       │   │   ├── agent/route.ts      # POST /api/agent — LLM Orchestration
│       │   │   ├── mcp/
│       │   │   │   ├── tools/route.ts  # GET — MCP Discovery
│       │   │   │   └── execute/route.ts # POST — MCP Proxy Execution
│       │   │   ├── health/onchain/route.ts # GET — Soroban Verifier
│       │   │   ├── tools/
│       │   │   │   ├── search/         # GET  /api/tools/search  ($0.01)
│       │   │   │   ├── summarize/      # POST /api/tools/summarize ($0.02)
│       │   │   │   └── analyze/        # POST /api/tools/analyze  ($0.03)
│       │   ├── workspace/page.tsx      # Agent workspace UI
│       ├── lib/
│       │   ├── agents/
│       │   │   └── external-agent.ts   # A2A Commerce Client
│       │   ├── types/index.ts          # Shared domain types
│       │   ├── services/
│       │   │   ├── search.ts           # Search tool implementation
│       │   │   ├── summarizer.ts       # LLM Summarize tool
│       │   │   └── analyzer.ts         # LLM Analyze tool
│       │   ├── db.ts                   # Database abstraction
│       │   └── supabase.ts             # Supabase client initialization
```

---

## Agentic Payment Flow (Multi-Step)

```
User Prompt
    │
    ▼
POST /api/agent (Vercel AI SDK)
    │
    ├─ 1. Reasoning Loop (GPT-4o-mini)
    │       └─ Decides Tool(s) to use: Search → Summarize → Analyze
    │
    ├─ 2. For each tool:
    │       ├─ Budget Check (canSpend)
    │       ├─ Call Tool Endpoint
    │       │    └─ 402 Payment Required
    │       ├─ x402 Settlement (Stellar Testnet)
    │       ├─ Soroban Authorization (authorize())
    │       └─ Unlock Tool Results
    │
    ├─ 3. Final Result Aggregation
    │
    └─ 4. Return { result, steps[], txHash, summary }
```

---

## Model Context Protocol (MCP) Integration

The platform serves as an **MCP Gateway**, allowing standard AI agents (Claude, Cursor) to consume paid Stellar services:

1.  **Discovery**: Agent calls `GET /api/mcp/tools` to see capabilities and x402 pricing.
2.  **Payment**: Agent performs x402 settlement on Stellar.
3.  **Execution**: Agent calls `POST /api/mcp/execute` with the tool name, arguments, and the `x402-receipt`.

---

## On-chain Spending Policy (Soroban)

A Rust-based smart contract enforces safety:
-   **authorize(agent, amount)**: Called by the router backend before tool execution.
-   **get_spent(agent)**: Public view of the agent's real on-chain activity.
-   **get_limit()**: The hard spending ceiling ($5.00 default).

---

## Test Strategy

```bash
npm run test:unit         # db.test + services.test + mcp.test
npm run test:integration  # api.integration.test
```

| Suite | Count | Covers |
|---|---|---|
| Unit | 51 | DB, LLM Services, MCP Interface |
| Integration | 37 | Full A2A flows, 402 redirects, sessions |
