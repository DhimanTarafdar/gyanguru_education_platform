// ==========================================
// 📊 GyanGuru Reports Controller
// ==========================================
// Extraordinary Phase 5: Advanced Report Generation
// Comprehensive reporting system with export capabilities
// Author: GitHub Copilot
// Date: August 21, 2025
// ==========================================

const mongoose = require('mongoose');
const Assessment = require('../models/Assessment');
const User = require('../models/User');
const Question = require('../models/Question');
const Submission = require('../models/Submission');
const { body, validationResult } = require('express-validator');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');

// ==========================================
// 📋 PROGRESS REPORTS GENERATION
// ==========================================

// @desc    Generate comprehensive student progress report
// @route   GET /api/reports/student/:studentId/progress
// @access  Private (Student/Teacher/Parent/Admin)
const generateStudentProgressReport = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { 
      timeframe = '90d', 
      format = 'pdf',
      includeDetails = true,
      subjects = 'all'
    } = req.query;
    
    console.log(`📊 Generating progress report for student: ${studentId}`);

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - parseInt(timeframe.replace('d', '')));

    // Get student information
    const student = await User.findById(studentId)
      .select('name email studentInfo profilePicture')
      .lean();

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Build assessment filter
    const assessmentFilter = {
      'assessmentData.assignedTo.students.studentId': new mongoose.Types.ObjectId(studentId),
      submittedAt: { $gte: startDate, $lte: endDate }
    };

    if (subjects !== 'all') {
      assessmentFilter['assessmentData.subject'] = { $in: subjects.split(',') };
    }

    // Get comprehensive submission data
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
          student: new mongoose.Types.ObjectId(studentId),
          submittedAt: { $gte: startDate, $lte: endDate },
          status: { $in: ['submitted', 'fully_graded'] }
        }
      },
      {
        $sort: { submittedAt: 1 }
      }
    ]);

    // Calculate comprehensive analytics
    const analytics = await calculateStudentProgressAnalytics(submissions, student);

    // Generate report based on format
    let reportData;
    if (format === 'pdf') {
      reportData = await generateProgressPDFReport(analytics, student, {
        timeframe,
        includeDetails,
        startDate,
        endDate
      });
    } else if (format === 'excel') {
      reportData = await generateProgressExcelReport(analytics, student, {
        timeframe,
        includeDetails,
        startDate,
        endDate
      });
    } else {
      reportData = {
        student,
        analytics,
        metadata: {
          timeframe,
          startDate,
          endDate,
          generatedAt: new Date(),
          totalAssessments: submissions.length
        }
      };
    }

    if (format === 'json') {
      res.json({
        success: true,
        message: 'Progress report generated successfully',
        data: reportData
      });
    } else {
      // For PDF/Excel, send file
      const fileName = `${student.name}_Progress_Report_${Date.now()}.${format}`;
      const filePath = path.join(__dirname, '../temp', fileName);
      
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('Content-Type', 
        format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      
      res.sendFile(filePath, (err) => {
        if (err) {
          console.error('Error sending file:', err);
          res.status(500).json({
            success: false,
            message: 'Error generating report file'
          });
        } else {
          // Clean up temp file
          setTimeout(() => {
            fs.unlink(filePath, (unlinkErr) => {
              if (unlinkErr) console.error('Error deleting temp file:', unlinkErr);
            });
          }, 5000);
        }
      });
    }

  } catch (error) {
    console.error('❌ Error generating student progress report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate progress report',
      error: error.message
    });
  }
};

