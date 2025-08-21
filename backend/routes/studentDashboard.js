const express = require('express');
const router = express.Router();
const studentDashboardController = require('../controllers/studentDashboardController');
const { authenticateUser } = require('../middleware/auth');

// 📊 GyanGuru Student Dashboard API Routes
// Features: Performance analytics, Progress tracking, Class comparisons

// ==========================================
// 🔒 MIDDLEWARE: All routes require authentication
// ==========================================
router.use(authenticateUser);

// ==========================================
// 📊 DASHBOARD OVERVIEW ROUTES
// ==========================================

/**
 * @route   GET /api/student-dashboard/overview
 * @desc    Get comprehensive dashboard overview
 * @access  Private (Student)
 * @returns {Object} Dashboard data with overview, analytics, and insights
 */
router.get('/overview', studentDashboardController.getDashboardOverview);

// ==========================================
// 📚 SUBJECT ANALYSIS ROUTES
// ==========================================

/**
 * @route   GET /api/student-dashboard/subjects
 * @desc    Get detailed subject-wise performance analysis
 * @access  Private (Student)
 * @query   {String} subject - Optional specific subject name
 * @query   {String} timeframe - month/quarter/year (default: month)
 * @returns {Object} Subject performance data and comparisons
 */
router.get('/subjects', studentDashboardController.getSubjectAnalysis);

/**
 * @route   GET /api/student-dashboard/subjects/:subject
 * @desc    Get specific subject detailed analysis
 * @access  Private (Student)
 * @param   {String} subject - Subject name
 * @returns {Object} Detailed subject analysis with trends and recommendations
 */
router.get('/subjects/:subject', (req, res, next) => {
  req.query.subject = req.params.subject;
  studentDashboardController.getSubjectAnalysis(req, res, next);
});

// ==========================================
// 📈 PROGRESS TRACKING ROUTES
// ==========================================

/**
 * @route   GET /api/student-dashboard/progress
 * @desc    Get monthly progress tracking data
 * @access  Private (Student)
 * @query   {Number} months - Number of months to include (default: 6)
 * @query   {String} subject - Optional specific subject
 * @returns {Object} Progress trends, monthly details, and predictions
 */
router.get('/progress', studentDashboardController.getMonthlyProgress);

/**
 * @route   GET /api/student-dashboard/progress/trends
 * @desc    Get progress trends and analytics
 * @access  Private (Student)
 * @returns {Object} Trend analysis and performance patterns
 */
router.get('/progress/trends', (req, res, next) => {
  req.query.trends_only = true;
  studentDashboardController.getMonthlyProgress(req, res, next);
});

// ==========================================
// 🎯 WEAK AREAS & IMPROVEMENT ROUTES
// ==========================================

/**
 * @route   GET /api/student-dashboard/weak-areas
 * @desc    Get detailed weak areas analysis
 * @access  Private (Student)
 * @returns {Object} Weak areas identification with improvement plans
 */
router.get('/weak-areas', studentDashboardController.getWeakAreasAnalysis);

/**
 * @route   GET /api/student-dashboard/suggestions
 * @desc    Get personalized improvement suggestions
 * @access  Private (Student)
 * @returns {Object} AI-powered improvement suggestions and study plans
 */
router.get('/suggestions', studentDashboardController.getImprovementSuggestions);

/**
 * @route   GET /api/student-dashboard/improvement-plan
 * @desc    Get detailed improvement plan based on weak areas
 * @access  Private (Student)
 * @returns {Object} Structured improvement plan with milestones
 */
router.get('/improvement-plan', async (req, res) => {
  try {
    // Combine weak areas and suggestions for comprehensive plan
    req.query.detailed_plan = true;
    await studentDashboardController.getWeakAreasAnalysis(req, res);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error generating improvement plan',
      error: error.message
    });
  }
});

// ==========================================
// 📊 CLASS COMPARISON ROUTES
// ==========================================

/**
 * @route   GET /api/student-dashboard/class-comparison
 * @desc    Get detailed class comparison and ranking
 * @access  Private (Student)
 * @returns {Object} Class ranking, peer comparison, and performance distribution
 */
router.get('/class-comparison', studentDashboardController.getClassComparison);

