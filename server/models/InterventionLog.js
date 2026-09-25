const mongoose = require('mongoose');
const S = new mongoose.Schema({
  log_id:     { type: String, unique: true },
  rule:       String,
  agent:      String,
  agent_id:   String,
  action:     String,
  timestamp:  { type: Date, default: Date.now },
  overridden: { type: Boolean, default: false },
});
S.index({ timestamp: -1 });
module.exports = mongoose.model('InterventionLog', S, 'intervention_log');
