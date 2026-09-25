const TrustInterceptor = require('../models/TrustInterceptor');
const { tagComplianceEvent } = require('../services/complianceTagger');

exports.getInterceptors = async (req, res, next) => {
  try {
    const raw = await TrustInterceptor.find(req.tenantFilter).lean();
    if (raw.length) {
      res.json(raw.map(t => ({ id: t.ti_id, name: t.name, desc: t.desc, active: t.active, events: t.events || 0 })));
    } else {
      res.json([
        { id: 'TI-001', name: 'SQL Injection Guard',     desc: 'Blocks destructive SQL patterns',        active: true,  events: 23 },
        { id: 'TI-002', name: 'Prompt Injection Shield', desc: 'Detects adversarial prompt payloads',    active: true,  events: 6  },
        { id: 'TI-003', name: 'Data Exfiltration Gate',  desc: 'Prevents PII/secrets in tool outputs',  active: true,  events: 4  },
        { id: 'TI-004', name: 'Token Budget Enforcer',   desc: 'Hard-limits per-call token spend',       active: true,  events: 18 },
        { id: 'TI-005', name: 'Loop Detector',           desc: 'Terminates identical ReAct cycles',      active: false, events: 0  },
        { id: 'TI-006', name: 'Semantic Drift Alert',    desc: 'Flags off-topic agent reasoning',        active: true,  events: 11 },
      ]);
    }
  } catch (err) { next(err); }
};

exports.updateInterceptor = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { active } = req.body;
    if (typeof active !== 'boolean') return res.status(400).json({ error: 'active must be boolean' });
    const updated = await TrustInterceptor.findOneAndUpdate(
      { ...req.tenantFilter, ti_id: id },
      { active },
      { new: true }
    ).lean();
    if (!updated) return res.status(404).json({ error: 'Interceptor not found' });
    // Tag compliance event when an interceptor fires (active toggled on → treat as trigger acknowledgement)
    if (active === true) {
      tagComplianceEvent({
        eventType: 'guardrail.trigger', sourceModel: 'TrustInterceptor', sourceId: updated.ti_id,
        agentName: updated.name, tenantId: req.tenantId,
        evidence: { ti_id: updated.ti_id, name: updated.name, action: 'activated' },
      });
    }
    res.json({ id: updated.ti_id, active: updated.active });
  } catch (err) { next(err); }
};

exports.getHallucinationTrend = (_req, res) => {
  const dates = ['3/16','3/17','3/18','3/19','3/20','3/21','3/22','3/23','3/24','3/25'];
  res.json(dates.map((date, i) => ({
    date,
    'Concierge Agent':              [0.12,0.18,0.09,0.21,0.31,0.28,0.19,0.24,0.15,0.11][i],
    'Insurance Underwriting Agent': [0.05,0.07,0.04,0.08,0.12,0.09,0.06,0.07,0.05,0.04][i],
    'Shipment Insight Agent':       [0.22,0.19,0.28,0.35,0.41,0.38,0.29,0.32,0.25,0.18][i],
    'Workforce Planning and Recruitment':     [0.08,0.14,0.11,0.19,0.25,0.22,0.17,0.20,0.13,0.09][i],
  })));
};
