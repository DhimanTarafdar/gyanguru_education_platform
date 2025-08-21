const mongoose = require('mongoose');

// 💬 GyanGuru Conversation Model
// Features: Private chats, group discussions, announcements, academic Q&A

const conversationSchema = new mongoose.Schema({
  // ==========================================
  // 🎯 CONVERSATION BASICS
  // ==========================================
  title: {
    type: String,
    trim: true,
    maxlength: 200
  },

  description: {
    type: String,
    trim: true,
    maxlength: 1000
  },

  conversationType: {
    type: String,
    enum: [
      'private',        // One-on-one chat
      'group',          // Group discussion
      'announcement',   // Official announcements
      'study_group',    // Academic study group
      'qa_session',     // Question & Answer session
      'class_discussion', // Class-wide discussion
      'doubt_clearing', // Doubt clearing session
      'assignment_help' // Assignment help discussion
    ],
    required: true,
    index: true
  },

  // ==========================================
  // 👥 PARTICIPANTS
  // ==========================================
  participants: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    role: {
      type: String,
      enum: ['admin', 'moderator', 'member'],
      default: 'member'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    leftAt: {
      type: Date,
      default: null
    },
    isActive: {
      type: Boolean,
      default: true
    },
    permissions: {
      canSendMessage: { type: Boolean, default: true },
      canShareFiles: { type: Boolean, default: true },
      canAddMembers: { type: Boolean, default: false },
      canRemoveMembers: { type: Boolean, default: false },
      canManageSettings: { type: Boolean, default: false }
    },
    // For notifications
    notificationSettings: {
      muteNotifications: { type: Boolean, default: false },
      mutedUntil: { type: Date, default: null }
    }
  }],

  // Conversation creator
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  // ==========================================
  // 📚 ACADEMIC CONTEXT
  // ==========================================
  academicContext: {
    subject: {
      type: String,
      enum: [
        'mathematics', 'physics', 'chemistry', 'biology',
        'english', 'bangla', 'ict', 'social_science',
        'general', 'multi_subject'
      ]
    },
    
    // For class-specific discussions
    class: {
      type: String,
      trim: true
    },
    
    // Academic year/session
    academicYear: {
      type: String,
      trim: true
    },

    // For assignment/exam related discussions
    relatedAssignment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Assessment'
    },

    // Topic tags for better organization
    topics: [{
      type: String,
      trim: true,
      maxlength: 100
    }],

    // Difficulty level for study groups
    difficultyLevel: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced', 'mixed']
    }
  },

  // ==========================================
  // ⚙️ CONVERSATION SETTINGS
  // ==========================================
  settings: {
    // Privacy settings
    isPrivate: {
      type: Boolean,
      default: false
    },
    
    // Who can join the conversation
    joinPolicy: {
      type: String,
      enum: ['open', 'approval_required', 'invite_only', 'closed'],
      default: 'open'
    },

    // Maximum participants (for groups)
    maxParticipants: {
      type: Number,
      default: 100,
      min: 2,
      max: 500
    },

    // Message settings
    allowFileSharing: {
      type: Boolean,
      default: true
    },
    
    allowVoiceMessages: {
      type: Boolean,
      default: true
    },

    // For academic sessions
    allowAnonymousQuestions: {
      type: Boolean,
      default: false
    },

    // Auto-delete messages after certain period
    autoDeleteMessages: {
      enabled: { type: Boolean, default: false },
      duration: { type: Number, default: 30 } // days
    },

    // Moderation settings
    moderationEnabled: {
      type: Boolean,
      default: false
    },
    
    requireApprovalForMessages: {
      type: Boolean,
      default: false
    }
  },

  // ==========================================
  // 📊 CONVERSATION STATISTICS
  // ==========================================
  stats: {
    totalMessages: {
      type: Number,
      default: 0
    },
    
    totalParticipants: {
      type: Number,
      default: 0
    },

    // Academic specific stats
    questionsAsked: {
      type: Number,
      default: 0
    },
    
    questionsAnswered: {
      type: Number,
      default: 0
    },

    filesShared: {
      type: Number,
      default: 0
    },

    // Activity metrics
    dailyActiveUsers: {
      type: Number,
      default: 0
    },
    
    weeklyActiveUsers: {
      type: Number,
      default: 0
    },

    averageResponseTime: {
      type: Number,
      default: 0 // in minutes
    }
  },

  // ==========================================
  // 🕒 ACTIVITY TRACKING
  // ==========================================
  lastActivity: {
    type: Date,
    default: Date.now,
    index: true
  },

  lastMessage: {
    messageId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message'
    },
    content: {
      type: String,
      maxlength: 200
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    sentAt: {
      type: Date
    }
  },

  // ==========================================
  // 🔒 PRIVACY & MODERATION
  // ==========================================
  moderation: {
    isReported: {
      type: Boolean,
      default: false
    },
    
    reports: [{
      reportedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      reason: {
        type: String,
        enum: ['inappropriate_content', 'spam', 'harassment', 'off_topic', 'other']
      },
      description: {
        type: String,
        maxlength: 500
      },
      reportedAt: {
        type: Date,
        default: Date.now
      },
      status: {
        type: String,
        enum: ['pending', 'reviewed', 'resolved', 'dismissed'],
        default: 'pending'
      }
    }],

    moderators: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }],

    bannedUsers: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      bannedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      bannedAt: {
        type: Date,
        default: Date.now
      },
      reason: {
        type: String,
        maxlength: 500
      },
      bannedUntil: {
        type: Date
      }
    }]
  },

  // ==========================================
  // 📅 SCHEDULING (for live sessions)
  // ==========================================
  schedule: {
    isScheduled: {
      type: Boolean,
      default: false
    },
    
    scheduledStart: {
      type: Date
    },
    
    scheduledEnd: {
      type: Date
    },
    
    timezone: {
      type: String,
      default: 'Asia/Dhaka'
    },
    
    recurringPattern: {
      type: String,
      enum: ['none', 'daily', 'weekly', 'monthly']
    },
    
    recurringDays: [{
      type: String,
      enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
    }]
  },

  // ==========================================
  // 🗑️ LIFECYCLE MANAGEMENT
  // ==========================================
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },

  isArchived: {
    type: Boolean,
    default: false
  },

  archivedAt: {
    type: Date
  },

  archivedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ==========================================
