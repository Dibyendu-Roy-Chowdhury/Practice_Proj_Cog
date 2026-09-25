const jwt  = require('jsonwebtoken');
const Session = require('../models/Session');

// Parse a JWT duration string (e.g. "1h", "24h", "7d") into milliseconds.
const parseDurationMs = (str) => {
  const match = String(str || '24h').match(/^(\d+)(s|m|h|d)$/);
  if (!match) return 24 * 60 * 60 * 1000; // fallback: 24h
  const n = parseInt(match[1], 10);
  const unit = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  return n * unit[match[2]];
};

const sign = async (payload) => {
  const expiresIn = process.env.JWT_EXPIRES_IN || '24h';
  const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn });
  const expiresMs = parseDurationMs(expiresIn);
  await Session.create({
    token,
    username:   payload.username,
    role:       payload.role,
    email:      payload.email || '',
    sso:        payload.sso   || false,
    provider:   payload.provider || null,
    created_at: new Date(),
    expires_at: new Date(Date.now() + expiresMs),
  });
  return token;
};

const revoke = async (token) => {
  await Session.deleteOne({ token });
};

module.exports = { sign, revoke };
