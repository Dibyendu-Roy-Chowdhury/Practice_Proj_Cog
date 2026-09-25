const ComplianceEvent = require('../models/ComplianceEvent');

// Canonical agents:
// arcadia-health: agent-101 Insurance Underwriting Agent, agent-102 Workforce Planning and Recruitment
// zenith-capital: agent-201 Trade Compliance Monitor, agent-202 Market Surveillance Agent,
//                 agent-203 Capital Adequacy Validator, agent-204 AML Detection Engine,
//                 agent-205 Regulatory Reporting Agent, agent-206 Risk Exposure Calculator

module.exports = async function seedCompliance() {
  await ComplianceEvent.deleteMany({});
  const now = Date.now();
  const fw = ['ISO42001','NIST_AI_RMF','SOC2'];

  await ComplianceEvent.insertMany([
    // ── arcadia-health ────────────────────────────────────────────────────────
    {
      ce_id: 'CE-SEED-0001', tenant_id: 'arcadia-health', event_type: 'guardrail.trigger',
      source_model: 'TrustInterceptor', source_id: 'TI-AHA-001',
      agent_id: 'agent-101', agent_name: 'Insurance Underwriting Agent',
      timestamp: new Date(now - 8*60000), severity: 'MEDIUM',
      control_ids: { ISO42001: ['A.6.1.2','A.6.2.3'], NIST_AI_RMF: ['GOVERN-1.1','MANAGE-2.2'], SOC2: ['CC6.1','CC7.2'] },
      frameworks: fw,
      evidence: { ti_id: 'TI-AHA-001', name: 'PII Underwriting Guard', events: 9 },
    },
    {
      ce_id: 'CE-SEED-0002', tenant_id: 'arcadia-health', event_type: 'guardrail.bypass_attempt',
      source_model: 'TrustInterceptor', source_id: 'TI-AHA-002',
      agent_id: 'agent-101', agent_name: 'Insurance Underwriting Agent',
      timestamp: new Date(now - 22*60000), severity: 'CRITICAL',
      control_ids: { ISO42001: ['A.6.2.3','A.7.3.1'], NIST_AI_RMF: ['MANAGE-4.1','MANAGE-4.2'], SOC2: ['CC6.6','CC6.8'] },
      frameworks: fw,
      evidence: { ti_id: 'TI-AHA-002', name: 'Policy Data Exfiltration Gate', events: 2 },
    },
    {
      ce_id: 'CE-SEED-0003', tenant_id: 'arcadia-health', event_type: 'hitl.decision',
      source_model: 'HitlHistory', source_id: 'hitl-h-001',
      agent_id: 'agent-101', agent_name: 'Insurance Underwriting Agent',
      timestamp: new Date(now - 45*60000), severity: 'INFO',
      control_ids: { ISO42001: ['A.5.4.1','A.5.4.2'], NIST_AI_RMF: ['GOVERN-5.2','MANAGE-1.3'], SOC2: ['CC2.2','CC2.3'] },
      frameworks: fw,
      evidence: { decision: 'approved', tool: 'issue_policy_decision', by: 'Sarah K. (L3)' },
    },
    {
      ce_id: 'CE-SEED-0004', tenant_id: 'arcadia-health', event_type: 'hitl.timeout',
      source_model: 'HitlHistory', source_id: 'hitl-h-002',
      agent_id: 'agent-102', agent_name: 'Workforce Planning and Recruitment',
      timestamp: new Date(now - 112*60000), severity: 'MEDIUM',
      control_ids: { ISO42001: ['A.5.4.2'], NIST_AI_RMF: ['GOVERN-5.2'], SOC2: ['CC2.3'] },
      frameworks: fw,
      evidence: { waitMs: 300000, tier: 2 },
    },
    {
      ce_id: 'CE-SEED-0005', tenant_id: 'arcadia-health', event_type: 'agent.rollback',
      source_model: 'Agent', source_id: 'agent-101',
      agent_id: 'agent-101', agent_name: 'Insurance Underwriting Agent',
      timestamp: new Date(now - 3*24*60*60*1000), severity: 'MEDIUM',
      control_ids: { ISO42001: ['A.8.2.1','A.8.3.1'], NIST_AI_RMF: ['MANAGE-3.1','MANAGE-3.2'], SOC2: ['CC8.1'] },
      frameworks: fw,
      evidence: { from_version: 'v2.0', to_version: 'v1.0', reason: 'Actuarial risk score hallucination regression in v2.0 pre-release' },
    },
    {
      ce_id: 'CE-SEED-0006', tenant_id: 'arcadia-health', event_type: 'circuit_breaker.triggered',
      source_model: 'CircuitBreaker', source_id: 'CB-AHA-001',
      agent_id: 'agent-101', agent_name: 'Insurance Underwriting Agent',
      timestamp: new Date(now - 6*60*60*1000), severity: 'HIGH',
      control_ids: { ISO42001: ['A.6.2.1','A.6.2.2'], NIST_AI_RMF: ['MANAGE-2.1','MANAGE-2.2'], SOC2: ['CC7.3','CC7.4'] },
      frameworks: fw,
      evidence: { cb_id: 'CB-AHA-001', type: 'Hallucination', threshold: 0.20, current: 0.26 },
    },
    {
      ce_id: 'CE-SEED-0007', tenant_id: 'arcadia-health', event_type: 'eval.hallucination_flag',
      source_model: 'AgentEvaluation', source_id: 'eval-0002',
      agent_id: 'agent-101', agent_name: 'Insurance Underwriting Agent',
      timestamp: new Date(now - 72*60*60*1000), severity: 'HIGH',
      control_ids: { ISO42001: ['A.9.3.1'], NIST_AI_RMF: ['MEASURE-2.5'], SOC2: ['CC7.1'] },
      frameworks: fw,
      evidence: { eval_id: 'eval-0002', hallucination_score: 0.26, threshold: 0.20 },
    },
    {
      ce_id: 'CE-SEED-0008', tenant_id: 'arcadia-health', event_type: 'eval.guardrail_bypass_in_eval',
      source_model: 'AgentEvaluation', source_id: 'eval-0002',
      agent_id: 'agent-101', agent_name: 'Insurance Underwriting Agent',
      timestamp: new Date(now - 72*60*60*1000 + 100), severity: 'CRITICAL',
      control_ids: { ISO42001: ['A.6.2.3','A.9.3.1'], NIST_AI_RMF: ['MANAGE-4.1','MEASURE-2.5'], SOC2: ['CC6.6','CC7.1'] },
      frameworks: fw,
      evidence: { eval_id: 'eval-0002', guardrail_bypass_attempts: 1 },
    },
    {
      ce_id: 'CE-SEED-0009', tenant_id: 'arcadia-health', event_type: 'guardrail.data_exfiltration_blocked',
      source_model: 'TrustInterceptor', source_id: 'TI-AHA-003',
      agent_id: 'agent-102', agent_name: 'Workforce Planning and Recruitment',
      timestamp: new Date(now - 30*60000), severity: 'HIGH',
      control_ids: { ISO42001: ['A.7.3.1','A.7.3.2'], NIST_AI_RMF: ['MANAGE-4.2'], SOC2: ['CC6.3','CC6.7'] },
      frameworks: fw,
      evidence: { ti_id: 'TI-AHA-003', name: 'Employee PII Guard', blocked_field: 'employee_pii' },
    },
    {
      ce_id: 'CE-SEED-0010', tenant_id: 'arcadia-health', event_type: 'eval.completed',
      source_model: 'AgentEvaluation', source_id: 'eval-0005',
      agent_id: 'agent-102', agent_name: 'Workforce Planning and Recruitment',
      timestamp: new Date(now - 18*60*60*1000), severity: 'INFO',
      control_ids: { ISO42001: ['A.9.1.1','A.9.2.1'], NIST_AI_RMF: ['MEASURE-1.1','MEASURE-2.1'], SOC2: ['CC4.1','CC7.1'] },
      frameworks: fw,
      evidence: { eval_id: 'eval-0005', composite_score: 0.8840 },
    },

    // ── zenith-capital ────────────────────────────────────────────────────────
    {
      ce_id: 'CE-SEED-0011', tenant_id: 'zenith-capital', event_type: 'guardrail.trigger',
      source_model: 'TrustInterceptor', source_id: 'TI-ZCA-001',
      agent_id: 'agent-203', agent_name: 'Capital Adequacy Validator',
      timestamp: new Date(now - 10*60000), severity: 'MEDIUM',
      control_ids: { ISO42001: ['A.6.1.2','A.6.2.3'], NIST_AI_RMF: ['GOVERN-1.1','MANAGE-2.2'], SOC2: ['CC6.1','CC7.2'] },
      frameworks: fw,
      evidence: { ti_id: 'TI-ZCA-001', name: 'Regulatory Threshold Guard', events: 12 },
    },
    {
      ce_id: 'CE-SEED-0012', tenant_id: 'zenith-capital', event_type: 'eval.hallucination_flag',
      source_model: 'AgentEvaluation', source_id: 'eval-0006',
      agent_id: 'agent-203', agent_name: 'Capital Adequacy Validator',
      timestamp: new Date(now - 36*60*60*1000), severity: 'HIGH',
      control_ids: { ISO42001: ['A.9.3.1'], NIST_AI_RMF: ['MEASURE-2.5'], SOC2: ['CC7.1'] },
      frameworks: fw,
      evidence: { eval_id: 'eval-0006', hallucination_score: 0.28, threshold: 0.15 },
    },
    {
      ce_id: 'CE-SEED-0013', tenant_id: 'zenith-capital', event_type: 'circuit_breaker.triggered',
      source_model: 'CircuitBreaker', source_id: 'CB-ZCA-002',
      agent_id: 'agent-202', agent_name: 'Market Surveillance Agent',
      timestamp: new Date(now - 4*60*60*1000), severity: 'HIGH',
      control_ids: { ISO42001: ['A.6.2.1','A.6.2.2'], NIST_AI_RMF: ['MANAGE-2.1'], SOC2: ['CC7.3'] },
      frameworks: fw,
      evidence: { cb_id: 'CB-ZCA-002', type: 'Cost', threshold: 0.50, current: 0.49 },
    },
    {
      ce_id: 'CE-SEED-0014', tenant_id: 'zenith-capital', event_type: 'hitl.decision',
      source_model: 'HitlHistory', source_id: 'hitl-zca-001',
      agent_id: 'agent-203', agent_name: 'Capital Adequacy Validator',
      timestamp: new Date(now - 3.5*60*60*1000), severity: 'INFO',
      control_ids: { ISO42001: ['A.5.4.1'], NIST_AI_RMF: ['GOVERN-5.2'], SOC2: ['CC2.2'] },
      frameworks: fw,
      evidence: { decision: 'approved', tool: 'submit_regulatory_filing', by: 'Rachel C. (L3)' },
    },
  ]);
};