// 📊 INDEXES FOR PERFORMANCE
// ==========================================
conversationSchema.index({ conversationType: 1, isActive: 1 });
conversationSchema.index({ 'participants.user': 1, isActive: 1 });
conversationSchema.index({ createdBy: 1, createdAt: -1 });
conversationSchema.index({ lastActivity: -1, isActive: 1 });
conversationSchema.index({ 'academicContext.subject': 1, conversationType: 1 });

// Compound indexes
conversationSchema.index({ 
  conversationType: 1, 
  'academicContext.subject': 1, 
  isActive: 1 
});

conversationSchema.index({ 
  'participants.user': 1, 
  lastActivity: -1, 
  isActive: 1 
});

// ==========================================
// 🔧 VIRTUAL FIELDS
// ==========================================

// Get active participants count
conversationSchema.virtual('activeParticipantsCount').get(function() {
  return this.participants.filter(p => p.isActive).length;
});

// Check if conversation is group
conversationSchema.virtual('isGroup').get(function() {
  return ['group', 'study_group', 'class_discussion'].includes(this.conversationType);
});

// Check if conversation is academic
conversationSchema.virtual('isAcademic').get(function() {
  return ['study_group', 'qa_session', 'class_discussion', 'doubt_clearing', 'assignment_help'].includes(this.conversationType);
});

// Get conversation display name
conversationSchema.virtual('displayName').get(function() {
  if (this.title) return this.title;
  
  if (this.conversationType === 'private' && this.participants.length === 2) {
    // For private chats, return the other participant's name
    // This would be populated in the controller
    return 'Private Chat';
  }
  
  if (this.academicContext.subject) {
    return `${this.academicContext.subject.charAt(0).toUpperCase() + this.academicContext.subject.slice(1)} Discussion`;
  }
  
  return this.conversationType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
});

// Get unread messages count for a user
conversationSchema.virtual('getUnreadCount').get(function() {
  // This will be calculated in the controller/service
  return 0;
});

