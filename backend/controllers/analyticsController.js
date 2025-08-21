// ==========================================
// 📊 GyanGuru Analytics Controller
// ==========================================
// Extraordinary Phase 5: Analytics & Reports
// Industry-leading analytics and insights system
// Author: GitHub Copilot
// Date: August 21, 2025
// ==========================================

const mongoose = require('mongoose');
const Assessment = require('../models/Assessment');
const User = require('../models/User');
const Question = require('../models/Question');
const Submission = require('../models/Submission');
const { body, validationResult } = require('express-validator');

// ==========================================
// 🎯 STUDENT PERFORMANCE ANALYTICS
// ==========================================

// @desc    Get comprehensive student analytics
// @route   GET /api/analytics/student/:studentId/dashboard
// @access  Private (Student/Teacher/Admin)
const getStudentDashboard = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { timeframe = '30d', subject = 'all' } = req.query;
    
    console.log(`📊 Generating student dashboard for: ${studentId}`);

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - parseInt(timeframe.replace('d', '')));

    // Build query filter
    const matchFilter = {
      student: new mongoose.Types.ObjectId(studentId),
      submittedAt: { $gte: startDate, $lte: endDate },
      status: { $in: ['submitted', 'fully_graded'] }
    };

    // Get comprehensive analytics
    const analytics = await Submission.aggregate([
      { $match: matchFilter },
      
      // Populate assessment details
      {
        $lookup: {
          from: 'assessments',
          localField: 'assessment',
          foreignField: '_id',
          as: 'assessmentData'
        }
      },
      { $unwind: '$assessmentData' },
      
      // Filter by subject if specified
      ...(subject !== 'all' ? [
        { $match: { 'assessmentData.subject': subject } }
      ] : []),
      
      // Group and calculate metrics
      {
        $group: {
          _id: null,
          totalAssessments: { $sum: 1 },
          averageScore: { $avg: '$percentage' },
          totalTimeSpent: { $sum: '$totalTimeSpent' },
          highestScore: { $max: '$percentage' },
          lowestScore: { $min: '$percentage' },
          totalMarksObtained: { $sum: '$totalMarksObtained' },
          
          // Subject-wise performance
          subjectPerformance: {
            $push: {
              subject: '$assessmentData.subject',
              score: '$percentage',
              timeSpent: '$totalTimeSpent',
              date: '$submittedAt'
            }
          },
          
          // Grade distribution
          gradeDistribution: {
            $push: '$grade'
          },
          
          // Time analytics
          timeAnalytics: {
            $push: {
              totalTime: '$totalTimeSpent',
              efficiency: '$analytics.timeEfficiency',
              avgTimePerQuestion: '$analytics.averageTimePerQuestion'
            }
          }
        }
      }
    ]);

    if (!analytics.length) {
      return res.json({
        success: true,
        message: 'No assessment data found for this period',
        data: {
          overview: {
            totalAssessments: 0,
            averageScore: 0,
            performanceTrend: 'no_data',
            improvementRate: 0
          },
          subjects: [],
          timeAnalytics: {},
          recommendations: []
        }
      });
    }

    const data = analytics[0];

    // Calculate performance trends
    const sortedSubmissions = data.subjectPerformance.sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );
    
    const recentPerformance = sortedSubmissions.slice(-5);
    const earlierPerformance = sortedSubmissions.slice(0, 5);
    
    const recentAvg = recentPerformance.reduce((sum, item) => sum + item.score, 0) / recentPerformance.length;
    const earlierAvg = earlierPerformance.reduce((sum, item) => sum + item.score, 0) / earlierPerformance.length;
    
    const improvementRate = recentAvg - earlierAvg;
    const performanceTrend = improvementRate > 5 ? 'improving' : 
                           improvementRate < -5 ? 'declining' : 'stable';

    // Calculate subject-wise insights
    const subjectStats = {};
    data.subjectPerformance.forEach(item => {
      if (!subjectStats[item.subject]) {
        subjectStats[item.subject] = {
          scores: [],
          timeSpent: [],
          assessmentCount: 0
        };
      }
      subjectStats[item.subject].scores.push(item.score);
      subjectStats[item.subject].timeSpent.push(item.timeSpent);
      subjectStats[item.subject].assessmentCount++;
    });

    const subjects = Object.entries(subjectStats).map(([subject, stats]) => ({
      name: subject,
      averageScore: stats.scores.reduce((a, b) => a + b, 0) / stats.scores.length,
      assessmentCount: stats.assessmentCount,
      totalTimeSpent: stats.timeSpent.reduce((a, b) => a + b, 0),
      trend: calculateTrend(stats.scores),
      strongestTopic: 'Analysis in progress',
      weakestTopic: 'Analysis in progress'
    }));

    // Generate grade distribution
    const gradeCount = data.gradeDistribution.reduce((acc, grade) => {
      acc[grade] = (acc[grade] || 0) + 1;
      return acc;
    }, {});

    // Calculate time efficiency
    const avgTimeEfficiency = data.timeAnalytics
      .filter(t => t.efficiency)
      .reduce((sum, t) => sum + t.efficiency, 0) / data.timeAnalytics.length;

    // Generate AI-powered recommendations
    const recommendations = generateStudentRecommendations({
      averageScore: data.averageScore,
      timeEfficiency: avgTimeEfficiency,
      performanceTrend,
      subjects,
      improvementRate
    });

    // Prepare response
    const dashboard = {
      overview: {
        totalAssessments: data.totalAssessments,
        averageScore: Math.round(data.averageScore * 100) / 100,
        highestScore: data.highestScore,
        lowestScore: data.lowestScore,
        totalTimeSpent: data.totalTimeSpent,
        performanceTrend,
        improvementRate: Math.round(improvementRate * 100) / 100,
        timeEfficiency: Math.round(avgTimeEfficiency * 100) / 100
      },
      
      subjects: subjects.sort((a, b) => b.averageScore - a.averageScore),
      
      gradeDistribution: gradeCount,
      
      timeAnalytics: {
        totalTimeSpent: data.totalTimeSpent,
        averageTimePerAssessment: Math.round(data.totalTimeSpent / data.totalAssessments),
        timeEfficiency: avgTimeEfficiency,
        timeManagementTips: generateTimeManagementTips(avgTimeEfficiency)
      },
      
      recommendations,
      
      insights: {
        strongestSubject: subjects.reduce((max, subj) => 
          subj.averageScore > max.averageScore ? subj : max, subjects[0] || {}),
        weakestSubject: subjects.reduce((min, subj) => 
          subj.averageScore < min.averageScore ? subj : min, subjects[0] || {}),
        consistencyScore: calculateConsistency(data.subjectPerformance),
        nextGoals: generateNextGoals(data.averageScore, performanceTrend)
      }
    };

    res.json({
      success: true,
      message: 'Student dashboard generated successfully',
      data: dashboard,
      metadata: {
        timeframe,
        subject,
        generatedAt: new Date(),
        dataPoints: data.totalAssessments
      }
    });

  } catch (error) {
    console.error('❌ Error generating student dashboard:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate student dashboard',
      error: error.message
    });
  }
};

