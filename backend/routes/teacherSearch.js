// Teacher Search Routes
// উন্নত শিক্ষক অনুসন্ধান রুট সিস্টেম

const express = require('express');
const { query } = require('express-validator');
const {
  searchTeachers,
  getSearchSuggestions,
  quickFilterTeachers,
  getPopularSearchData
} = require('../controllers/teacherSearchController');

const { optionalAuth } = require('../middleware/auth');

const router = express.Router();

// ============================================
// 📝 VALIDATION MIDDLEWARE
// ============================================

// Advanced search validation
const validateAdvancedSearch = [
  query('query')
    .optional()
    .isLength({ max: 100 })
    .withMessage('Search query cannot exceed 100 characters'),
    
  query('class')
    .optional()
    .isInt({ min: 1, max: 12 })
    .withMessage('Class must be between 1 and 12'),
    
  query('subject')
    .optional()
    .isLength({ max: 50 })
    .withMessage('Subject cannot exceed 50 characters'),
    
  query('experience')
    .optional()
    .isIn(['0-5', '5-10', '10+'])
    .withMessage('Invalid experience range'),
    
  query('rating')
    .optional()
    .isFloat({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
    
  query('verified')
    .optional()
    .isBoolean()
    .withMessage('Verified must be a boolean'),
    
  query('availability')
    .optional()
    .isBoolean()
    .withMessage('Availability must be a boolean'),
    
  query('sortBy')
    .optional()
    .isIn(['relevance', 'rating', 'experience', 'name', 'reviews'])
    .withMessage('Invalid sort option'),
    
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
    
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50')
];

// Search suggestions validation
const validateSearchSuggestions = [
  query('query')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('Query must be between 1-50 characters'),
    
  query('limit')
    .optional()
    .isInt({ min: 1, max: 20 })
    .withMessage('Limit must be between 1 and 20')
];

// Quick filter validation
const validateQuickFilter = [
  query('type')
    .isIn(['class', 'subject', 'rating', 'experience', 'verified', 'available'])
    .withMessage('Invalid filter type'),
    
  query('value')
    .notEmpty()
    .withMessage('Filter value is required'),
    
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
    
  query('limit')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('Limit must be between 1 and 50')
];

// ============================================
// 🌐 PUBLIC SEARCH ROUTES
// ============================================

// Advanced teacher search
router.get('/teachers', 
  optionalAuth,              // Optional authentication for personalized results
  validateAdvancedSearch, 
  searchTeachers
);

// Search suggestions (autocomplete)
router.get('/suggestions', 
  validateSearchSuggestions, 
  getSearchSuggestions
);

// Quick filter search
router.get('/quick-filter', 
  optionalAuth,
  validateQuickFilter, 
  quickFilterTeachers
);

// Popular search data (trending subjects, classes, etc.)
router.get('/popular', getPopularSearchData);

// ============================================
// 🎯 SPECIALIZED SEARCH ROUTES
// ============================================

// Search by class (e.g., /api/search/class/10)
router.get('/class/:classNumber', optionalAuth, async (req, res, next) => {
  req.query.type = 'class';
  req.query.value = req.params.classNumber;
  next();
}, validateQuickFilter, quickFilterTeachers);

// Search by subject (e.g., /api/search/subject/physics)
router.get('/subject/:subjectName', optionalAuth, async (req, res, next) => {
  req.query.type = 'subject';
  req.query.value = req.params.subjectName;
  next();
}, quickFilterTeachers);

// Search best teachers (4+ rating)
router.get('/best-teachers', optionalAuth, async (req, res, next) => {
  req.query.type = 'rating';
  req.query.value = '4';
  next();
}, quickFilterTeachers);

// Search verified teachers
router.get('/verified-teachers', optionalAuth, async (req, res, next) => {
  req.query.type = 'verified';
  req.query.value = 'true';
  next();
}, quickFilterTeachers);

// Search available teachers
router.get('/available-teachers', optionalAuth, async (req, res, next) => {
  req.query.type = 'available';
  req.query.value = 'true';
  next();
}, quickFilterTeachers);

// ============================================
// 📊 ANALYTICS ROUTES (Future Implementation)
// ============================================

// Search analytics (admin only)
// router.get('/analytics', protect, authorize('admin'), getSearchAnalytics);

// Popular search trends
// router.get('/trends', getSearchTrends);

// Search performance metrics
// router.get('/metrics', protect, authorize('admin'), getSearchMetrics);

module.exports = router;
