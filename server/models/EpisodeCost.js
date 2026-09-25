const mongoose = require('mongoose');
const S = new mongoose.Schema({
  episode_id: { type: String, unique: true },
  agent:      String,
  agent_id:   String,
  tokens:     Number,
  tools:      Number,
  compute:    Number,
  llm:        Number,
  total:      Number,
  status:     String,
  created_at: { type: Date, default: Date.now },
  tenant_id:  { type: String, default: 'demo' },
});
S.index({ agent_id: 1, created_at: -1 });
S.index({ tenant_id: 1, created_at: -1 });
module.exports = mongoose.model('EpisodeCost', S, 'episode_costs');
