const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Protects a route: requires a valid access token in the Authorization header.
 * On success, attaches the authenticated user document to req.user.
 */
async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) {
      return res.status(401).json({ error: 'Not authenticated. No access token provided.' });
    }

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    } catch (err) {
      const code = err.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'TOKEN_INVALID';
      return res.status(401).json({ error: 'Access token invalid or expired.', code });
    }

    const user = await User.findById(payload.userId);
    if (!user) {
      return res.status(401).json({ error: 'User for this token no longer exists.' });
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Does not block the request if there's no/invalid token, but attaches
 * req.user when a valid one is present. Useful for routes like "get post"
 * where we want to know if the viewer already liked it, but anyone can view.
 */
async function attachUserIfPresent(req, _res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return next();

    const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    const user = await User.findById(payload.userId);
    if (user) req.user = user;
    next();
  } catch (err) {
    next();
  }
}

module.exports = { requireAuth, attachUserIfPresent };
