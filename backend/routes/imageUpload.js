const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const auth = require('../middleware/auth');
const roleCheck = require('../middleware/roleCheck');
const {
  uploadMiddleware,
  uploadAnswerImages,
  getAnswerImages,
  gradeImageAnswer,
  getSubmissionsForGrading,
  serveImage
} = require('../controllers/imageUploadController');

// @route   POST /api/image-upload/:assessmentId/upload/:questionId
// @desc    Upload answer images for CQ/Essay questions
// @access  Private (Student only)
router.post(
  '/:assessmentId/upload/:questionId',
  auth,
  uploadAnswerImages
);

// @route   GET /api/image-upload/:assessmentId/images/:questionId
// @desc    Get uploaded images for a question
// @access  Private (Student - own images, Teacher - all images)
router.get(
  '/:assessmentId/images/:questionId',
  auth,
  getAnswerImages
);

// @route   POST /api/image-upload/:assessmentId/grade/:questionId
// @desc    Grade student's image answers (Teacher only)
// @access  Private (Teacher only)
router.post(
  '/:assessmentId/grade/:questionId',
  auth,
  [
    body('studentId')
      .isMongoId()
      .withMessage('Valid student ID is required'),
    body('marksAwarded')
      .isFloat({ min: 0 })
      .withMessage('Marks awarded must be a positive number'),
    body('feedback')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .withMessage('Feedback must not exceed 1000 characters')
  ],
  gradeImageAnswer
);

// @route   GET /api/image-upload/submissions/:assessmentId
// @desc    Get all students' submissions for grading (Teacher only)
// @access  Private (Teacher only)
router.get(
  '/submissions/:assessmentId',
  auth,
  getSubmissionsForGrading
);

// @route   GET /api/image-upload/serve/:filename
// @desc    Serve uploaded images with authentication
// @access  Private (with proper authentication)
router.get(
  '/serve/:filename',
  auth,
  serveImage
);

module.exports = router;
