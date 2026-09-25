const mongoose = require('mongoose');
const S = new mongoose.Schema({
  ti_id:   { type: String, unique: true },
  name:    String,
  desc:    String,
  active:  { type: Boolean, default: true },
  events:  { type: Number, default: 0 },
  pattern:   String,
  action:    String,
  tenant_id: { type: String, default: 'demo' },
});
S.index({ tenant_id: 1 });
module.exports = mongoose.model('TrustInterceptor', S, 'trust_interceptors');
