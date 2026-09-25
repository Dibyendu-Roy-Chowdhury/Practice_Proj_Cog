const Anomaly             = require('../models/Anomaly');
const AnomalyDistribution = require('../models/AnomalyDistribution');

exports.getStatus = (_req, res) => res.json({
  stages: [
    { id: 'COLLECT',   latency: '8ms',   status: 'active' },
    { id: 'CORRELATE', latency: '12ms',  status: 'active' },
    { id: 'PREDICT',   latency: '340ms', status: 'active' },
    { id: 'MITIGATE',  latency: '1.2s',  status: 'active' },
    { id: 'LEARN',     latency: 'bg',    status: 'active' },
  ],
});

exports.getAnomalyFeed = async (_req, res, next) => {
  try {
    const raw = await Anomaly.find().sort({ timestamp: -1 }).lean();
    if (raw.length) {
      res.json(raw.map(a => ({ id: a.anomaly_id, agent: a.agent, timestamp: a.timestamp, category: a.category, score: a.score, action: a.action })));
    } else {
      res.json([
        { id: 'ANM-001', agent: 'Insurance Underwriting Agent', timestamp: '2026-03-29 14:32', category: 'Token Spike',      score: 62, action: 'Under Observation' },
        { id: 'ANM-002', agent: 'Workforce Planning and Recruitment',     timestamp: '2026-03-30 09:15', category: 'Tool Error',       score: 45, action: 'Auto-Remediated'   },
        { id: 'ANM-003', agent: 'Public Research Agent',        timestamp: '2026-03-28 11:20', category: 'Hallucination',    score: 38, action: 'HITL Escalated'    },
        { id: 'ANM-004', agent: 'Concierge Agent',              timestamp: '2026-03-30 08:44', category: 'Prompt Injection', score: 71, action: 'Auto-Remediated'   },
        { id: 'ANM-005', agent: 'Shipment Insight Agent',       timestamp: '2026-03-29 16:05', category: 'ReAct Loop',       score: 29, action: 'No Action'         },
      ]);
    }
  } catch (err) { next(err); }
};

exports.getPrecursorAlerts = (_req, res) => res.json([
  { id: 'PA-001', mode: 'Tool Call Loop Escalation', ttf: '~8 min',  confidence: 87, risk: 'High'   },
  { id: 'PA-002', mode: 'Context Window Exhaustion',  ttf: '~22 min', confidence: 64, risk: 'Medium' },
  { id: 'PA-003', mode: 'Guardrail Saturation',       ttf: '~41 min', confidence: 51, risk: 'Low'    },
]);

exports.getRemediationQueue = (_req, res) => res.json([
  { id: 'PB-001', name: 'Preemptive Horizontal Scale',   target: 'cluster-prod-2',   action: 'Horizontal Scale', status: 'Completed',   progress: 100 },
  { id: 'PB-002', name: 'Model Endpoint Redistribution', target: 'gpt4o-endpoint-1', action: 'Circuit Break',    status: 'In Progress', progress: 62  },
  { id: 'PB-003', name: 'Agent Instance Restart',        target: 'genbi-agent-03',   action: 'Restart',          status: 'Pending',     progress: 0   },
]);
