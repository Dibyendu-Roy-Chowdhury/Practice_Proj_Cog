const jwt = require('jsonwebtoken');
const Session = require('../models/Session');

const auth = async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;

  // Allow mock/SSO tokens in development only.
  // Double-check: NODE_ENV must be explicitly 'development' (not undefined, not empty).
  if (process.env.NODE_ENV === 'development' &&
      process.env.REACT_APP_ENABLE_MOCK_AUTH === 'true' &&
      token && (token.startsWith('mock_token_') || token.startsWith('sso_token_'))) {
    req.user = { username: 'admin', role: 'admin', email: 'admin@veriforgeops.demo' };
    return next();
  }

  if (!token) return res.status(401).json({ error: 'No token provided' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Verify session still exists in DB
    const session = await Session.findOne({ token, expires_at: { $gt: new Date() } });
    if (!session) return res.status(401).json({ error: 'Session expired or revoked' });
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};

const requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Admin access required' });
  next();
};

module.exports = { auth, requireAdmin };
