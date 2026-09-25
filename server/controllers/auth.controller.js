const jwt   = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User   = require('../models/User');
const { sign: signToken, revoke: revokeToken } = require('../services/tokenService');

// Escape user input before injecting into a RegExp to prevent ReDoS.
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// SECURITY: DEMO_PASSTHROUGH only active in development — see auth.js for rationale.
const DEMO_PASSTHROUGH = (token) =>
  process.env.NODE_ENV === 'development' &&
  token && (token.startsWith('mock_token_') || token.startsWith('sso_token_'));

exports.login = async (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ detail: 'Username and password are required' });
    const query = username.includes('@')
      ? { email: { $regex: new RegExp(`^${escapeRegex(username)}$`, 'i') } }
      : { username: username.toLowerCase() };
    const user = await User.findOne(query).select('+password_hash');
    if (!user) return res.status(401).json({ detail: 'Invalid username or password' });
    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ detail: 'Invalid username or password' });
    const token = await signToken({ id: user._id, username: user.username, role: user.role });
    res.json({ access_token: token, username: user.displayName || user.username, role: user.role });
  } catch (err) { next(err); }
};

exports.sso = async (req, res, next) => {
  // Demo SSO — disabled in production.
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ detail: 'Not found' });
  }
  try {
    // Issue a real JWT + session so the SSO token is validated the same way as a login token.
    const token = await signToken({ id: 'sso-demo', username: 'demo', role: 'admin', sso: true });
    res.json({ access_token: token, username: 'Demo User', role: 'admin', sso: true, provider: 'Azure AD (mock)', email: 'demo@veriforgeops.demo' });
  } catch (err) { next(err); }
};

exports.validate = async (req, res) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.replace('Bearer ', '');
  if (DEMO_PASSTHROUGH(token)) return res.json({ valid: true });
  try {
    jwt.verify(token, process.env.JWT_SECRET);
    const Session = require('../models/Session');
    const session = await Session.findOne({ token, expires_at: { $gt: new Date() } });
    if (!session) return res.status(401).json({ valid: false });
    res.json({ valid: true });
  } catch { res.status(401).json({ valid: false }); }
};

exports.logout = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace('Bearer ', '');
    if (!DEMO_PASSTHROUGH(token)) await revokeToken(token).catch(() => {});
    res.json({ message: 'Logged out successfully' });
  } catch (err) { next(err); }
};