// @desc    Get student performance comparison
// @route   GET /api/analytics/student/:studentId/comparison
// @access  Private (Student/Teacher)
const getStudentComparison = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { classId, subject, timeframe = '30d' } = req.query;
    
    console.log(`📈 Generating performance comparison for student: ${studentId}`);

    // Get student's performance
    const studentPerformance = await Submission.aggregate([
      {
        $match: {
          student: new mongoose.Types.ObjectId(studentId),
          status: { $in: ['submitted', 'fully_graded'] }
        }
      },
      {
        $lookup: {
          from: 'assessments',
          localField: 'assessment',
          foreignField: '_id',
          as: 'assessmentData'
        }
      },
      { $unwind: '$assessmentData' },
      ...(subject ? [{ $match: { 'assessmentData.subject': subject } }] : []),
      {
        $group: {
          _id: null,
          averageScore: { $avg: '$percentage' },
          assessmentCount: { $sum: 1 },
          totalTimeSpent: { $sum: '$totalTimeSpent' }
        }
      }
    ]);

    // Get class average
    const classAverage = await Submission.aggregate([
      {
        $lookup: {
          from: 'assessments',
          localField: 'assessment',
          foreignField: '_id',
          as: 'assessmentData'
        }
      },
      { $unwind: '$assessmentData' },
      ...(subject ? [{ $match: { 'assessmentData.subject': subject } }] : []),
      {
        $group: {
          _id: null,
          classAverageScore: { $avg: '$percentage' },
          totalStudents: { $addToSet: '$student' }
        }
      },
      {
        $addFields: {
          totalStudents: { $size: '$totalStudents' }
        }
      }
    ]);

    // Calculate percentile
    const allScores = await Submission.aggregate([
      {
        $lookup: {
          from: 'assessments',
          localField: 'assessment',
          foreignField: '_id',
          as: 'assessmentData'
        }
      },
      { $unwind: '$assessmentData' },
      ...(subject ? [{ $match: { 'assessmentData.subject': subject } }] : []),
      {
        $group: {
          _id: '$student',
          averageScore: { $avg: '$percentage' }
        }
      },
      { $sort: { averageScore: 1 } }
    ]);

    const studentScore = studentPerformance[0]?.averageScore || 0;
    const position = allScores.findIndex(s => s.averageScore >= studentScore) + 1;
    const percentile = Math.round((position / allScores.length) * 100);

    const comparison = {
      student: {
        averageScore: Math.round(studentScore * 100) / 100,
        assessmentCount: studentPerformance[0]?.assessmentCount || 0,
        totalTimeSpent: studentPerformance[0]?.totalTimeSpent || 0
      },
      
      class: {
        averageScore: Math.round((classAverage[0]?.classAverageScore || 0) * 100) / 100,
        totalStudents: classAverage[0]?.totalStudents || 0
      },
      
      ranking: {
        position,
        percentile,
        outOf: allScores.length
      },
      
      insights: {
        performanceLevel: getPerformanceLevel(percentile),
        comparisonStatus: studentScore > (classAverage[0]?.classAverageScore || 0) ? 'above_average' : 'below_average',
        improvementPotential: calculateImprovementPotential(studentScore, percentile)
      }
    };

    res.json({
      success: true,
      message: 'Performance comparison generated successfully',
      data: comparison
    });

  } catch (error) {
    console.error('❌ Error generating performance comparison:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate performance comparison',
      error: error.message
    });
  }
};

