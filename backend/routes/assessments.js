const express = require('express');
const { body } = require('express-validator');
const {
  createAssessment,
  getAssessments,
  getAssessmentById,
  updateAssessment,
  deleteAssessment,
  publishAssessment,
  addParticipants,
  generateAIQuestions,
  getAssessmentAnalytics,
  archiveAssessment
} = require('../controllers/assessmentController');

const {
  startAssessment,
  getCurrentAttempt,
  saveAnswer,
  submitAssessment,
  getResults,
  pauseAssessment,
  resumeAssessment,
  reportSecurityEvent
} = require('../controllers/submissionController');

const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// Validation middleware
const validateAssessment = [
  body('title')
    .trim()
    .isLength({ min: 3, max: 200 })
    .withMessage('Title must be between 3-200 characters'),
    
  body('type')
    .isIn(['assignment', 'quiz', 'test', 'practice', 'exam', 'live-quiz', 'poll'])
    .withMessage('Invalid assessment type'),
    
  body('subject')
    .trim()
    .notEmpty()
    .withMessage('Subject is required'),
    
  body('class')
    .isInt({ min: 1, max: 12 })
    .withMessage('Class must be between 1-12'),
    
  body('schedule.startDate')
    .isISO8601()
    .withMessage('Valid start date is required'),
    
  body('schedule.endDate')
    .isISO8601()
    .withMessage('Valid end date is required')
    .custom((endDate, { req }) => {
      if (new Date(endDate) <= new Date(req.body.schedule.startDate)) {
        throw new Error('End date must be after start date');
      }
      return true;
    }),
    
  body('configuration.duration')
    .optional()
    .isInt({ min: 1, max: 480 })
    .withMessage('Duration must be between 1-480 minutes'),
    
  body('questions')
    .optional()
    .isArray()
    .withMessage('Questions must be an array'),
    
  body('questions.*.questionId')
    .optional()
    .isMongoId()
    .withMessage('Invalid question ID'),
    
  body('questions.*.marks')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Marks must be between 1-100'),
    
  body('questions.*.order')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Order must be a positive integer')
];

const validateParticipants = [
  body('studentIds')
    .optional()
    .isArray()
    .withMessage('Student IDs must be an array'),
    
  body('studentIds.*')
    .optional()
    .isMongoId()
    .withMessage('Invalid student ID'),
    
  body('openAccess.criteria.classes')
    .optional()
    .isArray()
    .withMessage('Classes must be an array'),
    
  body('openAccess.criteria.classes.*')
    .optional()
    .isInt({ min: 1, max: 12 })
    .withMessage('Class must be between 1-12')
];

const validateAIGeneration = [
  body('count')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Count must be between 1-50'),
    
  body('difficulty')
    .optional()
    .isIn(['easy', 'medium', 'hard'])
    .withMessage('Invalid difficulty level'),
    
  body('questionTypes')
    .optional()
    .isArray()
    .withMessage('Question types must be an array'),
    
  body('topics')
    .optional()
    .isArray()
    .withMessage('Topics must be an array')
];

const validateAnswer = [
  body('questionId')
    .isMongoId()
    .withMessage('Valid question ID is required'),
    
  body('answer')
    .notEmpty()
    .withMessage('Answer is required'),
    
  body('timeSpent')
    .optional()
    .isNumeric()
    .withMessage('Time spent must be a number'),
    
  body('isMarkedForReview')
    .optional()
    .isBoolean()
    .withMessage('isMarkedForReview must be a boolean')
];

const validateSecurityEvent = [
  body('eventType')
    .isIn([
      'tab_switch', 'window_blur', 'copy_attempt', 'paste_attempt', 
      'right_click', 'dev_tools', 'fullscreen_exit', 'browser_back',
      'suspicious_activity', 'webcam_violation', 'face_not_detected'
    ])
    .withMessage('Invalid event type'),
    
  body('severity')
    .optional()
    .isIn(['low', 'medium', 'high', 'critical'])
    .withMessage('Invalid severity level')
];

// All routes require authentication
router.use(protect);

// Assessment CRUD Routes (Teacher only)
router.route('/')
  .get(authorize('teacher'), getAssessments)
  .post(authorize('teacher'), validateAssessment, createAssessment);

router.route('/:id')
  .get(getAssessmentById)
  .put(authorize('teacher'), updateAssessment)
  .delete(authorize('teacher'), deleteAssessment);

// Assessment Management Routes (Teacher only)
router.post('/:id/publish', authorize('teacher'), publishAssessment);
router.post('/:id/archive', authorize('teacher'), archiveAssessment);

// Participant Management (Teacher only)
router.post('/:id/participants', 
  authorize('teacher'), 
  validateParticipants, 
  addParticipants
);

// AI Features (Teacher only)
router.post('/:id/generate-questions', 
  authorize('teacher'), 
  validateAIGeneration, 
  generateAIQuestions
);

// Analytics (Teacher only)
router.get('/:id/analytics', authorize('teacher'), getAssessmentAnalytics);

// Student Assessment Routes
router.post('/:id/start', authorize('student'), startAssessment);
router.get('/:id/attempt', authorize('student'), getCurrentAttempt);
router.post('/:id/answer', authorize('student'), validateAnswer, saveAnswer);
router.post('/:id/submit', authorize('student'), submitAssessment);
router.get('/:id/results', authorize('student'), getResults);
router.post('/:id/pause', authorize('student'), pauseAssessment);
router.post('/:id/resume', authorize('student'), resumeAssessment);
router.post('/:id/security-event', authorize('student'), validateSecurityEvent, reportSecurityEvent);

module.exports = router;
