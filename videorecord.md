# Gamma Slide Deck — Agent Paywall Router
## Stellar Hacks: Agents 2026 — Demo Video Slides

---

## HOW TO USE THIS FILE

1. Go to **[gamma.app](https://gamma.app)**
2. Click **"New AI"** → **"Generate"**
3. Copy the **GAMMA PROMPT** below and paste it into the prompt box
4. Click Generate
5. After generation, use the **SLIDE-BY-SLIDE CONTENT** section to manually fix any slide

---

## GAMMA PROMPT (copy this entire block)

```
Create a professional dark-themed presentation for a hackathon demo video.
The project is called "Agent Paywall Router" — built for Stellar Hacks: Agents 2026.

Theme: Dark background (#09090B), emerald green (#10B981) accent, white text.
Minimal, technical, clean. No stock photos. Use icons and code snippets instead.

Create exactly 10 slides:

SLIDE 1 — TITLE
Title: "Agent Paywall Router"
Subtitle: "Let AI Agents Pay for the Internet"
Tag: "Stellar Hacks: Agents 2026 · Mokwa Moffat Ohuru"

SLIDE 2 — THE PROBLEM
Title: "AI Agents Can't Pay"
Bullets:
- The modern web runs on paywalls — APIs, subscriptions, premium data
- When a human hits a paywall, they use a credit card. When an agent hits one, it STOPS.
- Agents can reason, plan, and execute — but they cannot transact
Big quote: "This is the Last Mile problem for AI agents."

SLIDE 3 — THE SOLUTION
Title: "Give Agents a Real Wallet on Stellar"
4-step horizontal flow:
1. Agent hits HTTP 402 paywall
2. Signs real USDC micropayment via x402 on Stellar testnet
3. Soroban contract enforces $5.00 on-chain spending limit
4. Tool unlocks — agent continues autonomously
Highlight: "No credit cards. No subscriptions. No human intervention."

SLIDE 4 — THE WORKSPACE (UI screenshot description)
Title: "The Agent Workspace"
Subtitle: "Type a prompt. The agent pays and executes autonomously."
Show a dark UI panel with:
- Left sidebar: Workspace, Bazaar, Payments, Settings, A2A Demo navigation
- Center: A prompt input box with placeholder "Give the agent a task"
- Execution timeline showing steps:
  ✓ Security Check — Prompt verified safe
  ✓ Initializing LLM Agent — Using OpenRouter (openai/gpt-4o-mini)
  ✓ Budget available for search — $0.01 available
  ⟳ Requesting search — 402 Payment Required
  ⟳ Paying $0.01 USDC — Signing via @x402/stellar
  ✓ search confirmed $0.01 — tx: stellar:b4560105...
  ✓ SpendingPolicy.authorize — policy_tx: 90fc551e...
  ✓ Done — All tools executed
- Right panel: Budget donut chart showing 3% used ($0.15 of $5.00)
Caption: "Every step is real. Every payment is on Stellar testnet."

SLIDE 5 — THE TOOL BAZAAR (UI screenshot description)
Title: "The Tool Bazaar"
Subtitle: "Agent-native services discoverable via /api/catalog"
Show 4 tool cards in a grid:
Card 1: x402 badge | Web Search | $0.01 | "Real-time web search via DuckDuckGo + Wikipedia"
Card 2: x402 badge | Text Summarizer | $0.02 | "Extracts key points and summary from any text"
Card 3: x402 badge | Sentiment Analyzer | $0.03 | "Sentiment analysis, entity extraction, theme detection"
Card 4: MPP badge | MPP Web Search | $0.01 | "Stripe Machine Payments Protocol — alternative to x402"
Bottom banner: "Bazaar Discovery Active — Any service implementing x402 or MPP on Stellar can be listed here."
Caption: "Two payment protocols: x402 (Coinbase) + MPP (Stripe). Both live on Stellar testnet."

SLIDE 6 — THE PAYMENT LEDGER (UI screenshot description)
Title: "Payment Ledger — Every Transaction On-Chain"
Show 3 summary cards at top:
- Total Transactions: 11
- Total Spent: $0.1500
- Success Rate: 100%
Show transaction list rows:
Row 1: search icon | search | $0.01 | stellar:b4560105... | [SUCCESS]
Row 2: summarize icon | summarize | $0.02 | stellar:90fc551e... | [SUCCESS]
Row 3: search icon | search | $0.01 | stellar:39760c8c... | [SUCCESS]
Right panel shows budget donut: 3% used, $0.15 of $5.00, 11 transactions
On-chain Policy box: "Verified Spend: $0.2500 | Contract: CABLFWIC..."
Caption: "Real Stellar transactions. Click any hash to verify on Stellar Expert."

SLIDE 7 — SETTINGS & SOROBAN CONTRACT
Title: "Configuration — Stellar Testnet"
Show settings grid with 6 cards:
- Network: Stellar Testnet
- Asset: USDC
- Spending Limit: $5.00 per session
- Session ID: sess_ysq10884
- Expires: Apr 12, 2026, 10:20 PM
- Soroban Contract: CABLFWICBLK5IX3EWQSVQGS6WIQ2V7YLNLA6HIPGLGEDCO4DKOQQSWOQ
Payment Protocols section:
- x402: Active — HTTP-native per-request payments
- MPP: Active — Machine Payments Protocol by Stripe
Bottom status bar: "Connected to Stellar Testnet · x402 Protocol v2 · USDC micropayments active"
Caption: "Soroban contract enforces spending limits on-chain. Cannot be bypassed."

SLIDE 8 — AGENT-TO-AGENT COMMERCE
Title: "Agent-to-Agent Commerce"
Subtitle: "A second autonomous agent discovers and pays for tools — no human clicks"
Show the A2A demo UI:
- Input field: "Buyer Agent Secret Key (Testnet) — S..."
- Execution Log terminal showing:
  [SUCCESS] Agent Initialization: Second Agent powered by ExternalAgentClient
  [SUCCESS] Tool Discovery: Agent calling GET /api/mcp/tools...
  [SUCCESS] Discovery Complete: Found 3 paid tools on Stellar
  [SUCCESS] Autonomous Execution: Agent decided to use 'search' for 'Stellar Hacks'
  [SUCCESS] A2A Commerce Success: Payment verified on-chain, data retrieved!
Two info cards:
1. "Bazaar Discovery — The agent calls /api/catalog to find tools. No manual integration needed."
2. "Programmable Payments — When it hits a 402, it signs a Stellar USDC transaction automatically and retries."
Caption: "Machine economy: agents buying from agents. Fully autonomous."

SLIDE 9 — ON-CHAIN PROOF
Title: "Real Stellar Transactions — Verifiable Right Now"
2-column layout:
Left column:
- Tool: Web Search
- Cost: $0.01 USDC
- Network: Stellar Testnet
- Asset: USDC (native)
- Settlement: < 5 seconds
- Fee: ~$0.00001
Right column (monospace font):
- Payment tx: b4560105d68f7e1fdb3f...
- Soroban policy tx: 90fc551e37ff384a3033...
- Contract: CABLFWICBLK5IX3EWQSVQGS6WIQ2V7YLNLA6HIPGLGEDCO4DKOQQSWOQ
- Explorer: stellar.expert/explorer/testnet
Big bottom text: "Paste any tx hash into stellar.expert — it's real."

SLIDE 10 — ARCHITECTURE & CLOSING
Title: "Built on Stellar + x402"
Left column — What we built:
- x402 v2 payment server + client (Coinbase protocol)
- Soroban spending policy contract (Rust, deployed on testnet)
- MPP endpoint (Stripe Machine Payments Protocol)
- MCP server — Claude/Cursor/Codex compatible
- Agent-to-Agent commerce (ExternalAgentClient)
- LLM orchestration — GPT-4o-mini via OpenRouter
Right column — Why Stellar:
- Fee: ~$0.00001 — 1000x cheaper than Ethereum
- Settlement: 3-5 seconds — fast enough for HTTP cycle
- USDC native — no wrapping, no bridges
- Soroban — programmable on-chain guardrails
- x402 — HTTP-native payment standard (402 since 1997)
Closing: "The infrastructure for a machine economy exists. This project proves it works."
GitHub: github.com/mokwathedeveloper/Agent-Paywall-Router
```

---

## SLIDE-BY-SLIDE CONTENT
### (Use this to manually fix any slide after Gamma generates)

---

### SLIDE 1 — Title

**Heading:** Agent Paywall Router
**Subheading:** Let AI Agents Pay for the Internet
**Body:** Stellar Hacks: Agents 2026 · Built by Mokwa Moffat Ohuru

**Speaker note:**
> "This is Agent Paywall Router — payment infrastructure that gives AI agents a real economic identity on Stellar. When an agent hits a paywall, this system doesn't stop. It pays."

---

### SLIDE 2 — The Problem

**Heading:** AI Agents Can't Pay

**Bullets:**
- The modern web runs on paywalls — APIs, subscriptions, premium data
- When a human hits a paywall, they use a credit card. When an agent hits one, it **stops**
- Agents can reason, plan, and execute — but they cannot transact

**Big quote:** "This is the Last Mile problem for AI agents."

**Speaker note:**
> "Every agent framework today treats payment as an afterthought — a human step that breaks the autonomous loop. The agent falls back to stale data, hallucinates facts, or simply fails."

---

### SLIDE 3 — The Solution

**Heading:** Give Agents a Real Wallet on Stellar

**4-step flow:**
1. Agent hits HTTP 402 — server returns payment requirement
2. Signs USDC micropayment — via x402 protocol on Stellar testnet
3. Soroban enforces limits — $5.00 on-chain spending cap, cannot be bypassed
4. Tool unlocks — agent continues, returns result + tx proof

**Highlight:** No credit cards. No subscriptions. No human intervention.

**Speaker note:**
> "The x402 protocol turns any HTTP endpoint into a paywall. The agent reads the 402 response, signs a real USDC transaction on Stellar, and retries. The whole cycle takes under 5 seconds."

---

### SLIDE 4 — The Workspace

**Heading:** The Agent Workspace

**Subheading:** Type a prompt. The agent pays and executes autonomously.

**What to show:** The left sidebar with Workspace / Bazaar / Payments / Settings / A2A Demo navigation, the prompt input, and the execution timeline with real step names.

**Key steps to highlight in the timeline:**
- `⟳ Requesting search — 402 — Payment Required` ← THE PAYWALL
- `⟳ Paying $0.01 USDC — Signing via @x402/stellar` ← THE PAYMENT
- `✓ search confirmed $0.01 — tx: stellar:b4560105...` ← THE PROOF

**Right panel:** Budget donut showing $0.15 spent of $5.00 (3%), 11 transactions

**Speaker note:**
> "This is the main workspace. I type a prompt, the agent decides which tools to use, hits the paywall, pays autonomously, and returns the result. Watch the execution timeline — every step is real."

---

### SLIDE 5 — The Tool Bazaar

**Heading:** The Tool Bazaar

**Subheading:** Agent-native services discoverable via /api/catalog

**4 tool cards:**

| Badge | Tool | Price | Description |
|---|---|---|---|
| x402 | Web Search | $0.01 | Real-time web search via DuckDuckGo + Wikipedia |
| x402 | Text Summarizer | $0.02 | Extracts key points and summary from any text |
| x402 | Sentiment Analyzer | $0.03 | Sentiment analysis, entity extraction, theme detection |
| MPP | MPP Web Search | $0.01 | Stripe Machine Payments Protocol — alternative to x402 |

**Bottom banner:** "Bazaar Discovery Active — Tools are dynamically discovered via /api/catalog. Any service implementing x402 or MPP on Stellar can be listed here."

**Speaker note:**
> "The Bazaar is a machine-readable service catalog. Any agent can call /api/catalog and discover what tools are available, what they cost, and how to pay. We support two protocols — x402 from Coinbase and MPP from Stripe. Both live on Stellar testnet."

---

### SLIDE 6 — Payment Ledger

**Heading:** Payment Ledger — Every Transaction On-Chain

**3 summary stats:**
- Total Transactions: **11**
- Total Spent: **$0.1500 USDC**
- Success Rate: **100%**

**Transaction rows (show 3):**
```
[SUCCESS]  search    $0.01   stellar:b4560105d68f7e1f...   Apr 11, 2026
[SUCCESS]  summarize $0.02   stellar:90fc551e37ff384a...   Apr 11, 2026
[SUCCESS]  search    $0.01   stellar:39760c8cedacbfa5...   Apr 11, 2026
```

**Right panel — Budget:**
- Donut: 3% used
- Spent: $0.15 of $5.00
- Remaining: $4.85
- Transactions: 11

**On-chain Policy box:**
- Verified Spend: $0.2500
- Contract: CABLFWIC...
- *(links to Stellar Expert)*

**Speaker note:**
> "Every payment is recorded in the ledger. Click any transaction hash and it opens on Stellar Expert — a real, confirmed transaction on Stellar testnet. The on-chain policy box shows the Soroban contract has verified $0.25 in spend."

---

### SLIDE 7 — Settings & Soroban Contract

**Heading:** Configuration — Stellar Testnet

**6 setting cards:**
- **Network:** Stellar Testnet
- **Asset:** USDC
- **Spending Limit:** $5.00 per session
- **Session ID:** sess_ysq10884
- **Expires:** Apr 12, 2026, 10:20 PM
- **Soroban Contract:** CABLFWICBLK5IX3EWQSVQGS6WIQ2V7YLNLA6HIPGLGEDCO4DKOQQSWOQ

**Wallet Connection:** Connect Freighter Wallet — Fund your agent directly from your Stellar wallet

**Payment Protocols:**
- **x402** — Active — HTTP-native per-request payments
- **MPP** — Active — Machine Payments Protocol by Stripe

**Status bar:** Connected to Stellar Testnet · x402 Protocol v2 · USDC micropayments active

**Speaker note:**
> "The settings panel shows the active Soroban contract — that's the on-chain spending policy. It's deployed on Stellar testnet. You can click the contract ID and verify it on Stellar Expert. Both x402 and MPP are active simultaneously."

---

### SLIDE 8 — Agent-to-Agent Commerce

**Heading:** Agent-to-Agent Commerce

**Subheading:** A second autonomous agent discovers and pays for tools — no human clicks

**Input:** Buyer Agent Secret Key (Testnet) — S...

**Execution Log terminal:**
```
[SUCCESS]  Agent Initialization:    Second Agent powered by ExternalAgentClient
[SUCCESS]  Tool Discovery:          Agent calling GET /api/mcp/tools...
[SUCCESS]  Discovery Complete:      Found 3 paid tools on Stellar
[SUCCESS]  Autonomous Execution:    Agent decided to use 'search' for 'Stellar Hacks'
[SUCCESS]  A2A Commerce Success:    Payment verified on-chain, data retrieved!
```

**Two info cards:**
1. **Bazaar Discovery** — The agent first calls /api/catalog to find tools. No manual integration needed.
2. **Programmable Payments** — When it hits a 402, it signs a Stellar USDC transaction automatically and retries.

**Speaker note:**
> "This is the A2A demo — Agent to Agent commerce. A second autonomous agent, the ExternalAgentClient, discovers our tools via the MCP server, hits the paywall, pays with its own Stellar wallet, and retrieves the result. No human clicked anything. This is the machine economy."

---

### SLIDE 9 — On-Chain Proof

**Heading:** Real Stellar Transactions — Verifiable Right Now

**Left column:**
- Tool: Web Search
- Cost: $0.01 USDC
- Network: Stellar Testnet
- Asset: USDC (native, no wrapping)
- Settlement: < 5 seconds
- Fee: ~$0.00001

**Right column (monospace):**
```
Payment tx:
b4560105d68f7e1fdb3f3ca9855a3ff9
7721d251dc8eb1c4d30185252e460425

Soroban policy tx:
90fc551e37ff384a3033cf09ed888813
798e55a967c908ad5dbe7138472df756

Contract:
CABLFWICBLK5IX3EWQSVQGS6WIQ2V7YL
NLA6HIPGLGEDCO4DKOQQSWOQ
```

**Big bottom text:** Paste any tx hash into stellar.expert — it's real.

**Explorer links:**
- `https://stellar.expert/explorer/testnet/tx/b4560105d68f7e1fdb3f3ca9855a3ff97721d251dc8eb1c4d30185252e460425`
- `https://horizon-testnet.stellar.org/transactions/b4560105d68f7e1fdb3f3ca9855a3ff97721d251dc8eb1c4d30185252e460425`

**Speaker note:**
> "These are real transaction hashes from this demo session. I can open Stellar Expert right now and show you the confirmed transaction. The Soroban policy transaction is also on-chain — that's the spending limit enforcement."

---

### SLIDE 10 — Architecture & Closing

**Heading:** Built on Stellar + x402

**Left — What we built:**
- x402 v2 payment server + client (Coinbase protocol)
- Soroban spending policy contract (Rust, deployed on testnet)
- MPP endpoint (Stripe Machine Payments Protocol)
- MCP server — Claude/Cursor/Codex compatible
- Agent-to-Agent commerce (ExternalAgentClient)
- LLM orchestration — GPT-4o-mini via OpenRouter (free)

**Right — Why Stellar:**
- Fee: ~$0.00001 — 1000x cheaper than Ethereum
- Settlement: 3-5 seconds — fast enough for HTTP cycle
- USDC native — no wrapping, no bridges, no slippage
- Soroban — programmable on-chain guardrails
- x402 — HTTP-native payment standard (402 since 1997)

**Closing line:** "The infrastructure for a machine economy exists. This project proves it works."

**GitHub:** `github.com/mokwathedeveloper/Agent-Paywall-Router`

**Speaker note:**
> "The code is open source. The Soroban contract is deployed. The payments are real. 11 transactions on Stellar testnet. Thank you."

---

## VIDEO RECORDING ORDER (2:30 total)

```
[0:00 – 0:10]  SLIDE 1  — Title. Say the tagline.
[0:10 – 0:25]  SLIDE 2  — The Problem. "Agents can't pay."
[0:25 – 0:40]  SLIDE 3  — The Solution. "x402 + Stellar."
[0:40 – 0:50]  SLIDE 4  — Show the Workspace slide. "Here's the UI."

[0:50 – 1:30]  BROWSER  — Switch to http://localhost:3000/workspace
               Type: "Search for Stellar blockchain news"
               Watch steps animate. Point out 402 → payment → tx hash.
               Click the tx hash → Stellar Expert opens.

[1:30 – 1:40]  BROWSER  — Click "Payments" tab. Show the ledger with 11 txns.
               Say: "$0.15 USDC spent. All real."

[1:40 – 1:50]  SLIDE 5  — Tool Bazaar. "x402 + MPP, both live."
[1:50 – 2:00]  SLIDE 6  — Payment Ledger. Show the stats.
[2:00 – 2:10]  SLIDE 7  — Settings. Point to Soroban contract ID.
[2:10 – 2:20]  SLIDE 8  — A2A Demo. "Agents buying from agents."
[2:20 – 2:25]  SLIDE 9  — On-chain proof. Show the tx hashes.
[2:25 – 2:30]  SLIDE 10 — Closing. GitHub link.
```

---

## WHAT TO SAY — WORD FOR WORD SCRIPT

### Opening (Slides 1-3, 0:00–0:40)

> *"This is Agent Paywall Router. The problem: AI agents can reason and plan, but they can't pay. When they hit a paywall, they stop. We built the infrastructure to fix that — using x402 on Stellar, agents can now pay for services autonomously, with real USDC micropayments and on-chain spending limits enforced by a Soroban smart contract."*

### Workspace Demo (Browser, 0:50–1:30)

> *"Here's the workspace. I'm going to give the agent one task."*

*(type: Search for Stellar blockchain news)*

> *"Watch the execution timeline. The agent hits the paywall — HTTP 402. Instead of stopping, it signs a real USDC transaction on Stellar testnet right now. That's the payment happening."*

*(point to 'search confirmed' step)*

> *"That transaction hash is real. Let me click it."*

*(click the tx hash — Stellar Expert opens)*

> *"There it is. Confirmed on Stellar testnet. The agent paid for data, autonomously, without a credit card or API key."*

### Payments Tab (Browser, 1:30–1:40)

*(click Payments tab)*

> *"The payment ledger shows every transaction. 11 payments. $0.15 USDC total. Every single one is a real Stellar transaction."*

### Bazaar (Slide 5, 1:40–1:50)

> *"The Tool Bazaar is a machine-readable catalog. Any agent can discover what tools are available and what they cost. We support two protocols — x402 from Coinbase and MPP from Stripe. Both live on Stellar testnet."*

### Settings (Slide 7, 2:00–2:10)

> *"The settings panel shows the active Soroban contract — CABLFWIC... — that's the on-chain spending policy. $5.00 limit per agent. If the agent tries to exceed it, the contract panics and the payment is rejected on-chain."*

### A2A Demo (Slide 8, 2:10–2:20)

> *"And finally — Agent to Agent commerce. A second autonomous agent discovers our tools, pays for them with its own Stellar wallet, and retrieves the result. No human clicked anything. This is the machine economy."*

### Closing (Slide 10, 2:25–2:30)

> *"Open source. Deployed on Stellar testnet. Real payments. The infrastructure for a machine economy exists. This project proves it works."*

---

## DEMO PROMPT TO USE

```
Search for Stellar blockchain news
```

Single tool, completes in ~15 seconds, shows the full payment flow without timeout.

---

## SUBMISSION CHECKLIST

- [ ] GitHub repo is public: `github.com/mokwathedeveloper/Agent-Paywall-Router`
- [ ] README.md is complete with setup instructions
- [ ] Demo video is 2-3 minutes
- [ ] Video shows Workspace with execution timeline
- [ ] Video shows Payments tab with real transactions
- [ ] Video shows Tool Bazaar (x402 + MPP tools)
- [ ] Video shows Settings with Soroban contract ID
- [ ] Video shows A2A demo execution log
- [ ] Video shows tx hash verified on Stellar Expert
- [ ] Submitted on DoraHacks before **April 13, 2026 20:00**
