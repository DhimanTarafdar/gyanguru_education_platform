const mongoose = require('mongoose');

// 🧠 GyanGuru Smart Recommendation Engine Model
// Features: Personalized learning recommendations, Adaptive suggestions, Learning path optimization

const recommendationSchema = new mongoose.Schema({
  
  // ==========================================
  // 👤 USER & TARGET INFORMATION
  // ==========================================
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  userRole: {
    type: String,
    enum: ['student', 'teacher'],
    required: true,
    default: 'student'
  },

  // Recommendation target (what subject/topic/skill)
  targetSubject: {
    type: String,
    required: true,
    index: true
  },

  targetTopic: {
    type: String,
    required: true
  },

  targetSkill: {
    type: String,
    required: false
  },

  // Academic context
  gradeLevel: {
    type: String,
    required: true
  },

  // ==========================================
  // 🎯 RECOMMENDATION DETAILS
  // ==========================================
  recommendationType: {
    type: String,
    enum: [
      'practice_questions',
      'study_materials',
      'difficulty_adjustment',
      'learning_path',
      'revision_topics',
      'skill_building',
      'concept_reinforcement',
      'exam_preparation',
      'weak_area_focus',
      'strength_enhancement'
    ],
    required: true,
    index: true
  },

  // Recommendation title and description
  title: {
    type: String,
    required: true,
    maxlength: 200
  },

  description: {
    type: String,
    required: true,
    maxlength: 1000
  },

  // Detailed recommendation content
  content: {
    // For practice questions recommendations
    practiceQuestions: [{
      questionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Assessment'
      },
      questionText: String,
      difficulty: {
        type: String,
        enum: ['easy', 'medium', 'hard', 'expert']
      },
      estimatedTime: Number, // in minutes
      concepts: [String],
      reason: String // Why this question is recommended
    }],

    // For study materials recommendations
    studyMaterials: [{
      materialType: {
        type: String,
        enum: ['video', 'article', 'book', 'pdf', 'interactive', 'quiz', 'simulation']
      },
      title: String,
      description: String,
      url: String,
      duration: Number, // in minutes
      difficulty: {
        type: String,
        enum: ['beginner', 'intermediate', 'advanced']
      },
      relevanceScore: {
        type: Number,
        min: 0,
        max: 100
      },
      reason: String
    }],

    // For difficulty adjustment recommendations
    difficultyAdjustment: {
      currentLevel: {
        type: String,
        enum: ['beginner', 'elementary', 'intermediate', 'advanced', 'expert']
      },
      recommendedLevel: {
        type: String,
        enum: ['beginner', 'elementary', 'intermediate', 'advanced', 'expert']
      },
      adjustmentReason: String,
      gradualSteps: [String],
      timeframe: String // "2 weeks", "1 month", etc.
    },

    // For learning path recommendations
    learningPath: {
      pathName: String,
      totalDuration: Number, // in days
      steps: [{
        stepNumber: Number,
        title: String,
        description: String,
        concepts: [String],
        estimatedDuration: Number, // in days
        prerequisites: [String],
        resources: [String],
        assessments: [String],
        milestones: [String]
      }],
      expectedOutcomes: [String],
      skillsToGain: [String]
    },

    // Generic content for other recommendation types
    genericContent: {
      actionItems: [String],
      resources: [String],
      tips: [String],
      timeEstimate: String,
      expectedBenefits: [String]
    }
  },

  // ==========================================
  // 🎯 TARGETING & PERSONALIZATION
  // ==========================================
  
  // Why this recommendation was generated
  reasoningData: {
    // Performance analysis that led to this recommendation
    performanceAnalysis: {
      weakAreas: [String],
      strongAreas: [String],
      averageScore: Number,
      recentTrends: String, // "improving", "declining", "stable"
      specificGaps: [String]
    },

    // Learning patterns observed
    learningPatterns: {
      preferredStudyTime: String, // "morning", "afternoon", "evening"
      learningStyle: String, // "visual", "auditory", "kinesthetic", "reading"
      attentionSpan: Number, // in minutes
      difficultyPreference: String,
      topicInterests: [String]
    },

    // AI reasoning
    aiAnalysis: {
      confidenceScore: {
        type: Number,
        min: 0,
        max: 100
      },
      factors: [String], // Factors that influenced this recommendation
      dataPoints: Number, // Number of data points used in analysis
      modelVersion: String,
      generatedAt: {
        type: Date,
        default: Date.now
      }
    }
  },

  // ==========================================
  // 📊 PRIORITY & URGENCY
  // ==========================================
  priority: {
    type: String,
    enum: ['critical', 'high', 'medium', 'low'],
    default: 'medium',
    index: true
  },

  urgency: {
    type: String,
    enum: ['immediate', 'this_week', 'this_month', 'flexible'],
    default: 'flexible'
  },

  // Expected impact of following this recommendation
  expectedImpact: {
    type: String,
    enum: ['significant', 'moderate', 'minor'],
    default: 'moderate'
  },

  // Estimated effort required
  effortLevel: {
    type: String,
    enum: ['minimal', 'light', 'moderate', 'intensive'],
    default: 'moderate'
  },

  // ==========================================
  // 📅 SCHEDULING & TIMELINE
  // ==========================================
  recommendedStartDate: {
    type: Date,
    default: Date.now
  },

  recommendedEndDate: {
    type: Date
  },

  estimatedDuration: {
    value: Number,
    unit: {
      type: String,
      enum: ['minutes', 'hours', 'days', 'weeks', 'months']
    }
  },

  // Optimal study schedule
  schedule: {
    frequency: String, // "daily", "3x per week", "weekly"
    sessionDuration: Number, // in minutes
    timeOfDay: [String], // ["morning", "evening"]
    daysOfWeek: [String] // ["monday", "wednesday", "friday"]
  },

  // ==========================================
  // 📈 TRACKING & METRICS
  // ==========================================
  
  // User interaction with this recommendation
  userResponse: {
    status: {
      type: String,
      enum: ['pending', 'accepted', 'declined', 'partially_followed', 'completed'],
      default: 'pending'
    },
    
    acceptedAt: Date,
    startedAt: Date,
    completedAt: Date,
    
    // User feedback
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    
    feedback: String,
    
    // How helpful was this recommendation
    helpfulnessScore: {
      type: Number,
      min: 0,
      max: 10
    },
    
    // Did user achieve expected outcomes
    achievedOutcomes: [String],
    
    // User's notes about following this recommendation
    userNotes: String
  },

  // Progress tracking
  progress: {
    completionPercentage: {
      type: Number,
      min: 0,
      max: 100,
      default: 0
    },
    
    milestonesCompleted: [String],
    
    timeSpent: {
      value: Number,
      unit: String
    },
    
    lastActivityDate: Date,
    
    // Performance improvement observed
    performanceImprovement: {
      before: Number, // score before following recommendation
      after: Number, // score after following recommendation
      improvement: Number, // percentage improvement
      measuredAt: Date
    }
  },

  // ==========================================
  // 🔄 ADAPTATION & LEARNING
  // ==========================================
  
  // How this recommendation evolved
  adaptationHistory: [{
    adaptedAt: Date,
    reason: String,
    changes: String,
    aiVersion: String
  }],

  // Related recommendations
  relatedRecommendations: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Recommendation'
  }],

  // Prerequisites (other recommendations that should be completed first)
  prerequisites: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Recommendation'
  }],

  // Follow-up recommendations
  followUps: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Recommendation'
  }],

  // ==========================================
  // 🎯 EFFECTIVENESS TRACKING
  // ==========================================
  
  effectiveness: {
    // How well did this recommendation work
    successMetrics: {
      scoreImprovement: Number,
      timeToCompletion: Number,
      engagementLevel: {
        type: String,
        enum: ['low', 'medium', 'high']
      },
      retentionRate: Number // How much student retained
    },
    
    // Learning outcomes achieved
    outcomesAchieved: [{
      outcome: String,
      achievedAt: Date,
      measuredBy: String
    }],
    
    // Impact on overall performance
    overallImpact: {
      type: String,
      enum: ['negative', 'neutral', 'positive', 'highly_positive']
    }
  },

  // ==========================================
  // 🔧 METADATA
  // ==========================================
  
  // Recommendation engine version
  engineVersion: {
    type: String,
    default: '1.0'
  },

  // Data sources used for this recommendation
  dataSources: [{
    source: String, // "assessment_results", "study_patterns", "peer_comparison"
    weight: Number, // How much this source influenced the recommendation
    dataPoints: Number
  }],

  // Machine learning model details
  mlModelDetails: {
    modelType: String,
    trainingData: String,
    accuracy: Number,
    lastTrained: Date
  },

  // Status and visibility
  isActive: {
    type: Boolean,
    default: true
  },

  isVisible: {
    type: Boolean,
    default: true
  },

  // Expiry (recommendations can become outdated)
  expiresAt: {
    type: Date,
    index: { expireAfterSeconds: 0 }
  },

  // Archive information
  archivedAt: Date,
  archiveReason: String

}, {
  timestamps: true,
  versionKey: false
});

