# Agent Paywall Router — Video Script
## Stellar Hacks: Agents 2026 | No Slides | Screen Recording Only | 2:30

---

## BEFORE YOU HIT RECORD

Open these tabs in your browser:
1. `http://localhost:3000/workspace` — the main app
2. `https://stellar.expert/explorer/testnet/tx/71bd4c7bbb0a926c8b9165d8f47ad8944e1761759dd8839e9dab5562fc85d79a` — real tx from today

Make sure your microphone is on. Start recording. Begin speaking immediately.

---

## THE SCRIPT (say this word for word, naturally)

---

### [0:00 – 0:25] INTRODUCTION + PROBLEM

*(You are on the workspace page. Don't type anything yet. Just talk.)*

> "My name is Mokwa Moffat Ohuru and this is Agent Paywall Router —
> built for Stellar Hacks: Agents 2026.
>
> Here is the problem.
>
> AI agents today can reason, plan, and execute tasks.
> But the moment they hit a paywall — a premium API, a paid data feed,
> any service that costs money — they stop.
> They have no wallet. No payment protocol. No way to transact.
>
> This is the Last Mile problem for AI agents.
> They can think. They cannot pay.
>
> We built the infrastructure to fix that."

---

### [0:25 – 0:45] THE SOLUTION

*(Still on workspace. Still not typing.)*

> "Agent Paywall Router gives AI agents a real economic identity on Stellar.
>
> When an agent hits a paywall, this system does not stop.
> It reads the HTTP 402 payment requirement,
> signs a real USDC micropayment on Stellar testnet using the x402 protocol,
> calls authorize on a deployed Soroban smart contract to enforce spending limits on-chain,
> retries the request with the signed receipt,
> and returns the unlocked data plus a verifiable transaction hash.
>
> This is not a simulation.
> Every payment is a real Stellar transaction you can verify right now."

---

### [0:45 – 1:30] LIVE DEMO — THE PAYMENT HAPPENING

*(Now type in the prompt box)*

> "Let me show you."

*(Type: `Search for Stellar blockchain news` — hit enter)*

> "I've given the agent one task — search for Stellar blockchain news.
> Watch the execution timeline on the right."

*(Wait 3 seconds for steps to appear)*

> "The agent first checks the service marketplace — it found 4 services,
> cheapest is search at one cent.
> It checks the budget — one cent available.
> Now it hits the paywall."

*(Point to the payment_required step)*

> "HTTP 402 — Payment Required.
> The agent doesn't stop.
> It signs a real USDC transaction on Stellar testnet right now."

*(Point to the paying step)*

> "That payment is happening on-chain as we speak.
> Stellar settles in under 5 seconds."

*(Point to the confirmed step with tx hash)*

> "Search confirmed. Dollar zero one USDC.
> That transaction hash — let me click it."

*(Click the tx hash link — Stellar Expert opens)*

> "There it is. Confirmed on Stellar testnet.
> Successful. Real. Permanent.
> The agent paid for data, autonomously,
> without a credit card, without an API key, without any human intervention."

---

### [1:30 – 1:50] PAYMENT LEDGER

*(Click the Payments tab in the sidebar)*

> "Every payment is recorded in the ledger.
> Real transaction hashes. Real amounts. Real timestamps.
> Click any hash — it opens on Stellar Expert.
> This is not a mock database. These are on-chain records."

---

### [1:50 – 2:05] THE TOOL BAZAAR + TWO PROTOCOLS

*(Click the Bazaar tab)*

> "The Tool Bazaar is a machine-readable service catalog.
> Any agent — Claude, Cursor, any MCP-compatible system —
> can call slash api slash catalog and discover what services exist,
> what they cost, and how to pay.
>
> We support two payment protocols simultaneously.
> x402 from Coinbase — HTTP-native per-request payments.
> MPP from Stripe — Machine Payments Protocol.
> Both live on Stellar testnet right now.
>
> No other submission in this hackathon implements both."

---

### [2:05 – 2:15] SOROBAN CONTRACT

*(Click Settings tab)*

> "The spending limit is enforced on-chain by a Soroban smart contract —
> deployed on Stellar testnet.
> Five dollars per agent. If the agent tries to exceed it,
> the contract panics and the payment is rejected on-chain.
> The agent cannot drain its wallet.
> This is programmable economic guardrails — in Rust, on Stellar."

---

### [2:15 – 2:30] CLOSING — UNIQUE FEATURES + CALL TO ACTION

*(Stay on Settings or go back to Workspace)*

> "To summarize what makes this unique:
>
> One — real Stellar transactions. Not simulated. Verifiable on any explorer.
>
> Two — two payment protocols. x402 and MPP. Both working simultaneously.
>
> Three — Soroban spending policy. On-chain guardrails that cannot be bypassed.
>
> Four — MCP server. Claude and Cursor can discover and pay for our tools
> without any custom integration.
>
> Five — Agent to Agent commerce. A second autonomous agent
> can discover our services, pay for them with its own Stellar wallet,
> and retrieve results — with zero human clicks.
>
> Six — Freighter wallet integration.
> This is my real Stellar wallet connected directly to the app.
> Agents can be funded directly from a browser wallet.
> No backend key management required.
> The wallet address is public, the connection is live,
> and any payment flows through a real Stellar account you can verify on-chain.
>
> The infrastructure for a machine economy exists.
> This project proves it works.
>
> Open source. GitHub: github dot com slash mokwathedeveloper slash Agent-Paywall-Router.
> Thank you."

---

## TIMING GUIDE

```
0:00 – 0:25   Introduction + Problem        (25 seconds)
0:25 – 0:45   The Solution                  (20 seconds)
0:45 – 1:30   Live Demo — payment on screen (45 seconds)
1:30 – 1:50   Payment Ledger                (20 seconds)
1:50 – 2:05   Tool Bazaar + Two Protocols   (15 seconds)
2:05 – 2:15   Soroban Contract              (10 seconds)
2:15 – 2:30   Closing + Unique Features     (15 seconds)
─────────────────────────────────────────────────────────
TOTAL: 2 minutes 30 seconds
```

---

## WHAT TO HAVE OPEN (in order)

1. Start on `http://localhost:3000/workspace`
2. After typing prompt → wait for tx hash → click it → Stellar Expert
3. Back to app → click **Payments** tab
4. Click **Bazaar** tab
5. Click **Settings** tab
6. End on Settings or Workspace

---

## THE ONE THING THAT WINS THE DEMO

When the tx hash appears and you click it — **pause for 2 seconds** before speaking.
Let the judge see Stellar Expert load with `Successful: true`.
That moment of silence is worth more than any word you say.

---

## AFTER RECORDING

1. Upload to YouTube (unlisted is fine) or Loom
2. Go to DoraHacks submission page
3. Paste: `https://github.com/mokwathedeveloper/Agent-Paywall-Router`
4. Paste the video link
5. Submit before **April 13, 2026 at 20:00**
