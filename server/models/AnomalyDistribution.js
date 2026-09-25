const mongoose = require('mongoose');
const S = new mongoose.Schema({
  day:              String,
  'Token Spike':    Number,
  'ReAct Loop':     Number,
  'Tool Abuse':     Number,
  'Prompt Injection': Number,
  'Hallucination':  Number,
  'Memory Overflow': Number,
}, { strict: false });
module.exports = mongoose.model('AnomalyDistribution', S, 'anomaly_distribution');
