const MeshRoutingRule   = require('../models/MeshRoutingRule');
const MeshQuarantine    = require('../models/MeshQuarantine');
const InterAgentMessage = require('../models/InterAgentMessage');

// Canonical agents:
// arcadia-health: agent-101 Insurance Underwriting Agent, agent-102 Workforce Planning and Recruitment
// zenith-capital: agent-201 Trade Compliance Monitor, agent-202 Market Surveillance Agent,
//                 agent-203 Capital Adequacy Validator, agent-204 AML Detection Engine,
//                 agent-205 Regulatory Reporting Agent, agent-206 Risk Exposure Calculator

module.exports = async function seedMesh() {
  await MeshRoutingRule.deleteMany({});
  await MeshQuarantine.deleteMany({});
  await InterAgentMessage.deleteMany({});

  await MeshRoutingRule.insertMany([
    // arcadia-health routing rules
    { rule_id: 'rr-001', name: 'Underwriting Agent Hallucination Failover', primary_agent_id: 'agent-101', primary_agent_name: 'Insurance Underwriting Agent',      backup_agent_id: 'agent-102', backup_agent_name: 'Workforce Planning and Recruitment', trigger: 'hallucination_score > 0.20', revert_condition: 'hallucination_score < 0.10 for 5m', status: 'triggered', enabled: true,  tenant_id: 'arcadia-health' },
    { rule_id: 'rr-002', name: 'Workforce Planning Latency Failover',      primary_agent_id: 'agent-102', primary_agent_name: 'Workforce Planning and Recruitment', backup_agent_id: 'agent-101', backup_agent_name: 'Insurance Underwriting Agent',      trigger: 'p99_latency_ms > 4000', revert_condition: 'p99_latency_ms < 2000 for 5m',     status: 'standby',   enabled: true,  tenant_id: 'arcadia-health' },
    // zenith-capital routing rules
    { rule_id: 'rr-004', name: 'Capital Adequacy Validator Failover', primary_agent_id: 'agent-203', primary_agent_name: 'Capital Adequacy Validator',backup_agent_id: 'agent-206', backup_agent_name: 'Risk Exposure Calculator', trigger: 'p99_latency_ms > 5000', revert_condition: 'p99_latency_ms < 2000 for 5m', status: 'standby',   enabled: true,  tenant_id: 'zenith-capital'  },
    { rule_id: 'rr-005', name: 'AML Detection Engine Load Offload',   primary_agent_id: 'agent-204', primary_agent_name: 'AML Detection Engine',      backup_agent_id: 'agent-202', backup_agent_name: 'Market Surveillance Agent',trigger: 'queue_depth > 500',     revert_condition: 'queue_depth < 100 for 5m',    status: 'standby',   enabled: true,  tenant_id: 'zenith-capital'  },
  ]);

  await MeshQuarantine.insertMany([
    { agent_id: 'agent-101', agent_name: 'Insurance Underwriting Agent', tenant_id: 'arcadia-health', reason: 'Hallucination score 0.26 exceeds threshold 0.20 — risk assessment outputs quarantined pending manual review', quarantine_type: 'auto', quarantined_at: new Date(Date.now() - 180*60000), lifted_by: null },
  ]);

  const now = Date.now();
  await InterAgentMessage.insertMany([
    // arcadia-health mesh messages
    {
      msg_id: 'msg-001', tenant_id: 'arcadia-health',
      source_agent_id: 'agent-102', source_agent_name: 'Workforce Planning and Recruitment',
      target_agent_id: 'agent-101', target_agent_name: 'Insurance Underwriting Agent',
      message_type: 'task_delegation',
      payload_summary: 'Delegate: underwriting capacity check for 14 high-priority applications in recruitment surge period',
      payload_raw: '{"task":"capacity_check","context":{"application_ids":["APP-88421","APP-88422"],"priority":"HIGH"}}',
      latency_ms: 234, handshake_status: 'ack', timestamp: new Date(now - 22*60000)
    },
    {
      msg_id: 'msg-002', tenant_id: 'arcadia-health',
      source_agent_id: 'agent-101', source_agent_name: 'Insurance Underwriting Agent',
      target_agent_id: 'agent-102', target_agent_name: 'Workforce Planning and Recruitment',
      message_type: 'result_relay',
      payload_summary: 'Result: underwriting capacity at 91% — recommend deferring 3 low-priority applications to next cycle',
      payload_raw: '{"result":"capacity_check","capacity_pct":91,"deferred_count":3,"action":"defer_low_priority"}',
      latency_ms: 1840, handshake_status: 'ack', timestamp: new Date(now - 22*60000 + 15000)
    },
    {
      msg_id: 'msg-003', tenant_id: 'arcadia-health',
      source_agent_id: 'agent-101', source_agent_name: 'Insurance Underwriting Agent',
      target_agent_id: 'agent-102', target_agent_name: 'Workforce Planning and Recruitment',
      message_type: 'health_ping',
      payload_summary: 'Health check — no response (hallucination quarantine active)',
      payload_raw: '{"type":"health_ping","expect_ack":true}',
      latency_ms: null, handshake_status: 'error', timestamp: new Date(now - 21*60000 + 50000)
    },
    // zenith-capital mesh messages
    {
      msg_id: 'msg-006', tenant_id: 'zenith-capital',
      source_agent_id: 'agent-201', source_agent_name: 'Trade Compliance Monitor',
      target_agent_id: 'agent-203', target_agent_name: 'Capital Adequacy Validator',
      message_type: 'task_delegation',
      payload_summary: 'Delegate: validate capital impact of 8 flagged MiFID II trades',
      payload_raw: '{"task":"capital_impact_check","context":{"trade_ids":["TRD-4481","TRD-4482","TRD-4483","TRD-4484","TRD-4485","TRD-4486","TRD-4487","TRD-4488"]}}',
      latency_ms: 450, handshake_status: 'ack', timestamp: new Date(now - 20*60000)
    },
    {
      msg_id: 'msg-007', tenant_id: 'zenith-capital',
      source_agent_id: 'agent-203', source_agent_name: 'Capital Adequacy Validator',
      target_agent_id: 'agent-205', target_agent_name: 'Regulatory Reporting Agent',
      message_type: 'error_propagation',
      payload_summary: 'Error: context window exceeded during ICAAP stress model batch computation',
      payload_raw: '{"error":"context_overflow","tokens_used":200000,"tokens_limit":200000}',
      latency_ms: 890, handshake_status: 'ack', timestamp: new Date(now - 20*60000 + 30000)
    },
  ]);
};
