const SelfHealingRule = require('../models/SelfHealingRule');

module.exports = async function seedSelfHealingRules() {
  await SelfHealingRule.deleteMany({});
  await SelfHealingRule.insertMany([
    { rule_id: 'sh-001', name: 'Insurance Underwriting Agent Loop Guard',    condition: 'Insurance Underwriting Agent ReAct iterations > 4',          action: 'Auto-Terminate Agent',           enabled: true,  severity: 'P1', triggered: 3 },
    { rule_id: 'sh-002', name: 'Concierge Agent Memory Kill',                condition: 'Concierge Agent memory usage > 85%',                         action: 'Restart Agent Instance',         enabled: true,  severity: 'P1', triggered: 1 },
    { rule_id: 'sh-003', name: 'Public Research Agent Rate Backoff',         condition: 'Public Research Agent API 429 errors > 5/min',               action: 'Switch to Fallback Model',       enabled: true,  severity: 'P2', triggered: 7 },
    { rule_id: 'sh-004', name: 'Insurance Underwriting Agent Cost Breaker',  condition: 'Insurance Underwriting Agent hourly spend > $50',            action: 'Pause Agent & Alert Admin',      enabled: false, severity: 'P2', triggered: 0 },
    { rule_id: 'sh-005', name: 'Workforce Planning and Recruitment Pipeline Timeout',  condition: 'Workforce Planning and Recruitment document extraction > 8000ms',      action: 'Retry with Exponential Backoff', enabled: true,  severity: 'P1', triggered: 0 },
    { rule_id: 'sh-006', name: 'Public Research Agent Latency Guard',        condition: 'Public Research Agent P95 latency > 5000ms',                 action: 'Route to Cache / Scale Down',    enabled: false, severity: 'P3', triggered: 2 },
  ]);
};
