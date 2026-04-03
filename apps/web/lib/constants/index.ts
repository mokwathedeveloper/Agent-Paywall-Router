/**
 * @file Application-wide constants.
 * No magic numbers or strings anywhere else in the codebase.
 */

// ─── Stellar / x402 ──────────────────────────────────────────────────────────

/** USDC asset on Stellar testnet (Soroban Asset Contract) */
export const USDC_TESTNET_ADDRESS = "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA";

/** USDC Soroban Contract ID on Stellar testnet */
export const USDC_CONTRACT_ADDRESS = "CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA";

/** x402 protocol version */
export const X402_VERSION = 2;

/** Default facilitator URL */
export const DEFAULT_FACILITATOR_URL = "https://x402.org/facilitator";

/** Stellar network identifier */
export const STELLAR_NETWORK = "stellar:testnet";

// ─── Tool Pricing (USD) ──────────────────────────────────────────────────────

export const TOOL_PRICES = {
  search: 0.01,
  summarize: 0.02,
  analyze: 0.03,
} as const;

/**
 * Tool prices in USDC token units (7 decimal places).
 * $0.01 = 100_000 stroops, $0.02 = 200_000, $0.03 = 300_000
 */
export const TOOL_PRICES_TOKEN_UNITS = {
  search: "100000",
  summarize: "200000",
  analyze: "300000",
} as const;

// ─── Session Defaults ────────────────────────────────────────────────────────

/** Default spending limit per session in USD */
export const DEFAULT_SPENDING_LIMIT = 5.0;

/** Session TTL in milliseconds (24 hours) */
export const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

// ─── Simulation ──────────────────────────────────────────────────────────────

/** Soroban spending policy contract ID on Stellar testnet */
export const SPENDING_POLICY_CONTRACT_ID = "CABLFWICBLK5IX3EWQSVQGS6WIQ2V7YLNLA6HIPGLGEDCO4DKOQQSWOQ";

/** Step animation delay in milliseconds */
export const STEP_ANIMATION_DELAY_MS = 400;
