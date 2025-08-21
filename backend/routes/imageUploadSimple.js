const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
  uploadAnswerImages,
  getAnswerImages,
  gradeImageAnswer,
  getSubmissionsForGrading,
  serveImage
} = require('../controllers/imageUploadController');

// Upload answer images for CQ/Essay questions
router.post('/:assessmentId/upload/:questionId', auth, uploadAnswerImages);

// Get uploaded images for a question
router.get('/:assessmentId/images/:questionId', auth, getAnswerImages);

// Grade student's image answers (Teacher only)
router.post('/:assessmentId/grade/:questionId', auth, gradeImageAnswer);

// Get all students' submissions for grading (Teacher only)
router.get('/submissions/:assessmentId', auth, getSubmissionsForGrading);

// Serve uploaded images with authentication
router.get('/serve/:filename', auth, serveImage);

module.exports = router;
