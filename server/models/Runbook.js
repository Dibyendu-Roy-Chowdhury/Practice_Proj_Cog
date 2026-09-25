const mongoose = require('mongoose');
const stepSchema = new mongoose.Schema({
  title:      String,
  desc:       String,
  command:    String,
  verify:     String,
  executable: Boolean,
}, { _id: false });

const escalationSchema = new mongoose.Schema({ from: String, to: String, threshold: String }, { _id: false });

const S = new mongoose.Schema({
  runbook_id:       { type: String, unique: true },
  title:            String,
  severity:         String,
  personas:         [String],
  triggers:         [String],
  steps:            [stepSchema],
  escalation:       [escalationSchema],
  relatedIncidents: [String],
});
module.exports = mongoose.model('Runbook', S, 'runbooks');
