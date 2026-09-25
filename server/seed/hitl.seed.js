const HitlQueue   = require('../models/HitlQueue');
const HitlHistory = require('../models/HitlHistory');

// Canonical agents:
// arcadia-health: agent-101 Insurance Underwriting Agent, agent-102 Workforce Planning and Recruitment
// zenith-capital: agent-201 Trade Compliance Monitor, agent-202 Market Surveillance Agent,
//                 agent-203 Capital Adequacy Validator, agent-204 AML Detection Engine,
//                 agent-205 Regulatory Reporting Agent, agent-206 Risk Exposure Calculator

module.exports = async function seedHitl() {
  await HitlQueue.deleteMany({});
  await HitlHistory.deleteMany({});

  await HitlQueue.insertMany([
    {
      request_id: 'AUTH-AHA-001', agent: 'Insurance Underwriting Agent', agent_id: 'agent-101',
      tool: 'issue_policy_decision', risk: 'Critical', waitMs: 25000,
      tenant_id: 'arcadia-health',
      reasoning: 'Insurance Underwriting Agent proposes issuing a binding policy decision for applicant APP-88421 (high-risk, high-value group health plan — estimated annual premium $420K). Confidence 0.87. Hallucination flag raised on actuarial risk score — underwriting supervisor sign-off required per policy governance before binding.',
      status: 'pending', tier: 'L3', created_at: new Date(Date.now() - 25000)
    },
    {
      request_id: 'AUTH-AHA-002', agent: 'Workforce Planning and Recruitment', agent_id: 'agent-102',
      tool: 'submit_compliance_report', risk: 'High', waitMs: 124000,
      tenant_id: 'arcadia-health',
      reasoning: 'Workforce Planning and Recruitment agent completed Q2 2026 staffing compliance report covering 14 open roles and 3 regulatory-mandated headcount additions. Agent flagged 2 data fields as estimated (role classification codes). Requires HR compliance officer sign-off before board submission.',
      status: 'pending', tier: 'L2', created_at: new Date(Date.now() - 124000)
    },
    {
      request_id: 'AUTH-ZCA-001', agent: 'Capital Adequacy Validator', agent_id: 'agent-203',
      tool: 'submit_regulatory_filing', risk: 'Critical', waitMs: 210000,
      tenant_id: 'zenith-capital',
      reasoning: 'Capital Adequacy Validator computed Basel III CET1 ratio at 8.1% — below 8.5% regulatory minimum under stress scenario S3. ICAAP filing requires CFO/CRO sign-off before EBA submission. Automated breach protocol initiated.',
      status: 'pending', tier: 'L3', created_at: new Date(Date.now() - 210000)
    },
    {
      request_id: 'AUTH-ZCA-002', agent: 'Regulatory Reporting Agent', agent_id: 'agent-205',
      tool: 'publish_emir_report', risk: 'High', waitMs: 310000,
      tenant_id: 'zenith-capital',
      reasoning: 'Regulatory Reporting Agent prepared EMIR trade report for 14 equity derivative positions. Report references 2 fields flagged as estimated by the data quality guard. Confidence 0.74. Compliance officer review recommended before EU submission.',
      status: 'pending', tier: 'L2', created_at: new Date(Date.now() - 310000)
    },
  ]);

  const now = Date.now();
  await HitlHistory.insertMany([
    { time: '09:08 today', timestamp: new Date(now - 30*60000),   agent: 'Insurance Underwriting Agent',        agent_id: 'agent-101', tool: 'issue_policy_decision',      decision: 'Approved', by: 'Sarah K. (L3)',   tenant_id: 'arcadia-health'  },
    { time: '08:52 today', timestamp: new Date(now - 65*60000),   agent: 'Workforce Planning and Recruitment',  agent_id: 'agent-102', tool: 'submit_compliance_report',   decision: 'Approved', by: 'Mark T. (L2)',    tenant_id: 'arcadia-health'  },
    { time: '07:30 today', timestamp: new Date(now - 80*60000),   agent: 'Insurance Underwriting Agent',        agent_id: 'agent-101', tool: 'issue_policy_decision',      decision: 'Rejected', by: 'Sarah K. (L3)',   tenant_id: 'arcadia-health'  },
    { time: 'Yesterday',   timestamp: new Date(now - 97*60000),   agent: 'Capital Adequacy Validator',          agent_id: 'agent-203', tool: 'submit_regulatory_filing',   decision: 'Approved', by: 'Auto (L1)',       tenant_id: 'zenith-capital'  },
    { time: 'Yesterday',   timestamp: new Date(now - 122*60000),  agent: 'Regulatory Reporting Agent',          agent_id: 'agent-205', tool: 'publish_emir_report',        decision: 'Approved', by: 'Rachel C. (L3)', tenant_id: 'zenith-capital'  },
    { time: '2 days ago',  timestamp: new Date(now - 1440*60000), agent: 'Trade Compliance Monitor',            agent_id: 'agent-201', tool: 'flag_trade_for_review',      decision: 'Approved', by: 'Mark T. (L3)',   tenant_id: 'zenith-capital'  },
    { time: '2 days ago',  timestamp: new Date(now - 1500*60000), agent: 'Workforce Planning and Recruitment',  agent_id: 'agent-102', tool: 'submit_compliance_report',   decision: 'Approved', by: 'Mark T. (L2)',   tenant_id: 'arcadia-health'  },
  ]);
};