/**
 * @route   GET /api/student-dashboard/ranking
 * @desc    Get current class ranking and position
 * @access  Private (Student)
 * @returns {Object} Current ranking information
 */
router.get('/ranking', async (req, res) => {
  try {
    req.query.ranking_only = true;
    await studentDashboardController.getClassComparison(req, res);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error getting ranking data',
      error: error.message
    });
  }
});

// ==========================================
// 📊 ANALYTICS & INSIGHTS ROUTES
// ==========================================

/**
 * @route   GET /api/student-dashboard/analytics
 * @desc    Get comprehensive analytics summary
 * @access  Private (Student)
 * @returns {Object} Analytics data for charts and graphs
 */
router.get('/analytics', async (req, res) => {
  try {
    console.log('📊 Getting analytics summary for student');
    
    // Get overview data which includes analytics
    req.query.analytics_mode = true;
    await studentDashboardController.getDashboardOverview(req, res);
  } catch (error) {
    console.error('❌ Analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting analytics data',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/student-dashboard/performance-summary
 * @desc    Get quick performance summary for widgets
 * @access  Private (Student)
 * @returns {Object} Summary data for dashboard widgets
 */
router.get('/performance-summary', async (req, res) => {
  try {
    const studentId = req.user._id;
    
    const StudentPerformance = require('../models/StudentPerformance');
    const performance = await StudentPerformance.findOne({ studentId });
    
    if (!performance) {
      return res.status(404).json({
        success: false,
        message: 'Performance data not found'
      });
    }

    // Quick summary for widgets
    const summary = {
      overallGrade: performance.currentGradeLevel,
      overallPercentage: Math.round(performance.overallMetrics.overallPercentage),
      totalSubjects: performance.subjectPerformance.length,
      classRank: performance.peerComparison.classPosition,
      weeklyImprovement: performance.overallMetrics.monthlyImprovement,
      assessmentsCompleted: performance.overallMetrics.totalAssessmentsCompleted,
      studyTime: Math.round(performance.overallMetrics.totalStudyTime / 60), // Convert to hours
      
      topSubjects: performance.subjectPerformance
        .sort((a, b) => b.averageScore - a.averageScore)
        .slice(0, 3)
        .map(s => ({
          name: s.subject,
          score: Math.round(s.averageScore)
        })),
        
      recentAchievements: performance.achievements
        .sort((a, b) => b.earnedDate - a.earnedDate)
        .slice(0, 3)
        .map(a => ({
          title: a.title,
          description: a.description,
          date: a.earnedDate
        }))
    };

    res.status(200).json({
      success: true,
      message: 'Performance summary retrieved',
      data: summary
    });

  } catch (error) {
    console.error('❌ Performance summary error:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting performance summary',
      error: error.message
    });
  }
});

// ==========================================
// 🔄 DATA MANAGEMENT ROUTES
// ==========================================

/**
 * @route   POST /api/student-dashboard/refresh
 * @desc    Refresh/update student performance data
 * @access  Private (Student)
 * @returns {Object} Updated performance data
 */
router.post('/refresh', async (req, res) => {
  try {
    const studentId = req.user._id;
    
    console.log(`🔄 Refreshing performance data for student: ${studentId}`);
    
    const updatedPerformance = await studentDashboardController.updatePerformanceData(studentId);
    
    res.status(200).json({
      success: true,
      message: 'Performance data refreshed successfully',
      data: {
        lastUpdated: updatedPerformance.lastUpdated,
        overallPercentage: updatedPerformance.overallMetrics.overallPercentage,
        totalSubjects: updatedPerformance.subjectPerformance.length
      }
    });

  } catch (error) {
    console.error('❌ Data refresh error:', error);
    res.status(500).json({
      success: false,
      message: 'Error refreshing performance data',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/student-dashboard/data-status
 * @desc    Check data freshness and update status
 * @access  Private (Student)
 * @returns {Object} Data status information
 */
router.get('/data-status', async (req, res) => {
  try {
    const studentId = req.user._id;
    
    const StudentPerformance = require('../models/StudentPerformance');
    const performance = await StudentPerformance.findOne({ studentId });
    
    if (!performance) {
      return res.status(404).json({
        success: false,
        message: 'Performance data not found',
        needsInit: true
      });
    }

    const lastUpdated = performance.lastUpdated;
    const hoursAgo = (Date.now() - lastUpdated) / (1000 * 60 * 60);
    
    const status = {
      lastUpdated,
      hoursAgo: Math.round(hoursAgo * 10) / 10,
      freshness: hoursAgo < 1 ? 'very_fresh' : 
                 hoursAgo < 6 ? 'fresh' : 
                 hoursAgo < 24 ? 'moderate' : 'stale',
      needsUpdate: hoursAgo > 6,
      dataComplete: performance.subjectPerformance.length > 0,
      totalRecords: performance.overallMetrics.totalAssessmentsCompleted
    };

    res.status(200).json({
      success: true,
      message: 'Data status retrieved',
      data: status
    });

  } catch (error) {
    console.error('❌ Data status error:', error);
    res.status(500).json({
      success: false,
      message: 'Error checking data status',
      error: error.message
    });
  }
});

// ==========================================
// 🎯 GOALS & ACHIEVEMENTS ROUTES
// ==========================================

/**
 * @route   GET /api/student-dashboard/goals
 * @desc    Get student's academic goals and progress
 * @access  Private (Student)
 * @returns {Object} Goals with progress tracking
 */
router.get('/goals', async (req, res) => {
  try {
    const studentId = req.user._id;
    
    const StudentPerformance = require('../models/StudentPerformance');
    const performance = await StudentPerformance.findOne({ studentId });
    
    if (!performance) {
      return res.status(404).json({
        success: false,
        message: 'Performance data not found'
      });
    }

    const goals = {
      activeGoals: performance.academicGoals.filter(g => g.status === 'in_progress'),
      completedGoals: performance.academicGoals.filter(g => g.status === 'completed'),
      achievements: performance.achievements.sort((a, b) => b.earnedDate - a.earnedDate)
    };

    res.status(200).json({
      success: true,
      message: 'Goals and achievements retrieved',
      data: goals
    });

  } catch (error) {
    console.error('❌ Goals error:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting goals data',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/student-dashboard/goals
 * @desc    Add new academic goal
 * @access  Private (Student)
 * @body    {Object} Goal data
 * @returns {Object} Created goal
 */
router.post('/goals', async (req, res) => {
  try {
    const studentId = req.user._id;
    const { title, description, targetValue, deadline, category } = req.body;

    // Validation
    if (!title || !targetValue || !deadline) {
      return res.status(400).json({
        success: false,
        message: 'Title, target value, and deadline are required'
      });
    }

    const StudentPerformance = require('../models/StudentPerformance');
    const performance = await StudentPerformance.findOne({ studentId });
    
    if (!performance) {
      return res.status(404).json({
        success: false,
        message: 'Performance data not found'
      });
    }

    const newGoal = {
      title,
      description,
      targetValue,
      currentValue: 0,
      deadline: new Date(deadline),
      category: category || 'academic',
      status: 'in_progress',
      createdDate: new Date()
    };

    performance.academicGoals.push(newGoal);
    await performance.save();

    res.status(201).json({
      success: true,
      message: 'Goal created successfully',
      data: newGoal
    });

  } catch (error) {
    console.error('❌ Goal creation error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating goal',
      error: error.message
    });
  }
});

// ==========================================
// 🔍 SEARCH & FILTER ROUTES
// ==========================================

/**
 * @route   GET /api/student-dashboard/search
 * @desc    Search dashboard data
 * @access  Private (Student)
 * @query   {String} query - Search query
 * @query   {String} type - Data type to search (subjects/topics/goals)
 * @returns {Object} Search results
 */
router.get('/search', async (req, res) => {
  try {
    const { query, type = 'all' } = req.query;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }

    const studentId = req.user._id;
    const StudentPerformance = require('../models/StudentPerformance');
    const performance = await StudentPerformance.findOne({ studentId });
    
    if (!performance) {
      return res.status(404).json({
        success: false,
        message: 'Performance data not found'
      });
    }

    const results = {
      subjects: [],
      topics: [],
      goals: [],
      achievements: []
    };

    const searchTerm = query.toLowerCase();

    // Search subjects
    if (type === 'all' || type === 'subjects') {
      results.subjects = performance.subjectPerformance
        .filter(s => s.subject.toLowerCase().includes(searchTerm))
        .map(s => ({
          subject: s.subject,
          score: s.averageScore,
          type: 'subject'
        }));
    }

    // Search topics
    if (type === 'all' || type === 'topics') {
      performance.subjectPerformance.forEach(subject => {
        [...subject.weakTopics, ...subject.strongTopics].forEach(topic => {
          if (topic.topic.toLowerCase().includes(searchTerm)) {
            results.topics.push({
              topic: topic.topic,
              subject: subject.subject,
              performance: topic.successRate || topic.masteryLevel,
              type: 'topic'
            });
          }
        });
      });
    }

    // Search goals
    if (type === 'all' || type === 'goals') {
      results.goals = performance.academicGoals
        .filter(g => 
          g.title.toLowerCase().includes(searchTerm) ||
          g.description.toLowerCase().includes(searchTerm)
        )
        .map(g => ({
          title: g.title,
          description: g.description,
          status: g.status,
          type: 'goal'
        }));
    }

    // Search achievements
    if (type === 'all' || type === 'achievements') {
      results.achievements = performance.achievements
        .filter(a => 
          a.title.toLowerCase().includes(searchTerm) ||
          a.description.toLowerCase().includes(searchTerm)
        )
        .map(a => ({
          title: a.title,
          description: a.description,
          earnedDate: a.earnedDate,
          type: 'achievement'
        }));
    }

    // Flatten results for unified search
    const allResults = [
      ...results.subjects,
      ...results.topics,
      ...results.goals,
      ...results.achievements
    ];

    res.status(200).json({
      success: true,
      message: 'Search completed',
      data: {
        query,
        totalResults: allResults.length,
        results: type === 'all' ? allResults : results[type + 's'] || allResults,
        breakdown: {
          subjects: results.subjects.length,
          topics: results.topics.length,
          goals: results.goals.length,
          achievements: results.achievements.length
        }
      }
    });

  } catch (error) {
    console.error('❌ Search error:', error);
    res.status(500).json({
      success: false,
      message: 'Error performing search',
      error: error.message
    });
  }
});

// ==========================================
// 📱 EXPORT & REPORTS ROUTES
// ==========================================

/**
 * @route   GET /api/student-dashboard/export
 * @desc    Export dashboard data in various formats
 * @access  Private (Student)
 * @query   {String} format - csv/json/pdf (default: json)
 * @query   {String} period - week/month/quarter/year (default: month)
 * @returns {File} Exported data
 */
router.get('/export', async (req, res) => {
  try {
    const { format = 'json', period = 'month' } = req.query;
    const studentId = req.user._id;

    console.log(`📁 Exporting dashboard data in ${format} format for ${period}`);

    // For now, return JSON format
    // Future: Implement CSV and PDF export
    
    const exportData = {
      exportInfo: {
        studentId,
        studentName: req.user.name,
        exportDate: new Date(),
        format,
        period
      },
      disclaimer: 'Data exported from GyanGuru Student Dashboard'
    };

    // Set appropriate headers
    if (format === 'json') {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="dashboard-export-${Date.now()}.json"`);
    }

    res.status(200).json({
      success: true,
      message: `Dashboard data exported in ${format} format`,
      data: exportData
    });

  } catch (error) {
    console.error('❌ Export error:', error);
    res.status(500).json({
      success: false,
      message: 'Error exporting data',
      error: error.message
    });
  }
});

// ==========================================
// 🚨 ERROR HANDLING MIDDLEWARE
// ==========================================

// Handle 404 for dashboard routes
router.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Dashboard endpoint not found',
    availableEndpoints: [
      'GET /overview',
      'GET /subjects',
      'GET /progress',
      'GET /weak-areas',
      'GET /suggestions',
      'GET /class-comparison',
      'GET /analytics',
      'POST /refresh',
      'GET /goals',
      'POST /goals',
      'GET /search'
    ]
  });
});

// Error handling middleware
router.use((error, req, res, next) => {
  console.error('🚨 Dashboard route error:', error);
  
  res.status(error.status || 500).json({
    success: false,
    message: error.message || 'Internal server error in student dashboard',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});

module.exports = router;
