const mongoose = require('mongoose');
const S = new mongoose.Schema({
  id:            Number,
  username:      { type: String, required: true, unique: true },
  displayName:   { type: String },
  email:         { type: String, required: true, unique: true },
  role:          { type: String, enum: ['admin','user'], default: 'user' },
  status:        { type: String, enum: ['Active','Inactive'], default: 'Active' },
  password_hash: { type: String, select: false },
  last_login:    Date,
  created_at:    { type: Date, default: Date.now },
});
S.index({ role: 1 });
module.exports = mongoose.model('User', S);
