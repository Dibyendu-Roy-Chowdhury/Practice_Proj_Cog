const mongoose = require('mongoose');
const versionEntrySchema = new mongoose.Schema({
  version:        Number,
  version_string: String,
  change_type:    { type: String, enum: ['create','update','rollback'] },
  changed_fields: [String],
  snapshot_date:  Date,
  updated_by:     String,
  desc:           String,
  model_id:       String,
}, { _id: false });

const S = new mongoose.Schema({
  id:             { type: String, unique: true },
  agent_id:       { type: String, required: true, unique: true },
  name:           { type: String, required: true },
  arn_id:         String,
  arn:            String,
  desc:           String,
  description:    String,
  role:           String,
  cloud_provider: { type: String, enum: ['AWS','Azure','GCP','OpenAI','Palantir'] },
  model_id:       String,
  log_group:      String,
  log_stream:     String,
  status:         { type: String, enum: ['Active','Degraded','Staging','Draining','Inactive'], default: 'Active' },
  version:        { type: Number, default: 1 },
  version_string: { type: String, default: 'v1' },
  change_type:    String,
  changed_fields: [String],
  crossAccount:   Boolean,
  accessKeyId:    { type: String, select: false },
  secretAccessKey:{ type: String, select: false },
  cloud_account_id: String,
  cloud_region:   String,
  created_by:     String,
  updated_by:     String,
  created_at:     { type: Date, default: Date.now },
  updated_at:     { type: Date, default: Date.now },
  versionHistory: [versionEntrySchema],
  tenant_id:      { type: String, default: 'demo' },
});
S.index({ status: 1 });
S.index({ cloud_provider: 1 });
S.index({ name: 1 });
S.index({ tenant_id: 1, status: 1 });
module.exports = mongoose.model('Agent', S);