// ==========================================
// 📝 INSTANCE METHODS
// ==========================================

// Add participant to conversation
conversationSchema.methods.addParticipant = async function(userId, role = 'member', addedBy = null) {
  // Check if user is already a participant
  const existingParticipant = this.participants.find(p => p.user.toString() === userId.toString());
  
  if (existingParticipant) {
    if (!existingParticipant.isActive) {
      // Reactivate if previously left
      existingParticipant.isActive = true;
      existingParticipant.leftAt = null;
      existingParticipant.joinedAt = new Date();
    }
    return this.save();
  }

  // Check participant limit
  if (this.activeParticipantsCount >= this.settings.maxParticipants) {
    throw new Error('Conversation has reached maximum participant limit');
  }

  // Add new participant
  this.participants.push({
    user: userId,
    role: role,
    joinedAt: new Date(),
    isActive: true
  });

  this.stats.totalParticipants = this.activeParticipantsCount;
  this.lastActivity = new Date();

  return this.save();
};

// Remove participant from conversation
conversationSchema.methods.removeParticipant = async function(userId, removedBy = null) {
  const participant = this.participants.find(p => p.user.toString() === userId.toString());
  
  if (!participant) {
    throw new Error('User is not a participant in this conversation');
  }

  participant.isActive = false;
  participant.leftAt = new Date();

  this.stats.totalParticipants = this.activeParticipantsCount;
  this.lastActivity = new Date();

  return this.save();
};

// Update participant role
conversationSchema.methods.updateParticipantRole = async function(userId, newRole, updatedBy = null) {
  const participant = this.participants.find(p => p.user.toString() === userId.toString() && p.isActive);
  
  if (!participant) {
    throw new Error('User is not an active participant in this conversation');
  }

  participant.role = newRole;
  
  // Update permissions based on role
  if (newRole === 'admin') {
    participant.permissions = {
      canSendMessage: true,
      canShareFiles: true,
      canAddMembers: true,
      canRemoveMembers: true,
      canManageSettings: true
    };
  } else if (newRole === 'moderator') {
    participant.permissions = {
      canSendMessage: true,
      canShareFiles: true,
      canAddMembers: true,
      canRemoveMembers: false,
      canManageSettings: false
    };
  }

  this.lastActivity = new Date();
  return this.save();
};

// Update last message info
conversationSchema.methods.updateLastMessage = async function(message) {
  this.lastMessage = {
    messageId: message._id,
    content: message.content.text ? message.content.text.substring(0, 200) : `[${message.messageType}]`,
    sender: message.sender,
    sentAt: message.createdAt
  };
  
  this.lastActivity = new Date();
  this.stats.totalMessages += 1;

  // Update question stats
  if (message.messageType === 'question') {
    this.stats.questionsAsked += 1;
  } else if (message.messageType === 'answer') {
    this.stats.questionsAnswered += 1;
  }

  return this.save();
};

// Archive conversation
conversationSchema.methods.archive = async function(archivedBy) {
  this.isArchived = true;
  this.archivedAt = new Date();
  this.archivedBy = archivedBy;
  this.isActive = false;
  
  return this.save();
};

// Unarchive conversation
conversationSchema.methods.unarchive = async function() {
  this.isArchived = false;
  this.archivedAt = null;
  this.archivedBy = null;
  this.isActive = true;
  
  return this.save();
};

// Check if user can send message
conversationSchema.methods.canUserSendMessage = function(userId) {
  const participant = this.participants.find(p => p.user.toString() === userId.toString() && p.isActive);
  
  if (!participant) return false;
  if (!participant.permissions.canSendMessage) return false;
  
  // Check if user is banned
  const isBanned = this.moderation.bannedUsers.some(ban => 
    ban.user.toString() === userId.toString() && 
    (!ban.bannedUntil || ban.bannedUntil > new Date())
  );
  
  return !isBanned;
};

// Report conversation
conversationSchema.methods.reportConversation = async function(reportedBy, reason, description = '') {
  this.moderation.reports.push({
    reportedBy: reportedBy,
    reason: reason,
    description: description,
    reportedAt: new Date()
  });

  this.moderation.isReported = true;
  return this.save();
};

