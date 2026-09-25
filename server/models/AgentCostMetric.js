const mongoose = require('mongoose');
const S = new mongoose.Schema({
  agentId:      String,
  agentName:    String,
  inputTokens:  Number,
  outputTokens: Number,
  totalCost:    String,
  totalCostNum: Number,
  requests:     Number,
  period_start: Date,
  period_end:   Date,
});
S.index({ agentId: 1 });
module.exports = mongoose.model('AgentCostMetric', S, 'agent_cost_metrics');