// ==========================================
// 👨‍🏫 TEACHER DASHBOARD ANALYTICS
// ==========================================

// @desc    Get comprehensive teacher dashboard
// @route   GET /api/analytics/teacher/:teacherId/dashboard
// @access  Private (Teacher/Admin)
const getTeacherDashboard = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { timeframe = '30d' } = req.query;
    
    console.log(`👨‍🏫 Generating teacher dashboard for: ${teacherId}`);

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - parseInt(timeframe.replace('d', '')));

    // Get teacher's assessments
    const assessments = await Assessment.find({
      createdBy: teacherId,
      createdAt: { $gte: startDate, $lte: endDate }
    }).populate('statistics');

    // Get submission analytics
    const submissionAnalytics = await Submission.aggregate([
      {
        $lookup: {
          from: 'assessments',
          localField: 'assessment',
          foreignField: '_id',
          as: 'assessmentData'
        }
      },
      { $unwind: '$assessmentData' },
      {
        $match: {
          'assessmentData.createdBy': new mongoose.Types.ObjectId(teacherId),
          submittedAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: null,
          totalSubmissions: { $sum: 1 },
          averageScore: { $avg: '$percentage' },
          totalGradingTime: { $sum: '$gradingDetails.totalGradingTime' },
          subjectPerformance: {
            $push: {
              subject: '$assessmentData.subject',
              score: '$percentage',
              timeSpent: '$totalTimeSpent'
            }
          }
        }
      }
    ]);

    // Calculate subject-wise statistics
    const subjectStats = {};
    if (submissionAnalytics[0]?.subjectPerformance) {
      submissionAnalytics[0].subjectPerformance.forEach(item => {
        if (!subjectStats[item.subject]) {
          subjectStats[item.subject] = {
            scores: [],
            submissions: 0,
            totalTime: 0
          };
        }
        subjectStats[item.subject].scores.push(item.score);
        subjectStats[item.subject].submissions++;
        subjectStats[item.subject].totalTime += item.timeSpent;
      });
    }

    const subjects = Object.entries(subjectStats).map(([subject, stats]) => ({
      name: subject,
      averageScore: stats.scores.reduce((a, b) => a + b, 0) / stats.scores.length,
      totalSubmissions: stats.submissions,
      averageTime: stats.totalTime / stats.submissions,
      passRate: stats.scores.filter(score => score >= 60).length / stats.scores.length * 100
    }));

    // Calculate engagement metrics
    const engagementMetrics = await calculateTeacherEngagement(teacherId, startDate, endDate);

    // Generate insights and recommendations
    const insights = await generateTeacherInsights(assessments, submissionAnalytics[0], subjects);

    const dashboard = {
      overview: {
        totalAssessments: assessments.length,
        totalSubmissions: submissionAnalytics[0]?.totalSubmissions || 0,
        averageClassScore: Math.round((submissionAnalytics[0]?.averageScore || 0) * 100) / 100,
        totalGradingTime: submissionAnalytics[0]?.totalGradingTime || 0,
        activeStudents: await getActiveStudentCount(teacherId, startDate),
        assessmentCompletionRate: await getAssessmentCompletionRate(teacherId, startDate)
      },

      subjects: subjects.sort((a, b) => b.averageScore - a.averageScore),

      assessmentAnalytics: {
        recentAssessments: assessments.slice(0, 5).map(a => ({
          id: a._id,
          title: a.title,
          subject: a.subject,
          participationRate: (a.statistics.totalCompleted / a.statistics.totalInvited) * 100,
          averageScore: a.statistics.averageScore,
          createdAt: a.createdAt
        })),
        
        topPerformingAssessments: assessments
          .sort((a, b) => b.statistics.averageScore - a.statistics.averageScore)
          .slice(0, 3),
          
        needsAttention: assessments
          .filter(a => a.statistics.averageScore < 60 || 
                      (a.statistics.totalCompleted / a.statistics.totalInvited) < 0.7)
      },

      engagement: engagementMetrics,

      insights,

      recommendations: generateTeacherRecommendations(dashboard)
    };

    res.json({
      success: true,
      message: 'Teacher dashboard generated successfully',
      data: dashboard,
      metadata: {
        timeframe,
        generatedAt: new Date(),
        assessmentCount: assessments.length
      }
    });

  } catch (error) {
    console.error('❌ Error generating teacher dashboard:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate teacher dashboard',
      error: error.message
    });
  }
};

