const express = require('express');
const router = express.Router();

// Import controllers & middleware
const {
  registerUser,
  loginUser,
  logoutUser,
  refreshToken,
  getCurrentUser,
  forgotPassword,
  resetPassword
} = require('../controllers/authController');

const { authenticateUser } = require('../middleware/auth');

// Authentication routes
router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/logout', authenticateUser, logoutUser);
router.post('/refresh', refreshToken);
router.get('/me', authenticateUser, getCurrentUser);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password/:resetToken', resetPassword);

module.exports = router;
