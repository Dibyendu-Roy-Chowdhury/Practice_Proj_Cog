const mongoose = require('mongoose');
const S = new mongoose.Schema({
  agent_id:       { type: String, unique: true },
  agent_name:     String,
  reason:         String,
  quarantine_type:{ type: String, enum: ['auto','manual'], default: 'manual' },
  quarantined_at: { type: Date, default: Date.now },
  lifted_by:      { type: String, default: null },
  lifted_at:      { type: Date, default: null },
});
module.exports = mongoose.model('MeshQuarantine', S, 'mesh_quarantine');
