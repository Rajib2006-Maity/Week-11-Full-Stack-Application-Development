const express = require('express');
const { requireAuth } = require('../middleware/auth');
const {
  register,
  login,
  refreshToken,
  logout,
  logoutAllDevices,
  getMe,
  updateMe,
  changePassword
} = require('../controllers/authController');

const router = express.Router();

router.post('/register', register);
router.post('/login', login);
router.post('/refresh-token', refreshToken);
router.post('/logout', logout);

router.get('/me', requireAuth, getMe);
router.put('/me', requireAuth, updateMe);
router.put('/me/password', requireAuth, changePassword);
router.post('/logout-all', requireAuth, logoutAllDevices);

module.exports = router;
