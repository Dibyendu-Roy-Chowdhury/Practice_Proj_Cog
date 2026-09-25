const mongoose = require('mongoose');

const controlIdsSchema = new mongoose.Schema({
  ISO42001:    [String],
  NIST_AI_RMF: [String],
  SOC2:        [String],
}, { _id: false });

const S = new mongoose.Schema({
  ce_id:        { type: String, required: true, unique: true },
  event_type:   { type: String, required: true },
  source_model: { type: String, required: true },   // 'TrustInterceptor' | 'HitlHistory' | 'AgentEvaluation' | 'InterventionLog' | 'Agent'
  source_id:    { type: String, required: true },   // ti_id / log_id / eval_id / agent_id
  agent_id:     String,
  agent_name:   String,
  timestamp:    { type: Date, default: Date.now },
  severity:     { type: String, enum: ['INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'], default: 'INFO' },
  control_ids:  { type: controlIdsSchema, default: () => ({}) },
  frameworks:   [String],
  evidence:     mongoose.Schema.Types.Mixed,   // immutable snapshot of originating record
  report_id:    String,
  tenant_id:    { type: String, default: 'demo' },
});

// ComplianceEvent is write-once — no updates after creation.
S.pre('findOneAndUpdate', function () { throw new Error('ComplianceEvent records are immutable'); });
S.pre('updateOne',        function () { throw new Error('ComplianceEvent records are immutable'); });
S.pre('updateMany',       function () { throw new Error('ComplianceEvent records are immutable'); });

S.index({ tenant_id: 1, timestamp: -1 });
S.index({ tenant_id: 1, event_type: 1 });
S.index({ agent_id: 1, timestamp: -1 });
S.index({ report_id: 1 });

module.exports = mongoose.model('ComplianceEvent', S, 'compliance_events');