// @desc    Get class performance analytics
// @route   GET /api/analytics/teacher/:teacherId/class/:classId
// @access  Private (Teacher)
const getClassAnalytics = async (req, res) => {
  try {
    const { teacherId, classId } = req.params;
    const { subject, assessmentId } = req.query;
    
    console.log(`📚 Generating class analytics for class: ${classId}`);

    // Build filter
    const assessmentFilter = {
      createdBy: teacherId,
      class: classId
    };
    
    if (subject) assessmentFilter.subject = subject;
    if (assessmentId) assessmentFilter._id = assessmentId;

    // Get class assessments
    const assessments = await Assessment.find(assessmentFilter)
      .populate('statistics')
      .sort({ createdAt: -1 });

    // Get detailed submission data
    const submissions = await Submission.aggregate([
      {
        $lookup: {
          from: 'assessments',
          localField: 'assessment',
          foreignField: '_id',
          as: 'assessmentData'
        }
      },
      { $unwind: '$assessmentData' },
      {
        $match: {
          'assessmentData.createdBy': new mongoose.Types.ObjectId(teacherId),
          'assessmentData.class': classId,
          ...(subject && { 'assessmentData.subject': subject }),
          ...(assessmentId && { 'assessmentData._id': new mongoose.Types.ObjectId(assessmentId) })
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'student',
          foreignField: '_id',
          as: 'studentData'
        }
      },
      { $unwind: '$studentData' }
    ]);

    // Calculate comprehensive analytics
    const analytics = calculateClassAnalytics(submissions, assessments);

    res.json({
      success: true,
      message: 'Class analytics generated successfully',
      data: analytics
    });

  } catch (error) {
    console.error('❌ Error generating class analytics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate class analytics',
      error: error.message
    });
  }
};