// ==========================================
// 📊 INDEXES FOR PERFORMANCE
// ==========================================
recommendationSchema.index({ userId: 1, targetSubject: 1 });
recommendationSchema.index({ recommendationType: 1, priority: 1 });
recommendationSchema.index({ 'userResponse.status': 1 });
recommendationSchema.index({ createdAt: -1 });
recommendationSchema.index({ priority: 1, urgency: 1 });
recommendationSchema.index({ 'reasoningData.aiAnalysis.confidenceScore': -1 });

// ==========================================
// 🔧 INSTANCE METHODS
// ==========================================

// Mark recommendation as accepted
recommendationSchema.methods.accept = function() {
  this.userResponse.status = 'accepted';
  this.userResponse.acceptedAt = new Date();
  return this.save();
};

// Mark recommendation as started
recommendationSchema.methods.start = function() {
  this.userResponse.status = 'partially_followed';
  this.userResponse.startedAt = new Date();
  return this.save();
};

// Mark recommendation as completed
recommendationSchema.methods.complete = function(feedback = {}) {
  this.userResponse.status = 'completed';
  this.userResponse.completedAt = new Date();
  this.progress.completionPercentage = 100;
  
  if (feedback.rating) this.userResponse.rating = feedback.rating;
  if (feedback.feedback) this.userResponse.feedback = feedback.feedback;
  if (feedback.helpfulnessScore) this.userResponse.helpfulnessScore = feedback.helpfulnessScore;
  
  return this.save();
};

