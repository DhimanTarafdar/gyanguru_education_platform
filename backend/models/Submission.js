const mongoose = require('mongoose');

// ============================================
// 📄 SUBMISSION MODEL - Student এর Quiz/Assessment Submit করার Data
// ============================================

const submissionSchema = new mongoose.Schema({
  
  // 🔗 REFERENCES - Assessment এবং Student এর connection
  assessment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Assessment',
    required: [true, 'Assessment reference is required'],
    index: true // Performance এর জন্য index
  },
  
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Student reference is required'],
    index: true // Student এর সব submission quickly find করার জন্য
  },
  
  // ⏰ TIMING INFORMATION - Quiz করার সময়ের data
  startTime: {
    type: Date,
    required: [true, 'Start time is required'],
    default: Date.now
  },
  
  endTime: {
    type: Date,
    validate: {
      validator: function(endTime) {
        // End time start time এর পরে হতে হবে
        return !endTime || endTime > this.startTime;
      },
      message: 'End time must be after start time'
    }
  },
  
  totalTimeSpent: {
    type: Number, // Minutes এ
    default: 0,
    min: [0, 'Time spent cannot be negative']
  },
  
  // 📝 ANSWERS ARRAY - Student এর সব answer গুলো
  answers: [{
    question: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question',
      required: true
    },
    
    // Student এর দেওয়া answer - different types এর জন্য flexible
    studentAnswer: {
      mcqOption: String,           // MCQ এর জন্য - option A, B, C, D
      textAnswer: String,          // Text answer এর জন্য
      selectedOptions: [String],   // Multiple selection এর জন্য
      writtenImage: String         // CQ এর written answer এর image URL (Cloudinary)
    },
    
    // ⏱️ Question wise timing
    timeSpentOnQuestion: {
      type: Number, // Seconds এ
      default: 0,
      min: [0, 'Time cannot be negative']
    },
    
    // 📊 GRADING INFORMATION
    isCorrect: {
      type: Boolean,
      default: null // null = not graded yet
    },
    
    marksObtained: {
      type: Number,
      default: 0,
      min: [0, 'Marks cannot be negative']
    },
    
    maxMarks: {
      type: Number,
      required: true,
      min: [1, 'Max marks must be at least 1']
    },
    
    // 👨‍🏫 TEACHER FEEDBACK (CQ এর জন্য)
    teacherFeedback: {
      type: String,
      maxLength: [1000, 'Feedback cannot exceed 1000 characters']
    },
    
    // 🤖 AI GRADING (Future feature)
    aiGrading: {
      confidence: {
        type: Number,
        min: 0,
        max: 1 // 0 to 1 scale
      },
      suggestion: String
    }
  }],
  
  // 🏆 OVERALL SCORING
  totalMarksObtained: {
    type: Number,
    default: 0,
    min: [0, 'Total marks cannot be negative']
  },
  
  totalMaxMarks: {
    type: Number,
    required: true,
    min: [1, 'Total max marks must be at least 1']
  },
  
  percentage: {
    type: Number,
    min: [0, 'Percentage cannot be negative'],
    max: [100, 'Percentage cannot exceed 100']
  },
  
  grade: {
    type: String,
    enum: ['A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D', 'F'],
    default: null
  },
  
  // 📊 STATUS TRACKING
  status: {
    type: String,
    enum: ['in_progress', 'submitted', 'partially_graded', 'fully_graded', 'reviewed'],
    default: 'in_progress',
    index: true // Status wise query করার জন্য
  },
  
  submissionMethod: {
    type: String,
    enum: ['auto_submit', 'manual_submit', 'time_expired'],
    default: 'manual_submit'
  },
  
  // 📱 SUBMISSION DETAILS
  submittedAt: {
    type: Date,
    index: true // Recent submissions query করার জন্য
  },
  
  ipAddress: {
    type: String,
    validate: {
      validator: function(ip) {
        // Basic IP validation
        return !ip || /^(\d{1,3}\.){3}\d{1,3}$/.test(ip);
      },
      message: 'Invalid IP address format'
    }
  },
  
  userAgent: String, // Security এর জন্য browser/device info
  
  // 🔄 REVISION TRACKING
  revisionCount: {
    type: Number,
    default: 0,
    min: [0, 'Revision count cannot be negative']
  },
  
  lastRevisedAt: Date,
  
  // 🎯 PERFORMANCE ANALYTICS
  analytics: {
    // Per difficulty performance
    easyQuestionsCorrect: { type: Number, default: 0 },
    mediumQuestionsCorrect: { type: Number, default: 0 },
    hardQuestionsCorrect: { type: Number, default: 0 },
    
    // Time analytics
    averageTimePerQuestion: { type: Number, default: 0 },
    fastestQuestion: { type: Number, default: 0 },
    slowestQuestion: { type: Number, default: 0 },
    
    // Accuracy metrics
    mcqAccuracy: { type: Number, default: 0 },
    cqAccuracy: { type: Number, default: 0 }
  },
  
  // 🏅 RANKING & COMPARISON
  rankInClass: {
    type: Number,
    min: [1, 'Rank must be at least 1']
  },
  
  percentile: {
    type: Number,
    min: [0, 'Percentile cannot be negative'],
    max: [100, 'Percentile cannot exceed 100']
  },
  
  // 🔒 INTEGRITY CHECKS
  integrityFlags: {
    suspiciousActivity: { type: Boolean, default: false },
    timeAnomaly: { type: Boolean, default: false },
    patternAnomaly: { type: Boolean, default: false },
    flaggedForReview: { type: Boolean, default: false }
  },
  
  // 📧 NOTIFICATION STATUS
  notificationsSent: {
    studentNotified: { type: Boolean, default: false },
    teacherNotified: { type: Boolean, default: false },
    parentsNotified: { type: Boolean, default: false }
  }

}, {
  timestamps: true, // createdAt, updatedAt automatic
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ==========================================
// 🔍 INDEXES FOR PERFORMANCE
// ==========================================

// Compound index - Student এর সব submission
submissionSchema.index({ student: 1, submittedAt: -1 });

// Assessment এর সব submission
submissionSchema.index({ assessment: 1, status: 1 });

// Performance ranking queries
submissionSchema.index({ assessment: 1, percentage: -1 });

// Date range queries
submissionSchema.index({ submittedAt: -1 });

// Unique constraint - একই assessment এ একই student একাধিক submission করতে পারবে না
submissionSchema.index({ assessment: 1, student: 1 }, { unique: true });

// ==========================================
// 🧮 VIRTUAL FIELDS - Calculated Properties
// ==========================================

// Calculate accuracy percentage
submissionSchema.virtual('accuracyPercentage').get(function() {
  if (this.answers.length === 0) return 0;
  const correctAnswers = this.answers.filter(answer => answer.isCorrect === true).length;
  return Math.round((correctAnswers / this.answers.length) * 100);
});

// Calculate total time in readable format
submissionSchema.virtual('totalTimeFormatted').get(function() {
  const hours = Math.floor(this.totalTimeSpent / 60);
  const minutes = this.totalTimeSpent % 60;
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
});

// Check if submission is late
submissionSchema.virtual('isLateSubmission').get(function() {
  if (!this.submittedAt || !this.assessment.endTime) return false;
  return this.submittedAt > this.assessment.endTime;
});

// Calculate completion percentage
submissionSchema.virtual('completionPercentage').get(function() {
  if (this.answers.length === 0) return 0;
  const answeredQuestions = this.answers.filter(answer => 
    answer.studentAnswer.mcqOption || 
    answer.studentAnswer.textAnswer || 
    answer.studentAnswer.writtenImage
  ).length;
  return Math.round((answeredQuestions / this.answers.length) * 100);
});

// ==========================================
// 🔧 MIDDLEWARE - Automatic Operations
// ==========================================

// Pre-save middleware - Calculate scores automatically
submissionSchema.pre('save', function(next) {
  // Calculate total marks obtained
  this.totalMarksObtained = this.answers.reduce((total, answer) => {
    return total + (answer.marksObtained || 0);
  }, 0);
  
  // Calculate percentage
  if (this.totalMaxMarks > 0) {
    this.percentage = Math.round((this.totalMarksObtained / this.totalMaxMarks) * 100);
  }
  
  // Assign grade based on percentage
  if (this.percentage !== null) {
    if (this.percentage >= 90) this.grade = 'A+';
    else if (this.percentage >= 85) this.grade = 'A';
    else if (this.percentage >= 80) this.grade = 'A-';
    else if (this.percentage >= 75) this.grade = 'B+';
    else if (this.percentage >= 70) this.grade = 'B';
    else if (this.percentage >= 65) this.grade = 'B-';
    else if (this.percentage >= 60) this.grade = 'C+';
    else if (this.percentage >= 55) this.grade = 'C';
    else if (this.percentage >= 50) this.grade = 'C-';
    else if (this.percentage >= 40) this.grade = 'D';
    else this.grade = 'F';
  }
  
  // Update submission timestamp if status changed to submitted
  if (this.status === 'submitted' && !this.submittedAt) {
    this.submittedAt = new Date();
  }
  
  // Calculate analytics
  this.calculateAnalytics();
  
  next();
});

// ==========================================
// 📊 INSTANCE METHODS - Custom Functions
// ==========================================

// Calculate detailed analytics
submissionSchema.methods.calculateAnalytics = function() {
  if (this.answers.length === 0) return;
  
  // Reset analytics
  this.analytics = {
    easyQuestionsCorrect: 0,
    mediumQuestionsCorrect: 0,
    hardQuestionsCorrect: 0,
    averageTimePerQuestion: 0,
    fastestQuestion: Infinity,
    slowestQuestion: 0,
    mcqAccuracy: 0,
    cqAccuracy: 0
  };
  
  let totalTime = 0;
  let mcqTotal = 0, mcqCorrect = 0;
  let cqTotal = 0, cqCorrect = 0;
  
  this.answers.forEach(answer => {
    // Time tracking
    totalTime += answer.timeSpentOnQuestion || 0;
    this.analytics.fastestQuestion = Math.min(this.analytics.fastestQuestion, answer.timeSpentOnQuestion || 0);
    this.analytics.slowestQuestion = Math.max(this.analytics.slowestQuestion, answer.timeSpentOnQuestion || 0);
    
    // Type-wise accuracy (will be populated from question data)
    // This would require population in actual implementation
  });
  
  // Calculate averages
  this.analytics.averageTimePerQuestion = Math.round(totalTime / this.answers.length);
  
  if (this.analytics.fastestQuestion === Infinity) {
    this.analytics.fastestQuestion = 0;
  }
};

// Auto-grade MCQ answers
submissionSchema.methods.autoGradeMCQ = async function() {
  for (let answer of this.answers) {
    // Populate question to get correct answer
    await this.populate('answers.question');
    
    const question = answer.question;
    if (question.type === 'mcq') {
      const correctOption = question.options.find(opt => opt.isCorrect);
      
      if (correctOption && answer.studentAnswer.mcqOption === correctOption.text) {
        answer.isCorrect = true;
        answer.marksObtained = answer.maxMarks;
      } else {
        answer.isCorrect = false;
        answer.marksObtained = 0;
      }
    }
  }
  
  return this.save();
};

// Generate detailed report
submissionSchema.methods.generateReport = function() {
  return {
    student: this.student,
    assessment: this.assessment,
    performance: {
      totalMarks: this.totalMarksObtained,
      maxMarks: this.totalMaxMarks,
      percentage: this.percentage,
      grade: this.grade,
      accuracy: this.accuracyPercentage
    },
    timing: {
      totalTime: this.totalTimeFormatted,
      averagePerQuestion: Math.round(this.analytics.averageTimePerQuestion),
      submissionStatus: this.submissionMethod
    },
    analytics: this.analytics,
    completionStatus: {
      isComplete: this.completionPercentage === 100,
      completionRate: this.completionPercentage,
      isLate: this.isLateSubmission
    }
  };
};

// ==========================================
// 📈 STATIC METHODS - Collection Level Operations
// ==========================================

// Get assessment leaderboard
submissionSchema.statics.getLeaderboard = function(assessmentId, limit = 10) {
  return this.find({ 
    assessment: assessmentId, 
    status: { $in: ['submitted', 'fully_graded'] }
  })
  .populate('student', 'name avatar')
  .sort({ percentage: -1, submittedAt: 1 })
  .limit(limit)
  .select('student percentage totalMarksObtained grade submittedAt');
};

// Get student performance history
submissionSchema.statics.getStudentHistory = function(studentId, limit = 20) {
  return this.find({ student: studentId })
    .populate('assessment', 'title subject class')
    .sort({ submittedAt: -1 })
    .limit(limit)
    .select('assessment percentage grade submittedAt totalTimeSpent');
};

// Get assessment analytics
submissionSchema.statics.getAssessmentAnalytics = async function(assessmentId) {
  const submissions = await this.find({ 
    assessment: assessmentId, 
    status: { $in: ['submitted', 'fully_graded'] }
  });
  
  if (submissions.length === 0) {
    return {
      totalSubmissions: 0,
      averageScore: 0,
      highestScore: 0,
      lowestScore: 0,
      passRate: 0
    };
  }
  
  const scores = submissions.map(s => s.percentage || 0);
  const passThreshold = 50; // 50% pass mark
  
  return {
    totalSubmissions: submissions.length,
    averageScore: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
    highestScore: Math.max(...scores),
    lowestScore: Math.min(...scores),
    passRate: Math.round((scores.filter(s => s >= passThreshold).length / scores.length) * 100),
    gradeDistribution: this.calculateGradeDistribution(submissions)
  };
};

// Calculate grade distribution
submissionSchema.statics.calculateGradeDistribution = function(submissions) {
  const distribution = { 'A+': 0, 'A': 0, 'A-': 0, 'B+': 0, 'B': 0, 'B-': 0, 'C+': 0, 'C': 0, 'C-': 0, 'D': 0, 'F': 0 };
  
  submissions.forEach(submission => {
    if (submission.grade) {
      distribution[submission.grade]++;
    }
  });
  
  return distribution;
};

module.exports = mongoose.model('Submission', submissionSchema);
