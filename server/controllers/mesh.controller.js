const MeshRoutingRule  = require('../models/MeshRoutingRule');
const MeshQuarantine   = require('../models/MeshQuarantine');
const InterAgentMessage= require('../models/InterAgentMessage');

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

exports.getTopology = (_req, res) => res.json({
  mesh_health_score: 74,
  nodes: [
    { id: 'agent-005', name: 'Shipment Insight Agent',       role: 'orchestrator', status: 'healthy',     load: 0.54, message_count_1h: 312, x: 50, y: 18 },
    { id: 'agent-002', name: 'Public Research Agent',        role: 'worker',       status: 'healthy',     load: 0.31, message_count_1h: 198, x: 82, y: 44 },
    { id: 'agent-003', name: 'Insurance Underwriting Agent', role: 'worker',       status: 'degraded',    load: 0.89, message_count_1h: 87,  x: 68, y: 80 },
    { id: 'agent-001', name: 'Concierge Agent',              role: 'worker',       status: 'healthy',     load: 0.42, message_count_1h: 155, x: 32, y: 80 },
    { id: 'agent-009', name: 'Workforce Planning and Recruitment',     role: 'leaf',         status: 'quarantined', load: 0,    message_count_1h: 0,   x: 50, y: 58 },
  ],
  edges: [
    { id: 'e-001', source: 'agent-001', target: 'agent-002', message_count_1h: 142, avg_latency_ms: 234,  p99_latency_ms: 890,  handshake_status: 'established' },
    { id: 'e-002', source: 'agent-001', target: 'agent-005', message_count_1h: 98,  avg_latency_ms: 190,  p99_latency_ms: 540,  handshake_status: 'established' },
    { id: 'e-003', source: 'agent-002', target: 'agent-003', message_count_1h: 76,  avg_latency_ms: 1840, p99_latency_ms: 4200, handshake_status: 'degraded'    },
    { id: 'e-004', source: 'agent-005', target: 'agent-004', message_count_1h: 88,  avg_latency_ms: 310,  p99_latency_ms: 980,  handshake_status: 'established' },
    { id: 'e-005', source: 'agent-003', target: 'agent-001', message_count_1h: 44,  avg_latency_ms: 2100, p99_latency_ms: 5800, handshake_status: 'degraded'    },
    { id: 'e-006', source: 'agent-004', target: 'agent-003', message_count_1h: 22,  avg_latency_ms: 450,  p99_latency_ms: 1200, handshake_status: 'established' },
  ],
});

