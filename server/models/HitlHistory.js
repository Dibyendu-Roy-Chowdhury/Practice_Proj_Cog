const mongoose = require('mongoose');
const S = new mongoose.Schema({
  time:      String,
  timestamp: { type: Date, default: Date.now },
  agent:     String,
  agent_id:  String,
  tool:      String,
  decision:  String,
  by:        String,
});
S.index({ timestamp: -1 });
module.exports = mongoose.model('HitlHistory', S, 'hitl_history');
