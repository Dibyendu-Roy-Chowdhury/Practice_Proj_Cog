const mongoose = require('mongoose');
const S = new mongoose.Schema({
  alert_id:    { type: String, unique: true },
  agent_id:    String,
  agentName:   String,
  model_id:    String,
  severity:    String,
  message:     String,
  request_id:  String,
  timestamp:   { type: Date, default: Date.now },
  resolved:    { type: Boolean, default: false },
  resolved_at: Date,
  tenant_id:   { type: String, default: 'demo' },
});
S.index({ timestamp: -1 });
S.index({ agent_id: 1, timestamp: -1 });
S.index({ severity: 1, resolved: 1 });
S.index({ tenant_id: 1, severity: 1, resolved: 1 });
module.exports = mongoose.model('Alert', S);
