const CircuitBreaker = require('../models/CircuitBreaker');

module.exports = async function seedGovernance() {
  await CircuitBreaker.deleteMany({});
  await CircuitBreaker.insertMany([
    // ── Demo ────────────────────────────────────────────────────────────────
    { cb_id: 'CB-001', tenant_id: 'demo', agent: 'Concierge Agent',              agent_id: 'agent-001', model: 'anthropic.claude-3-5-haiku-20241022-v1:0', type: 'Cost',    threshold: 0.50, current: 0.21, status: 'Armed'     },
    { cb_id: 'CB-002', tenant_id: 'demo', agent: 'Shipment Insight Agent',       agent_id: 'agent-005', model: 'amazon.nova-pro-v1:0',                     type: 'Loop',    threshold: 3,    current: 1,    status: 'Armed'     },
    { cb_id: 'CB-003', tenant_id: 'demo', agent: 'Insurance Underwriting Agent', agent_id: 'agent-003', model: 'anthropic.claude-3-opus-20240229-v1:0',    type: 'Latency', threshold: 5000, current: 1200, status: 'Armed'     },
    { cb_id: 'CB-004', tenant_id: 'demo', agent: 'Public Research Agent',              agent_id: 'agent-002', model: 'anthropic.claude-3-5-sonnet-20241022-v2:0', type: 'Cost',    threshold: 0.25, current: 0.11, status: 'Disabled' },
    { cb_id: 'CB-005', tenant_id: 'demo', agent: 'Workforce Planning and Recruitment', agent_id: 'agent-009', model: 'gpt-5.5 (Palantir AIP Hub)',                type: 'Cost',    threshold: 0.50, current: 0.08, status: 'Armed'   },
    // ── arcadia-health ──────────────────────────────────────────────────────
    { cb_id: 'AHA-CB-001', tenant_id: 'arcadia-health', agent: 'Insurance Underwriting Agent',      agent_id: 'agent-101', model: 'anthropic.claude-sonnet-4-5-20250929-v1:0', type: 'Hallucination', threshold: 0.20, current: 0.26, status: 'Triggered' },
    { cb_id: 'AHA-CB-002', tenant_id: 'arcadia-health', agent: 'Workforce Planning and Recruitment', agent_id: 'agent-102', model: 'anthropic.claude-sonnet-4-5-20250929-v1:0', type: 'Cost',          threshold: 0.50, current: 0.22, status: 'Armed'     },
    // ── Retail GX ────────────────────────────────────────────────────────────
    { cb_id: 'RTL-CB-001', tenant_id: 'zenith-capital', agent: 'Product Recommendation Agent', agent_id: 'agent-301', model: 'amazon.nova-pro-v1:0',                      type: 'Cost',    threshold: 0.20, current: 0.07, status: 'Armed'    },
    { cb_id: 'RTL-CB-002', tenant_id: 'zenith-capital', agent: 'Inventory Forecast Agent',     agent_id: 'agent-302', model: 'anthropic.claude-3-5-haiku-20241022-v1:0',  type: 'Latency', threshold: 4000, current: 2430, status: 'Armed'    },
    // ── HealthDX ─────────────────────────────────────────────────────────────
    { cb_id: 'HLT-CB-001', tenant_id: 'zenith-capital', agent: 'Patient Intake Agent',         agent_id: 'agent-401', model: 'anthropic.claude-3-5-sonnet-20241022-v2:0', type: 'Latency', threshold: 5000, current: 1890, status: 'Armed'    },
    { cb_id: 'HLT-CB-002', tenant_id: 'zenith-capital', agent: 'Clinical Documentation Agent', agent_id: 'agent-402', model: 'anthropic.claude-3-opus-20240229-v1:0',     type: 'Cost',    threshold: 0.60, current: 0.51, status: 'Triggered' },
  ]);
};
