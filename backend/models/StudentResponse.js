const mongoose = require('mongoose');

// Student Response Schema for Assessment Submissions
const studentResponseSchema = new mongoose.Schema({
  // Assessment Reference
  assessmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Assessment',
    required: [true, 'Assessment ID is required']
  },
  
  // Student Reference
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Student ID is required']
  },
  
  // Attempt Information
  attemptNumber: {
    type: Number,
    required: true,
    min: 1
  },
  
  // Submission Status
  status: {
    type: String,
    enum: {
      values: ['started', 'in_progress', 'paused', 'submitted', 'auto_submitted', 'graded'],
      message: 'Invalid submission status'
    },
    default: 'started'
  },
  
  // Timing Information
  startedAt: {
    type: Date,
    required: true,
    default: Date.now
  },
  
  submittedAt: Date,
  
  timeTaken: {
    type: Number, // in minutes
    default: 0
  },
  
  timeRemaining: {
    type: Number, // in minutes
    default: 0
  },
  
  // Question Responses
  responses: [{
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question',
      required: true
    },
    
    // Question Info (cached for performance)
    questionOrder: {
      type: Number,
      required: true
    },
    
    questionType: {
      type: String,
      enum: ['MCQ', 'True/False', 'Fill in the Blanks', 'Short Answer', 'Long Answer', 'Essay'],
      required: true
    },
    
    maxMarks: {
      type: Number,
      required: true,
      min: 0
    },
    
    // Student's Answer
    answer: {
      // For MCQ/True-False: selected option
      selectedOption: String,
      
      // For Fill in the Blanks: array of answers
      fillAnswers: [String],
      
      // For text-based questions
      textAnswer: String,
      
      // For image uploads (written answers)
      imageUrls: [String],
      
      // For file uploads
      fileUrls: [String]
    },
    
    // Response Timing
    timeSpent: {
      type: Number,
      default: 0 // in seconds
    },
    
    isAnswered: {
      type: Boolean,
      default: false
    },
    
    isMarkedForReview: {
      type: Boolean,
      default: false
    },
    
    // Auto-grading Results
    autoGrading: {
      isCorrect: Boolean,
      marksAwarded: {
        type: Number,
        default: 0,
        min: 0
      },
      explanation: String,
      confidence: {
        type: Number,
        min: 0,
        max: 1
      }
    },
    
    // Manual Grading (for subjective questions)
    manualGrading: {
      marksAwarded: {
        type: Number,
        min: 0
      },
      feedback: String,
      gradedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      gradedAt: Date,
      rubricScores: [{
        criteria: String,
        maxMarks: Number,
        marksAwarded: Number,
        comments: String
      }]
    },
    
    // Final Marks (auto + manual)
    finalMarks: {
      type: Number,
      default: 0,
      min: 0
    },
    
    // AI Analysis
    aiAnalysis: {
      plagiarismScore: {
        type: Number,
        min: 0,
        max: 1
      },
      qualityScore: {
        type: Number,
        min: 0,
        max: 1
      },
      relevanceScore: {
        type: Number,
        min: 0,
        max: 1
      },
      suggestions: [String]
    }
  }],
  
  // Overall Scores
  scoring: {
    totalMarks: {
      type: Number,
      default: 0
    },
    
    marksObtained: {
      type: Number,
      default: 0
    },
    
    percentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    
    grade: {
      type: String,
      enum: ['A+', 'A', 'B', 'C', 'D', 'F']
    },
    
    // Breakdown by question type
    breakdown: {
      mcq: {
        total: { type: Number, default: 0 },
        correct: { type: Number, default: 0 },
        marks: { type: Number, default: 0 }
      },
      truefalse: {
        total: { type: Number, default: 0 },
        correct: { type: Number, default: 0 },
        marks: { type: Number, default: 0 }
      },
      fillblanks: {
        total: { type: Number, default: 0 },
        correct: { type: Number, default: 0 },
        marks: { type: Number, default: 0 }
      },
      subjective: {
        total: { type: Number, default: 0 },
        marks: { type: Number, default: 0 }
      }
    },
    
    // Negative marking impact
    negativeMarks: {
      type: Number,
      default: 0
    }
  },
  
  // Security & Monitoring
  securityEvents: [{
    eventType: {
      type: String,
      enum: [
        'tab_switch', 'window_blur', 'copy_attempt', 'paste_attempt', 
        'right_click', 'dev_tools', 'fullscreen_exit', 'browser_back',
        'suspicious_activity', 'webcam_violation', 'face_not_detected'
      ]
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    details: mongoose.Schema.Types.Mixed,
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium'
    }
  }],
  
  // Live Monitoring Data
  monitoring: {
    webcamEnabled: {
      type: Boolean,
      default: false
    },
    
    screenshots: [{
      url: String,
      timestamp: Date,
      analysisResults: {
        faceDetected: Boolean,
        multipleFaces: Boolean,
        suspiciousActivity: Boolean
      }
    }],
    
    activityLog: [{
      action: String,
      timestamp: Date,
      questionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Question'
      }
    }],
    
    // Browser & Device Info
    deviceInfo: {
      userAgent: String,
      screenResolution: String,
      browserVersion: String,
      os: String,
      ipAddress: String
    }
  },
  
  // Teacher Feedback
  teacherFeedback: {
    overallComments: String,
    strengths: [String],
    improvements: [String],
    additionalResources: [String],
    feedbackGivenAt: Date,
    feedbackGivenBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  
  // Submission Metadata
  submissionData: {
    ipAddress: String,
    userAgent: String,
    location: {
      latitude: Number,
      longitude: Number,
      city: String,
      country: String
    },
    submissionSource: {
      type: String,
      enum: ['web', 'mobile', 'tablet'],
      default: 'web'
    }
  },
  
  // Review & Appeals
  review: {
    isUnderReview: {
      type: Boolean,
      default: false
    },
    
    reviewRequested: {
      type: Boolean,
      default: false
    },
    
    reviewRequestedAt: Date,
    
    reviewComments: String,
    
    appealStatus: {
      type: String,
      enum: ['none', 'pending', 'approved', 'rejected'],
      default: 'none'
    },
    
    appealReason: String
  },
  
  // Adaptive Testing Data
  adaptiveData: {
    enabled: {
      type: Boolean,
      default: false
    },
    
    currentDifficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: 'medium'
    },
    
    performanceMetrics: {
      accuracy: Number,
      speed: Number,
      consistency: Number
    },
    
    nextQuestionSuggestions: [{
      questionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Question'
      },
      probability: Number,
      reasoning: String
    }]
  }

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
studentResponseSchema.index({ assessmentId: 1, studentId: 1, attemptNumber: 1 }, { unique: true });
studentResponseSchema.index({ studentId: 1, status: 1 });
studentResponseSchema.index({ assessmentId: 1, status: 1 });
studentResponseSchema.index({ submittedAt: -1 });

