const express = require('express');
const router = express.Router();

const SmartRecommendationController = require('../controllers/smartRecommendationController');
const { authenticateUser, studentOnly, teacherOnly } = require('../middleware/auth');

// 🧠 GyanGuru Smart Recommendation Engine API Routes
// Features: AI-powered personalized learning recommendations, Adaptive suggestions, Learning path optimization

// ==========================================
// 🔒 MIDDLEWARE: All routes require authentication
// ==========================================
router.use(authenticateUser);

// ==========================================
// 🎯 MAIN RECOMMENDATION ENDPOINTS
// ==========================================

/**
 * @route   POST /api/recommendations/generate
 * @desc    Generate new personalized recommendations for user
 * @access  Private (Students and Teachers)
 * @body    {Object} Generation options
 * @returns {Object} Generated recommendations
 */
router.post('/generate', SmartRecommendationController.generateRecommendations);

/**
 * @route   GET /api/recommendations
 * @desc    Get user's active recommendations with filters and pagination
 * @access  Private (All authenticated users)
 * @query   {Number} page - Page number (default: 1)
 * @query   {Number} limit - Items per page (default: 10)
 * @query   {String} type - Filter by recommendation type
 * @query   {String} subject - Filter by target subject
 * @query   {String} status - Filter by status (pending/accepted/completed)
 * @query   {String} priority - Filter by priority (critical/high/medium/low)
 * @returns {Object} User's recommendations with pagination and statistics
 */
router.get('/', SmartRecommendationController.getUserRecommendations);

/**
 * @route   GET /api/recommendations/:id
 * @desc    Get detailed recommendation by ID
 * @access  Private (Recommendation owner only)
 * @param   {String} id - Recommendation ID
 * @returns {Object} Detailed recommendation information
 */
router.get('/:id', SmartRecommendationController.getRecommendationDetails);

// ==========================================
// 🎯 RECOMMENDATION INTERACTION ENDPOINTS
// ==========================================

/**
 * @route   POST /api/recommendations/:id/accept
 * @desc    Accept a recommendation
 * @access  Private (Recommendation owner only)
 * @param   {String} id - Recommendation ID
 * @returns {Object} Acceptance confirmation
 */
router.post('/:id/accept', SmartRecommendationController.acceptRecommendation);

/**
 * @route   POST /api/recommendations/:id/start
 * @desc    Start following a recommendation
 * @access  Private (Recommendation owner only)
 * @param   {String} id - Recommendation ID
 * @returns {Object} Start confirmation
 */
router.post('/:id/start', SmartRecommendationController.startRecommendation);

/**
 * @route   PUT /api/recommendations/:id/progress
 * @desc    Update recommendation progress
 * @access  Private (Recommendation owner only)
 * @param   {String} id - Recommendation ID
 * @body    {Object} Progress data
 * @returns {Object} Progress update confirmation
 */
router.put('/:id/progress', SmartRecommendationController.updateProgress);

/**
 * @route   POST /api/recommendations/:id/complete
 * @desc    Complete a recommendation with feedback
 * @access  Private (Recommendation owner only)
 * @param   {String} id - Recommendation ID
 * @body    {Object} Completion data and feedback
 * @returns {Object} Completion confirmation with effectiveness score
 */
router.post('/:id/complete', SmartRecommendationController.completeRecommendation);

/**
 * @route   POST /api/recommendations/:id/decline
 * @desc    Decline a recommendation
 * @access  Private (Recommendation owner only)
 * @param   {String} id - Recommendation ID
 * @body    {Object} Decline reason
 * @returns {Object} Decline confirmation
 */
router.post('/:id/decline', SmartRecommendationController.declineRecommendation);

// ==========================================
// 📊 ANALYTICS AND INSIGHTS ENDPOINTS
// ==========================================

/**
 * @route   GET /api/recommendations/analytics
 * @desc    Get comprehensive recommendation analytics for user
 * @access  Private (All authenticated users)
 * @query   {Number} timeframe - Days to analyze (default: 30)
 * @returns {Object} Detailed analytics and statistics
 */
router.get('/analytics', SmartRecommendationController.getRecommendationAnalytics);

