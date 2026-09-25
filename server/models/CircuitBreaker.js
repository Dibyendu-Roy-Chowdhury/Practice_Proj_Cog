const mongoose = require('mongoose');
const S = new mongoose.Schema({
  cb_id:     { type: String, unique: true },
  agent:     String,
  agent_id:  String,
  model:     String,
  type:      String,
  threshold: Number,
  current:   Number,
  status:    { type: String, enum: ['Armed','Triggered','Disabled'], default: 'Armed' },
  tenant_id: { type: String, default: 'demo' },
});
S.index({ agent_id: 1 });
S.index({ tenant_id: 1 });
module.exports = mongoose.model('CircuitBreaker', S, 'circuit_breakers');
