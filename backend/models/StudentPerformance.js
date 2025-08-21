const mongoose = require('mongoose');

// 📊 GyanGuru Student Performance Analytics Model
// Features: Subject-wise tracking, Progress analysis, Weak areas identification

const studentPerformanceSchema = new mongoose.Schema({
  
  // Student Information
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Student ID is required'],
    index: true
  },
  
  // Academic Period
  academicYear: {
    type: String,
    required: true,
    default: () => new Date().getFullYear().toString()
  },
  
  academicMonth: {
    type: Number,
    required: true,
    default: () => new Date().getMonth() + 1,
    min: 1,
    max: 12
  },
  
  // Subject-wise Performance
  subjectPerformance: [{
    subject: {
      type: String,
      required: true,
      enum: [
        'Mathematics', 'Physics', 'Chemistry', 'Biology', 
        'English', 'Bangla', 'ICT', 'Economics', 'Accounting',
        'History', 'Geography', 'Civics', 'Religion', 'General'
      ]
    },
    
    // Assessment Statistics
    totalAssessments: { type: Number, default: 0 },
    completedAssessments: { type: Number, default: 0 },
    averageScore: { type: Number, default: 0, min: 0, max: 100 },
    bestScore: { type: Number, default: 0, min: 0, max: 100 },
    worstScore: { type: Number, default: 0, min: 0, max: 100 },
    
    // Time Analytics
    totalTimeSpent: { type: Number, default: 0 }, // in minutes
    averageTimePerAssessment: { type: Number, default: 0 },
    
    // Progress Tracking
    improvementRate: { type: Number, default: 0 }, // percentage improvement
    consistencyScore: { type: Number, default: 0 }, // 0-100
    difficultyProgression: {
      easy: { attempted: Number, success: Number },
      medium: { attempted: Number, success: Number },
      hard: { attempted: Number, success: Number }
    },
    
    // Weak Areas
    weakTopics: [{
      topic: String,
      successRate: Number,
      attemptsCount: Number,
      needsImprovement: Boolean
    }],
    
    // Strong Areas
    strongTopics: [{
      topic: String,
      successRate: Number,
      masteryLevel: String // 'beginner', 'intermediate', 'advanced', 'expert'
    }],
    
    // Monthly Progress
    monthlyScores: [{
      month: Number,
      year: Number,
      averageScore: Number,
      assessmentCount: Number,
      timeSpent: Number
    }],
    
    // Comparative Analysis
    classRanking: {
      position: Number,
      totalStudents: Number,
      percentile: Number
    },
    
    classAverage: Number,
    performanceVsClass: String // 'above', 'average', 'below'
  }],
  
  // Overall Performance Metrics
  overallMetrics: {
    // Academic Performance
    overallGPA: { type: Number, default: 0, min: 0, max: 5 },
    overallPercentage: { type: Number, default: 0, min: 0, max: 100 },
    totalAssessmentsCompleted: { type: Number, default: 0 },
    
    // Time Management
    totalStudyTime: { type: Number, default: 0 }, // in minutes
    averageSessionTime: { type: Number, default: 0 },
    studyRegularity: { type: Number, default: 0 }, // days studied this month
    
    // Progress Indicators
    monthlyImprovement: { type: Number, default: 0 }, // percentage
    learningVelocity: { type: Number, default: 0 }, // assessments per week
    goalAchievementRate: { type: Number, default: 0 }, // percentage
    
    // Behavioral Analytics
    procrastinationIndex: { type: Number, default: 0 }, // 0-100 (higher = more procrastination)
    focusScore: { type: Number, default: 100 }, // 0-100 (based on time spent vs results)
    adaptabilityScore: { type: Number, default: 50 }, // 0-100 (how well adapts to difficulty)
    
    // Engagement Metrics
    loginFrequency: { type: Number, default: 0 }, // logins per week
    featureUsage: {
      assessments: Number,
      questionPractice: Number,
      teacherInteraction: Number,
      resourceDownloads: Number
    }
  },
  
  // Learning Patterns
  learningPatterns: {
    // Preferred Study Times
    preferredStudyHours: [{
      hour: Number, // 0-23
      activityLevel: Number, // 0-100
      performanceLevel: Number // 0-100
    }],
    
    // Study Session Analysis
    averageSessionLength: Number, // minutes
    optimalSessionLength: Number, // minutes
    breakPatterns: {
      frequency: Number, // breaks per hour
      averageDuration: Number // minutes
    },
    
    // Learning Speed
    fastLearningSubjects: [String],
    slowLearningSubjects: [String],
    averageLearningSpeed: Number, // questions per minute
    
    // Error Patterns
    commonMistakes: [{
      category: String,
      frequency: Number,
      lastOccurrence: Date
    }],
    
    // Improvement Areas
    recommendedActions: [{
      type: String, // 'practice_more', 'review_basics', 'seek_help', 'time_management'
      subject: String,
      priority: String, // 'high', 'medium', 'low'
      description: String,
      estimatedImpact: Number // 0-100
    }]
  },
  
  // Goals and Targets
  academicGoals: [{
    type: String, // 'subject_improvement', 'overall_grade', 'time_management', 'specific_skill'
    target: String,
    currentValue: Number,
    targetValue: Number,
    deadline: Date,
    progress: Number, // 0-100
    status: {
      type: String,
      enum: ['not_started', 'in_progress', 'achieved', 'overdue'],
      default: 'not_started'
    }
  }],
  
  // Achievements and Milestones
  achievements: [{
    type: String,
    title: String,
    description: String,
    earnedDate: Date,
    category: String, // 'academic', 'consistency', 'improvement', 'mastery'
    points: Number,
    badge: String // badge icon/color
  }],
  
  // Feedback and Recommendations
  systemRecommendations: [{
    category: String, // 'study_plan', 'resource', 'teacher_help', 'practice'
    recommendation: String,
    reason: String,
    priority: Number, // 1-5
    implementationDate: Date,
    status: String // 'pending', 'implemented', 'dismissed'
  }],
  
  // Comparative Analysis
  peerComparison: {
    classPosition: Number,
    gradePosition: Number,
    schoolPosition: Number,
    subjectWiseRanking: [{
      subject: String,
      position: Number,
      totalStudents: Number,
      percentile: Number
    }]
  },
  
  // Prediction Models
  predictionData: {
    // Grade Prediction
    predictedFinalGrade: {
      percentage: Number,
      confidence: Number, // 0-100
      factors: [String] // factors affecting prediction
    },
    
    // Improvement Prediction
    improvementPotential: {
      shortTerm: Number, // 1-month potential improvement
      mediumTerm: Number, // 3-month potential
      longTerm: Number, // 6-month potential
      recommendations: [String]
    },
    
    // Risk Assessment
    riskFactors: [{
      factor: String,
      severity: String, // 'low', 'medium', 'high'
      impact: String,
      mitigation: String
    }]
  },
  
  // Data Timestamps
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  
  lastCalculated: {
    type: Date,
    default: Date.now
  },
  
  // Metadata
  dataVersion: {
    type: String,
    default: '1.0'
  },
  
  calculationMetadata: {
    totalDataPoints: Number,
    calculationMethod: String,
    confidenceLevel: Number
  }

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for optimal performance
studentPerformanceSchema.index({ studentId: 1, academicYear: 1, academicMonth: 1 });
studentPerformanceSchema.index({ 'subjectPerformance.subject': 1 });
studentPerformanceSchema.index({ 'overallMetrics.overallPercentage': -1 });
studentPerformanceSchema.index({ lastUpdated: -1 });

// Virtual fields
studentPerformanceSchema.virtual('currentGradeLevel').get(function() {
  const percentage = this.overallMetrics.overallPercentage;
  if (percentage >= 90) return 'A+';
  if (percentage >= 80) return 'A';
  if (percentage >= 70) return 'B';
  if (percentage >= 60) return 'C';
  if (percentage >= 50) return 'D';
  return 'F';
});

studentPerformanceSchema.virtual('performanceStatus').get(function() {
  const improvement = this.overallMetrics.monthlyImprovement;
  if (improvement > 10) return 'excellent';
  if (improvement > 5) return 'good';
  if (improvement > 0) return 'stable';
  if (improvement > -5) return 'declining';
  return 'concerning';
});

studentPerformanceSchema.virtual('studyEfficiency').get(function() {
  const timeSpent = this.overallMetrics.totalStudyTime;
  const score = this.overallMetrics.overallPercentage;
  if (timeSpent === 0) return 0;
  return Math.round((score / (timeSpent / 60)) * 10) / 10; // score per hour
});

// Instance Methods
studentPerformanceSchema.methods.getSubjectAnalysis = function(subject) {
  const subjectData = this.subjectPerformance.find(s => s.subject === subject);
  if (!subjectData) return null;
  
  return {
    performance: subjectData.averageScore,
    trend: subjectData.improvementRate,
    ranking: subjectData.classRanking,
    weakAreas: subjectData.weakTopics,
    strongAreas: subjectData.strongTopics,
    timeEfficiency: subjectData.totalTimeSpent / subjectData.completedAssessments
  };
};

studentPerformanceSchema.methods.getImprovementSuggestions = function() {
  const suggestions = [];
  
  // Analyze weak subjects
  this.subjectPerformance.forEach(subject => {
    if (subject.averageScore < 60) {
      suggestions.push({
        type: 'subject_improvement',
        subject: subject.subject,
        priority: 'high',
        action: `Focus on ${subject.subject} - current score: ${subject.averageScore}%`,
        weakTopics: subject.weakTopics.slice(0, 3)
      });
    }
  });
  
  // Time management suggestions
  if (this.overallMetrics.procrastinationIndex > 70) {
    suggestions.push({
      type: 'time_management',
      priority: 'medium',
      action: 'Improve study schedule consistency',
      recommendation: 'Set fixed daily study times'
    });
  }
  
  return suggestions;
};

studentPerformanceSchema.methods.calculateProgressTrend = function(months = 3) {
  const recentData = [];
  const currentMonth = new Date().getMonth() + 1;
  
  for (let i = 0; i < months; i++) {
    const month = currentMonth - i;
    const monthData = this.subjectPerformance.map(subject => {
      const monthlyScore = subject.monthlyScores.find(m => m.month === month);
      return monthlyScore ? monthlyScore.averageScore : 0;
    });
    
    const avgScore = monthData.reduce((a, b) => a + b, 0) / monthData.length;
    recentData.unshift(avgScore);
  }
  
  // Calculate trend (simple linear regression slope)
  let trend = 0;
  if (recentData.length > 1) {
    const n = recentData.length;
    const sumX = (n * (n + 1)) / 2;
    const sumY = recentData.reduce((a, b) => a + b, 0);
    const sumXY = recentData.reduce((acc, y, x) => acc + (x + 1) * y, 0);
    const sumX2 = (n * (n + 1) * (2 * n + 1)) / 6;
    
    trend = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
  }
  
  return {
    data: recentData,
    trend: Math.round(trend * 100) / 100,
    direction: trend > 0 ? 'improving' : trend < 0 ? 'declining' : 'stable'
  };
};

// Static Methods
studentPerformanceSchema.statics.getClassAverages = async function(grade, subject = null) {
  const matchQuery = { 'studentId': { $exists: true } };
  
  if (subject) {
    return await this.aggregate([
      { $match: matchQuery },
      { $unwind: '$subjectPerformance' },
      { $match: { 'subjectPerformance.subject': subject } },
      {
        $group: {
          _id: null,
          averageScore: { $avg: '$subjectPerformance.averageScore' },
          studentCount: { $sum: 1 },
          bestScore: { $max: '$subjectPerformance.bestScore' },
          worstScore: { $min: '$subjectPerformance.worstScore' }
        }
      }
    ]);
  } else {
    return await this.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          averageGPA: { $avg: '$overallMetrics.overallGPA' },
          averagePercentage: { $avg: '$overallMetrics.overallPercentage' },
          studentCount: { $sum: 1 }
        }
      }
    ]);
  }
};

