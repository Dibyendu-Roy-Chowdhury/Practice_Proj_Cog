const mongoose = require('mongoose');
const S = new mongoose.Schema({
  date:     String,
  date_iso: { type: Date, unique: true },
  cost:     Number,
  tokens:   Number,
});
S.index({ date_iso: -1 });
module.exports = mongoose.model('DailyCostMetric', S, 'daily_cost_metrics');