// Virtual for completion status
studentResponseSchema.virtual('isCompleted').get(function() {
  return ['submitted', 'auto_submitted', 'graded'].includes(this.status);
});

// Virtual for pass/fail status
studentResponseSchema.virtual('isPassed').get(function() {
  // This would need the assessment's passing marks
  return this.scoring.percentage >= 40; // Default 40% passing
});

// Virtual for time efficiency
studentResponseSchema.virtual('timeEfficiency').get(function() {
  if (!this.submittedAt || !this.startedAt) return 0;
  
  const totalTimeAllowed = this.timeRemaining + this.timeTaken;
  const timeUsed = this.timeTaken;
  
  return Math.round(((totalTimeAllowed - timeUsed) / totalTimeAllowed) * 100);
});

// Pre-save middleware
studentResponseSchema.pre('save', function(next) {
  // Calculate total marks obtained
  if (this.responses && this.responses.length > 0) {
    this.scoring.marksObtained = this.responses.reduce((total, response) => {
      return total + (response.finalMarks || 0);
    }, 0);
    
    // Calculate percentage
    if (this.scoring.totalMarks > 0) {
      this.scoring.percentage = Math.round(
        (this.scoring.marksObtained / this.scoring.totalMarks) * 100
      );
    }
  }
  
  // Set submitted timestamp if status changed to submitted
  if (this.isModified('status') && ['submitted', 'auto_submitted'].includes(this.status)) {
    if (!this.submittedAt) {
      this.submittedAt = new Date();
    }
    
    // Calculate time taken
    if (this.startedAt) {
      this.timeTaken = Math.round((this.submittedAt - this.startedAt) / (1000 * 60));
    }
  }
  
  next();
});

// Instance methods
studentResponseSchema.methods.calculateFinalGrade = function(gradingScale) {
  const percentage = this.scoring.percentage;
  
  for (const [grade, range] of Object.entries(gradingScale)) {
    if (percentage >= range.min && percentage <= range.max) {
      this.scoring.grade = grade;
      break;
    }
  }
  
  return this.scoring.grade;
};

studentResponseSchema.methods.addSecurityEvent = function(eventType, details, severity = 'medium') {
  this.securityEvents.push({
    eventType,
    details,
    severity,
    timestamp: new Date()
  });
  
  return this.save();
};

studentResponseSchema.methods.updateResponse = function(questionId, answerData) {
  const response = this.responses.find(r => r.questionId.toString() === questionId.toString());
  
  if (response) {
    response.answer = { ...response.answer, ...answerData };
    response.isAnswered = true;
    
    // Mark for auto-grading if objective question
    if (['MCQ', 'True/False', 'Fill in the Blanks'].includes(response.questionType)) {
      this.performAutoGrading(response);
    }
  }
  
  return this.save();
};

studentResponseSchema.methods.performAutoGrading = function(response) {
  // This would connect to the Question model to get correct answers
  // Simplified implementation here
  if (response.questionType === 'MCQ' || response.questionType === 'True/False') {
    // Would compare with correct answer from Question model
    response.autoGrading = {
      isCorrect: false, // Would be calculated
      marksAwarded: 0,   // Would be calculated
      confidence: 1.0
    };
    
    response.finalMarks = response.autoGrading.marksAwarded;
  }
};

studentResponseSchema.methods.submitResponse = function() {
  this.status = 'submitted';
  this.submittedAt = new Date();
  
  if (this.startedAt) {
    this.timeTaken = Math.round((this.submittedAt - this.startedAt) / (1000 * 60));
  }
  
  return this.save();
};

// Static methods
studentResponseSchema.statics.getStudentAttempts = function(studentId, assessmentId) {
  return this.find({ studentId, assessmentId }).sort({ attemptNumber: -1 });
};

studentResponseSchema.statics.getAssessmentStats = function(assessmentId) {
  return this.aggregate([
    { $match: { assessmentId: new mongoose.Types.ObjectId(assessmentId) } },
    {
      $group: {
        _id: null,
        totalSubmissions: { $sum: 1 },
        averageScore: { $avg: '$scoring.percentage' },
        averageTime: { $avg: '$timeTaken' },
        highestScore: { $max: '$scoring.percentage' },
        lowestScore: { $min: '$scoring.percentage' }
      }
    }
  ]);
};

module.exports = mongoose.model('StudentResponse', studentResponseSchema);