// ==========================================
// 📊 SYSTEM-WIDE ANALYTICS
// ==========================================

// @desc    Get system overview analytics
// @route   GET /api/analytics/system/overview
// @access  Private (Admin)
const getSystemOverview = async (req, res) => {
  try {
    const { timeframe = '30d' } = req.query;
    
    console.log(`🌐 Generating system overview analytics`);

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - parseInt(timeframe.replace('d', '')));

    // Get comprehensive system metrics
    const [
      userStats,
      assessmentStats,
      submissionStats,
      engagementStats
    ] = await Promise.all([
      calculateUserStatistics(startDate, endDate),
      calculateAssessmentStatistics(startDate, endDate),
      calculateSubmissionStatistics(startDate, endDate),
      calculateEngagementStatistics(startDate, endDate)
    ]);

    const overview = {
      users: userStats,
      assessments: assessmentStats,
      submissions: submissionStats,
      engagement: engagementStats,
      
      insights: {
        growthRate: calculateGrowthRate(userStats, timeframe),
        platformHealth: calculatePlatformHealth(assessmentStats, submissionStats),
        topPerformingSubjects: await getTopPerformingSubjects(startDate, endDate),
        systemRecommendations: generateSystemRecommendations({
          userStats,
          assessmentStats,
          submissionStats,
          engagementStats
        })
      }
    };

    res.json({
      success: true,
      message: 'System overview generated successfully',
      data: overview,
      metadata: {
        timeframe,
        generatedAt: new Date()
      }
    });

  } catch (error) {
    console.error('❌ Error generating system overview:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate system overview',
      error: error.message
    });
  }
};

// ==========================================
// 📈 HELPER FUNCTIONS
// ==========================================

// Calculate trend direction
function calculateTrend(scores) {
  if (scores.length < 2) return 'insufficient_data';
  
  const recent = scores.slice(-3);
  const earlier = scores.slice(0, 3);
  
  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const earlierAvg = earlier.reduce((a, b) => a + b, 0) / earlier.length;
  
  const diff = recentAvg - earlierAvg;
  return diff > 5 ? 'improving' : diff < -5 ? 'declining' : 'stable';
}

// Generate student recommendations
function generateStudentRecommendations(data) {
  const recommendations = [];
  
  if (data.averageScore < 70) {
    recommendations.push({
      type: 'academic',
      priority: 'high',
      title: 'Focus on Core Concepts',
      description: 'Your average score suggests room for improvement in fundamental concepts',
      actionItems: [
        'Review basic concepts in weak subjects',
        'Seek help from teachers',
        'Practice more regularly'
      ]
    });
  }
  
  if (data.timeEfficiency < 75) {
    recommendations.push({
      type: 'time_management',
      priority: 'medium',
      title: 'Improve Time Management',
      description: 'Work on managing your time more effectively during assessments',
      actionItems: [
        'Practice time-bound questions',
        'Learn quick calculation techniques',
        'Prioritize questions strategically'
      ]
    });
  }
  
  if (data.performanceTrend === 'declining') {
    recommendations.push({
      type: 'performance',
      priority: 'high',
      title: 'Address Performance Decline',
      description: 'Your recent performance shows a declining trend',
      actionItems: [
        'Identify and address knowledge gaps',
        'Increase study hours',
        'Get additional support'
      ]
    });
  }
  
  return recommendations;
}

