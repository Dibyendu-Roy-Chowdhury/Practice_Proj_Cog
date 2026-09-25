const mongoose = require('mongoose');

const testResultSchema = new mongoose.Schema({
  case_id:  String,
  input:    String,
  expected: String,
  actual:   String,
  passed:   Boolean,
  score:    Number,   // 0–1
}, { _id: false });

const metricsSchema = new mongoose.Schema({
  hallucination_score:       { type: Number, min: 0, max: 1, default: 0 },
  factual_accuracy:          { type: Number, min: 0, max: 1, default: 0 },
  toxicity_score:            { type: Number, min: 0, max: 1, default: 0 },
  guardrail_bypass_attempts: { type: Number, default: 0 },
  latency_ms:                { type: Number, default: 0 },
  token_cost_usd:            { type: Number, default: 0 },
  composite_score:           { type: Number, min: 0, max: 1, default: 0 },
}, { _id: false });

const S = new mongoose.Schema({
  eval_id:      { type: String, required: true, unique: true },
  agent_id:     { type: String, required: true },
  episode_id:   String,   // optional ref to EpisodeCost
  suite_id:     String,   // optional ref to AgentTestSuite
  eval_type:    { type: String, enum: ['manual', 'scheduled', 'ci-triggered', 'regression'], default: 'manual' },
  status:       { type: String, enum: ['pending', 'running', 'completed', 'failed'], default: 'pending' },
  metrics:      { type: metricsSchema, default: () => ({}) },
  test_results: [testResultSchema],
  model_id:     String,
  triggered_by: String,
  started_at:   Date,
  completed_at: Date,
  notes:        String,
  tenant_id:    { type: String, default: 'demo' },
});
S.index({ agent_id: 1, started_at: -1 });
S.index({ tenant_id: 1, status: 1 });
S.index({ tenant_id: 1, started_at: -1 });

module.exports = mongoose.model('AgentEvaluation', S, 'agent_evaluations');
