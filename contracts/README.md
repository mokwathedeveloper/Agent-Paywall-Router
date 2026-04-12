# Soroban Contracts

## spending-policy

An on-chain spending policy contract that enforces per-agent budget limits for x402 micropayments on Stellar testnet.

**Deployed:**

| | |
|---|---|
| Contract ID | `CABLFWICBLK5IX3EWQSVQGS6WIQ2V7YLNLA6HIPGLGEDCO4DKOQQSWOQ` |
| Network | Stellar Testnet |
| Limit | $5.00 per agent (50,000,000 stroops) |
| Explorer | [View on Stellar Expert ↗](https://stellar.expert/explorer/testnet/contract/CABLFWICBLK5IX3EWQSVQGS6WIQ2V7YLNLA6HIPGLGEDCO4DKOQQSWOQ) |

---

## How It Works

Before every x402 payment, the agent calls `authorize(agent, amount)` on this contract. The contract tracks cumulative spend per agent address in **persistent on-chain storage** and rejects any payment that would exceed the $5.00 limit — enforced on-chain, not just server-side.

If the limit is exceeded, the contract panics with `"spending limit exceeded"`. The payment is rejected before it reaches the tool server. The agent cannot drain its wallet.

---

## Contract Functions

| Function | Access | Description |
|---|---|---|
| `initialize(admin, limit)` | Admin only | Deploy and set the global spending limit in stroops |
| `authorize(agent, amount)` | Admin only | Check + record spend for an agent. Panics if limit exceeded |
| `get_spent(agent)` | Public | Returns cumulative spend for an agent address |
| `get_limit()` | Public | Returns the global spending limit |
| `reset_agent(agent)` | Admin only | Reset an agent's spend counter (new session) |
| `set_limit(new_limit)` | Admin only | Update the global spending limit |
| `can_spend(agent, amount)` | Public | Returns true if agent can spend `amount` without exceeding limit |

---

## Storage

| Key | Type | Description |
|---|---|---|
| `Admin` | `Address` | Contract administrator (instance storage) |
| `Limit` | `i128` | Global spending limit in stroops (instance storage) |
| `Spent(Address)` | `i128` | Cumulative spend per agent (persistent storage) |

---

## Tests

6 tests covering all critical paths:

```bash
cd contracts/spending-policy
cargo test
```

| Test | Description |
|---|---|
| `test_authorize_within_limit` | Authorizes $0.01 — returns new total |
| `test_cumulative_spend_tracked` | Three payments — verifies running total |
| `test_reject_over_limit` | $6.00 attempt — panics with "spending limit exceeded" |
| `test_can_spend_check` | Boundary check at $4.99 spent |
| `test_reset_agent` | Admin resets agent spend to zero |
| `test_set_limit` | Admin raises limit from $5.00 to $10.00 |

---

## Build

```bash
cd contracts/spending-policy
cargo build --target wasm32-unknown-unknown --release
```

---

## Deploy (testnet)

```bash
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/spending_policy.wasm \
  --source-account YOUR_SECRET_KEY \
  --network testnet
```

---

## Initialize

```bash
stellar contract invoke \
  --id CONTRACT_ID \
  --source-account YOUR_SECRET_KEY \
  --network testnet \
  -- initialize \
  --admin YOUR_PUBLIC_KEY \
  --limit 50000000
```

> `50000000` stroops = $5.00 USDC (7 decimal places)
