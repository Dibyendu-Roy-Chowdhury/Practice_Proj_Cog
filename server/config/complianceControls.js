/**
 * complianceControls.js
 * Static mapping: event_type → control IDs across ISO/IEC 42001, NIST AI RMF, SOC2 Type II.
 * Extend this map as new event types are introduced.
 */

const CONTROL_MAP = {
  // ── Guardrail events ──────────────────────────────────────────────────────
  'guardrail.trigger': {
    ISO42001:    ['A.6.1.2', 'A.6.2.3'],
    NIST_AI_RMF: ['GOVERN-1.1', 'MANAGE-2.2'],
    SOC2:        ['CC6.1', 'CC7.2'],
    description: 'A trust interceptor or safety guardrail was triggered by an agent action',
  },
  'guardrail.bypass_attempt': {
    ISO42001:    ['A.6.2.3', 'A.7.3.1'],
    NIST_AI_RMF: ['MANAGE-4.1', 'MANAGE-4.2'],
    SOC2:        ['CC6.6', 'CC6.8'],
    description: 'An agent attempted to bypass or circumvent a configured guardrail',
  },
  'guardrail.data_exfiltration_blocked': {
    ISO42001:    ['A.7.3.1', 'A.7.3.2'],
    NIST_AI_RMF: ['MANAGE-4.2'],
    SOC2:        ['CC6.3', 'CC6.7'],
    description: 'A data exfiltration gate blocked PII or secrets from leaving the system',
  },

  // ── Evaluation events ─────────────────────────────────────────────────────
  'eval.completed': {
    ISO42001:    ['A.9.1.1', 'A.9.2.1'],
    NIST_AI_RMF: ['MEASURE-1.1', 'MEASURE-2.1'],
    SOC2:        ['CC4.1', 'CC7.1'],
    description: 'An agent evaluation run completed with scored metrics',
  },
  'eval.hallucination_flag': {
    ISO42001:    ['A.9.3.1'],
    NIST_AI_RMF: ['MEASURE-2.5'],
    SOC2:        ['CC7.1'],
    description: 'Hallucination score exceeded configured threshold',
  },
  'eval.toxicity_flag': {
    ISO42001:    ['A.9.3.2'],
    NIST_AI_RMF: ['MEASURE-2.6'],
    SOC2:        ['CC9.1'],
    description: 'Toxicity score exceeded configured threshold',
  },
  'eval.guardrail_bypass_in_eval': {
    ISO42001:    ['A.6.2.3', 'A.9.3.1'],
    NIST_AI_RMF: ['MANAGE-4.1', 'MEASURE-2.5'],
    SOC2:        ['CC6.6', 'CC7.1'],
    description: 'Guardrail bypass attempts were recorded during an evaluation run',
  },

  // ── HITL events ────────────────────────────────────────────────────────────
  'hitl.decision': {
    ISO42001:    ['A.5.4.1', 'A.5.4.2'],
    NIST_AI_RMF: ['GOVERN-5.2', 'MANAGE-1.3'],
    SOC2:        ['CC2.2', 'CC2.3'],
    description: 'A human-in-the-loop decision was recorded (approved/rejected/delegated)',
  },
  'hitl.timeout': {
    ISO42001:    ['A.5.4.2'],
    NIST_AI_RMF: ['GOVERN-5.2'],
    SOC2:        ['CC2.3'],
    description: 'A HITL decision request timed out without human action',
  },
  'hitl.escalated': {
    ISO42001:    ['A.5.4.1', 'A.5.5.1'],
    NIST_AI_RMF: ['GOVERN-5.1', 'GOVERN-5.2'],
    SOC2:        ['CC2.2'],
    description: 'A HITL request was escalated to a higher tier',
  },

  // ── Agent lifecycle events ────────────────────────────────────────────────
  'agent.rollback': {
    ISO42001:    ['A.8.2.1', 'A.8.3.1'],
    NIST_AI_RMF: ['MANAGE-3.1', 'MANAGE-3.2'],
    SOC2:        ['CC8.1'],
    description: 'An agent version was rolled back to a prior state',
  },
  'agent.status_change': {
    ISO42001:    ['A.8.1.1'],
    NIST_AI_RMF: ['MANAGE-1.1'],
    SOC2:        ['CC6.1'],
    description: 'An agent was activated, deactivated, or quarantined',
  },

  // ── Circuit breaker / governance events ───────────────────────────────────
  'circuit_breaker.triggered': {
    ISO42001:    ['A.6.2.1', 'A.6.2.2'],
    NIST_AI_RMF: ['MANAGE-2.1', 'MANAGE-2.2'],
    SOC2:        ['CC7.3', 'CC7.4'],
    description: 'A circuit breaker tripped due to cost, loop, or latency threshold breach',
  },

  // ── Audit trail events ────────────────────────────────────────────────────
  'audit.trace': {
    ISO42001:    ['A.10.1.1', 'A.10.1.2'],
    NIST_AI_RMF: ['MAP-1.1', 'MEASURE-1.1'],
    SOC2:        ['CC4.1', 'CC4.2'],
    description: 'An agent execution trace was recorded in the immutable audit trail',
  },
};

// Severity override per event type (default: INFO)
const EVENT_SEVERITY = {
  'guardrail.bypass_attempt':           'CRITICAL',
  'guardrail.data_exfiltration_blocked': 'HIGH',
  'guardrail.trigger':                  'MEDIUM',
  'eval.hallucination_flag':            'HIGH',
  'eval.toxicity_flag':                 'HIGH',
  'eval.guardrail_bypass_in_eval':      'CRITICAL',
  'eval.completed':                     'INFO',
  'hitl.timeout':                       'MEDIUM',
  'hitl.escalated':                     'MEDIUM',
  'hitl.decision':                      'INFO',
  'agent.rollback':                     'MEDIUM',
  'agent.status_change':                'LOW',
  'circuit_breaker.triggered':          'HIGH',
  'audit.trace':                        'INFO',
};

/**
 * Look up control IDs for a given event type.
 * Returns null if event type is not mapped.
 */
function getControls(eventType) {
  return CONTROL_MAP[eventType] || null;
}

/**
 * Get severity for an event type (defaults to 'INFO').
 */
function getEventSeverity(eventType) {
  return EVENT_SEVERITY[eventType] || 'INFO';
}

/**
 * List all frameworks present in the map.
 */
const FRAMEWORKS = ['ISO42001', 'NIST_AI_RMF', 'SOC2'];

module.exports = { CONTROL_MAP, getControls, getEventSeverity, FRAMEWORKS };