studentPerformanceSchema.statics.getTopPerformers = async function(subject = null, limit = 10) {
  if (subject) {
    return await this.aggregate([
      { $unwind: '$subjectPerformance' },
      { $match: { 'subjectPerformance.subject': subject } },
      { $sort: { 'subjectPerformance.averageScore': -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: 'users',
          localField: 'studentId',
          foreignField: '_id',
          as: 'student'
        }
      },
      {
        $project: {
          studentName: '$student.name',
          score: '$subjectPerformance.averageScore',
          subject: '$subjectPerformance.subject'
        }
      }
    ]);
  } else {
    return await this.find({})
      .sort({ 'overallMetrics.overallPercentage': -1 })
      .limit(limit)
      .populate('studentId', 'name avatar')
      .select('studentId overallMetrics.overallPercentage overallMetrics.overallGPA');
  }
};

studentPerformanceSchema.statics.generateAnalyticsReport = async function(studentId, timeframe = 'month') {
  const student = await this.findOne({ studentId }).populate('studentId', 'name email');
  if (!student) return null;
  
  const report = {
    student: student.studentId,
    period: timeframe,
    generatedAt: new Date(),
    
    overview: {
      overallGrade: student.currentGradeLevel,
      overallPercentage: student.overallMetrics.overallPercentage,
      monthlyImprovement: student.overallMetrics.monthlyImprovement,
      studyEfficiency: student.studyEfficiency
    },
    
    subjectAnalysis: student.subjectPerformance.map(subject => ({
      subject: subject.subject,
      score: subject.averageScore,
      trend: subject.improvementRate,
      ranking: subject.classRanking,
      timeSpent: subject.totalTimeSpent,
      weakTopics: subject.weakTopics.slice(0, 3),
      strongTopics: subject.strongTopics.slice(0, 3)
    })),
    
    recommendations: student.getImprovementSuggestions(),
    progressTrend: student.calculateProgressTrend(3),
    achievements: student.achievements.slice(-5),
    goals: student.academicGoals.filter(g => g.status === 'in_progress')
  };
  
  return report;
};

module.exports = mongoose.model('StudentPerformance', studentPerformanceSchema);
