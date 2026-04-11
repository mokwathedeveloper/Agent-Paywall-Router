#!/usr/bin/env node
/**
 * Agent Paywall Router — End-to-End Demo Script
 *
 * Runs a real agent task that pays for tools using x402 on Stellar testnet.
 *
 * Usage:
 *   node scripts/demo.js
 *   node scripts/demo.js "Search for Stellar DeFi and summarize"
 *
 * Requires the dev server to be running:
 *   cd apps/web && npm run dev
 *
 * Requires apps/web/.env.local to have:
 *   OPENAI_API_KEY, STELLAR_PRIVATE_KEY, STELLAR_RECEIVER_ADDRESS, NEXT_PUBLIC_BASE_URL
 */

// ─── Load .env.local ─────────────────────────────────────────────────────────
const path = require("path");
const fs = require("fs");

const envPath = path.join(__dirname, "../apps/web/.env.local");
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, "utf8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (key && !process.env[key]) process.env[key] = val;
  }
}

// ─── Config ──────────────────────────────────────────────────────────────────

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
const DEFAULT_TASK = "Search for Stellar blockchain micropayments and summarize the key points";
const task = process.argv[2] || DEFAULT_TASK;

// ─── Formatting helpers ───────────────────────────────────────────────────────

const RESET  = "\x1b[0m";
const BOLD   = "\x1b[1m";
const DIM    = "\x1b[2m";
const GREEN  = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RED    = "\x1b[31m";
const CYAN   = "\x1b[36m";
const BLUE   = "\x1b[34m";
const MAGENTA = "\x1b[35m";

function line(char = "─", len = 72) {
  return DIM + char.repeat(len) + RESET;
}

function statusColor(status) {
  switch (status) {
    case "success":          return GREEN;
    case "payment_required": return YELLOW;
    case "paying":           return BLUE;
    case "failed":           return RED;
    default:                 return DIM;
  }
}

function statusIcon(status) {
  switch (status) {
    case "success":          return "✓";
    case "payment_required": return "⟳";
    case "paying":           return "⟳";
    case "failed":           return "✗";
    default:                 return "·";
  }
}