// Generate time management tips
function generateTimeManagementTips(efficiency) {
  const tips = [
    'Start with easier questions to build confidence',
    'Allocate specific time limits for each section',
    'Use elimination techniques for multiple choice questions'
  ];
  
  if (efficiency < 60) {
    tips.push(
      'Practice speed reading techniques',
      'Work on mental math skills',
      'Take regular breaks during long study sessions'
    );
  }
  
  return tips;
}

// Calculate consistency score
function calculateConsistency(performances) {
  if (performances.length < 3) return 0;
  
  const scores = performances.map(p => p.score);
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
  const standardDeviation = Math.sqrt(variance);
  
  return Math.max(0, 100 - (standardDeviation * 2));
}

// Generate next goals
function generateNextGoals(averageScore, trend) {
  const goals = [];
  
  if (averageScore < 80) {
    goals.push(`Achieve 80%+ average score`);
  }
  
  if (trend === 'declining') {
    goals.push('Reverse the declining trend');
  }
  
  goals.push('Maintain consistent performance');
  goals.push('Improve time management skills');
  
  return goals;
}

// Get performance level
function getPerformanceLevel(percentile) {
  if (percentile >= 90) return 'exceptional';
  if (percentile >= 75) return 'above_average';
  if (percentile >= 50) return 'average';
  if (percentile >= 25) return 'below_average';
  return 'needs_improvement';
}

// Calculate improvement potential
function calculateImprovementPotential(score, percentile) {
  const potentialScore = Math.min(100, score + (100 - score) * 0.3);
  return {
    currentScore: score,
    potentialScore: Math.round(potentialScore),
    improvementMargin: Math.round(potentialScore - score),
    achievabilityLevel: percentile > 50 ? 'high' : 'medium'
  };
}

// Calculate teacher engagement
async function calculateTeacherEngagement(teacherId, startDate, endDate) {
  // Implementation for teacher engagement metrics
  return {
    assessmentCreationRate: 0,
    gradingEfficiency: 0,
    studentInteraction: 0,
    contentQuality: 0
  };
}

// Generate teacher insights
async function generateTeacherInsights(assessments, submissions, subjects) {
  return {
    mostEngagingSubject: subjects[0]?.name || 'N/A',
    averageGradingTime: submissions?.totalGradingTime || 0,
    studentProgressTrend: 'stable',
    recommendedActions: [
      'Focus on subjects with lower performance',
      'Create more engaging assessments',
      'Provide detailed feedback to students'
    ]
  };
}

// Get active student count
async function getActiveStudentCount(teacherId, startDate) {
  const count = await Submission.aggregate([
    {
      $lookup: {
        from: 'assessments',
        localField: 'assessment',
        foreignField: '_id',
        as: 'assessmentData'
      }
    },
    { $unwind: '$assessmentData' },
    {
      $match: {
        'assessmentData.createdBy': new mongoose.Types.ObjectId(teacherId),
        submittedAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: '$student'
      }
    },
    {
      $count: 'activeStudents'
    }
  ]);
  
  return count[0]?.activeStudents || 0;
}

// Get assessment completion rate
async function getAssessmentCompletionRate(teacherId, startDate) {
  const assessments = await Assessment.find({
    createdBy: teacherId,
    createdAt: { $gte: startDate }
  });
  
  const totalInvited = assessments.reduce((sum, a) => sum + a.statistics.totalInvited, 0);
  const totalCompleted = assessments.reduce((sum, a) => sum + a.statistics.totalCompleted, 0);
  
  return totalInvited > 0 ? (totalCompleted / totalInvited) * 100 : 0;
}

// Generate teacher recommendations
function generateTeacherRecommendations(dashboard) {
  const recommendations = [];
  
  if (dashboard.overview.assessmentCompletionRate < 80) {
    recommendations.push({
      type: 'engagement',
      priority: 'high',
      title: 'Improve Assessment Completion',
      description: 'Low completion rates suggest engagement issues'
    });
  }
  
  return recommendations;
}

// Calculate class analytics
function calculateClassAnalytics(submissions, assessments) {
  // Comprehensive class analysis logic
  return {
    overview: {
      totalStudents: submissions.length,
      averageScore: 0,
      topPerformers: [],
      strugglingStudents: []
    },
    performance: {
      distribution: {},
      trends: {},
      comparisons: {}
    }
  };
}