// Update progress
recommendationSchema.methods.updateProgress = function(percentage, notes = '') {
  this.progress.completionPercentage = Math.min(100, Math.max(0, percentage));
  this.progress.lastActivityDate = new Date();
  
  if (notes) {
    this.userResponse.userNotes = notes;
  }
  
  return this.save();
};

// Calculate effectiveness score
recommendationSchema.methods.calculateEffectiveness = function() {
  let score = 0;
  let factors = 0;
  
  // User rating (0-5) -> (0-25 points)
  if (this.userResponse.rating) {
    score += (this.userResponse.rating / 5) * 25;
    factors++;
  }
  
  // Completion percentage (0-25 points)
  score += (this.progress.completionPercentage / 100) * 25;
  factors++;
  
  // Performance improvement (0-25 points)
  if (this.progress.performanceImprovement.improvement) {
    score += Math.min(25, this.progress.performanceImprovement.improvement);
    factors++;
  }
  
  // Helpfulness score (0-10) -> (0-25 points)
  if (this.userResponse.helpfulnessScore) {
    score += (this.userResponse.helpfulnessScore / 10) * 25;
    factors++;
  }
  
  return factors > 0 ? score / factors : 0;
};

// Get recommendation summary
recommendationSchema.methods.getSummary = function() {
  return {
    id: this._id,
    type: this.recommendationType,
    title: this.title,
    description: this.description,
    priority: this.priority,
    urgency: this.urgency,
    status: this.userResponse.status,
    progress: this.progress.completionPercentage,
    expectedImpact: this.expectedImpact,
    effortLevel: this.effortLevel,
    estimatedDuration: this.estimatedDuration,
    confidenceScore: this.reasoningData.aiAnalysis.confidenceScore,
    createdAt: this.createdAt
  };
};

