const InterventionLog = require('../models/InterventionLog');

module.exports = async function seedInterventionLog() {
  await InterventionLog.deleteMany({});
  const now = Date.now();
  await InterventionLog.insertMany([
    { log_id: 'IL-001', rule: 'Insurance Underwriting Agent Loop Guard',    agent: 'Insurance Underwriting Agent', agent_id: 'agent-003', action: 'Auto-Terminated',    timestamp: new Date(now - 110*60000), overridden: false },
    { log_id: 'IL-002', rule: 'Public Research Agent Rate Backoff',         agent: 'Public Research Agent',        agent_id: 'agent-002', action: 'Switched Fallback',  timestamp: new Date(now - 128*60000), overridden: true  },
    { log_id: 'IL-003', rule: 'Insurance Underwriting Agent Loop Guard',    agent: 'Insurance Underwriting Agent', agent_id: 'agent-003', action: 'Auto-Terminated',    timestamp: new Date(now - 149*60000), overridden: false },
    { log_id: 'IL-004', rule: 'Concierge Agent Memory Kill',                agent: 'Concierge Agent',              agent_id: 'agent-001', action: 'Instance Restarted', timestamp: new Date(now - 467*60000), overridden: false },
    { log_id: 'IL-005', rule: 'Shipment Insight Agent Hallucination Guard', agent: 'Shipment Insight Agent',       agent_id: 'agent-005', action: 'Response Flagged',   timestamp: new Date(now - 641*60000), overridden: false },
  ]);
};