// @desc    Generate class progress report
// @route   GET /api/reports/teacher/:teacherId/class/:classId/progress
// @access  Private (Teacher/Admin)
const generateClassProgressReport = async (req, res) => {
  try {
    const { teacherId, classId } = req.params;
    const { 
      timeframe = '30d', 
      format = 'pdf',
      subject = 'all',
      includeIndividual = false
    } = req.query;
    
    console.log(`📚 Generating class progress report for: ${classId}`);

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - parseInt(timeframe.replace('d', '')));

    // Get teacher information
    const teacher = await User.findById(teacherId)
      .select('name teacherInfo')
      .lean();

    // Get class assessments and submissions
    const classData = await getClassProgressData(teacherId, classId, startDate, endDate, subject);

    // Calculate comprehensive class analytics
    const analytics = await calculateClassProgressAnalytics(classData);

    // Generate report based on format
    let reportData;
    if (format === 'pdf') {
      reportData = await generateClassProgressPDFReport(analytics, teacher, classId, {
        timeframe,
        includeIndividual,
        startDate,
        endDate
      });
    } else if (format === 'excel') {
      reportData = await generateClassProgressExcelReport(analytics, teacher, classId, {
        timeframe,
        includeIndividual,
        startDate,
        endDate
      });
    } else {
      reportData = {
        teacher,
        classId,
        analytics,
        metadata: {
          timeframe,
          startDate,
          endDate,
          generatedAt: new Date(),
          totalStudents: analytics.overview.totalStudents
        }
      };
    }

    if (format === 'json') {
      res.json({
        success: true,
        message: 'Class progress report generated successfully',
        data: reportData
      });
    } else {
      // Send file for PDF/Excel
      const fileName = `Class_${classId}_Progress_Report_${Date.now()}.${format}`;
      const filePath = path.join(__dirname, '../temp', fileName);
      
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('Content-Type', 
        format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      
      res.sendFile(filePath);
    }

  } catch (error) {
    console.error('❌ Error generating class progress report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate class progress report',
      error: error.message
    });
  }
};

// ==========================================
// 📈 PERFORMANCE ANALYTICS REPORTS
// ==========================================

// @desc    Generate comprehensive performance analytics report
// @route   GET /api/reports/analytics/performance
// @access  Private (Teacher/Admin)
const generatePerformanceAnalyticsReport = async (req, res) => {
  try {
    const { 
      scope = 'class', // class, subject, school
      scopeId,
      timeframe = '90d',
      format = 'pdf',
      metrics = 'all'
    } = req.query;
    
    console.log(`📈 Generating performance analytics report - Scope: ${scope}`);

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - parseInt(timeframe.replace('d', '')));

    let analyticsData;
    
    switch (scope) {
      case 'class':
        analyticsData = await getClassPerformanceAnalytics(scopeId, startDate, endDate);
        break;
      case 'subject':
        analyticsData = await getSubjectPerformanceAnalytics(scopeId, startDate, endDate);
        break;
      case 'school':
        analyticsData = await getSchoolPerformanceAnalytics(startDate, endDate);
        break;
      default:
        throw new Error('Invalid scope specified');
    }

    // Calculate comprehensive performance metrics
    const performanceReport = await calculatePerformanceMetrics(analyticsData, {
      scope,
      scopeId,
      timeframe,
      metrics
    });

    // Generate report based on format
    let reportData;
    if (format === 'pdf') {
      reportData = await generatePerformancePDFReport(performanceReport, {
        scope,
        scopeId,
        timeframe,
        startDate,
        endDate
      });
    } else if (format === 'excel') {
      reportData = await generatePerformanceExcelReport(performanceReport, {
        scope,
        scopeId,
        timeframe,
        startDate,
        endDate
      });
    } else {
      reportData = performanceReport;
    }

    if (format === 'json') {
      res.json({
        success: true,
        message: 'Performance analytics report generated successfully',
        data: reportData
      });
    } else {
      // Send file for PDF/Excel
      const fileName = `Performance_Analytics_${scope}_${Date.now()}.${format}`;
      const filePath = path.join(__dirname, '../temp', fileName);
      
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('Content-Type', 
        format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      
      res.sendFile(filePath);
    }

  } catch (error) {
    console.error('❌ Error generating performance analytics report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate performance analytics report',
      error: error.message
    });
  }
};

