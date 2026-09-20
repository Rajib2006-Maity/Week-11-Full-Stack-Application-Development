const jwt = require('jsonwebtoken');

/**
 * Short-lived access token. Sent back in the JSON response body and kept by the
 * client (localStorage) so it can be attached as an Authorization: Bearer header.
 */
function generateAccessToken(user) {
  return jwt.sign(
    { userId: user._id.toString() },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m' }
  );
}

/**
 * Longer-lived refresh token. Sent as an httpOnly cookie so client-side JS
 * (and therefore XSS) can never read it directly. tokenVersion is embedded so
 * changing the password or logging out everywhere can invalidate it instantly.
 */
function generateRefreshToken(user) {
  return jwt.sign(
    { userId: user._id.toString(), tokenVersion: user.tokenVersion },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );
}

function refreshCookieOptions() {
  const isProd = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true,
    secure: isProd, // requires HTTPS in production
    sameSite: isProd ? 'none' : 'lax',
    path: '/api/auth', // cookie only sent to auth endpoints (refresh/logout)
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
  };
}

module.exports = { generateAccessToken, generateRefreshToken, refreshCookieOptions };
