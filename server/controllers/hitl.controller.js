const HitlQueue   = require('../models/HitlQueue');
const HitlHistory = require('../models/HitlHistory');
const { tagComplianceEvent } = require('../services/complianceTagger');

const fmtTs = (d) => new Date(d).toISOString().slice(0, 19).replace('T', ' ');

const rebaseMs = (records, tsField = 'timestamp') => {
  if (!records.length) return records;
  const times  = records.map(r => new Date(r[tsField]).getTime()).filter(t => !isNaN(t));
  const offset = Date.now() - Math.max(...times);
  return records.map(r => {
    const orig = new Date(r[tsField]);
    return isNaN(orig) ? r : { ...r, [tsField]: fmtTs(orig.getTime() + offset) };
  });
};

exports.getQueue = async (_req, res, next) => {
  try {
    const raw = await HitlQueue.find({ status: 'pending' }).lean();
    if (raw.length) {
      const queue = raw.map(q => ({ id: q.request_id, agent: q.agent, tool: q.tool, risk: q.risk, waitMs: q.wait_ms || 0, reasoning: q.reasoning }));
      res.json(queue);
    } else {
      res.json([
        { id: 'AUTH-001', agent: 'Workforce Planning and Recruitment',     tool: 'submit_compliance_report', risk: 'Critical', waitMs: 25000,  reasoning: 'Workforce Planning and Recruitment completed Q2 2026 staffing compliance report covering 14 open roles and 3 regulatory-mandated headcount additions. Identified 3 potential gaps in AI governance obligations cross-referencing ISO 42001 Article 8.4. High-confidence extraction (0.97) — principal sign-off required before board submission.' },
        { id: 'AUTH-002', agent: 'Insurance Underwriting Agent', tool: 'issue_policy_document',    risk: 'Critical', waitMs: 48000,  reasoning: 'Agent proposes issuing a $2.4M commercial property policy for client VRT-0042 based on automated risk scoring (0.87 confidence). No human underwriter sign-off recorded. Manual review required per underwriting policy.' },
        { id: 'AUTH-003', agent: 'Insurance Underwriting Agent', tool: 'send_regulatory_report',   risk: 'High',     waitMs: 124000, reasoning: 'Regulatory disclosure draft generated for Q2 2026. Agent flagged 3 data fields as estimated values. Requires principal sign-off before submission to FCA.' },
        { id: 'AUTH-004', agent: 'Concierge Agent',              tool: 'modify_client_profile',    risk: 'High',     waitMs: 210000, reasoning: 'Update request for client profile VRT-0089 — proposed change to risk tolerance from Conservative to Aggressive. Source: automated rebalancing signal. Human review required per governance policy.' },
        { id: 'AUTH-005', agent: 'Public Research Agent',        tool: 'publish_research_summary', risk: 'Medium',   waitMs: 310000, reasoning: 'Research synthesis output references 2 unverified public sources flagged by the RAG grounding guard. Confidence 0.74. Recommend human review before external publication.' },
      ]);
    }
  } catch (err) { next(err); }
};

exports.getHistory = async (req, res, next) => {
  try {
    const raw = await HitlHistory.find().sort({ timestamp: -1 }).limit(20).lean();
    if (raw.length) {
      // Tag recent decisions as compliance events (fire-and-forget)
      raw.slice(0, 5).forEach(h => {
        tagComplianceEvent({
          eventType: 'hitl.decision', sourceModel: 'HitlHistory', sourceId: h._id?.toString() || h.request_id || 'unknown',
          agentId: h.agent_id, agentName: h.agent, tenantId: req.tenantId,
          evidence: { tool: h.tool, decision: h.decision, by: h.decided_by },
          timestamp: h.timestamp ? new Date(h.timestamp) : undefined,
        });
      });
      const history = raw.map(h => ({ time: new Date(h.timestamp).toTimeString().slice(0, 8), agent: h.agent, tool: h.tool, decision: h.decision, by: h.decided_by }));
      res.json(history);
    } else {
      res.json([
        { time: '14:30:01', agent: 'Shipment Insight Agent',       tool: 'send_shipment_alert',      decision: 'Approved', by: 'Sarah K. (L2)'  },
        { time: '14:18:44', agent: 'Concierge Agent',              tool: 'execute_account_action',   decision: 'Rejected', by: 'Mark T. (L3)'   },
        { time: '13:55:12', agent: 'Public Research Agent',        tool: 'publish_research_summary', decision: 'Approved', by: 'Sarah K. (L2)'  },
        { time: '13:40:08', agent: 'Insurance Underwriting Agent', tool: 'generate_audit_report',    decision: 'Approved', by: 'Auto (L1)'      },
        { time: '13:22:55', agent: 'Workforce Planning and Recruitment',     tool: 'submit_compliance_report', decision: 'Approved', by: 'Rachel C. (L3)' },
        { time: '12:58:20', agent: 'Concierge Agent',              tool: 'update_model_weights',     decision: 'Approved', by: 'Mark T. (L3)'   },
      ]);
    }
  } catch (err) { next(err); }
};
