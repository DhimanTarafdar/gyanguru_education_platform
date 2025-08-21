const mongoose = require('mongoose');

// 🏆 GyanGuru Achievement System Schema
// Features: Badges, Progress, Milestones, Rewards

// 🏅 Achievement Schema
const AchievementSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  icon: {
    type: String,
    required: true // Icon name or URL
  },
  color: {
    type: String,
    default: '#FFD700' // Gold color
  },
  category: {
    type: String,
    enum: [
      'learning', 'consistency', 'social', 'mastery', 
      'exploration', 'achievement', 'milestone', 'special'
    ],
    required: true
  },
  type: {
    type: String,
    enum: ['progress', 'milestone', 'streak', 'social', 'special'],
    required: true
  },
  tier: {
    type: String,
    enum: ['bronze', 'silver', 'gold', 'platinum', 'diamond'],
    default: 'bronze'
  },
  criteria: {
    action: {
      type: String,
      required: true // e.g., 'complete_lesson', 'study_streak', 'help_student'
    },
    threshold: {
      type: Number,
      required: true // e.g., 10, 30, 100
    },
    timeframe: {
      type: String,
      enum: ['daily', 'weekly', 'monthly', 'all_time', 'none'],
      default: 'all_time'
    },
    subject: {
      type: String,
      default: null // Specific subject or null for any
    },
    grade: {
      type: String,
      default: null // Specific grade or null for any
    }
  },
  rewards: {
    points: {
      type: Number,
      default: 0
    },
    badge: {
      type: Boolean,
      default: true
    },
    title: {
      type: String,
      default: null // Special title for display
    },
    privileges: [{
      type: String // e.g., 'early_access', 'special_content'
    }]
  },
  rarity: {
    type: String,
    enum: ['common', 'uncommon', 'rare', 'epic', 'legendary'],
    default: 'common'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isHidden: {
    type: Boolean,
    default: false // Hidden achievements
  },
  prerequisite: {
    type: String,
    default: null // Achievement ID that must be earned first
  },
  metadata: {
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    totalEarned: {
      type: Number,
      default: 0
    },
    firstEarnedDate: {
      type: Date,
      default: null
    },
    lastEarnedDate: {
      type: Date,
      default: null
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 🎯 User Achievement Schema (Many-to-Many relationship)
const UserAchievementSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  achievement: {
    type: String, // Achievement ID
    required: true
  },
  earnedAt: {
    type: Date,
    default: Date.now
  },
  progress: {
    current: {
      type: Number,
      default: 0
    },
    target: {
      type: Number,
      required: true
    },
    percentage: {
      type: Number,
      default: 0
    }
  },
  isCompleted: {
    type: Boolean,
    default: false
  },
  completedAt: {
    type: Date,
    default: null
  },
  metadata: {
    contextData: {
      type: mongoose.Schema.Types.Mixed,
      default: {} // Additional context about how it was earned
    },
    celebrationShown: {
      type: Boolean,
      default: false
    },
    notificationSent: {
      type: Boolean,
      default: false
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 📊 Progress Tracking Schema
const ProgressTrackingSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  subject: {
    type: String,
    required: true
  },
  grade: {
    type: String,
    required: true
  },
  topic: {
    type: String,
    default: null
  },
  activity: {
    type: {
      type: String,
      enum: [
        'lesson_completed', 'quiz_taken', 'assignment_submitted',
        'video_watched', 'book_read', 'practice_session',
        'help_given', 'question_answered', 'resource_shared'
      ],
      required: true
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  performance: {
    score: {
      type: Number,
      default: null // 0-100 or null if not applicable
    },
    accuracy: {
      type: Number,
      default: null // 0-100 percentage
    },
    timeSpent: {
      type: Number,
      default: 0 // in minutes
    },
    attempts: {
      type: Number,
      default: 1
    }
  },
  points: {
    earned: {
      type: Number,
      default: 0
    },
    bonus: {
      type: Number,
      default: 0
    },
    total: {
      type: Number,
      default: 0
    }
  },
  streaks: {
    daily: {
      current: { type: Number, default: 0 },
      best: { type: Number, default: 0 },
      lastActivity: { type: Date, default: null }
    },
    weekly: {
      current: { type: Number, default: 0 },
      best: { type: Number, default: 0 },
      lastWeek: { type: Number, default: null }
    }
  },
  date: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 🎯 Study Goals Schema
const StudyGoalSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  type: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'custom', 'milestone'],
    required: true
  },
  category: {
    type: String,
    enum: [
      'study_time', 'lessons_completed', 'quiz_score',
      'streak_maintenance', 'skill_mastery', 'social_interaction'
    ],
    required: true
  },
  target: {
    value: {
      type: Number,
      required: true
    },
    unit: {
      type: String,
      enum: ['minutes', 'hours', 'lessons', 'quizzes', 'points', 'percentage', 'days'],
      required: true
    }
  },
  current: {
    value: {
      type: Number,
      default: 0
    },
    percentage: {
      type: Number,
      default: 0
    }
  },
  timeframe: {
    start: {
      type: Date,
      required: true
    },
    end: {
      type: Date,
      required: true
    },
    duration: {
      type: Number // in days
    }
  },
  subject: {
    type: String,
    default: null // null means all subjects
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard', 'expert'],
    default: 'medium'
  },
  status: {
    type: String,
    enum: ['active', 'completed', 'failed', 'paused', 'cancelled'],
    default: 'active'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  rewards: {
    points: {
      type: Number,
      default: 0
    },
    badges: [{
      type: String // Achievement IDs
    }],
    unlocks: [{
      type: String // Content or feature unlocks
    }]
  },
  milestones: [{
    percentage: {
      type: Number,
      required: true // e.g., 25, 50, 75
    },
    reward: {
      points: Number,
      message: String,
      badge: String
    },
    achieved: {
      type: Boolean,
      default: false
    },
    achievedAt: {
      type: Date,
      default: null
    }
  }],
  isPublic: {
    type: Boolean,
    default: false
  },
  supporters: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    supportType: {
      type: String,
      enum: ['cheer', 'mentor', 'study_buddy']
    },
    addedAt: {
      type: Date,
      default: Date.now
    }
  }],
  completedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 🏆 Leaderboard Schema
const LeaderboardSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  type: {
    type: String,
    enum: ['global', 'class', 'school', 'subject', 'grade', 'custom'],
    required: true
  },
  metric: {
    type: String,
    enum: [
      'total_points', 'study_time', 'lessons_completed',
      'quiz_average', 'streak_length', 'achievements_earned',
      'help_given', 'improvement_rate'
    ],
    required: true
  },
  timeframe: {
    type: String,
    enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly', 'all_time'],
    required: true
  },
  filters: {
    subject: {
      type: String,
      default: null
    },
    grade: {
      type: String,
      default: null
    },
    school: {
      type: String,
      default: null
    },
    class: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Class',
      default: null
    }
  },
  participants: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    rank: {
      type: Number,
      required: true
    },
    score: {
      type: Number,
      required: true
    },
    previousRank: {
      type: Number,
      default: null
    },
    trend: {
      type: String,
      enum: ['up', 'down', 'same', 'new'],
      default: 'new'
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  }],
  settings: {
    maxParticipants: {
      type: Number,
      default: 100
    },
    isActive: {
      type: Boolean,
      default: true
    },
    isPublic: {
      type: Boolean,
      default: true
    },
    autoUpdate: {
      type: Boolean,
      default: true
    },
    updateFrequency: {
      type: String,
      enum: ['realtime', 'hourly', 'daily', 'weekly'],
      default: 'daily'
    }
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 🎊 Milestone Celebration Schema
const CelebrationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: [
      'achievement_earned', 'goal_completed', 'streak_milestone',
      'level_up', 'leaderboard_position', 'first_time', 'anniversary'
    ],
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  data: {
    achievement: {
      type: String,
      default: null
    },
    goal: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'StudyGoal',
      default: null
    },
    points: {
      type: Number,
      default: 0
    },
    level: {
      type: Number,
      default: null
    },
    rank: {
      type: Number,
      default: null
    },
    streak: {
      type: Number,
      default: null
    }
  },
  animation: {
    type: String,
    enum: ['confetti', 'fireworks', 'stars', 'balloons', 'trophy'],
    default: 'confetti'
  },
  sound: {
    type: String,
    enum: ['cheer', 'fanfare', 'ding', 'applause', 'bell'],
    default: 'cheer'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'epic'],
    default: 'medium'
  },
  isShown: {
    type: Boolean,
    default: false
  },
  shownAt: {
    type: Date,
    default: null
  },
  expiresAt: {
    type: Date,
    default: function() {
      return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 🌟 User Gamification Profile Schema
const GamificationProfileSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  level: {
    current: {
      type: Number,
      default: 1
    },
    experience: {
      current: {
        type: Number,
        default: 0
      },
      required: {
        type: Number,
        default: 100
      },
      total: {
        type: Number,
        default: 0
      }
    }
  },
  points: {
    total: {
      type: Number,
      default: 0
    },
    available: {
      type: Number,
      default: 0
    },
    spent: {
      type: Number,
      default: 0
    },
    lifetime: {
      type: Number,
      default: 0
    }
  },
  achievements: {
    earned: [{
      type: String // Achievement IDs
    }],
    inProgress: [{
      achievementId: String,
      progress: Number,
      startedAt: Date
    }],
    total: {
      type: Number,
      default: 0
    }
  },
  streaks: {
    current: {
      type: Number,
      default: 0
    },
    longest: {
      type: Number,
      default: 0
    },
    lastActivity: {
      type: Date,
      default: null
    }
  },
  statistics: {
    studyTime: {
      total: { type: Number, default: 0 }, // in minutes
      daily: { type: Number, default: 0 },
      weekly: { type: Number, default: 0 },
      monthly: { type: Number, default: 0 }
    },
    lessonsCompleted: {
      type: Number,
      default: 0
    },
    quizzesCompleted: {
      type: Number,
      default: 0
    },
    averageScore: {
      type: Number,
      default: 0
    },
    helpGiven: {
      type: Number,
      default: 0
    },
    socialInteractions: {
      type: Number,
      default: 0
    }
  },
  preferences: {
    celebrationsEnabled: {
      type: Boolean,
      default: true
    },
    soundEnabled: {
      type: Boolean,
      default: true
    },
    leaderboardVisible: {
      type: Boolean,
      default: true
    },
    shareAchievements: {
      type: Boolean,
      default: true
    }
  },
  title: {
    current: {
      type: String,
      default: 'Student'
    },
    earned: [{
      type: String
    }]
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 📈 Indexes for better performance
AchievementSchema.index({ category: 1, type: 1 });
AchievementSchema.index({ 'criteria.action': 1 });
AchievementSchema.index({ isActive: 1, isHidden: 1 });

UserAchievementSchema.index({ user: 1, achievement: 1 }, { unique: true });
UserAchievementSchema.index({ user: 1, isCompleted: 1 });
UserAchievementSchema.index({ achievement: 1, completedAt: 1 });

ProgressTrackingSchema.index({ user: 1, date: -1 });
ProgressTrackingSchema.index({ user: 1, subject: 1, date: -1 });
ProgressTrackingSchema.index({ 'activity.type': 1, date: -1 });

StudyGoalSchema.index({ user: 1, status: 1 });
StudyGoalSchema.index({ user: 1, type: 1, status: 1 });
StudyGoalSchema.index({ 'timeframe.end': 1, status: 1 });

LeaderboardSchema.index({ type: 1, metric: 1, timeframe: 1 });
LeaderboardSchema.index({ 'participants.user': 1 });
LeaderboardSchema.index({ lastUpdated: -1 });

CelebrationSchema.index({ user: 1, isShown: 1 });
CelebrationSchema.index({ user: 1, createdAt: -1 });
CelebrationSchema.index({ expiresAt: 1 });

GamificationProfileSchema.index({ user: 1 }, { unique: true });
GamificationProfileSchema.index({ 'points.total': -1 });
GamificationProfileSchema.index({ 'level.current': -1 });

// Virtual fields
GamificationProfileSchema.virtual('levelProgress').get(function() {
  return (this.level.experience.current / this.level.experience.required * 100).toFixed(1);
});

StudyGoalSchema.virtual('progressPercentage').get(function() {
  return Math.min((this.current.value / this.target.value * 100), 100).toFixed(1);
});

StudyGoalSchema.virtual('daysRemaining').get(function() {
  const now = new Date();
  const end = new Date(this.timeframe.end);
  const diff = Math.ceil((end - now) / (1000 * 60 * 60 * 24));
  return Math.max(diff, 0);
});

// Model exports
const Achievement = mongoose.model('Achievement', AchievementSchema);
const UserAchievement = mongoose.model('UserAchievement', UserAchievementSchema);
const ProgressTracking = mongoose.model('ProgressTracking', ProgressTrackingSchema);
const StudyGoal = mongoose.model('StudyGoal', StudyGoalSchema);
const Leaderboard = mongoose.model('Leaderboard', LeaderboardSchema);
const Celebration = mongoose.model('Celebration', CelebrationSchema);
const GamificationProfile = mongoose.model('GamificationProfile', GamificationProfileSchema);

module.exports = {
  Achievement,
  UserAchievement,
  ProgressTracking,
  StudyGoal,
  Leaderboard,
  Celebration,
  GamificationProfile
};
