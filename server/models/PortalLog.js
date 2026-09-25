const mongoose = require('mongoose');
const S = new mongoose.Schema({
  log_id:    Number,
  level:     { type: String, enum: ['INFO','WARNING','ERROR'] },
  timestamp: { type: Date, default: Date.now },
  action:    String,
  message:   String,
});
S.index({ timestamp: -1 });
S.index({ level: 1, timestamp: -1 });
module.exports = mongoose.model('PortalLog', S, 'portal_logs');