// ==========================================
// 📊 STATIC METHODS
// ==========================================

// Get conversations for a user
conversationSchema.statics.getUserConversations = function(userId, page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  
  return this.find({
    'participants.user': userId,
    'participants.isActive': true,
    isActive: true
  })
  .populate('participants.user', 'name email avatar role')
  .populate('lastMessage.sender', 'name avatar')
  .populate('createdBy', 'name avatar role')
  .sort({ lastActivity: -1 })
  .skip(skip)
  .limit(limit);
};

// Get academic conversations by subject
conversationSchema.statics.getAcademicConversations = function(subject, conversationType = null) {
  const query = {
    'academicContext.subject': subject,
    isActive: true,
    $or: [
      { 'settings.joinPolicy': 'open' },
      { 'settings.joinPolicy': 'approval_required' }
    ]
  };

  if (conversationType) {
    query.conversationType = conversationType;
  }

  return this.find(query)
    .populate('createdBy', 'name avatar role')
    .populate('participants.user', 'name avatar role')
    .sort({ lastActivity: -1 });
};

// Search conversations
conversationSchema.statics.searchConversations = function(searchTerm, userId = null) {
  const query = {
    $or: [
      { title: { $regex: searchTerm, $options: 'i' } },
      { description: { $regex: searchTerm, $options: 'i' } },
      { 'academicContext.topics': { $in: [new RegExp(searchTerm, 'i')] } }
    ],
    isActive: true
  };

  if (userId) {
    query['participants.user'] = userId;
    query['participants.isActive'] = true;
  }

  return this.find(query)
    .populate('createdBy', 'name avatar role')
    .sort({ lastActivity: -1 });
};

// Get conversation statistics
conversationSchema.statics.getConversationStats = function(timeframe = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - timeframe);

  return this.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate },
        isActive: true
      }
    },
    {
      $group: {
        _id: '$conversationType',
        count: { $sum: 1 },
        totalMessages: { $sum: '$stats.totalMessages' },
        totalParticipants: { $sum: '$stats.totalParticipants' },
        avgResponseTime: { $avg: '$stats.averageResponseTime' }
      }
    },
    {
      $sort: { count: -1 }
    }
  ]);
};

// Get popular study topics
conversationSchema.statics.getPopularTopics = function(limit = 10) {
  return this.aggregate([
    {
      $match: {
        conversationType: { $in: ['study_group', 'qa_session', 'doubt_clearing'] },
        isActive: true
      }
    },
    {
      $unwind: '$academicContext.topics'
    },
    {
      $group: {
        _id: '$academicContext.topics',
        count: { $sum: 1 },
        conversations: { $push: '$_id' }
      }
    },
    {
      $sort: { count: -1 }
    },
    {
      $limit: limit
    }
  ]);
};

// ==========================================
// 🔄 MIDDLEWARE
// ==========================================

// Pre-save middleware
conversationSchema.pre('save', function(next) {
  // Update total participants count
  this.stats.totalParticipants = this.participants.filter(p => p.isActive).length;
  
  // Auto-generate title for certain conversation types
  if (!this.title) {
    if (this.conversationType === 'study_group' && this.academicContext.subject) {
      this.title = `${this.academicContext.subject.charAt(0).toUpperCase() + this.academicContext.subject.slice(1)} Study Group`;
    } else if (this.conversationType === 'qa_session') {
      this.title = 'Q&A Session';
    }
  }

  next();
});

// Post-save middleware for real-time notifications
conversationSchema.post('save', function(doc) {
  // Emit real-time event for conversation updates
  const io = require('../services/SocketService').getIO();
  if (io) {
    // Emit to all participants
    doc.participants.forEach(participant => {
      if (participant.isActive) {
        io.to(`user_${participant.user}`).emit('conversationUpdate', {
          conversationId: doc._id,
          type: this.isNew ? 'new_conversation' : 'conversation_updated',
          conversation: {
            _id: doc._id,
            title: doc.displayName,
            conversationType: doc.conversationType,
            lastActivity: doc.lastActivity,
            participantsCount: doc.activeParticipantsCount
          }
        });
      }
    });
  }
});

module.exports = mongoose.model('Conversation', conversationSchema);
