const mongoose = require('mongoose');
const S = new mongoose.Schema({
  anomaly_id: { type: String, unique: true },
  agent:      String,
  agent_id:   String,
  timestamp:  { type: Date, default: Date.now },
  category:   String,
  score:      Number,
  action:     String,
  resolved:   { type: Boolean, default: false },
});
S.index({ timestamp: -1 });
S.index({ agent_id: 1, timestamp: -1 });
module.exports = mongoose.model('Anomaly', S, 'anomalies');