// ==========================================
// 📊 STATIC METHODS
// ==========================================

// Get active recommendations for user
recommendationSchema.statics.getActiveForUser = function(userId, options = {}) {
  const query = {
    userId,
    isActive: true,
    isVisible: true,
    'userResponse.status': { $in: ['pending', 'accepted', 'partially_followed'] }
  };
  
  if (options.subject) query.targetSubject = options.subject;
  if (options.type) query.recommendationType = options.type;
  if (options.priority) query.priority = options.priority;
  
  return this.find(query)
    .sort({ priority: 1, 'reasoningData.aiAnalysis.confidenceScore': -1, createdAt: -1 })
    .limit(options.limit || 10);
};

// Get recommendations by effectiveness
recommendationSchema.statics.getByEffectiveness = function(userId, minEffectiveness = 70) {
  return this.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        'userResponse.status': 'completed'
      }
    },
    {
      $addFields: {
        effectivenessScore: {
          $avg: [
            { $multiply: [{ $divide: ['$userResponse.rating', 5] }, 25] },
            { $multiply: [{ $divide: ['$progress.completionPercentage', 100] }, 25] },
            { $ifNull: ['$progress.performanceImprovement.improvement', 0] },
            { $multiply: [{ $divide: ['$userResponse.helpfulnessScore', 10] }, 25] }
          ]
        }
      }
    },
    {
      $match: {
        effectivenessScore: { $gte: minEffectiveness }
      }
    },
    {
      $sort: { effectivenessScore: -1 }
    }
  ]);
};

// Get user's learning patterns
recommendationSchema.statics.getUserLearningPatterns = function(userId) {
  return this.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        'userResponse.status': { $in: ['completed', 'partially_followed'] }
      }
    },
    {
      $group: {
        _id: null,
        averageRating: { $avg: '$userResponse.rating' },
        averageCompletion: { $avg: '$progress.completionPercentage' },
        preferredTypes: { $push: '$recommendationType' },
        preferredSubjects: { $push: '$targetSubject' },
        averageTimeToComplete: { $avg: { $subtract: ['$userResponse.completedAt', '$userResponse.startedAt'] } },
        totalRecommendations: { $sum: 1 }
      }
    }
  ]);
};

// Generate recommendation statistics
recommendationSchema.statics.getStatistics = function(userId, timeframe = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - timeframe);
  
  return this.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        createdAt: { $gte: startDate }
      }
    },
    {
      $facet: {
        byType: [
          { $group: { _id: '$recommendationType', count: { $sum: 1 } } },
          { $sort: { count: -1 } }
        ],
        byStatus: [
          { $group: { _id: '$userResponse.status', count: { $sum: 1 } } }
        ],
        byPriority: [
          { $group: { _id: '$priority', count: { $sum: 1 } } }
        ],
        effectiveness: [
          {
            $match: { 'userResponse.status': 'completed' }
          },
          {
            $group: {
              _id: null,
              averageRating: { $avg: '$userResponse.rating' },
              averageCompletion: { $avg: '$progress.completionPercentage' },
              totalCompleted: { $sum: 1 }
            }
          }
        ]
      }
    }
  ]);
};

module.exports = mongoose.model('Recommendation', recommendationSchema);
