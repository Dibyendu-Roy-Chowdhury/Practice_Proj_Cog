const mongoose = require('mongoose');
const S = new mongoose.Schema({
  rule_id:   { type: String, unique: true },
  name:      String,
  condition: String,
  action:    String,
  enabled:   Boolean,
  severity:  String,
  triggered: { type: Number, default: 0 },
});
module.exports = mongoose.model('SelfHealingRule', S, 'self_healing_rules');