/**
 * @route   GET /api/recommendations/insights
 * @desc    Get personalized learning insights and suggestions
 * @access  Private (Students only)
 * @returns {Object} Learning insights and recommendations
 */
router.get('/insights', studentOnly, SmartRecommendationController.getLearningInsights);

// ==========================================
// 🎯 SPECIALIZED RECOMMENDATION ENDPOINTS
// ==========================================

/**
 * @route   GET /api/recommendations/types
 * @desc    Get available recommendation types and their descriptions
 * @access  Private (All authenticated users)
 * @returns {Object} Recommendation types information
 */
router.get('/types', async (req, res) => {
  try {
    const recommendationTypes = {
      'practice_questions': {
        name: 'Practice Questions',
        description: 'Targeted practice questions based on your weak areas',
        icon: '🎯',
        estimatedTime: '15-30 minutes',
        difficulty: 'Adaptive',
        benefits: ['Skill reinforcement', 'Performance improvement', 'Confidence building']
      },
      'study_materials': {
        name: 'Study Materials',
        description: 'Curated study resources matching your learning style',
        icon: '📚',
        estimatedTime: '30-60 minutes',
        difficulty: 'Variable',
        benefits: ['Conceptual understanding', 'Knowledge expansion', 'Reference materials']
      },
      'difficulty_adjustment': {
        name: 'Difficulty Optimization',
        description: 'Personalized difficulty level adjustments for optimal learning',
        icon: '⚖️',
        estimatedTime: '1-2 weeks',
        difficulty: 'Adaptive',
        benefits: ['Optimal challenge level', 'Better learning outcomes', 'Reduced frustration']
      },
      'learning_path': {
        name: 'Learning Path',
        description: 'Structured learning journey with clear milestones',
        icon: '🛤️',
        estimatedTime: '2-4 weeks',
        difficulty: 'Progressive',
        benefits: ['Systematic progress', 'Goal achievement', 'Comprehensive mastery']
      },
      'revision_topics': {
        name: 'Revision Focus',
        description: 'Smart revision suggestions based on forgetting curves',
        icon: '🔄',
        estimatedTime: '20-40 minutes',
        difficulty: 'Review',
        benefits: ['Knowledge retention', 'Memory strengthening', 'Exam preparation']
      },
      'skill_building': {
        name: 'Skill Development',
        description: 'Targeted skill building exercises and activities',
        icon: '💪',
        estimatedTime: '45-90 minutes',
        difficulty: 'Progressive',
        benefits: ['Skill enhancement', 'Competency development', 'Practical application']
      },
      'concept_reinforcement': {
        name: 'Concept Reinforcement',
        description: 'Deep-dive into fundamental concepts for stronger understanding',
        icon: '🧠',
        estimatedTime: '30-60 minutes',
        difficulty: 'Foundational',
        benefits: ['Conceptual clarity', 'Foundation strengthening', 'Knowledge consolidation']
      },
      'exam_preparation': {
        name: 'Exam Preparation',
        description: 'Strategic exam preparation with timed practice and revision',
        icon: '📝',
        estimatedTime: '1-3 weeks',
        difficulty: 'Assessment Level',
        benefits: ['Exam readiness', 'Performance optimization', 'Stress reduction']
      },
      'weak_area_focus': {
        name: 'Weak Area Focus',
        description: 'Intensive focus on identified weak areas with targeted resources',
        icon: '🎯',
        estimatedTime: '1-2 weeks',
        difficulty: 'Targeted',
        benefits: ['Gap closure', 'Performance balance', 'Confidence improvement']
      },
      'strength_enhancement': {
        name: 'Strength Enhancement',
        description: 'Advanced challenges to further develop your strong areas',
        icon: '⭐',
        estimatedTime: '30-45 minutes',
        difficulty: 'Advanced',
        benefits: ['Excellence development', 'Advanced skills', 'Leadership in subjects']
      }
    };

    res.status(200).json({
      success: true,
      message: 'Recommendation types retrieved successfully',
      data: {
        types: recommendationTypes,
        totalTypes: Object.keys(recommendationTypes).length,
        categories: {
          'performance': ['practice_questions', 'weak_area_focus', 'difficulty_adjustment'],
          'content': ['study_materials', 'concept_reinforcement', 'revision_topics'],
          'planning': ['learning_path', 'exam_preparation'],
          'development': ['skill_building', 'strength_enhancement']
        }
      }
    });

  } catch (error) {
    console.error('❌ Get recommendation types error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve recommendation types',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/recommendations/bulk-action
 * @desc    Perform bulk actions on multiple recommendations
 * @access  Private (All authenticated users)
 * @body    {Object} Bulk action data
 * @returns {Object} Bulk action results
 */
router.post('/bulk-action', async (req, res) => {
  try {
    const { action, recommendationIds, data = {} } = req.body;
    const userId = req.user._id;

    if (!action || !recommendationIds || !Array.isArray(recommendationIds)) {
      return res.status(400).json({
        success: false,
        message: 'Action and recommendation IDs array are required'
      });
    }

    console.log(`🔄 Performing bulk action: ${action} on ${recommendationIds.length} recommendations`);

    const Recommendation = require('../models/Recommendation');
    const results = {
      successful: [],
      failed: [],
      skipped: []
    };

    // Find all recommendations
    const recommendations = await Recommendation.find({
      _id: { $in: recommendationIds },
      userId,
      isActive: true
    });

    if (recommendations.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No valid recommendations found'
      });
    }

    // Perform bulk action
    for (const recommendation of recommendations) {
      try {
        switch (action) {
          case 'accept':
            if (recommendation.userResponse.status === 'pending') {
              await recommendation.accept();
              results.successful.push(recommendation._id);
            } else {
              results.skipped.push({
                id: recommendation._id,
                reason: `Already ${recommendation.userResponse.status}`
              });
            }
            break;

          case 'decline':
            if (['pending', 'accepted'].includes(recommendation.userResponse.status)) {
              recommendation.userResponse.status = 'declined';
              recommendation.userResponse.feedback = data.reason || 'Bulk decline';
              recommendation.isVisible = false;
              await recommendation.save();
              results.successful.push(recommendation._id);
            } else {
              results.skipped.push({
                id: recommendation._id,
                reason: `Cannot decline - current status: ${recommendation.userResponse.status}`
              });
            }
            break;

          case 'archive':
            recommendation.isVisible = false;
            recommendation.archivedAt = new Date();
            recommendation.archiveReason = data.reason || 'Bulk archive';
            await recommendation.save();
            results.successful.push(recommendation._id);
            break;

          case 'prioritize':
            if (data.priority && ['critical', 'high', 'medium', 'low'].includes(data.priority)) {
              recommendation.priority = data.priority;
              await recommendation.save();
              results.successful.push(recommendation._id);
            } else {
              results.failed.push({
                id: recommendation._id,
                reason: 'Invalid priority value'
              });
            }
            break;

          default:
            results.failed.push({
              id: recommendation._id,
              reason: `Unknown action: ${action}`
            });
        }
      } catch (error) {
        results.failed.push({
          id: recommendation._id,
          reason: error.message
        });
      }
    }

    res.status(200).json({
      success: true,
      message: `Bulk action ${action} completed`,
      data: {
        action,
        totalProcessed: recommendationIds.length,
        results: {
          successful: results.successful.length,
          failed: results.failed.length,
          skipped: results.skipped.length
        },
        details: results
      }
    });

  } catch (error) {
    console.error('❌ Bulk action error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to perform bulk action',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/recommendations/dashboard
 * @desc    Get recommendation dashboard data for quick overview
 * @access  Private (All authenticated users)
 * @returns {Object} Dashboard data with key metrics and recommendations
 */
router.get('/dashboard', async (req, res) => {
  try {
    const userId = req.user._id;

    console.log(`📊 Getting recommendation dashboard for user: ${userId}`);

    const Recommendation = require('../models/Recommendation');

    // Get key metrics
    const [
      pendingRecommendations,
      activeRecommendations,
      recentCompleted,
      highPriorityRecommendations,
      stats
    ] = await Promise.all([
      Recommendation.find({
        userId,
        'userResponse.status': 'pending',
        isActive: true,
        isVisible: true
      }).limit(5).sort({ priority: 1, createdAt: -1 }),

      Recommendation.find({
        userId,
        'userResponse.status': { $in: ['accepted', 'partially_followed'] },
        isActive: true
      }).limit(3).sort({ 'progress.lastActivityDate': -1 }),

      Recommendation.find({
        userId,
        'userResponse.status': 'completed',
        completedAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
      }).limit(3).sort({ 'userResponse.completedAt': -1 }),

      Recommendation.find({
        userId,
        priority: { $in: ['critical', 'high'] },
        'userResponse.status': { $in: ['pending', 'accepted', 'partially_followed'] },
        isActive: true
      }).limit(3).sort({ priority: 1 }),

      Recommendation.aggregate([
        { $match: { userId: new require('mongoose').Types.ObjectId(userId) } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            pending: { $sum: { $cond: [{ $eq: ['$userResponse.status', 'pending'] }, 1, 0] } },
            active: { $sum: { $cond: [{ $in: ['$userResponse.status', ['accepted', 'partially_followed']] }, 1, 0] } },
            completed: { $sum: { $cond: [{ $eq: ['$userResponse.status', 'completed'] }, 1, 0] } },
            averageRating: { $avg: '$userResponse.rating' },
            averageCompletion: { $avg: '$progress.completionPercentage' }
          }
        }
      ])
    ]);

    const dashboard = {
      summary: {
        totalRecommendations: stats[0]?.total || 0,
        pendingCount: stats[0]?.pending || 0,
        activeCount: stats[0]?.active || 0,
        completedCount: stats[0]?.completed || 0,
        averageRating: Math.round((stats[0]?.averageRating || 0) * 10) / 10,
        completionRate: stats[0]?.total > 0 ? 
          Math.round(((stats[0]?.completed || 0) / stats[0].total) * 100) : 0
      },

      quickActions: {
        pendingRecommendations: pendingRecommendations.map(r => r.getSummary()),
        activeRecommendations: activeRecommendations.map(r => ({
          ...r.getSummary(),
          progress: r.progress.completionPercentage,
          lastActivity: r.progress.lastActivityDate
        })),
        highPriorityItems: highPriorityRecommendations.map(r => r.getSummary())
      },

      recentActivity: {
        recentlyCompleted: recentCompleted.map(r => ({
          ...r.getSummary(),
          completedAt: r.userResponse.completedAt,
          rating: r.userResponse.rating,
          effectivenessScore: r.calculateEffectiveness()
        }))
      },

      insights: {
        needsAttention: pendingRecommendations.length > 5 ? 
          'You have many pending recommendations. Consider reviewing and organizing them.' : null,
        
        goodProgress: activeRecommendations.filter(r => r.progress.completionPercentage > 50).length,
        
        suggestion: stats[0]?.averageRating > 4 ? 
          'Great job! Your high ratings show you\'re finding recommendations helpful.' :
          stats[0]?.averageRating < 3 ? 
          'Consider providing feedback to get better-suited recommendations.' : null
      }
    };

    res.status(200).json({
      success: true,
      message: 'Recommendation dashboard retrieved successfully',
      data: dashboard
    });

  } catch (error) {
    console.error('❌ Recommendation dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve recommendation dashboard',
      error: error.message
    });
  }
});

// ==========================================
// 🚨 ERROR HANDLING MIDDLEWARE
// ==========================================

// Handle 404 for recommendation routes
router.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Recommendation endpoint not found',
    availableEndpoints: [
      'POST /generate',
      'GET /',
      'GET /:id',
      'POST /:id/accept',
      'POST /:id/start',
      'PUT /:id/progress',
      'POST /:id/complete',
      'POST /:id/decline',
      'GET /analytics',
      'GET /insights',
      'GET /types',
      'POST /bulk-action',
      'GET /dashboard'
    ]
  });
});

// Error handling middleware
router.use((error, req, res, next) => {
  console.error('🚨 Smart recommendation route error:', error);
  
  res.status(error.status || 500).json({
    success: false,
    message: error.message || 'Internal server error in smart recommendation system',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});

module.exports = router;
