const User = require('../models/User');

exports.getUsers = async (_req, res, next) => {
  try {
    const raw = await User.find().select('-password_hash -__v').lean();
    const users = raw.map(u => ({
      id: u._id,
      username: u.username,
      email: u.email,
      role: u.role,
      status: u.status,
      last_login: 'Just now',
      created_at: '2026-05-01',
    }));
    res.json({ status: 'success', users });
  } catch (err) { next(err); }
};