function printStep(step) {
  const color = statusColor(step.status);
  const icon  = statusIcon(step.status);
  const cost  = step.cost > 0 ? `  ${CYAN}$${step.cost.toFixed(2)}${RESET}` : "";
  const ms    = `  ${DIM}${step.latency}ms${RESET}`;
  console.log(
    `  ${color}${icon}${RESET}  ${BOLD}${step.action}${RESET}${cost}${ms}`
  );
  if (step.detail) {
    console.log(`     ${DIM}${step.detail}${RESET}`);
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n" + line("═"));
  console.log(`${BOLD}  Agent Paywall Router — Live Demo${RESET}`);
  console.log(`  Stellar Hacks: Agents 2026`);
  console.log(line("═"));

  // ── Pre-flight checks ──────────────────────────────────────────────────────
  const required = ["OPENAI_API_KEY", "STELLAR_PRIVATE_KEY", "STELLAR_RECEIVER_ADDRESS", "NEXT_PUBLIC_BASE_URL"];
  const missing = required.filter(k => !process.env[k]);
  if (missing.length > 0) {
    console.error(`\n${RED}${BOLD}✗ Missing environment variables:${RESET}`);
    missing.forEach(k => console.error(`  ${RED}${k}${RESET}`));
    console.error(`\n  Add them to ${CYAN}apps/web/.env.local${RESET}\n`);
    process.exit(1);
  }

  // ── Check server is running ────────────────────────────────────────────────
  console.log(`\n${DIM}  Checking server at ${BASE_URL}...${RESET}`);
  try {
    const health = await fetch(`${BASE_URL}/api/health`, { signal: AbortSignal.timeout(5000) });
    if (!health.ok) throw new Error(`HTTP ${health.status}`);
    const hBody = await health.json();
    console.log(`  ${GREEN}✓${RESET} Server healthy — ${DIM}${hBody.database} · ${hBody.network}${RESET}`);
  } catch (err) {
    console.error(`\n${RED}${BOLD}✗ Server not reachable at ${BASE_URL}${RESET}`);
    console.error(`  ${DIM}Start it with: cd apps/web && npm run dev${RESET}\n`);
    process.exit(1);
  }

  // ── Task ───────────────────────────────────────────────────────────────────
  console.log(`\n${line()}`);
  console.log(`${BOLD}  Task${RESET}`);
  console.log(`  ${CYAN}"${task}"${RESET}`);
  console.log(line());

  console.log(`\n${DIM}  Calling ${BASE_URL}/api/demo/run ...${RESET}\n`);

  const startMs = Date.now();
  let res;
  try {
    res = await fetch(
      `${BASE_URL}/api/demo/run?task=${encodeURIComponent(task)}`,
      { signal: AbortSignal.timeout(90_000) }
    );
  } catch (err) {
    console.error(`\n${RED}${BOLD}✗ Request failed: ${String(err)}${RESET}\n`);
    process.exit(1);
  }

  const body = await res.json();
  const elapsed = Date.now() - startMs;

  // ── Execution steps ────────────────────────────────────────────────────────
  if (body.steps && body.steps.length > 0) {
    console.log(`${BOLD}  Execution Trace${RESET}`);
    console.log(line());
    body.steps.forEach(printStep);
    console.log(line());
  }

  // ── Payment proof ──────────────────────────────────────────────────────────
  console.log(`\n${BOLD}  Payment Proof${RESET}`);
  console.log(line());

  const p = body.payment;
  if (p?.proven) {
    console.log(`  ${GREEN}${BOLD}✓ Real Stellar transaction confirmed${RESET}`);
    console.log(`\n  ${BOLD}Tool used:${RESET}       ${CYAN}${p.tool}${RESET}`);
    console.log(`  ${BOLD}Total cost:${RESET}      ${GREEN}$${p.totalCostUsd.toFixed(2)} USDC${RESET}`);
    console.log(`\n  ${BOLD}Payment tx:${RESET}      ${DIM}${p.txHash}${RESET}`);
    if (p.policyTxHash) {
      console.log(`  ${BOLD}Policy tx:${RESET}       ${DIM}${p.policyTxHash}${RESET}`);
    }
    if (p.policyAgent) {
      console.log(`  ${BOLD}Agent address:${RESET}   ${DIM}${p.policyAgent}${RESET}`);
    }
    if (p.explorerLinks?.stellarExpert) {
      console.log(`\n  ${BOLD}Verify on-chain:${RESET}`);
      console.log(`  ${BLUE}${p.explorerLinks.stellarExpert}${RESET}`);
      if (p.explorerLinks.horizon) {
        console.log(`  ${BLUE}${p.explorerLinks.horizon}${RESET}`);
      }
      if (p.explorerLinks.sorobanPolicyTx) {
        console.log(`  ${BLUE}${p.explorerLinks.sorobanPolicyTx}${RESET}`);
      }
    }
  } else if (body.agentError) {
    console.log(`  ${RED}${BOLD}✗ Agent error: ${body.agentError}${RESET}`);
    if (body.agentDetail) {
      console.log(`  ${DIM}${body.agentDetail}${RESET}`);
    }
  } else {
    console.log(`  ${YELLOW}⚠ No payment transaction recorded${RESET}`);
    console.log(`  ${DIM}The agent may not have called a paid tool.${RESET}`);
  }

  // ── Budget summary ─────────────────────────────────────────────────────────
  if (body.execution?.budget) {
    const b = body.execution.budget;
    console.log(`\n${line()}`);
    console.log(`${BOLD}  Session Budget${RESET}`);
    console.log(line());
    console.log(`  Spent:      ${GREEN}$${b.used.toFixed(2)}${RESET} of $${b.limit.toFixed(2)}`);
    console.log(`  Remaining:  $${b.remaining.toFixed(2)}`);
    console.log(`  Txns:       ${b.transactionCount}`);
  }

  // ── Result ─────────────────────────────────────────────────────────────────
  if (body.result) {
    console.log(`\n${line()}`);
    console.log(`${BOLD}  Result${RESET}`);
    console.log(line());
    const resultStr = typeof body.result === "string"
      ? body.result
      : JSON.stringify(body.result, null, 2);
    // Truncate very long results for readability
    const display = resultStr.length > 1200
      ? resultStr.slice(0, 1200) + `\n  ${DIM}... (truncated)${RESET}`
      : resultStr;
    console.log(`  ${display}`);
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log(`\n${line("═")}`);
  const statusLabel = body.ok
    ? `${GREEN}${BOLD}SUCCESS${RESET}`
    : `${RED}${BOLD}FAILED${RESET}`;
  console.log(`  ${statusLabel}  ${DIM}${elapsed}ms total${RESET}`);
  console.log(line("═") + "\n");

  process.exit(body.ok ? 0 : 1);
}

main().catch(err => {
  console.error(`\n${RED}Unexpected error: ${String(err)}${RESET}\n`);
  process.exit(1);
});
