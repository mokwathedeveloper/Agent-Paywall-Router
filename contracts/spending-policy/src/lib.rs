//! # Agent Spending Policy Contract
//!
//! Enforces per-agent spending limits on Stellar testnet.
//! Used by the Agent Paywall Router to authorize x402 micropayments.
//!
//! ## How it works
//! 1. Admin initializes the contract with a spending limit (in stroops)
//! 2. Before each payment, the agent calls `authorize(agent, amount)`
//! 3. Contract checks cumulative spend — rejects if limit exceeded
//! 4. On success, records the spend on-chain
//! 5. Admin can reset a session or update limits

#![no_std]

use soroban_sdk::{
    contract, contractimpl, contracttype, symbol_short,
    Address, Env, Symbol,
};

// ─── Storage Keys ────────────────────────────────────────────────────────────

const LIMIT_KEY: Symbol = symbol_short!("LIMIT");
#[allow(dead_code)]
const ADMIN_KEY: Symbol = symbol_short!("ADMIN");

#[contracttype]
pub enum DataKey {
    Spent(Address),   // cumulative spend per agent address
    Limit,            // global spending limit in stroops
    Admin,            // contract administrator
}

// ─── Contract ────────────────────────────────────────────────────────────────

#[contract]
pub struct SpendingPolicy;

#[contractimpl]
impl SpendingPolicy {
    /// Initialize the contract with an admin and a spending limit.
    /// `limit` is in stroops (1 XLM = 10_000_000 stroops).
    /// For USDC with 7 decimals: $5.00 = 50_000_000 stroops.
    pub fn initialize(env: Env, admin: Address, limit: i128) {
        // Can only be initialized once
        if env.storage().instance().has(&DataKey::Admin) {
            panic!("already initialized");
        }
        admin.require_auth();
        env.storage().instance().set(&DataKey::Admin, &admin);
        env.storage().instance().set(&DataKey::Limit, &limit);
    }

    /// Authorize a payment for an agent.
    /// Returns the new cumulative spend if authorized.
    /// Panics if the spend would exceed the limit.
    pub fn authorize(env: Env, agent: Address, amount: i128) -> i128 {
        agent.require_auth();

        let limit: i128 = env.storage().instance().get(&DataKey::Limit).unwrap();
        let spent: i128 = env
            .storage()
            .persistent()
            .get(&DataKey::Spent(agent.clone()))
            .unwrap_or(0);

        let new_total = spent + amount;
        if new_total > limit {
            panic!("spending limit exceeded");
        }

        env.storage()
            .persistent()
            .set(&DataKey::Spent(agent.clone()), &new_total);

        // Emit event for off-chain indexing
        env.events().publish(
            (symbol_short!("payment"), agent),
            (amount, new_total, limit),
        );

        new_total
    }

    /// Get the current cumulative spend for an agent.
    pub fn get_spent(env: Env, agent: Address) -> i128 {
        env.storage()
            .persistent()
            .get(&DataKey::Spent(agent))
            .unwrap_or(0)
    }

    /// Get the global spending limit.
    pub fn get_limit(env: Env) -> i128 {
        env.storage().instance().get(&DataKey::Limit).unwrap()
    }

    /// Admin: reset an agent's spend counter (new session).
    pub fn reset_agent(env: Env, agent: Address) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();
        env.storage()
            .persistent()
            .remove(&DataKey::Spent(agent));
    }

    /// Admin: update the global spending limit.
    pub fn set_limit(env: Env, new_limit: i128) {
        let admin: Address = env.storage().instance().get(&DataKey::Admin).unwrap();
        admin.require_auth();
        env.storage().instance().set(&DataKey::Limit, &new_limit);
    }

    /// Check if an agent can spend `amount` without exceeding the limit.
    pub fn can_spend(env: Env, agent: Address, amount: i128) -> bool {
        let limit: i128 = env.storage().instance().get(&DataKey::Limit).unwrap_or(0);
        let spent: i128 = env
            .storage()
            .persistent()
            .get(&DataKey::Spent(agent))
            .unwrap_or(0);
        spent + amount <= limit
    }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;
    use soroban_sdk::testutils::Address as _;
    use soroban_sdk::Env;

    fn setup() -> (Env, SpendingPolicyClient<'static>, Address, Address) {
        let env = Env::default();
        env.mock_all_auths();
        let contract_id = env.register(SpendingPolicy, ());
        let client = SpendingPolicyClient::new(&env, &contract_id);
        let admin = Address::generate(&env);
        let agent = Address::generate(&env);
        // $5.00 USDC = 50_000_000 stroops (7 decimals)
        client.initialize(&admin, &50_000_000);
        (env, client, admin, agent)
    }

    #[test]
    fn test_authorize_within_limit() {
        let (_, client, _, agent) = setup();
        // $0.01 = 100_000 stroops
        let new_total = client.authorize(&agent, &100_000);
        assert_eq!(new_total, 100_000);
    }

    #[test]
    fn test_cumulative_spend_tracked() {
        let (_, client, _, agent) = setup();
        client.authorize(&agent, &100_000); // $0.01
        client.authorize(&agent, &200_000); // $0.02
        client.authorize(&agent, &300_000); // $0.03
        assert_eq!(client.get_spent(&agent), 600_000); // $0.06
    }

    #[test]
    #[should_panic(expected = "spending limit exceeded")]
    fn test_reject_over_limit() {
        let (_, client, _, agent) = setup();
        // Try to spend $6.00 in one shot — exceeds $5.00 limit
        client.authorize(&agent, &60_000_000);
    }

    #[test]
    fn test_can_spend_check() {
        let (_, client, _, agent) = setup();
        assert!(client.can_spend(&agent, &100_000));
        client.authorize(&agent, &49_900_000); // spend $4.99
        assert!(client.can_spend(&agent, &100_000));  // $0.01 left — OK
        assert!(!client.can_spend(&agent, &200_000)); // $0.02 — exceeds
    }

    #[test]
    fn test_reset_agent() {
        let (_, client, _admin, agent) = setup();
        client.authorize(&agent, &10_000_000); // spend $1.00
        assert_eq!(client.get_spent(&agent), 10_000_000);
        client.reset_agent(&agent);
        assert_eq!(client.get_spent(&agent), 0);
    }

    #[test]
    fn test_set_limit() {
        let (_, client, _admin, _) = setup();
        assert_eq!(client.get_limit(), 50_000_000);
        client.set_limit(&100_000_000); // raise to $10.00
        assert_eq!(client.get_limit(), 100_000_000);
    }
}
