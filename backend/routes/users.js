const express = require('express');
const router = express.Router();

// Import controllers and middleware
const {
  getUserProfile,
  updateUserProfile,
  uploadAvatar,
  getTeachers,
  getStudents,
  sendConnectionRequest,
  respondToConnectionRequest,
  getUserConnections
} = require('../controllers/userController');

const { authenticateUser, teacherOnly, studentOnly } = require('../middleware/auth');
const { uploadAvatar: avatarUpload, handleUploadError } = require('../middleware/upload');

// Profile routes
router.get('/profile', authenticateUser, getUserProfile);
router.put('/profile', authenticateUser, updateUserProfile);
router.post('/avatar', authenticateUser, avatarUpload, handleUploadError, uploadAvatar);

// User listing routes
router.get('/teachers', authenticateUser, getTeachers);
router.get('/students', authenticateUser, getStudents);

// Connection routes
router.post('/connect', authenticateUser, sendConnectionRequest);
router.put('/connection/respond', authenticateUser, respondToConnectionRequest);
router.get('/connections', authenticateUser, getUserConnections);

module.exports = router;
