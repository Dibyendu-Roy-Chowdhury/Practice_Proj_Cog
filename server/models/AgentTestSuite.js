const mongoose = require('mongoose');

const testCaseSchema = new mongoose.Schema({
  case_id:  { type: String, required: true },
  input:    { type: String, required: true },
  expected: { type: String, required: true },
  tags:     [String],   // e.g. ['hallucination','toxicity','tool-use','guardrail']
}, { _id: false });

const S = new mongoose.Schema({
  suite_id:    { type: String, required: true, unique: true },
  name:        { type: String, required: true },
  description: String,
  agent_id:    { type: String, required: true },
  cases:       [testCaseSchema],
  created_by:  String,
  created_at:  { type: Date, default: Date.now },
  updated_at:  { type: Date, default: Date.now },
  tenant_id:   { type: String, default: 'demo' },
});
S.index({ agent_id: 1 });
S.index({ tenant_id: 1 });

module.exports = mongoose.model('AgentTestSuite', S, 'agent_test_suites');