// ==========================================
// 🎯 TEACHER DASHBOARD REPORTS
// ==========================================

// @desc    Generate comprehensive teacher dashboard report
// @route   GET /api/reports/teacher/:teacherId/dashboard
// @access  Private (Teacher/Admin)
const generateTeacherDashboardReport = async (req, res) => {
  try {
    const { teacherId } = req.params;
    const { 
      timeframe = '30d',
      format = 'pdf',
      includeClassBreakdown = true,
      includeStudentDetails = false
    } = req.query;
    
    console.log(`👨‍🏫 Generating teacher dashboard report for: ${teacherId}`);

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - parseInt(timeframe.replace('d', '')));

    // Get teacher information
    const teacher = await User.findById(teacherId)
      .select('name email teacherInfo')
      .lean();

    if (!teacher) {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found'
      });
    }

    // Get comprehensive teacher data
    const teacherData = await getTeacherDashboardData(teacherId, startDate, endDate);

    // Calculate teacher analytics
    const analytics = await calculateTeacherDashboardAnalytics(teacherData, {
      includeClassBreakdown,
      includeStudentDetails
    });

    // Generate report based on format
    let reportData;
    if (format === 'pdf') {
      reportData = await generateTeacherDashboardPDFReport(analytics, teacher, {
        timeframe,
        includeClassBreakdown,
        includeStudentDetails,
        startDate,
        endDate
      });
    } else if (format === 'excel') {
      reportData = await generateTeacherDashboardExcelReport(analytics, teacher, {
        timeframe,
        includeClassBreakdown,
        includeStudentDetails,
        startDate,
        endDate
      });
    } else {
      reportData = {
        teacher,
        analytics,
        metadata: {
          timeframe,
          startDate,
          endDate,
          generatedAt: new Date(),
          totalAssessments: analytics.overview.totalAssessments
        }
      };
    }

    if (format === 'json') {
      res.json({
        success: true,
        message: 'Teacher dashboard report generated successfully',
        data: reportData
      });
    } else {
      // Send file for PDF/Excel
      const fileName = `Teacher_Dashboard_${teacher.name}_${Date.now()}.${format}`;
      const filePath = path.join(__dirname, '../temp', fileName);
      
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('Content-Type', 
        format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      
      res.sendFile(filePath);
    }

  } catch (error) {
    console.error('❌ Error generating teacher dashboard report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate teacher dashboard report',
      error: error.message
    });
  }
};

// ==========================================
// 🎓 STUDENT INSIGHTS REPORTS
// ==========================================

// @desc    Generate detailed student insights report
// @route   GET /api/reports/student/:studentId/insights
// @access  Private (Student/Teacher/Parent/Admin)
const generateStudentInsightsReport = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { 
      timeframe = '180d',
      format = 'pdf',
      includeRecommendations = true,
      includeLearningPath = true,
      compareWithPeers = false
    } = req.query;
    
    console.log(`🎓 Generating student insights report for: ${studentId}`);

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - parseInt(timeframe.replace('d', '')));

    // Get student information
    const student = await User.findById(studentId)
      .select('name email studentInfo profilePicture')
      .lean();

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found'
      });
    }

    // Get comprehensive student insights data
    const insightsData = await getStudentInsightsData(studentId, startDate, endDate, {
      includeRecommendations,
      includeLearningPath,
      compareWithPeers
    });

    // Calculate detailed insights
    const insights = await calculateStudentInsights(insightsData, {
      includeRecommendations,
      includeLearningPath,
      compareWithPeers
    });

    // Generate report based on format
    let reportData;
    if (format === 'pdf') {
      reportData = await generateStudentInsightsPDFReport(insights, student, {
        timeframe,
        includeRecommendations,
        includeLearningPath,
        compareWithPeers,
        startDate,
        endDate
      });
    } else if (format === 'excel') {
      reportData = await generateStudentInsightsExcelReport(insights, student, {
        timeframe,
        includeRecommendations,
        includeLearningPath,
        compareWithPeers,
        startDate,
        endDate
      });
    } else {
      reportData = {
        student,
        insights,
        metadata: {
          timeframe,
          startDate,
          endDate,
          generatedAt: new Date(),
          dataPoints: insights.analytics.totalDataPoints
        }
      };
    }

    if (format === 'json') {
      res.json({
        success: true,
        message: 'Student insights report generated successfully',
        data: reportData
      });
    } else {
      // Send file for PDF/Excel
      const fileName = `Student_Insights_${student.name}_${Date.now()}.${format}`;
      const filePath = path.join(__dirname, '../temp', fileName);
      
      res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
      res.setHeader('Content-Type', 
        format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      
      res.sendFile(filePath);
    }

  } catch (error) {
    console.error('❌ Error generating student insights report:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate student insights report',
      error: error.message
    });
  }
};

