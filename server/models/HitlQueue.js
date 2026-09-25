const mongoose = require('mongoose');
const S = new mongoose.Schema({
  request_id: { type: String, unique: true },
  agent:      String,
  agent_id:   String,
  tool:       String,
  risk:       String,
  waitMs:     Number,
  reasoning:  String,
  status:     { type: String, enum: ['pending','approved','rejected','delegated','timeout'], default: 'pending' },
  decision:   String,
  decided_by: String,
  decided_at: Date,
  created_at: { type: Date, default: Date.now },
  tier:       { type: String, default: 'L1' },
});
S.index({ status: 1, created_at: -1 });
module.exports = mongoose.model('HitlQueue', S, 'hitl_queue');
