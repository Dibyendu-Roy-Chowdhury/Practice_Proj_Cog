const SelfHealingRule  = require('../models/SelfHealingRule');
const InterventionLog  = require('../models/InterventionLog');

const fmtTs = (d) => new Date(d).toISOString().slice(0, 19).replace('T', ' ');

const rebase = (records, tsField = 'timestamp') => {
  if (!records.length) return records;
  const times  = records.map(r => new Date(r[tsField]).getTime()).filter(t => !isNaN(t));
  const offset = Date.now() - Math.max(...times);
  return records.map(r => {
    const orig = new Date(r[tsField]);
    return isNaN(orig) ? r : { ...r, [tsField]: fmtTs(orig.getTime() + offset) };
  });
};

exports.getRules = async (_req, res, next) => {
  try {
    const raw = await SelfHealingRule.find().lean();
    if (raw.length) {
      res.json(raw.map(r => ({ id: r.rule_id, name: r.name, condition: r.condition, action: r.action, enabled: r.enabled, severity: r.severity, triggered: r.triggered_count || 0 })));
    } else {
      res.json([
        { id: 'sh-001', name: 'Insurance Underwriting Agent Loop Guard',    condition: 'Insurance Underwriting Agent ReAct iterations > 4',          action: 'Auto-Terminate Agent',           enabled: true,  severity: 'P1', triggered: 3 },
        { id: 'sh-002', name: 'Concierge Agent Memory Kill',                condition: 'Concierge Agent memory usage > 85%',                         action: 'Restart Agent Instance',         enabled: true,  severity: 'P1', triggered: 1 },
        { id: 'sh-003', name: 'Public Research Agent Rate Backoff',         condition: 'Public Research Agent API 429 errors > 5/min',               action: 'Switch to Fallback Model',       enabled: true,  severity: 'P2', triggered: 7 },
        { id: 'sh-004', name: 'Insurance Underwriting Agent Cost Breaker',  condition: 'Insurance Underwriting Agent hourly spend > $50',            action: 'Pause Agent & Alert Admin',      enabled: false, severity: 'P2', triggered: 0 },
        { id: 'sh-005', name: 'Workforce Planning and Recruitment Pipeline Timeout',  condition: 'Workforce Planning and Recruitment document extraction > 8000ms',      action: 'Retry with Exponential Backoff', enabled: true,  severity: 'P1', triggered: 0 },
        { id: 'sh-006', name: 'Public Research Agent Latency Guard',        condition: 'Public Research Agent P95 latency > 5000ms',                 action: 'Route to Cache / Scale Down',    enabled: false, severity: 'P3', triggered: 2 },
      ]);
    }
  } catch (err) { next(err); }
};

exports.getInterventions = async (_req, res, next) => {
  try {
    const raw = await InterventionLog.find().sort({ timestamp: -1 }).limit(20).lean();
    if (raw.length) {
      const records = raw.map(r => ({ id: r.log_id, rule: r.rule, agent: r.agent, action: r.action, timestamp: r.timestamp, overridden: r.overridden || false }));
      res.json(rebase(records));
    } else {
      res.json(rebase([
        { id: 'IL-001', rule: 'Insurance Underwriting Agent Loop Guard',    agent: 'Insurance Underwriting Agent', action: 'Auto-Terminated',    timestamp: '2026-03-26 09:14', overridden: false },
        { id: 'IL-002', rule: 'Public Research Agent Rate Backoff',         agent: 'Public Research Agent',        action: 'Switched Fallback',  timestamp: '2026-03-26 08:52', overridden: true  },
        { id: 'IL-003', rule: 'Insurance Underwriting Agent Loop Guard',    agent: 'Insurance Underwriting Agent', action: 'Auto-Terminated',    timestamp: '2026-03-26 07:31', overridden: false },
        { id: 'IL-004', rule: 'Concierge Agent Memory Kill',                agent: 'Concierge Agent',              action: 'Instance Restarted', timestamp: '2026-03-25 22:18', overridden: false },
        { id: 'IL-005', rule: 'Shipment Insight Agent Hallucination Guard', agent: 'Shipment Insight Agent',       action: 'Response Flagged',   timestamp: '2026-03-25 19:07', overridden: false },
      ]));
    }
  } catch (err) { next(err); }
};
