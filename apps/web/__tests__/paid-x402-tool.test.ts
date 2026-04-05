import { isOnChainBudgetExceededMessage } from "@/lib/paywall/paid-x402-tool";

describe("isOnChainBudgetExceededMessage", () => {
  it("detects Soroban contract panic text", () => {
    expect(isOnChainBudgetExceededMessage("spending limit exceeded")).toBe(true);
  });

  it("detects generic limit exceed wording", () => {
    expect(isOnChainBudgetExceededMessage("Simulation failed: limit exceeded")).toBe(true);
  });

  it("does not treat unrelated errors as budget", () => {
    expect(isOnChainBudgetExceededMessage("network timeout")).toBe(false);
    expect(isOnChainBudgetExceededMessage("Missing STELLAR_PRIVATE_KEY")).toBe(false);
  });
});