// Calculate user statistics
async function calculateUserStatistics(startDate, endDate) {
  const stats = await User.aggregate([
    {
      $facet: {
        total: [{ $count: 'count' }],
        newUsers: [
          { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
          { $count: 'count' }
        ],
        byRole: [
          { $group: { _id: '$role', count: { $sum: 1 } } }
        ],
        active: [
          { $match: { lastLogin: { $gte: startDate } } },
          { $count: 'count' }
        ]
      }
    }
  ]);
  
  return {
    total: stats[0].total[0]?.count || 0,
    newUsers: stats[0].newUsers[0]?.count || 0,
    activeUsers: stats[0].active[0]?.count || 0,
    byRole: stats[0].byRole
  };
}

// Calculate assessment statistics
async function calculateAssessmentStatistics(startDate, endDate) {
  const stats = await Assessment.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: null,
        totalAssessments: { $sum: 1 },
        averageQuestions: { $avg: { $size: '$questions' } },
        subjectDistribution: { $push: '$subject' }
      }
    }
  ]);
  
  return stats[0] || {
    totalAssessments: 0,
    averageQuestions: 0,
    subjectDistribution: []
  };
}

// Calculate submission statistics
async function calculateSubmissionStatistics(startDate, endDate) {
  const stats = await Submission.aggregate([
    {
      $match: {
        submittedAt: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: null,
        totalSubmissions: { $sum: 1 },
        averageScore: { $avg: '$percentage' },
        totalTimeSpent: { $sum: '$totalTimeSpent' }
      }
    }
  ]);
  
  return stats[0] || {
    totalSubmissions: 0,
    averageScore: 0,
    totalTimeSpent: 0
  };
}

// Calculate engagement statistics
async function calculateEngagementStatistics(startDate, endDate) {
  return {
    dailyActiveUsers: 0,
    sessionDuration: 0,
    featureUsage: {},
    retentionRate: 0
  };
}

// Calculate growth rate
function calculateGrowthRate(userStats, timeframe) {
  const days = parseInt(timeframe.replace('d', ''));
  const dailyGrowth = userStats.newUsers / days;
  return {
    daily: dailyGrowth,
    weekly: dailyGrowth * 7,
    monthly: dailyGrowth * 30
  };
}

// Calculate platform health
function calculatePlatformHealth(assessmentStats, submissionStats) {
  const healthScore = Math.min(100, (
    (submissionStats.totalSubmissions / Math.max(1, assessmentStats.totalAssessments)) * 50 +
    Math.min(50, submissionStats.averageScore)
  ));
  
  return {
    score: healthScore,
    status: healthScore > 80 ? 'excellent' : healthScore > 60 ? 'good' : 'needs_attention'
  };
}

// Get top performing subjects
async function getTopPerformingSubjects(startDate, endDate) {
  const subjects = await Submission.aggregate([
    {
      $lookup: {
        from: 'assessments',
        localField: 'assessment',
        foreignField: '_id',
        as: 'assessmentData'
      }
    },
    { $unwind: '$assessmentData' },
    {
      $match: {
        submittedAt: { $gte: startDate, $lte: endDate }
      }
    },
    {
      $group: {
        _id: '$assessmentData.subject',
        averageScore: { $avg: '$percentage' },
        totalSubmissions: { $sum: 1 }
      }
    },
    { $sort: { averageScore: -1 } },
    { $limit: 5 }
  ]);
  
  return subjects;
}

// Generate system recommendations
function generateSystemRecommendations(metrics) {
  const recommendations = [];
  
  if (metrics.userStats.activeUsers / metrics.userStats.total < 0.3) {
    recommendations.push({
      type: 'engagement',
      priority: 'high',
      title: 'Improve User Engagement',
      description: 'Low active user ratio suggests engagement issues'
    });
  }
  
  return recommendations;
}

module.exports = {
  getStudentDashboard,
  getStudentComparison,
  getTeacherDashboard,
  getClassAnalytics,
  getSystemOverview
};