// ==========================================
// 🔧 HELPER FUNCTIONS
// ==========================================

// Calculate student progress analytics
async function calculateStudentProgressAnalytics(submissions, student) {
  const analytics = {
    overview: {
      totalAssessments: submissions.length,
      averageScore: 0,
      highestScore: 0,
      lowestScore: 100,
      totalTimeSpent: 0,
      improvementTrend: 'stable'
    },
    
    subjects: {},
    
    timelineData: [],
    
    strengths: [],
    
    areasForImprovement: [],
    
    achievements: [],
    
    recommendations: []
  };

  // Calculate overview metrics
  if (submissions.length > 0) {
    analytics.overview.averageScore = submissions.reduce((sum, sub) => sum + sub.percentage, 0) / submissions.length;
    analytics.overview.highestScore = Math.max(...submissions.map(sub => sub.percentage));
    analytics.overview.lowestScore = Math.min(...submissions.map(sub => sub.percentage));
    analytics.overview.totalTimeSpent = submissions.reduce((sum, sub) => sum + sub.totalTimeSpent, 0);
  }

  // Subject-wise analysis
  submissions.forEach(submission => {
    const subject = submission.assessmentData.subject;
    
    if (!analytics.subjects[subject]) {
      analytics.subjects[subject] = {
        assessmentCount: 0,
        scores: [],
        totalTime: 0,
        averageScore: 0,
        trend: 'stable'
      };
    }
    
    analytics.subjects[subject].assessmentCount++;
    analytics.subjects[subject].scores.push(submission.percentage);
    analytics.subjects[subject].totalTime += submission.totalTimeSpent;
  });

  // Calculate subject averages and trends
  Object.keys(analytics.subjects).forEach(subject => {
    const subjectData = analytics.subjects[subject];
    subjectData.averageScore = subjectData.scores.reduce((a, b) => a + b, 0) / subjectData.scores.length;
    subjectData.trend = calculateTrend(subjectData.scores);
  });

  // Timeline data for progress visualization
  analytics.timelineData = submissions.map(submission => ({
    date: submission.submittedAt,
    score: submission.percentage,
    subject: submission.assessmentData.subject,
    assessmentTitle: submission.assessmentData.title
  }));

  // Identify strengths and weaknesses
  analytics.strengths = Object.entries(analytics.subjects)
    .filter(([_, data]) => data.averageScore >= 80)
    .map(([subject, data]) => ({
      subject,
      score: data.averageScore,
      consistency: calculateConsistency(data.scores)
    }));

  analytics.areasForImprovement = Object.entries(analytics.subjects)
    .filter(([_, data]) => data.averageScore < 70)
    .map(([subject, data]) => ({
      subject,
      score: data.averageScore,
      priority: data.averageScore < 50 ? 'high' : 'medium',
      recommendations: generateSubjectRecommendations(subject, data)
    }));

  // Calculate improvement trend
  if (submissions.length >= 3) {
    const recentScores = analytics.timelineData.slice(-3).map(item => item.score);
    const earlierScores = analytics.timelineData.slice(0, 3).map(item => item.score);
    
    const recentAvg = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;
    const earlierAvg = earlierScores.reduce((a, b) => a + b, 0) / earlierScores.length;
    
    analytics.overview.improvementTrend = recentAvg > earlierAvg + 5 ? 'improving' :
                                        recentAvg < earlierAvg - 5 ? 'declining' : 'stable';
  }

  return analytics;
}

