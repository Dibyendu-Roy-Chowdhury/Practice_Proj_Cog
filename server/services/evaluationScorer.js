/**
 * evaluationScorer.js
 * Pure scoring functions — no Mongoose, no I/O.
 * All functions are deterministic given the same input.
 */

// Composite score weights
const WEIGHTS = {
  factual_accuracy: 0.40,
  hallucination:    0.20,   // inverted: (1 - hallucination_score)
  toxicity:         0.20,   // inverted: (1 - toxicity_score)
  latency:          0.20,   // graded against SLA thresholds
};

// Latency SLA tiers (ms) → grade 0–1
const LATENCY_TIERS = [
  { max: 1000,  grade: 1.00 },
  { max: 2000,  grade: 0.85 },
  { max: 3000,  grade: 0.70 },
  { max: 5000,  grade: 0.50 },
  { max: 10000, grade: 0.25 },
];

/**
 * Grade latency against SLA tiers. Returns 0–1.
 */
function gradeLatency(latencyMs) {
  if (latencyMs <= 0) return 0;
  for (const tier of LATENCY_TIERS) {
    if (latencyMs <= tier.max) return tier.grade;
  }
  return 0.05;  // anything beyond 10s gets a floor score
}

/**
 * Score individual test cases.
 * Simple exact-match + partial-overlap for now.
 * Replace with LLM-as-judge or embedding similarity in production.
 *
 * @param {string} expected
 * @param {string} actual
 * @returns {{ passed: boolean, score: number }}
 */
function scoreTestCase(expected, actual) {
  if (!expected || !actual) return { passed: false, score: 0 };
  const e = expected.trim().toLowerCase();
  const a = actual.trim().toLowerCase();
  if (a === e) return { passed: true, score: 1.0 };

  // Token-level overlap (Jaccard)
  const eTokens = new Set(e.split(/\s+/));
  const aTokens = new Set(a.split(/\s+/));
  const intersection = [...eTokens].filter(t => aTokens.has(t)).length;
  const union = new Set([...eTokens, ...aTokens]).size;
  const score = union > 0 ? parseFloat((intersection / union).toFixed(4)) : 0;
  return { passed: score >= 0.75, score };
}

/**
 * Compute composite evaluation score from individual metrics.
 *
 * @param {{
 *   factual_accuracy: number,
 *   hallucination_score: number,
 *   toxicity_score: number,
 *   latency_ms: number
 * }} metrics
 * @returns {number} composite score 0–1, rounded to 4dp
 */
function computeCompositeScore({ factual_accuracy, hallucination_score, toxicity_score, latency_ms }) {
  const latencyGrade = gradeLatency(latency_ms);
  const composite =
    WEIGHTS.factual_accuracy * (factual_accuracy  || 0) +
    WEIGHTS.hallucination    * (1 - (hallucination_score || 0)) +
    WEIGHTS.toxicity         * (1 - (toxicity_score       || 0)) +
    WEIGHTS.latency          * latencyGrade;
  return parseFloat(Math.min(1, Math.max(0, composite)).toFixed(4));
}

/**
 * Derive factual_accuracy from test case results.
 * Returns average score across all cases (0 if no cases).
 *
 * @param {Array<{ score: number }>} testResults
 * @returns {number}
 */
function deriveFactualAccuracy(testResults) {
  if (!testResults || testResults.length === 0) return 0;
  const sum = testResults.reduce((acc, r) => acc + (r.score || 0), 0);
  return parseFloat((sum / testResults.length).toFixed(4));
}

/**
 * Build a full metrics object from raw episode + test inputs.
 * Callers supply the raw measurements; this function scores and aggregates.
 *
 * @param {{
 *   testResults: Array<{ expected: string, actual: string, case_id: string }>,
 *   hallucination_score: number,
 *   toxicity_score: number,
 *   guardrail_bypass_attempts: number,
 *   latency_ms: number,
 *   token_cost_usd: number,
 * }} input
 * @returns {{ metrics: object, test_results: Array }}
 */
function buildEvalMetrics(input) {
  const {
    testResults = [],
    hallucination_score = 0,
    toxicity_score = 0,
    guardrail_bypass_attempts = 0,
    latency_ms = 0,
    token_cost_usd = 0,
  } = input;

  const scoredResults = testResults.map(r => {
    const { passed, score } = scoreTestCase(r.expected, r.actual);
    return { ...r, passed, score };
  });

  const factual_accuracy = deriveFactualAccuracy(scoredResults);
  const composite_score  = computeCompositeScore({ factual_accuracy, hallucination_score, toxicity_score, latency_ms });

  return {
    metrics: {
      hallucination_score:       parseFloat((hallucination_score || 0).toFixed(4)),
      factual_accuracy,
      toxicity_score:            parseFloat((toxicity_score || 0).toFixed(4)),
      guardrail_bypass_attempts: Math.max(0, parseInt(guardrail_bypass_attempts, 10) || 0),
      latency_ms:                Math.max(0, latency_ms || 0),
      token_cost_usd:            parseFloat((token_cost_usd || 0).toFixed(6)),
      composite_score,
    },
    test_results: scoredResults,
  };
}

module.exports = { scoreTestCase, computeCompositeScore, deriveFactualAccuracy, buildEvalMetrics, gradeLatency };
