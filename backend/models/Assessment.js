const mongoose = require('mongoose');

// Assessment Schema - Advanced & Feature-Rich for Extraordinary Platform
const assessmentSchema = new mongoose.Schema({
  // Basic Information
  title: {
    type: String,
    required: [true, 'Assessment title is required'],
    trim: true,
    minlength: [3, 'Title must be at least 3 characters'],
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  
  // Assessment Types with Live Quiz Support
  type: {
    type: String,
    required: [true, 'Assessment type is required'],
    enum: {
      values: ['assignment', 'quiz', 'test', 'practice', 'exam', 'live-quiz', 'poll'],
      message: 'Type must be one of: assignment, quiz, test, practice, exam, live-quiz, poll'
    }
  },
  
  // Academic Context
  subject: {
    type: String,
    required: [true, 'Subject is required'],
    trim: true
  },
  
  chapter: {
    type: String,
    trim: true
  },
  
  class: {
    type: Number,
    required: [true, 'Class is required'],
    min: [1, 'Class must be between 1-12'],
    max: [12, 'Class must be between 1-12']
  },
  
  // Questions Configuration
  questions: [{
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Question',
      required: true
    },
    marks: {
      type: Number,
      required: true,
      min: [1, 'Marks must be at least 1'],
      max: [100, 'Marks cannot exceed 100 per question']
    },
    order: {
      type: Number,
      required: true,
      min: 1
    },
    timeLimit: {
      type: Number,
      default: 0, // 0 means use global time limit
      min: 0
    },
    isOptional: {
      type: Boolean,
      default: false
    },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: 'medium'
    }
  }],
  
  // Advanced Assessment Configuration
  configuration: {
    // Timing Settings
    duration: {
      type: Number,
      required: [true, 'Assessment duration is required'],
      min: [1, 'Duration must be at least 1 minute'],
      max: [480, 'Duration cannot exceed 8 hours']
    },
    
    // Display Settings
    questionsPerPage: {
      type: Number,
      default: 1,
      min: 1,
      max: 10
    },
    
    allowBackward: {
      type: Boolean,
      default: true
    },
    
    showQuestionNumbers: {
      type: Boolean,
      default: true
    },
    
    showProgress: {
      type: Boolean,
      default: true
    },
    
    // Randomization for Fair Assessment
    shuffleQuestions: {
      type: Boolean,
      default: false
    },
    
    shuffleOptions: {
      type: Boolean,
      default: false
    },
    
    // Anti-Cheating & Security Measures
    preventCheating: {
      fullScreen: {
        type: Boolean,
        default: false
      },
      disableRightClick: {
        type: Boolean,
        default: false
      },
      preventCopyPaste: {
        type: Boolean,
        default: false
      },
      disableDevTools: {
        type: Boolean,
        default: false
      },
      browserLockdown: {
        type: Boolean,
        default: false
      },
      webcamMonitoring: {
        type: Boolean,
        default: false
      },
      screenRecording: {
        type: Boolean,
        default: false
      },
      tabSwitchDetection: {
        type: Boolean,
        default: false
      },
      faceDetection: {
        type: Boolean,
        default: false
      }
    },
    
    // Attempt Management
    maxAttempts: {
      type: Number,
      default: 1,
      min: 1,
      max: 10
    },
    
    attemptDelay: {
      type: Number,
      default: 0, // minutes between attempts
      min: 0
    },
    
    // Results Display
    showResults: {
      immediately: {
        type: Boolean,
        default: true
      },
      afterDeadline: {
        type: Boolean,
        default: false
      },
      afterAllComplete: {
        type: Boolean,
        default: false
      },
      manual: {
        type: Boolean,
        default: false
      }
    },
    
    // Grading System
    autoGrading: {
      type: Boolean,
      default: true
    },
    
    partialMarking: {
      type: Boolean,
      default: false
    },
    
    negativeMarking: {
      enabled: {
        type: Boolean,
        default: false
      },
      percentage: {
        type: Number,
        default: 25,
        min: 0,
        max: 100
      }
    },
    
    // Feedback Configuration
    showCorrectAnswers: {
      type: Boolean,
      default: true
    },
    
    showExplanations: {
      type: Boolean,
      default: true
    },
    
    detailedFeedback: {
      type: Boolean,
      default: true
    },
    
    // Live Features
    liveUpdates: {
      type: Boolean,
      default: false
    },
    
    realTimeLeaderboard: {
      type: Boolean,
      default: false
    }
  },
  
  // Scheduling System
  schedule: {
    startDate: {
      type: Date,
      required: [true, 'Start date is required']
    },
    
    endDate: {
      type: Date,
      required: [true, 'End date is required']
    },
    
    timezone: {
      type: String,
      default: 'Asia/Dhaka'
    },
    
    gracePeriod: {
      type: Number,
      default: 5, // minutes
      min: 0,
      max: 60
    },
    
    autoSubmit: {
      type: Boolean,
      default: true
    },
    
    lateSubmission: {
      allowed: {
        type: Boolean,
        default: false
      },
      penaltyPercentage: {
        type: Number,
        default: 10,
        min: 0,
        max: 100
      }
    }
  },
  
  // Advanced Participant Management
  participants: {
    // Individual Students
    students: [{
      studentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      invitedAt: {
        type: Date,
        default: Date.now
      },
      status: {
        type: String,
        enum: ['invited', 'started', 'completed', 'submitted', 'graded'],
        default: 'invited'
      },
      attempts: {
        type: Number,
        default: 0
      },
      lastAttemptAt: Date,
      score: {
        type: Number,
        default: 0
      },
      grade: String,
      feedback: String
    }],
    
    // Open Access Configuration
    openAccess: {
      enabled: {
        type: Boolean,
        default: false
      },
      criteria: {
        classes: [Number],
        subjects: [String],
        schools: [String]
      },
      maxParticipants: {
        type: Number,
        default: 0 // 0 means unlimited
      }
    },
    
    // Access Control
    accessCode: {
      type: String,
      trim: true,
      uppercase: true
    },
    
    // IP Restrictions
    ipRestrictions: {
      enabled: {
        type: Boolean,
        default: false
      },
      allowedIPs: [String],
      allowedRanges: [String]
    }
  },
  
  // Creator & Collaboration
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Creator is required']
  },
  
  collaborators: [{
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      enum: ['co-creator', 'grader', 'viewer', 'moderator'],
      default: 'viewer'
    },
    permissions: [String],
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Comprehensive Analytics
  statistics: {
    totalInvited: {
      type: Number,
      default: 0
    },
    
    totalStarted: {
      type: Number,
      default: 0
    },
    
    totalCompleted: {
      type: Number,
      default: 0
    },
    
    averageScore: {
      type: Number,
      default: 0
    },
    
    averageTime: {
      type: Number,
      default: 0
    },
    
    highestScore: {
      type: Number,
      default: 0
    },
    
    lowestScore: {
      type: Number,
      default: 0
    },
    
    passRate: {
      type: Number,
      default: 0
    },
    
    // Question-wise Analytics
    questionAnalytics: [{
      questionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Question'
      },
      correctAnswers: {
        type: Number,
        default: 0
      },
      totalAttempts: {
        type: Number,
        default: 0
      },
      averageTime: {
        type: Number,
        default: 0
      },
      successRate: {
        type: Number,
        default: 0
      }
    }],
    
    // Time-based Analytics
    timeAnalytics: {
      fastestCompletion: {
        type: Number,
        default: 0
      },
      slowestCompletion: {
        type: Number,
        default: 0
      },
      abandonmentRate: {
        type: Number,
        default: 0
      }
    }
  },
  
  // Grading System
  grading: {
    totalMarks: {
      type: Number,
      required: true,
      min: 1
    },
    
    passingMarks: {
      type: Number,
      required: true,
      min: 0
    },
    
    // Grade Scale
    gradingScale: {
      type: Map,
      of: {
        min: Number,
        max: Number,
        description: String
      },
      default: new Map([
        ['A+', { min: 90, max: 100, description: 'Outstanding' }],
        ['A', { min: 80, max: 89, description: 'Excellent' }],
        ['B', { min: 70, max: 79, description: 'Good' }],
        ['C', { min: 60, max: 69, description: 'Satisfactory' }],
        ['D', { min: 50, max: 59, description: 'Acceptable' }],
        ['F', { min: 0, max: 49, description: 'Needs Improvement' }]
      ])
    },
    
    // Custom Rubric for Subjective Questions
    rubric: [{
      criteria: {
        type: String,
        required: true
      },
      maxMarks: {
        type: Number,
        required: true,
        min: 1
      },
      description: String,
      levels: [{
        name: String,
        score: Number,
        description: String
      }]
    }]
  },
  
  // Organization & Metadata
  tags: {
    type: [String],
    validate: {
      validator: function(v) {
        return v.length <= 10;
      },
      message: 'Cannot have more than 10 tags'
    }
  },
  
  category: {
    type: String,
    enum: {
      values: ['academic', 'competitive', 'practice', 'mock-test', 'board-prep', 'entrance-exam'],
      message: 'Invalid category'
    }
  },
  
  difficulty: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced', 'expert'],
    default: 'intermediate'
  },
  
  // Status Management
  status: {
    type: String,
    enum: {
      values: ['draft', 'published', 'active', 'paused', 'completed', 'archived', 'cancelled'],
      message: 'Invalid status'
    },
    default: 'draft'
  },
  
  publishedAt: Date,
  completedAt: Date,
  archivedAt: Date,
  
  // Template System
  template: {
    isTemplate: {
      type: Boolean,
      default: false
    },
    
    templateName: String,
    
    parentTemplate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Assessment'
    },
    
    templateCategory: {
      type: String,
      enum: ['official', 'community', 'personal']
    }
  },
  
  // AI-Powered Features
  aiFeatures: {
    autoQuestionGeneration: {
      enabled: {
        type: Boolean,
        default: false
      },
      provider: {
        type: String,
        enum: ['groq', 'openrouter', 'gemini', 'openai'],
        default: 'groq'
      },
      lastGenerated: Date
    },
    
    intelligentGrading: {
      enabled: {
        type: Boolean,
        default: false
      },
      confidence: {
        type: Number,
        min: 0,
        max: 1
      }
    },
    
    plagiarismDetection: {
      enabled: {
        type: Boolean,
        default: false
      },
      threshold: {
        type: Number,
        default: 0.8,
        min: 0,
        max: 1
      }
    },
    
    adaptiveTesting: {
      enabled: {
        type: Boolean,
        default: false
      },
      algorithm: {
        type: String,
        enum: ['irt', 'cat', 'simple'],
        default: 'simple'
      }
    },
    
    insights: [{
      type: {
        type: String,
        enum: ['performance', 'engagement', 'difficulty', 'recommendation']
      },
      description: String,
      data: mongoose.Schema.Types.Mixed,
      generatedAt: {
        type: Date,
        default: Date.now
      },
      confidence: Number
    }]
  },
  
  // Live Assessment Features
  liveFeatures: {
    enabled: {
      type: Boolean,
      default: false
    },
    
    realTimeMonitoring: {
      type: Boolean,
      default: false
    },
    
    liveChat: {
      enabled: {
        type: Boolean,
        default: false
      },
      moderatorOnly: {
        type: Boolean,
        default: true
      }
    },
    
    announcements: [{
      message: String,
      sentAt: {
        type: Date,
        default: Date.now
      },
      sentBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium'
      }
    }],
    
    breakouts: {
      enabled: {
        type: Boolean,
        default: false
      },
      duration: Number,
      message: String
    }
  },
  
  // Integration Settings
  integrations: {
    lms: {
      enabled: {
        type: Boolean,
        default: false
      },
      platform: String,
      syncGrades: {
        type: Boolean,
        default: false
      }
    },
    
    videoConferencing: {
      enabled: {
        type: Boolean,
        default: false
      },
      platform: {
        type: String,
        enum: ['zoom', 'meet', 'teams', 'webex']
      },
      meetingId: String,
      meetingPassword: String
    },
    
    parentNotification: {
      enabled: {
        type: Boolean,
        default: false
      },
      methods: [String], // email, sms, app
      triggers: [String] // start, complete, grade_available
    }
  },
  
  // Security Audit Trail
  auditTrail: [{
    action: {
      type: String,
      required: true
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    details: mongoose.Schema.Types.Mixed,
    ipAddress: String,
    userAgent: String
  }]

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for Performance Optimization
assessmentSchema.index({ createdBy: 1, status: 1 });
assessmentSchema.index({ subject: 1, class: 1 });
assessmentSchema.index({ 'schedule.startDate': 1, 'schedule.endDate': 1 });
assessmentSchema.index({ type: 1, category: 1 });
assessmentSchema.index({ status: 1, publishedAt: -1 });
assessmentSchema.index({ tags: 1 });
assessmentSchema.index({ 'participants.students.studentId': 1 });

// Compound indexes for complex queries
assessmentSchema.index({ 
  status: 1, 
  'schedule.startDate': 1, 
  'schedule.endDate': 1 
});

// Text search index
assessmentSchema.index({
  title: 'text',
  description: 'text',
  subject: 'text',
  tags: 'text'
}, {
  weights: {
    title: 10,
    subject: 5,
    description: 1,
    tags: 3
  }
});

// Virtual Properties
assessmentSchema.virtual('durationFormatted').get(function() {
  const duration = this.configuration.duration;
  const hours = Math.floor(duration / 60);
  const minutes = duration % 60;
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
});

assessmentSchema.virtual('currentStatus').get(function() {
  const now = new Date();
  const start = this.schedule.startDate;
  const end = this.schedule.endDate;
  
  if (this.status !== 'published' && this.status !== 'active') {
    return this.status;
  }
  
  if (now < start) return 'upcoming';
  if (now >= start && now <= end) return 'ongoing';
  return 'ended';
});

assessmentSchema.virtual('participationRate').get(function() {
  if (this.statistics.totalInvited === 0) return 0;
  return Math.round((this.statistics.totalCompleted / this.statistics.totalInvited) * 100);
});

assessmentSchema.virtual('averageDifficulty').get(function() {
  if (!this.questions || this.questions.length === 0) return 'medium';
  
  const difficultyScores = {
    easy: 1,
    medium: 2,
    hard: 3
  };
  
  const avgDifficulty = this.questions.reduce((sum, q) => {
    return sum + (difficultyScores[q.difficulty] || 2);
  }, 0) / this.questions.length;
  
  if (avgDifficulty <= 1.5) return 'easy';
  if (avgDifficulty >= 2.5) return 'hard';
  return 'medium';
});

// Pre-save Middleware
assessmentSchema.pre('save', function(next) {
  // Calculate total marks from questions
  if (this.questions && this.questions.length > 0) {
    this.grading.totalMarks = this.questions.reduce((total, q) => total + q.marks, 0);
  }
  
  // Set passing marks if not set (default to 40% of total)
  if (!this.grading.passingMarks && this.grading.totalMarks) {
    this.grading.passingMarks = Math.ceil(this.grading.totalMarks * 0.4);
  }
  
  // Validate schedule
  if (this.schedule.startDate >= this.schedule.endDate) {
    return next(new Error('End date must be after start date'));
  }
  
  // Generate access code if needed
  if (this.participants.accessCode === undefined && this.type === 'live-quiz') {
    this.participants.accessCode = this.generateAccessCode();
  }
  
  next();
});

// Pre-find Middleware
assessmentSchema.pre(/^find/, function(next) {
  // Populate creator info for all find operations
  this.populate({
    path: 'createdBy',
    select: 'name email avatar teacherInfo.subjects teacherInfo.experience'
  });
  next();
});

// Static Methods
assessmentSchema.statics.getActiveAssessments = function(criteria = {}) {
  const now = new Date();
  return this.find({
    ...criteria,
    status: { $in: ['published', 'active'] },
    'schedule.startDate': { $lte: now },
    'schedule.endDate': { $gte: now }
  }).sort({ 'schedule.startDate': 1 });
};

assessmentSchema.statics.getUpcomingAssessments = function(criteria = {}, limit = 5) {
  const now = new Date();
  return this.find({
    ...criteria,
    status: { $in: ['published', 'active'] },
    'schedule.startDate': { $gt: now }
  })
  .sort({ 'schedule.startDate': 1 })
  .limit(limit);
};

assessmentSchema.statics.searchAssessments = function(query, filters = {}) {
  const searchQuery = {
    $text: { $search: query },
    ...filters
  };
  
  return this.find(searchQuery, { score: { $meta: 'textScore' } })
    .sort({ score: { $meta: 'textScore' } });
};

// Instance Methods
assessmentSchema.methods.addParticipant = function(studentId, invitedBy = null) {
  const existingParticipant = this.participants.students.find(
    p => p.studentId.toString() === studentId.toString()
  );
  
  if (!existingParticipant) {
    this.participants.students.push({
      studentId: studentId,
      status: 'invited',
      invitedAt: new Date()
    });
    
    this.statistics.totalInvited += 1;
    
    // Add to audit trail
    this.auditTrail.push({
      action: 'participant_added',
      performedBy: invitedBy || this.createdBy,
      details: { studentId }
    });
  }
  
  return this.save();
};

assessmentSchema.methods.updateParticipantStatus = function(studentId, status, additionalData = {}) {
  const participant = this.participants.students.find(
    p => p.studentId.toString() === studentId.toString()
  );
  
  if (participant) {
    const oldStatus = participant.status;
    participant.status = status;
    
    // Update additional data
    Object.assign(participant, additionalData);
    
    // Update statistics
    if (oldStatus !== 'started' && status === 'started') {
      this.statistics.totalStarted += 1;
    }
    
    if (oldStatus !== 'completed' && status === 'completed') {
      this.statistics.totalCompleted += 1;
    }
    
    // Add to audit trail
    this.auditTrail.push({
      action: 'participant_status_updated',
      performedBy: studentId,
      details: { oldStatus, newStatus: status, ...additionalData }
    });
  }
  
  return this.save();
};

assessmentSchema.methods.updateStatistics = function(submissionData) {
  const { score, timeTaken, studentId } = submissionData;
  
  // Update basic statistics
  this.statistics.totalCompleted += 1;
  
  // Calculate new averages
  const prevCount = this.statistics.totalCompleted - 1;
  const newAvgScore = ((this.statistics.averageScore * prevCount) + score) / this.statistics.totalCompleted;
  const newAvgTime = ((this.statistics.averageTime * prevCount) + timeTaken) / this.statistics.totalCompleted;
  
  this.statistics.averageScore = Math.round(newAvgScore * 100) / 100;
  this.statistics.averageTime = Math.round(newAvgTime);
  
  // Update min/max scores
  if (score > this.statistics.highestScore) {
    this.statistics.highestScore = score;
  }
  
  if (this.statistics.lowestScore === 0 || score < this.statistics.lowestScore) {
    this.statistics.lowestScore = score;
  }
  
  // Calculate pass rate
  const passingScore = this.grading.passingMarks;
  const passCount = this.participants.students.filter(p => 
    p.score >= passingScore && p.status === 'completed'
  ).length;
  
  this.statistics.passRate = Math.round((passCount / this.statistics.totalCompleted) * 100);
  
  // Add to audit trail
  this.auditTrail.push({
    action: 'statistics_updated',
    performedBy: studentId,
    details: { score, timeTaken }
  });
  
  return this.save();
};

assessmentSchema.methods.generateAccessCode = function() {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
};

assessmentSchema.methods.publishAssessment = function(publishedBy) {
  this.status = 'published';
  this.publishedAt = new Date();
  
  // Add to audit trail
  this.auditTrail.push({
    action: 'assessment_published',
    performedBy: publishedBy,
    details: { publishedAt: this.publishedAt }
  });
  
  return this.save();
};

assessmentSchema.methods.addAnnouncement = function(message, sentBy, priority = 'medium') {
  if (!this.liveFeatures.enabled) {
    throw new Error('Live features not enabled for this assessment');
  }
  
  this.liveFeatures.announcements.push({
    message,
    sentBy,
    priority,
    sentAt: new Date()
  });
  
  // Add to audit trail
  this.auditTrail.push({
    action: 'announcement_added',
    performedBy: sentBy,
    details: { message, priority }
  });
  
  return this.save();
};

module.exports = mongoose.model('Assessment', assessmentSchema);