exports.getMessages = async (_req, res, next) => {
  try {
    const raw = await InterAgentMessage.find().sort({ timestamp: -1 }).limit(20).lean();
    if (raw.length) {
      const msgs = raw.map(m => ({
        id: m.message_id, source_agent_id: m.source_agent_id, source_agent_name: m.source_agent_name,
        target_agent_id: m.target_agent_id, target_agent_name: m.target_agent_name,
        message_type: m.message_type, payload_summary: m.payload_summary, payload_raw: m.payload_raw,
        latency_ms: m.latency_ms, handshake_status: m.handshake_status, timestamp: m.timestamp,
      }));
      res.json(rebase(msgs));
    } else {
      const ts = (minsAgo) => { const d = new Date(Date.now() - minsAgo * 60000); return d.toISOString().slice(0,19).replace('T',' '); };
      res.json([
        { id: 'msg-001', source_agent_id: 'agent-009', source_agent_name: 'Workforce Planning and Recruitment',     target_agent_id: 'agent-002', target_agent_name: 'Public Research Agent',        message_type: 'task_delegation',   payload_summary: 'Route: policy research request → regulatory synthesis workflow',        payload_raw: '{"task":"regulatory_synthesis","context":{"regulation":"Basel_III","section":"Pillar2"}}', latency_ms: 234,  handshake_status: 'ack',     timestamp: ts(3)  },
        { id: 'msg-002', source_agent_id: 'agent-002', source_agent_name: 'Public Research Agent',        target_agent_id: 'agent-003', target_agent_name: 'Insurance Underwriting Agent', message_type: 'task_delegation',   payload_summary: 'Delegate: risk scoring for policy VRT-00412',                           payload_raw: '{"task":"risk_score","context":{"policy_id":"VRT-00412","type":"commercial_property","value":2400000}}', latency_ms: 1840, handshake_status: 'ack',     timestamp: ts(4)  },
        { id: 'msg-003', source_agent_id: 'agent-003', source_agent_name: 'Insurance Underwriting Agent', target_agent_id: 'agent-005', target_agent_name: 'Shipment Insight Agent',       message_type: 'result_relay',      payload_summary: 'Result: risk score 0.72 — within acceptable underwriting threshold',    payload_raw: '{"result":"risk_score","value":0.72,"threshold":0.80,"eligible":true}',   latency_ms: 2100, handshake_status: 'timeout', timestamp: ts(5)  },
        { id: 'msg-004', source_agent_id: 'agent-005', source_agent_name: 'Shipment Insight Agent',       target_agent_id: 'agent-001', target_agent_name: 'Concierge Agent',               message_type: 'task_delegation',   payload_summary: 'Delegate: fetch shipment exception status for client VRT-0089',         payload_raw: '{"task":"fetch_shipment_status","context":{"client_id":"VRT-0089","shipment":"SHP-44821"}}', latency_ms: 190,  handshake_status: 'ack',     timestamp: ts(6)  },
        { id: 'msg-005', source_agent_id: 'agent-009', source_agent_name: 'Workforce Planning and Recruitment',     target_agent_id: 'agent-005', target_agent_name: 'Shipment Insight Agent',       message_type: 'health_ping',       payload_summary: 'Health check — no response (agent quarantined)',                        payload_raw: '{"type":"health_ping","expect_ack":true}',                                latency_ms: null, handshake_status: 'error',   timestamp: ts(8)  },
        { id: 'msg-006', source_agent_id: 'agent-001', source_agent_name: 'Concierge Agent',              target_agent_id: 'agent-003', target_agent_name: 'Insurance Underwriting Agent', message_type: 'result_relay',      payload_summary: 'Result: shipment data retrieved — 3 exceptions flagged for triage',     payload_raw: '{"rules_evaluated":8,"anomalies":3,"status":"flagged"}',                  latency_ms: 450,  handshake_status: 'ack',     timestamp: ts(9)  },
        { id: 'msg-007', source_agent_id: 'agent-003', source_agent_name: 'Insurance Underwriting Agent', target_agent_id: 'agent-005', target_agent_name: 'Shipment Insight Agent',       message_type: 'error_propagation', payload_summary: 'Error: context window exceeded during large policy document analysis',  payload_raw: '{"error":"context_overflow","tokens_used":200000,"tokens_limit":200000}',  latency_ms: 890,  handshake_status: 'ack',     timestamp: ts(10) },
      ]);
    }
  } catch (err) { next(err); }
};

exports.getLoops = (_req, res) => {
  const ts = (m) => { const d = new Date(Date.now() - m*60000); return d.toISOString().slice(0,19).replace('T',' '); };
  res.json({ loops: [
    { id: 'loop-001', chain: ['Shipment Insight Agent','Public Research Agent','Insurance Underwriting Agent','Shipment Insight Agent'], chain_ids: ['agent-005','agent-002','agent-003','agent-005'], iteration_count: 7,  ttl_ceiling: 10, risk: 'High',   status: 'active',     detected_at: ts(45)  },
    { id: 'loop-002', chain: ['Concierge Agent','Public Research Agent','Concierge Agent'],                                             chain_ids: ['agent-001','agent-002','agent-001'],             iteration_count: 3,  ttl_ceiling: 10, risk: 'Medium', status: 'monitoring', detected_at: ts(120) },
    { id: 'loop-003', chain: ['Insurance Underwriting Agent','Shipment Insight Agent','Insurance Underwriting Agent'],                   chain_ids: ['agent-003','agent-005','agent-003'],             iteration_count: 10, ttl_ceiling: 10, risk: 'High',   status: 'terminated', detected_at: ts(240) },
  ]});
};

