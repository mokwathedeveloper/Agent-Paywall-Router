# Soroban Contracts

## spending-policy

An on-chain spending policy contract that enforces per-agent budget limits for x402 micropayments.

**Deployed on Stellar Testnet:**
- Contract ID: `CABLFWICBLK5IX3EWQSVQGS6WIQ2V7YLNLA6HIPGLGEDCO4DKOQQSWOQ`
- [View on Stellar Expert](https://stellar.expert/explorer/testnet/contract/CABLFWICBLK5IX3EWQSVQGS6WIQ2V7YLNLA6HIPGLGEDCO4DKOQQSWOQ)

### What it does

Before every x402 payment, the agent calls `authorize(agent, amount)` on this contract.
The contract tracks cumulative spend per agent address and rejects any payment that would exceed the $5.00 limit — enforced **on-chain**, not just server-side.

### Run tests

```bash
cd spending-policy
cargo test
```

### Build

```bash
cargo build --target wasm32-unknown-unknown --release
```

### Deploy

```bash
stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/spending_policy.wasm \
  --source-account YOUR_SECRET_KEY \
  --network testnet
```

### Initialize

```bash
stellar contract invoke \
  --id CONTRACT_ID \
  --source-account YOUR_SECRET_KEY \
  --network testnet \
  -- initialize \
  --admin YOUR_PUBLIC_KEY \
  --limit 50000000
```
