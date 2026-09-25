const mongoose = require('mongoose');
const S = new mongoose.Schema({
  dep_id:  { type: String, unique: true },
  name:    String,
  version: String,
  model:   String,
  env:     String,
  date:    Date,
  by:      String,
  status:  String,
});
S.index({ date: -1 });
S.index({ env: 1, status: 1 });
module.exports = mongoose.model('Deployment', S, 'deployments');
