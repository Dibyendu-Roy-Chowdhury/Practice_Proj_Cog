const Anomaly             = require('../models/Anomaly');
const AnomalyDistribution = require('../models/AnomalyDistribution');

module.exports = async function seedAnomalies() {
  await Anomaly.deleteMany({});
  await AnomalyDistribution.deleteMany({});

  await Anomaly.insertMany([
    { anomaly_id: 'ANM-001', agent: 'Insurance Underwriting Agent', agent_id: 'agent-003', timestamp: new Date('2026-05-10T14:32:00Z'), category: 'Token Spike',      score: 62, action: 'Under Observation', resolved: false },
    { anomaly_id: 'ANM-003', agent: 'Public Research Agent',        agent_id: 'agent-002', timestamp: new Date('2026-05-08T11:20:00Z'), category: 'Hallucination',    score: 38, action: 'HITL Escalated',    resolved: false },
    { anomaly_id: 'ANM-004', agent: 'Concierge Agent',              agent_id: 'agent-001', timestamp: new Date('2026-05-11T08:44:00Z'), category: 'Prompt Injection', score: 71, action: 'Auto-Remediated',   resolved: true  },
    { anomaly_id: 'ANM-005', agent: 'Shipment Insight Agent',       agent_id: 'agent-005', timestamp: new Date('2026-05-09T16:05:00Z'), category: 'Hallucination',    score: 58, action: 'No Action',         resolved: false },
    { anomaly_id: 'ANM-006', agent: 'Workforce Planning and Recruitment',     agent_id: 'agent-009', timestamp: new Date('2026-05-12T10:18:00Z'), category: 'Token Spike',      score: 79, action: 'HITL Escalated',    resolved: false },
  ]);

  await AnomalyDistribution.insertMany([
    { day: 'Mon', 'Token Spike': 4, 'ReAct Loop': 2, 'Tool Abuse': 3, 'Prompt Injection': 1, 'Hallucination': 2, 'Memory Overflow': 1 },
    { day: 'Tue', 'Token Spike': 6, 'ReAct Loop': 3, 'Tool Abuse': 2, 'Prompt Injection': 2, 'Hallucination': 3, 'Memory Overflow': 2 },
    { day: 'Wed', 'Token Spike': 5, 'ReAct Loop': 4, 'Tool Abuse': 5, 'Prompt Injection': 3, 'Hallucination': 1, 'Memory Overflow': 0 },
    { day: 'Thu', 'Token Spike': 8, 'ReAct Loop': 2, 'Tool Abuse': 3, 'Prompt Injection': 1, 'Hallucination': 4, 'Memory Overflow': 2 },
    { day: 'Fri', 'Token Spike': 7, 'ReAct Loop': 5, 'Tool Abuse': 4, 'Prompt Injection': 4, 'Hallucination': 2, 'Memory Overflow': 1 },
    { day: 'Sat', 'Token Spike': 3, 'ReAct Loop': 1, 'Tool Abuse': 2, 'Prompt Injection': 0, 'Hallucination': 1, 'Memory Overflow': 0 },
    { day: 'Sun', 'Token Spike': 5, 'ReAct Loop': 3, 'Tool Abuse': 3, 'Prompt Injection': 2, 'Hallucination': 3, 'Memory Overflow': 1 },
  ]);
};