// Get class progress data
async function getClassProgressData(teacherId, classId, startDate, endDate, subject) {
  const filter = {
    createdBy: teacherId,
    class: classId,
    createdAt: { $gte: startDate, $lte: endDate }
  };

  if (subject !== 'all') {
    filter.subject = subject;
  }

  const assessments = await Assessment.find(filter)
    .populate('statistics')
    .lean();

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
        submittedAt: { $gte: startDate, $lte: endDate },
        ...(subject !== 'all' && { 'assessmentData.subject': subject })
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

  return {
    assessments,
    submissions
  };
}

// Calculate class progress analytics
async function calculateClassProgressAnalytics(classData) {
  const { assessments, submissions } = classData;
  
  const analytics = {
    overview: {
      totalStudents: new Set(submissions.map(s => s.student.toString())).size,
      totalAssessments: assessments.length,
      averageScore: 0,
      participationRate: 0,
      completionRate: 0
    },
    
    studentPerformance: {},
    
    assessmentAnalytics: [],
    
    subjectBreakdown: {},
    
    trends: {
      scoreProgression: [],
      participationTrend: 'stable',
      performanceTrend: 'stable'
    },
    
    insights: {
      topPerformers: [],
      strugglingStudents: [],
      improvedStudents: [],
      recommendations: []
    }
  };

  // Calculate overview metrics
  if (submissions.length > 0) {
    analytics.overview.averageScore = submissions.reduce((sum, sub) => sum + sub.percentage, 0) / submissions.length;
    
    const totalInvited = assessments.reduce((sum, assessment) => sum + assessment.statistics.totalInvited, 0);
    const totalCompleted = assessments.reduce((sum, assessment) => sum + assessment.statistics.totalCompleted, 0);
    
    analytics.overview.participationRate = totalInvited > 0 ? (totalCompleted / totalInvited) * 100 : 0;
    analytics.overview.completionRate = analytics.overview.participationRate;
  }

  // Student performance analysis
  const studentGroups = groupBy(submissions, 'student');
  
  Object.entries(studentGroups).forEach(([studentId, studentSubmissions]) => {
    const student = studentSubmissions[0].studentData;
    const scores = studentSubmissions.map(sub => sub.percentage);
    
    analytics.studentPerformance[studentId] = {
      name: student.name,
      email: student.email,
      assessmentCount: studentSubmissions.length,
      averageScore: scores.reduce((a, b) => a + b, 0) / scores.length,
      highestScore: Math.max(...scores),
      lowestScore: Math.min(...scores),
      trend: calculateTrend(scores),
      consistency: calculateConsistency(scores)
    };
  });

  // Assessment analytics
  analytics.assessmentAnalytics = assessments.map(assessment => ({
    id: assessment._id,
    title: assessment.title,
    subject: assessment.subject,
    averageScore: assessment.statistics.averageScore,
    participationRate: (assessment.statistics.totalCompleted / assessment.statistics.totalInvited) * 100,
    difficulty: calculateAssessmentDifficulty(assessment.statistics.averageScore),
    createdAt: assessment.createdAt
  }));

  // Subject breakdown
  const subjectGroups = groupBy(submissions, 'assessmentData.subject');
  
  Object.entries(subjectGroups).forEach(([subject, subjectSubmissions]) => {
    const scores = subjectSubmissions.map(sub => sub.percentage);
    
    analytics.subjectBreakdown[subject] = {
      assessmentCount: new Set(subjectSubmissions.map(sub => sub.assessment.toString())).size,
      submissionCount: subjectSubmissions.length,
      averageScore: scores.reduce((a, b) => a + b, 0) / scores.length,
      participationRate: calculateSubjectParticipation(subjectSubmissions),
      trend: calculateTrend(scores)
    };
  });

  // Identify insights
  const performanceEntries = Object.entries(analytics.studentPerformance);
  
  analytics.insights.topPerformers = performanceEntries
    .sort(([,a], [,b]) => b.averageScore - a.averageScore)
    .slice(0, 5)
    .map(([id, data]) => ({ id, ...data }));

  analytics.insights.strugglingStudents = performanceEntries
    .filter(([,data]) => data.averageScore < 60)
    .sort(([,a], [,b]) => a.averageScore - b.averageScore)
    .slice(0, 5)
    .map(([id, data]) => ({ id, ...data }));

  analytics.insights.improvedStudents = performanceEntries
    .filter(([,data]) => data.trend === 'improving')
    .sort(([,a], [,b]) => b.averageScore - a.averageScore)
    .slice(0, 5)
    .map(([id, data]) => ({ id, ...data }));

  return analytics;
}

