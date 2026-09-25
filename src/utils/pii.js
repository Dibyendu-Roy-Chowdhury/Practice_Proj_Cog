/**
 * PII masking utilities for log display.
 *
 * Replaces common PII patterns with [REDACTED] before rendering in the UI.
 * This is a display-layer safeguard — it does NOT replace server-side redaction.
 *
 * TODO: replace with a policy-driven redaction service response once the
 *       backend PII detection pipeline is integrated.
 */

// Patterns to detect and redact
const PII_PATTERNS = [
  // Email addresses
  { pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,      replacement: '[EMAIL REDACTED]'  },
  // Bearer / API tokens (common formats)
  { pattern: /\b(Bearer\s+)[A-Za-z0-9\-._~+/]+=*/g,                          replacement: 'Bearer [TOKEN REDACTED]' },
  { pattern: /\b(sk-|ak-|pk-)[A-Za-z0-9]{16,}/g,                             replacement: '[API KEY REDACTED]' },
  // AWS access key IDs
  { pattern: /\bAKIA[A-Z0-9]{16}\b/g,                                         replacement: '[AWS KEY REDACTED]' },
  // Credit card numbers (basic 4-4-4-4 pattern)
  { pattern: /\b\d{4}[\s-]\d{4}[\s-]\d{4}[\s-]\d{4}\b/g,                    replacement: '[CARD REDACTED]'   },
  // Phone numbers (international and US formats)
  { pattern: /\b(\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]\d{3}[-.\s]\d{4}\b/g,        replacement: '[PHONE REDACTED]'  },
];

/**
 * maskPii(str) — apply all PII patterns to a string and return the masked result.
 * Returns the original string unchanged if it is null/undefined/non-string.
 */
export function maskPii(str) {
  if (typeof str !== 'string') return str;
  let result = str;
  for (const { pattern, replacement } of PII_PATTERNS) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

/**
 * hasPii(str) — returns true if the string contains any detectable PII pattern.
 * Useful for showing a "PII Detected" badge before masking.
 */
export function hasPii(str) {
  if (typeof str !== 'string') return false;
  return PII_PATTERNS.some(({ pattern }) => {
    pattern.lastIndex = 0; // reset global regex state
    return pattern.test(str);
  });
}