exports.getSemanticConsistency = (_req, res) => res.json({
  threshold: 0.80,
  relay_chains: [
    { id: 'chain-001', task: 'Basel III Pillar 2 compliance report generation',             risk: 'High',
      hops: [{ step: 0, agent: 'Workforce Planning and Recruitment',     similarity: 1.00 }, { step: 1, agent: 'Public Research Agent',        similarity: 0.94 }, { step: 2, agent: 'Insurance Underwriting Agent', similarity: 0.81 }, { step: 3, agent: 'Concierge Agent', similarity: 0.71 }] },
    { id: 'chain-002', task: 'Risk scoring for commercial property policy VRT-00412',       risk: 'Low',
      hops: [{ step: 0, agent: 'Workforce Planning and Recruitment',     similarity: 1.00 }, { step: 1, agent: 'Public Research Agent',        similarity: 0.97 }, { step: 2, agent: 'Insurance Underwriting Agent', similarity: 0.93 }] },
    { id: 'chain-003', task: 'Cross-reference shipment exception data with risk thresholds', risk: 'Medium',
      hops: [{ step: 0, agent: 'Shipment Insight Agent', similarity: 1.00 }, { step: 1, agent: 'Concierge Agent', similarity: 0.91 }, { step: 2, agent: 'Insurance Underwriting Agent', similarity: 0.83 }, { step: 3, agent: 'Public Research Agent', similarity: 0.78 }] },
  ],
});

exports.getQuarantine = async (_req, res, next) => {
  try {
    const raw = await MeshQuarantine.find({ lifted: false }).lean();
    const ts  = (m) => { const d = new Date(Date.now() - m*60000); return d.toISOString().slice(0,19).replace('T',' '); };
    const quarantined = raw.length ? raw.map(q => ({ agent_id: q.agent_id, agent_name: q.agent_name, reason: q.reason, quarantine_type: q.quarantine_type, quarantined_at: q.quarantined_at, lifted_by: q.lifted_by || null })) : [{ agent_id: 'agent-009', agent_name: 'Workforce Planning and Recruitment', reason: 'Repeated semantic corruption — avg similarity 0.41 across 14 relay hops', quarantine_type: 'auto', quarantined_at: ts(180), lifted_by: null }];
    res.json({ quarantined });
  } catch (err) { next(err); }
};

exports.quarantineAgent = async (req, res, next) => {
  try {
    const { agent_id, agent_name, reason } = req.body;
    const existing = await MeshQuarantine.findOne({ agent_id, lifted: false });
    if (!existing) {
      await MeshQuarantine.create({ agent_id, agent_name, reason, quarantine_type: 'manual', quarantined_at: new Date().toISOString(), lifted: false });
    }
    res.json({ success: true });
  } catch (err) { next(err); }
};

exports.liftQuarantine = async (req, res, next) => {
  try {
    await MeshQuarantine.updateMany({ agent_id: req.params.agentId }, { lifted: true, lifted_at: new Date().toISOString() });
    res.json({ success: true });
  } catch (err) { next(err); }
};

exports.getRoutingRules = async (_req, res, next) => {
  try {
    const raw = await MeshRoutingRule.find().lean();
    if (raw.length) {
      res.json({ rules: raw.map(r => ({ id: r.rule_id, name: r.name, primary_agent_id: r.primary_agent_id, primary_agent_name: r.primary_agent_name, backup_agent_id: r.backup_agent_id, backup_agent_name: r.backup_agent_name, trigger: r.trigger, revert_condition: r.revert_condition, status: r.status, enabled: r.enabled })) });
    } else {
      res.json({ rules: [
        { id: 'rr-001', name: 'Insurance Underwriting Agent Failover',    primary_agent_id: 'agent-003', primary_agent_name: 'Insurance Underwriting Agent', backup_agent_id: 'agent-001', backup_agent_name: 'Concierge Agent',        trigger: 'p99_latency_ms > 3000', revert_condition: 'p99_latency_ms < 1000 for 5m', status: 'triggered', enabled: true  },
        { id: 'rr-002', name: 'Public Research Agent Failover',           primary_agent_id: 'agent-002', primary_agent_name: 'Public Research Agent',        backup_agent_id: 'agent-005', backup_agent_name: 'Shipment Insight Agent', trigger: 'error_rate > 0.15',     revert_condition: 'error_rate < 0.05 for 10m',   status: 'standby',   enabled: true  },
        { id: 'rr-003', name: 'Shipment Insight Agent Load Offload',      primary_agent_id: 'agent-005', primary_agent_name: 'Shipment Insight Agent',       backup_agent_id: 'agent-001', backup_agent_name: 'Concierge Agent',        trigger: 'load > 0.90',           revert_condition: 'load < 0.70 for 5m',          status: 'standby',   enabled: false },
      ]});
    }
  } catch (err) { next(err); }
};

exports.updateRoutingRule = async (req, res, next) => {
  try {
    await MeshRoutingRule.findOneAndUpdate({ rule_id: req.params.id }, { enabled: req.body.enabled });
    res.json({ success: true });
  } catch (err) { next(err); }
};
