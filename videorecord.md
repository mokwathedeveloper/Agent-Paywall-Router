# Gamma Slide Deck — Agent Paywall Router
## Stellar Hacks: Agents 2026 — Demo Video Slides

---

## HOW TO USE THIS FILE

1. Go to **[gamma.app](https://gamma.app)**
2. Click **"New AI"** → **"Generate"**
3. Copy the **GAMMA PROMPT** below and paste it into the prompt box
4. Click Generate
5. After generation, use the **SLIDE-BY-SLIDE CONTENT** section below to manually correct any slide that doesn't match

---

## GAMMA PROMPT (copy this entire block)

```
Create a professional dark-themed presentation for a hackathon demo video.
The project is called "Agent Paywall Router" — it was built for the Stellar Hacks: Agents 2026 hackathon.

Theme: Dark background (#09090B), emerald green (#10B981) as accent color, white text. Minimal, technical, clean. No stock photos. Use icons and diagrams instead.

Create exactly 6 slides:

SLIDE 1 — TITLE SLIDE
Title: "Agent Paywall Router"
Subtitle: "Let AI Agents Pay for the Internet"
Bottom tag: "Stellar Hacks: Agents 2026 · Built by Mokwa Moffat Ohuru"
Visual: A simple icon of a robot hitting a wall with a dollar sign, then breaking through

SLIDE 2 — THE PROBLEM
Title: "AI Agents Can't Pay"
3 bullet points:
- The modern web runs on paywalls — APIs, subscriptions, premium data feeds
- When a human hits a paywall, they use a credit card. When an agent hits one, it STOPS.
- Agents can reason, plan, and execute — but they cannot transact
Bottom quote in large text: "This is the Last Mile problem for AI agents."
Visual: A flowchart showing Agent → Paywall → BLOCKED (red X)

SLIDE 3 — THE SOLUTION
Title: "Give Agents a Real Wallet on Stellar"
4 steps in a horizontal flow:
1. Agent hits HTTP 402 paywall
2. Signs real USDC micropayment via x402 protocol
3. Soroban smart contract enforces $5.00 spending limit on-chain
4. Tool unlocks — agent continues autonomously
Highlight box: "No credit cards. No subscriptions. No human intervention."
Visual: Flow diagram with Stellar logo

SLIDE 4 — LIVE DEMO (placeholder slide shown during demo recording)
Title: "Live Demo"
Subtitle: "Watch the agent pay in real time"
3 items with icons:
- 🔍 Agent searches for Stellar news
- 💳 Hits x402 paywall → pays $0.01 USDC on Stellar testnet
- ✅ Real transaction hash returned — verifiable on Stellar Expert
Bottom note: "Every payment is a real Stellar testnet transaction. Not simulated."

SLIDE 5 — ON-CHAIN PROOF
Title: "Real Stellar Transactions"
Content:
- Payment tx hash: stellar:b4560105d68f7e1fdb3f3ca9855a3ff97721d251dc8eb1c4d30185252e460425
- Soroban policy tx: 90fc551e37ff384a3033cf09ed888813798e55a967c908ad5dbe7138472df756
- Verify at: stellar.expert/explorer/testnet
2 column layout:
Left: What happened (agent paid $0.01 USDC for a search)
Right: On-chain proof (tx hash, explorer link, Soroban contract ID)
Soroban Contract: CABLFWICBLK5IX3EWQSVQGS6WIQ2V7YLNLA6HIPGLGEDCO4DKOQQSWOQ
Visual: Screenshot placeholder of Stellar Expert explorer

SLIDE 6 — ARCHITECTURE & CLOSING
Title: "Built on Stellar + x402"
Left column — Tech Stack:
- x402 v2 (Coinbase) — HTTP-native payments
- Stellar Testnet — USDC micropayments, ~$0.00001 fee
- Soroban Smart Contract — on-chain spending limits
- MPP (Stripe) — second payment protocol
- MCP Server — Claude/Cursor compatible
- GPT-4o-mini via OpenRouter — LLM orchestration
Right column — Why Stellar:
- $0.01 payment with $0.00001 fee = 99.99% reaches the provider
- 3-5 second settlement — fast enough for HTTP request cycle
- Programmable guardrails via Soroban
Bottom closing line: "The infrastructure for a machine economy exists. This project proves it works."
GitHub: github.com/mokwathedeveloper/Agent-Paywall-Router
```

---

## SLIDE-BY-SLIDE CONTENT
### (Use this to manually fix any slide after Gamma generates)

---

### SLIDE 1 — Title

**Heading:** Agent Paywall Router

**Subheading:** Let AI Agents Pay for the Internet

**Body:** Built for Stellar Hacks: Agents 2026

**Speaker note (say this on camera):**
> "This is Agent Paywall Router — payment infrastructure that gives AI agents a real economic identity on Stellar. When an agent hits a paywall, this system doesn't stop. It pays."

---

### SLIDE 2 — The Problem

**Heading:** AI Agents Can't Pay

**3 bullets:**
- The modern web runs on paywalls — APIs, subscriptions, premium data
- When a human hits a paywall, they use a credit card. When an agent hits one, it **stops**
- Agents can reason, plan, and execute — but they cannot transact

**Big quote:**
> "This is the Last Mile problem for AI agents."

**Speaker note:**
> "Every agent framework today treats payment as an afterthought — a human step that breaks the autonomous loop. The agent falls back to stale data, hallucinates facts, or simply fails."

---

### SLIDE 3 — The Solution

**Heading:** Give Agents a Real Wallet on Stellar

**4-step flow:**
1. **Agent hits HTTP 402** — server returns payment requirement
2. **Signs USDC micropayment** — via x402 protocol on Stellar testnet
3. **Soroban enforces limits** — $5.00 on-chain spending cap, cannot be bypassed
4. **Tool unlocks** — agent continues, returns result + tx proof

**Highlight box:**
> No credit cards. No subscriptions. No human intervention.

**Speaker note:**
> "The x402 protocol turns any HTTP endpoint into a paywall. The agent reads the 402 response, signs a real USDC transaction on Stellar, and retries. The whole cycle takes under 5 seconds."

---

### SLIDE 4 — Live Demo

**Heading:** Live Demo

**Subheading:** Watch the agent pay in real time

**3 items:**
- Agent receives task: *"Search for Stellar blockchain news"*
- Hits x402 paywall → pays $0.01 USDC on Stellar testnet autonomously
- Returns real transaction hash — verifiable on any Stellar explorer

**Bottom note:**
> Every payment is a real Stellar testnet transaction. Not simulated.

**Speaker note:**
> "I'm going to type a prompt into the workspace. Watch the execution timeline — you'll see the 402 challenge, the payment, the Soroban authorization, and the result. The transaction hash at the end is real."

---

### SLIDE 5 — On-Chain Proof

**Heading:** Real Stellar Transactions — Verifiable On-Chain

**Left column:**
- Tool: Web Search
- Cost: $0.01 USDC
- Network: Stellar Testnet
- Asset: USDC
- Settlement: < 5 seconds
- Fee: ~$0.00001

**Right column:**
- Payment tx: `b4560105d68f7e1f...`
- Soroban policy tx: `90fc551e37ff384a...`
- Contract: `CABLFWICBLK5IX3E...`
- Explorer: stellar.expert/explorer/testnet

**Bottom:**
> Take any tx hash from the demo and verify it at stellar.expert — it's real.

**Speaker note:**
> "This transaction hash was generated during this demo. You can paste it into Stellar Expert right now and see the real on-chain record. The Soroban contract also recorded the spend — that's the programmable guardrail."

---

### SLIDE 6 — Architecture & Closing

**Heading:** Built on Stellar + x402

**Left — What we built:**
- x402 v2 payment server + client
- Soroban spending policy contract (Rust)
- MPP (Stripe Machine Payments) endpoint
- MCP server — Claude/Cursor compatible
- Agent-to-Agent commerce (A2A)
- LLM orchestration via Vercel AI SDK

**Right — Why Stellar:**
- Fee: ~$0.00001 — 1000x cheaper than Ethereum
- Settlement: 3-5 seconds
- USDC native — no wrapping, no bridges
- Soroban — programmable on-chain limits
- x402 — HTTP-native payment standard

**Closing line:**
> "The infrastructure for a machine economy exists. This project proves it works."

**GitHub:** `github.com/mokwathedeveloper/Agent-Paywall-Router`

**Speaker note:**
> "The code is open source. The contract is deployed. The payments are real. Thank you."

---

## VIDEO RECORDING ORDER

When recording your demo video, show the slides in this order:

```
[0:00] Show SLIDE 1 (title) — speak for 10 seconds
[0:10] Show SLIDE 2 (problem) — speak for 20 seconds
[0:30] Show SLIDE 3 (solution) — speak for 20 seconds
[0:50] Switch to BROWSER — run live demo — speak for 50 seconds
[1:40] Show SLIDE 5 (on-chain proof) — click tx hash in browser — speak for 20 seconds
[2:00] Show SLIDE 6 (architecture) — speak for 20 seconds
[2:20] Back to SLIDE 1 (title) — closing line — 10 seconds
[2:30] STOP
```

---

## DEMO PROMPT TO USE (type this in the workspace during recording)

```
Search for Stellar blockchain news
```

This is a single-tool task — it will complete in one payment cycle (~15 seconds) without timing out.

---

## WHAT TO SAY DURING THE LIVE DEMO (word for word)

> *"I'm going to give the agent a task — search for Stellar blockchain news."*

*(type the prompt, hit enter)*

> *"Watch the execution timeline. The agent hits the paywall — HTTP 402. Instead of stopping, it signs a real USDC transaction on Stellar testnet. That's the payment happening right now."*

*(point to the 'search confirmed' step with the tx hash)*

> *"That transaction hash is real. I can click it right now and show you on Stellar Expert."*

*(click the tx hash link — it opens stellar.expert)*

> *"There it is — confirmed on Stellar testnet. The agent paid for data, autonomously, without a credit card or API key."*

*(switch to Payments tab)*

> *"The payment ledger shows the transaction. $0.01 USDC. Real."*

---

## SUBMISSION CHECKLIST

- [ ] GitHub repo is public: `github.com/mokwathedeveloper/Agent-Paywall-Router`
- [ ] README.md is complete with setup instructions
- [ ] Demo video is 2-3 minutes
- [ ] Video shows real Stellar transaction hash
- [ ] Video shows tx verified on Stellar Expert
- [ ] Submitted on DoraHacks before **April 13, 2026 20:00**
