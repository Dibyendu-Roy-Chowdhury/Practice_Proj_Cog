const AGENT_STATUS   = ['Active', 'Staging', 'Draining', 'Inactive'];
const SEVERITY       = ['P1', 'P2', 'P3', 'CRITICAL', 'WARNING', 'ERROR', 'INFO'];
const CLOUD_PROVIDER = ['AWS', 'Palantir', 'Azure'];
const CHANGE_TYPE    = ['create', 'update', 'rollback'];
const HITL_STATUS    = ['pending', 'approved', 'rejected', 'delegated', 'timeout'];
const RISK           = ['High', 'Medium', 'Low'];
const ENV            = ['Production', 'Staging', 'Development'];

const AUDIT_TRACES_STATIC = [
  { traceId: 'trace-001', tenant_id: 'demo',       agent: 'Insurance Underwriting Agent',        agentId: 'agent-003', model: 'anthropic.claude-3-opus-20240229-v1:0',    durationMs: 1240, spans: 4,  status: 'completed', startedAt: new Date(Date.now() - 2  * 60 * 60 * 1000).toISOString() },
  { traceId: 'trace-002', tenant_id: 'demo',       agent: 'Public Research Agent',               agentId: 'agent-002', model: 'anthropic.claude-3-5-sonnet-20241022-v2:0', durationMs: 3820, spans: 7,  status: 'failed',    startedAt: new Date(Date.now() - 4  * 60 * 60 * 1000).toISOString() },
  { traceId: 'trace-003', tenant_id: 'demo',       agent: 'Concierge Agent',                     agentId: 'agent-001', model: 'anthropic.claude-3-5-haiku-20241022-v1:0',  durationMs: 890,  spans: 3,  status: 'completed', startedAt: new Date(Date.now() - 6  * 60 * 60 * 1000).toISOString() },
  { traceId: 'trace-004', tenant_id: 'demo',       agent: 'Shipment Insight Agent',              agentId: 'agent-005', model: 'amazon.nova-pro-v1:0',                      durationMs: 5640, spans: 12, status: 'timeout',   startedAt: new Date(Date.now() - 8  * 60 * 60 * 1000).toISOString() },
  { traceId: 'cf45a9c07516ae76', tenant_id: 'demo', agent: 'Workforce Planning and Recruitment',  agentId: 'agent-009', model: 'gpt-5.5 (Palantir AIP Hub)',               durationMs: 39000, spans: 5, status: 'completed', startedAt: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(), source: 'palantir-foundry-audit', executionId: '0000019f-5f99-e046-4806-37a7843dd29a', logicRid: 'ri.eddie.main.logic.0d87a2c6-9c53-4c5b-95e5-8e7d0e8d50d3' },
  { traceId: 'trace-006', tenant_id: 'arcadia-health',  agent: 'Insurance Underwriting Agent',        agentId: 'agent-101', model: 'anthropic.claude-sonnet-4-5-20250929-v1:0', durationMs: 2850, spans: 8,  status: 'completed', startedAt: new Date(Date.now() - 1  * 60 * 60 * 1000).toISOString() },
  { traceId: 'trace-007', tenant_id: 'arcadia-health',  agent: 'Insurance Underwriting Agent',        agentId: 'agent-101', model: 'anthropic.claude-sonnet-4-5-20250929-v1:0', durationMs: 4100, spans: 9,  status: 'failed',    startedAt: new Date(Date.now() - 3  * 60 * 60 * 1000).toISOString() },
  { traceId: 'trace-008', tenant_id: 'arcadia-health',  agent: 'Workforce Planning and Recruitment',  agentId: 'agent-102', model: 'anthropic.claude-sonnet-4-5-20250929-v1:0', durationMs: 1560, spans: 5,  status: 'completed', startedAt: new Date(Date.now() - 2  * 60 * 60 * 1000).toISOString() },
  { traceId: 'trace-009', tenant_id: 'arcadia-health',  agent: 'Workforce Planning and Recruitment',  agentId: 'agent-102', model: 'anthropic.claude-sonnet-4-5-20250929-v1:0', durationMs: 3270, spans: 7,  status: 'completed', startedAt: new Date(Date.now() - 5  * 60 * 60 * 1000).toISOString() },
  { traceId: 'trace-010', tenant_id: 'zenith-capital',  agent: 'Algo Trading Sentinel',         agentId: 'agent-201', model: 'amazon.nova-pro-v1:0',                      durationMs: 980,  spans: 3,  status: 'completed', startedAt: new Date(Date.now() - 1  * 60 * 60 * 1000).toISOString() },
  { traceId: 'trace-011', tenant_id: 'zenith-capital',  agent: 'SEC Filing Analyst',            agentId: 'agent-202', model: 'anthropic.claude-3-5-haiku-20241022-v1:0',  durationMs: 2430, spans: 6,  status: 'timeout',   startedAt: new Date(Date.now() - 4  * 60 * 60 * 1000).toISOString() },
  { traceId: 'trace-012', tenant_id: 'zenith-capital',  agent: 'Risk Exposure Monitor',         agentId: 'agent-203', model: 'anthropic.claude-3-5-sonnet-20241022-v2:0', durationMs: 1890, spans: 6,  status: 'completed', startedAt: new Date(Date.now() - 2  * 60 * 60 * 1000).toISOString() },
  { traceId: 'trace-013', tenant_id: 'zenith-capital',  agent: 'Fraud Detection Engine',        agentId: 'agent-204', model: 'anthropic.claude-3-opus-20240229-v1:0',    durationMs: 5120, spans: 11, status: 'failed',    startedAt: new Date(Date.now() - 6  * 60 * 60 * 1000).toISOString() },
];

module.exports = { AGENT_STATUS, SEVERITY, CLOUD_PROVIDER, CHANGE_TYPE, HITL_STATUS, RISK, ENV, AUDIT_TRACES_STATIC };
