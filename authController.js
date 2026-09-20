const jwt = require('jsonwebtoken');
const User = require('../models/User');
const {
  generateAccessToken,
  generateRefreshToken,
  refreshCookieOptions
} = require('../utils/generateTokens');

async function register(req, res, next) {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'username, email and password are required.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    const user = await User.create({ username, email, password });

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    res.cookie('refreshToken', refreshToken, refreshCookieOptions());

    res.status(201).json({ user: user.toPublicJSON(), accessToken });
  } catch (err) {
    next(err);
  }
}

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'email and password are required.' });
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);
    res.cookie('refreshToken', refreshToken, refreshCookieOptions());

    res.json({ user: user.toPublicJSON(), accessToken });
  } catch (err) {
    next(err);
  }
}

/**
 * Reads the httpOnly refresh-token cookie, verifies it, and — if valid —
 * issues a brand new access token AND rotates the refresh token (defense
 * against replay if a refresh token is ever stolen).
 */
async function refreshToken(req, res, next) {
  try {
    const token = req.cookies?.refreshToken;
    if (!token) {
      return res.status(401).json({ error: 'No refresh token provided.' });
    }

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
    } catch (err) {
      res.clearCookie('refreshToken', { path: '/api/auth' });
      return res.status(401).json({ error: 'Refresh token invalid or expired.' });
    }

    const user = await User.findById(payload.userId);
    if (!user || user.tokenVersion !== payload.tokenVersion) {
      res.clearCookie('refreshToken', { path: '/api/auth' });
      return res.status(401).json({ error: 'Refresh token no longer valid.' });
    }

    const accessToken = generateAccessToken(user);
    const newRefreshToken = generateRefreshToken(user);
    res.cookie('refreshToken', newRefreshToken, refreshCookieOptions());

    res.json({ accessToken, user: user.toPublicJSON() });
  } catch (err) {
    next(err);
  }
}

async function logout(req, res, next) {
  try {
    res.clearCookie('refreshToken', { path: '/api/auth' });
    res.json({ message: 'Logged out.' });
  } catch (err) {
    next(err);
  }
}

/** Logs the user out on every device by bumping tokenVersion, which
 *  instantly invalidates every refresh token issued before now. */
async function logoutAllDevices(req, res, next) {
  try {
    req.user.tokenVersion += 1;
    await req.user.save();
    res.clearCookie('refreshToken', { path: '/api/auth' });
    res.json({ message: 'Logged out of all devices.' });
  } catch (err) {
    next(err);
  }
}

async function getMe(req, res) {
  res.json({ user: req.user.toPublicJSON() });
}

async function updateMe(req, res, next) {
  try {
    const { username, bio, avatar } = req.body;
    if (username) req.user.username = username;
    if (bio !== undefined) req.user.bio = bio;
    if (avatar !== undefined) req.user.avatar = avatar;
    await req.user.save();
    res.json({ user: req.user.toPublicJSON() });
  } catch (err) {
    next(err);
  }
}

async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'currentPassword and newPassword are required.' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters.' });
    }

    const user = await User.findById(req.user._id).select('+password');
    if (!(await user.comparePassword(currentPassword))) {
      return res.status(401).json({ error: 'Current password is incorrect.' });
    }

    user.password = newPassword;
    user.tokenVersion += 1; // invalidate existing refresh tokens for safety
    await user.save();

    res.clearCookie('refreshToken', { path: '/api/auth' });
    res.json({ message: 'Password updated. Please log in again.' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  register,
  login,
  refreshToken,
  logout,
  logoutAllDevices,
  getMe,
  updateMe,
  changePassword
};
