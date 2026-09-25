const mongoose = require('mongoose');
const S = new mongoose.Schema({
  token:      { type: String, required: true, unique: true },
  username:   String,
  role:       String,
  email:      String,
  sso:        { type: Boolean, default: false },
  provider:   String,
  created_at: { type: Date, default: Date.now },
  expires_at: { type: Date, required: true },
});
S.index({ expires_at: 1 }, { expireAfterSeconds: 0 });
module.exports = mongoose.model('Session', S);
