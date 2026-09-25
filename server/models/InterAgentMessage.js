const mongoose = require('mongoose');
const S = new mongoose.Schema({
  msg_id:             { type: String, unique: true },
  source_agent_id:    String,
  source_agent_name:  String,
  target_agent_id:    String,
  target_agent_name:  String,
  message_type:       String,
  payload_summary:    String,
  payload_raw:        String,
  latency_ms:         Number,
  handshake_status:   String,
  timestamp:          { type: Date, default: Date.now },
});
S.index({ timestamp: -1 });
module.exports = mongoose.model('InterAgentMessage', S, 'inter_agent_messages');
