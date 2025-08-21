// Teacher Review Routes
// শিক্ষক রেটিং এবং রিভিউ রুট

const express = require('express');
const { body, query } = require('express-validator');
const {
  createTeacherReview,
  getTeacherReviews,
  reactToReview,
  updateTeacherReview,
  deleteTeacherReview,
  getTopRatedTeachers,
  getTeacherRatingSummary
} = require('../controllers/teacherReviewController');

const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// ============================================
// 📝 VALIDATION MIDDLEWARE
// ============================================

// Create review validation
const validateCreateReview = [
  body('rating.overall')
    .isFloat({ min: 1, max: 5 })
    .withMessage('Overall rating must be between 1 and 5'),
    
  body('rating.teaching')
    .optional()
    .isFloat({ min: 1, max: 5 })
    .withMessage('Teaching rating must be between 1 and 5'),
    
  body('rating.communication')
    .optional()
    .isFloat({ min: 1, max: 5 })
    .withMessage('Communication rating must be between 1 and 5'),
    
  body('rating.punctuality')
    .optional()
    .isFloat({ min: 1, max: 5 })
    .withMessage('Punctuality rating must be between 1 and 5'),
    
  body('rating.helpfulness')
    .optional()
    .isFloat({ min: 1, max: 5 })
    .withMessage('Helpfulness rating must be between 1 and 5'),
    
  body('review.title')
    .trim()
    .isLength({ min: 5, max: 100 })
    .withMessage('Review title must be between 5-100 characters'),
    
  body('review.content')
    .trim()
    .isLength({ min: 20, max: 1000 })
    .withMessage('Review content must be between 20-1000 characters'),
    
  body('review.pros')
    .optional()
    .isArray()
    .withMessage('Pros must be an array'),
    
  body('review.pros.*')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Each pro cannot exceed 200 characters'),
    
  body('review.cons')
    .optional()
    .isArray()
    .withMessage('Cons must be an array'),
    
  body('review.cons.*')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Each con cannot exceed 200 characters'),
    
  body('studyDuration')
    .isIn(['1-3 months', '3-6 months', '6-12 months', '1+ years'])
    .withMessage('Invalid study duration')
];

// Update review validation
const validateUpdateReview = [
  body('rating.overall')
    .optional()
    .isFloat({ min: 1, max: 5 })
    .withMessage('Overall rating must be between 1 and 5'),
    
  body('rating.teaching')
    .optional()
    .isFloat({ min: 1, max: 5 })
    .withMessage('Teaching rating must be between 1 and 5'),
    
  body('rating.communication')
    .optional()
    .isFloat({ min: 1, max: 5 })
    .withMessage('Communication rating must be between 1 and 5'),
    
  body('rating.punctuality')
    .optional()
    .isFloat({ min: 1, max: 5 })
    .withMessage('Punctuality rating must be between 1 and 5'),
    
  body('rating.helpfulness')
    .optional()
    .isFloat({ min: 1, max: 5 })
    .withMessage('Helpfulness rating must be between 1 and 5'),
    
  body('review.title')
    .optional()
    .trim()
    .isLength({ min: 5, max: 100 })
    .withMessage('Review title must be between 5-100 characters'),
    
  body('review.content')
    .optional()
    .trim()
    .isLength({ min: 20, max: 1000 })
    .withMessage('Review content must be between 20-1000 characters')
];

// React to review validation
const validateReaction = [
  body('reaction')
    .isIn(['like', 'dislike'])
    .withMessage('Reaction must be either "like" or "dislike"')
];

// Query validation for getting reviews
const validateGetReviews = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
    
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50'),
    
  query('sortBy')
    .optional()
    .isIn(['recent', 'rating', 'helpful', 'likes'])
    .withMessage('Invalid sort option'),
    
  query('rating')
    .optional()
    .isIn(['all', '1', '2', '3', '4', '5'])
    .withMessage('Invalid rating filter'),
    
  query('verified')
    .optional()
    .isIn(['all', 'verified', 'unverified'])
    .withMessage('Invalid verification filter')
];

// Top rated teachers validation
const validateTopRated = [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50'),
    
  query('class')
    .optional()
    .isInt({ min: 1, max: 12 })
    .withMessage('Class must be between 1 and 12'),
    
  query('minReviews')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Minimum reviews must be a positive integer')
];

// ============================================
// 🌐 PUBLIC ROUTES
// ============================================

// Get top rated teachers (public)
router.get('/teachers/top-rated', validateTopRated, getTopRatedTeachers);

// Get teacher reviews (public)
router.get('/teacher/:teacherId', validateGetReviews, getTeacherReviews);

// Get teacher rating summary (public)
router.get('/teacher/:teacherId/summary', getTeacherRatingSummary);

// ============================================
// 🔒 PROTECTED ROUTES (Authentication required)
// ============================================

// Apply authentication to all routes below
router.use(protect);

// ============================================
// 🎓 STUDENT-ONLY ROUTES
// ============================================

// Create teacher review (students only)
router.post('/teacher/:teacherId', 
  authorize('student'), 
  validateCreateReview, 
  createTeacherReview
);

// Update own review (students only)
router.put('/:reviewId', 
  authorize('student'), 
  validateUpdateReview, 
  updateTeacherReview
);

// Delete own review (students only, admins can also delete)
router.delete('/:reviewId', 
  authorize('student', 'admin'), 
  deleteTeacherReview
);

// ============================================
// 👥 ALL AUTHENTICATED USER ROUTES
// ============================================

// Like/dislike a review (all authenticated users)
router.post('/:reviewId/react', validateReaction, reactToReview);

// ============================================
// 🔍 ADMIN-ONLY ROUTES (Future Implementation)
// ============================================

// Get flagged reviews (admin only)
// router.get('/flagged', authorize('admin'), getFlaggedReviews);

// Moderate review (admin only)
// router.put('/:reviewId/moderate', authorize('admin'), moderateReview);

// Get review analytics (admin only)
// router.get('/analytics', authorize('admin'), getReviewAnalytics);

// ============================================
// 📊 ANALYTICS ROUTES (Future Implementation)
// ============================================

// Get teacher review trends
// router.get('/teacher/:teacherId/trends', getTeacherReviewTrends);

// Get subject-wise rating comparison
// router.get('/analytics/subjects', getSubjectRatingComparison);

// Get class-wise rating comparison
// router.get('/analytics/classes', getClassRatingComparison);

module.exports = router;