// Calculate trend direction
function calculateTrend(scores) {
  if (scores.length < 3) return 'insufficient_data';
  
  const recent = scores.slice(-3);
  const earlier = scores.slice(0, 3);
  
  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const earlierAvg = earlier.reduce((a, b) => a + b, 0) / earlier.length;
  
  const diff = recentAvg - earlierAvg;
  return diff > 5 ? 'improving' : diff < -5 ? 'declining' : 'stable';
}

// Calculate consistency score
function calculateConsistency(scores) {
  if (scores.length < 2) return 100;
  
  const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
  const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
  const standardDeviation = Math.sqrt(variance);
  
  return Math.max(0, 100 - (standardDeviation * 2));
}

// Generate subject recommendations
function generateSubjectRecommendations(subject, data) {
  const recommendations = [];
  
  if (data.averageScore < 50) {
    recommendations.push(`Focus on fundamental concepts in ${subject}`);
    recommendations.push(`Seek additional help from teachers`);
  } else if (data.averageScore < 70) {
    recommendations.push(`Practice more problems in ${subject}`);
    recommendations.push(`Review challenging topics`);
  }
  
  if (data.trend === 'declining') {
    recommendations.push(`Address recent performance decline in ${subject}`);
  }
  
  return recommendations;
}

// Calculate assessment difficulty
function calculateAssessmentDifficulty(averageScore) {
  if (averageScore >= 80) return 'easy';
  if (averageScore >= 60) return 'medium';
  return 'hard';
}

// Calculate subject participation
function calculateSubjectParticipation(submissions) {
  // Simplified calculation - could be enhanced with actual invitation data
  return 85; // Default 85% participation
}

// Group array by key
function groupBy(array, key) {
  return array.reduce((groups, item) => {
    const groupKey = key.includes('.') ? 
      key.split('.').reduce((obj, prop) => obj[prop], item) : 
      item[key];
    
    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    groups[groupKey].push(item);
    return groups;
  }, {});
}

