/**
 * Security Service
 * 
 * Implements defenses against prompt injection and malicious agent behavior.
 * This directly addresses the "Security and Controls" hackathon category.
 */

const MALICIOUS_PATTERNS = [
  /ignore previous instructions/i,
  /system prompt/i,
  /you are now a/i,
  /\bbypass\b/i,
  /reveal your/i,
  /\bhack\b/i,
  /private key/i,
  /stellar_private_key/i,
  /STELLAR_PRIVATE_KEY/i,
  /x402[-_\s]?receipt/i,
  /payment[-_\s]?signature/i,
  /payment[-_\s]?required/i,
  /PAYMENT[-_\s]?REQUIRED/i,
  /PAYMENT[-_\s]?RESPONSE/i,
  /authorize\s*\(/i,
  /spendingpolicy/i,
];

export interface SecurityScanResult {
  safe: boolean;
  reason?: string;
}

export function scanPrompt(prompt: string): SecurityScanResult {
  for (const pattern of MALICIOUS_PATTERNS) {
    if (pattern.test(prompt)) {
      return {
        safe: false,
        reason: `Potential prompt injection detected: matches pattern ${pattern.source}`,
      };
    }
  }

  // Check for excessive length or complexity
  if (prompt.length > 2000) {
    return {
      safe: false,
      reason: "Prompt exceeds safety length limits.",
    };
  }

  return { safe: true };
}

/**
 * Fail-closed input validator.
 * Throws an error with name `SecurityViolation` so callers can consistently map to HTTP 403.
 */
export function requireSafeInput(input: string): void {
  const res = scanPrompt(input);
  if (!res.safe) {
    const err = new Error(res.reason ?? "Security violation");
    err.name = "SecurityViolation";
    throw err;
  }
}

export function isSecurityViolationError(err: unknown): boolean {
  return (err as { name?: string })?.name === "SecurityViolation";
}
