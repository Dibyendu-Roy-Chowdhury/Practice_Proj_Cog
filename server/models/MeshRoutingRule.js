const mongoose = require('mongoose');
const S = new mongoose.Schema({
  rule_id:            { type: String, unique: true },
  name:               String,
  primary_agent_id:   String,
  primary_agent_name: String,
  backup_agent_id:    String,
  backup_agent_name:  String,
  trigger:            String,
  revert_condition:   String,
  status:             String,
  enabled:            Boolean,
});
module.exports = mongoose.model('MeshRoutingRule', S, 'mesh_routing_rules');
