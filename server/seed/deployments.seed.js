const Deployment = require('../models/Deployment');

module.exports = async function seedDeployments() {
  await Deployment.deleteMany({});
  await Deployment.insertMany([
    { dep_id: 'DEP-001', agent_id: 'agent-001', name: 'Concierge Agent',              version: 'v3.2', model: 'anthropic.claude-3-5-haiku-20241022-v1:0',  env: 'Production', date: new Date('2026-07-02'), by: 'admin@veriforgeops.demo',  status: 'Live'     },
    { dep_id: 'DEP-002', agent_id: 'agent-003', name: 'Insurance Underwriting Agent', version: 'v1.8', model: 'anthropic.claude-3-opus-20240229-v1:0',      env: 'Production', date: new Date('2026-06-15'), by: 'devops@veriforgeops.demo', status: 'Live'     },
    { dep_id: 'DEP-003', agent_id: 'agent-002', name: 'Public Research Agent',        version: 'v2.1', model: 'anthropic.claude-3-5-sonnet-20241022-v2:0',  env: 'Production', date: new Date('2026-05-28'), by: 'admin@veriforgeops.demo',  status: 'Live'     },
    { dep_id: 'DEP-004', agent_id: 'agent-005', name: 'Shipment Insight Agent',       version: 'v2.4', model: 'amazon.nova-pro-v1:0',                       env: 'Production', date: new Date('2026-06-01'), by: 'devops@veriforgeops.demo', status: 'Live'     },
    { dep_id: 'DEP-005', agent_id: 'agent-009', name: 'Workforce Planning and Recruitment', version: 'v2.0', model: 'gpt-5.5',                             env: 'Production', date: new Date('2026-07-01'), by: 'admin@veriforgeops.demo',  status: 'Live'     },
    { dep_id: 'DEP-006', agent_id: 'agent-001', name: 'Concierge Agent',              version: 'v3.1', model: 'anthropic.claude-3-5-haiku-20241022-v1:0',   env: 'Staging',    date: new Date('2026-06-25'), by: 'admin@veriforgeops.demo',  status: 'Inactive' },
  ]);
};