// Generate PDF report (placeholder - implement with PDFKit)
async function generateProgressPDFReport(analytics, student, options) {
  // Implementation would use PDFKit to create comprehensive PDF
  console.log('📄 Generating PDF report for:', student.name);
  
  // Create temp directory if it doesn't exist
  const tempDir = path.join(__dirname, '../temp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  const fileName = `${student.name}_Progress_Report_${Date.now()}.pdf`;
  const filePath = path.join(tempDir, fileName);
  
  // Create PDF document
  const doc = new PDFDocument();
  doc.pipe(fs.createWriteStream(filePath));
  
  // Add content
  doc.fontSize(20).text('Student Progress Report', 100, 100);
  doc.fontSize(14).text(`Student: ${student.name}`, 100, 140);
  doc.text(`Report Period: ${options.startDate.toDateString()} - ${options.endDate.toDateString()}`, 100, 160);
  doc.text(`Average Score: ${analytics.overview.averageScore.toFixed(2)}%`, 100, 180);
  
  // Add more content...
  
  doc.end();
  
  return filePath;
}

// Generate Excel report (placeholder - implement with ExcelJS)
async function generateProgressExcelReport(analytics, student, options) {
  console.log('📊 Generating Excel report for:', student.name);
  
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Progress Report');
  
  // Add headers and data
  worksheet.addRow(['Student Progress Report']);
  worksheet.addRow([`Student: ${student.name}`]);
  worksheet.addRow([`Period: ${options.startDate.toDateString()} - ${options.endDate.toDateString()}`]);
  worksheet.addRow([]);
  worksheet.addRow(['Metric', 'Value']);
  worksheet.addRow(['Average Score', `${analytics.overview.averageScore.toFixed(2)}%`]);
  worksheet.addRow(['Total Assessments', analytics.overview.totalAssessments]);
  
  // Add more data...
  
  const tempDir = path.join(__dirname, '../temp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  const fileName = `${student.name}_Progress_Report_${Date.now()}.xlsx`;
  const filePath = path.join(tempDir, fileName);
  
  await workbook.xlsx.writeFile(filePath);
  return filePath;
}

// Placeholder functions for other report types
async function generateClassProgressPDFReport(analytics, teacher, classId, options) {
  // Implement class progress PDF generation
  return 'class_progress.pdf';
}

async function generateClassProgressExcelReport(analytics, teacher, classId, options) {
  // Implement class progress Excel generation
  return 'class_progress.xlsx';
}

async function getClassPerformanceAnalytics(classId, startDate, endDate) {
  // Implement class performance data retrieval
  return {};
}

async function getSubjectPerformanceAnalytics(subject, startDate, endDate) {
  // Implement subject performance data retrieval
  return {};
}

async function getSchoolPerformanceAnalytics(startDate, endDate) {
  // Implement school-wide performance data retrieval
  return {};
}

async function calculatePerformanceMetrics(data, options) {
  // Implement performance metrics calculation
  return {};
}

async function generatePerformancePDFReport(data, options) {
  // Implement performance PDF generation
  return 'performance.pdf';
}

async function generatePerformanceExcelReport(data, options) {
  // Implement performance Excel generation
  return 'performance.xlsx';
}

async function getTeacherDashboardData(teacherId, startDate, endDate) {
  // Implement teacher dashboard data retrieval
  return {};
}

async function calculateTeacherDashboardAnalytics(data, options) {
  // Implement teacher dashboard analytics
  return {};
}

async function generateTeacherDashboardPDFReport(analytics, teacher, options) {
  // Implement teacher dashboard PDF generation
  return 'teacher_dashboard.pdf';
}

async function generateTeacherDashboardExcelReport(analytics, teacher, options) {
  // Implement teacher dashboard Excel generation
  return 'teacher_dashboard.xlsx';
}

async function getStudentInsightsData(studentId, startDate, endDate, options) {
  // Implement student insights data retrieval
  return {};
}

async function calculateStudentInsights(data, options) {
  // Implement student insights calculation
  return {};
}

async function generateStudentInsightsPDFReport(insights, student, options) {
  // Implement student insights PDF generation
  return 'student_insights.pdf';
}

async function generateStudentInsightsExcelReport(insights, student, options) {
  // Implement student insights Excel generation
  return 'student_insights.xlsx';
}

module.exports = {
  generateStudentProgressReport,
  generateClassProgressReport,
  generatePerformanceAnalyticsReport,
  generateTeacherDashboardReport,
  generateStudentInsightsReport
};
