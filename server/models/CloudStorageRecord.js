const mongoose = require('mongoose');

const providerStateSchema = new mongoose.Schema({
  status:    { type: String, enum: ['pending', 'synced', 'failed', 'skipped'], default: 'pending' },
  synced_at: Date,
  error:     String,
  uri:       String,
}, { _id: false });

const S = new mongoose.Schema({
  record_id:    { type: String, unique: true, default: () => `csr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}` },
  record_type:  { type: String, enum: ['evaluation', 'compliance_report', 'audit_export', 'episode_cost', 'agent_telemetry'], required: true },
  source_id:    { type: String, required: true },
  storage_key:  { type: String, required: true },
  content_hash: String,   // SHA-256 for integrity verification
  sync_state: {
    aws:   { type: providerStateSchema, default: () => ({ status: 'skipped' }) },
    azure: { type: providerStateSchema, default: () => ({ status: 'skipped' }) },
    gcp:   { type: providerStateSchema, default: () => ({ status: 'skipped' }) },
  },
  created_at:   { type: Date, default: Date.now },
  tenant_id:    { type: String, default: 'demo' },
});

S.index({ tenant_id: 1, created_at: -1 });
S.index({ source_id: 1 });
S.index({ 'sync_state.aws.status': 1 });
S.index({ 'sync_state.azure.status': 1 });
S.index({ 'sync_state.gcp.status': 1 });

module.exports = mongoose.model('CloudStorageRecord', S, 'cloud_storage_records');
