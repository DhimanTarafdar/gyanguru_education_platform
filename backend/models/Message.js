const mongoose = require('mongoose');

// 💬 GyanGuru Message Model
// Features: Direct messaging, group chats, file attachments, real-time delivery

const messageSchema = new mongoose.Schema({
  // ==========================================
  // 👥 PARTICIPANTS & CONVERSATION
  // ==========================================
  conversationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true,
    index: true
  },

  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },

  recipients: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    readAt: {
      type: Date,
      default: null
    },
    deliveredAt: {
      type: Date,
      default: Date.now
    }
  }],

  // ==========================================
  // 📝 MESSAGE CONTENT
  // ==========================================
  messageType: {
    type: String,
    enum: [
      'text',           // Normal text message
      'image',          // Image attachment
      'file',           // File attachment
      'audio',          // Voice message
      'video',          // Video message
      'question',       // Academic question
      'answer',         // Answer to question
      'announcement',   // Official announcement
      'poll',           // Poll/survey
      'assignment',     // Assignment sharing
      'resource'        // Educational resource
    ],
    default: 'text',
    required: true
  },

  content: {
    text: {
      type: String,
      maxlength: 5000,
      trim: true
    },
    
    // For questions and structured content
    subject: {
      type: String,
      maxlength: 200,
      trim: true
    },
    
    // For categorizing academic questions
    category: {
      type: String,
      enum: [
        'mathematics', 'physics', 'chemistry', 'biology',
        'english', 'bangla', 'ict', 'social_science',
        'general', 'assignment_help', 'exam_preparation',
        'concept_clarification', 'problem_solving'
      ]
    },

    // Priority level for questions/announcements
    priority: {
      type: String,
      enum: ['low', 'medium', 'high', 'urgent'],
      default: 'medium'
    },

    // Tags for better organization
    tags: [{
      type: String,
      maxlength: 50,
      trim: true
    }]
  },

  // ==========================================
  // 📎 ATTACHMENTS & MEDIA
  // ==========================================
  attachments: [{
    fileName: {
      type: String,
      required: true,
      maxlength: 255
    },
    originalName: {
      type: String,
      required: true,
      maxlength: 255
    },
    fileType: {
      type: String,
      required: true,
      enum: [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'text/plain', 'text/csv',
        'audio/mpeg', 'audio/wav', 'audio/ogg',
        'video/mp4', 'video/webm', 'video/ogg'
      ]
    },
    fileSize: {
      type: Number,
      required: true,
      max: 50 * 1024 * 1024 // 50MB max
    },
    filePath: {
      type: String,
      required: true
    },
    thumbnail: {
      type: String // For images and videos
    },
    uploadedAt: {
      type: Date,
      default: Date.now
    },
    downloadCount: {
      type: Number,
      default: 0
    }
  }],

  // ==========================================
  // 🔗 MESSAGE RELATIONSHIPS
  // ==========================================
  // For replies and threading
  replyTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    default: null
  },

  // For forwarded messages
  forwardedFrom: {
    originalMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message'
    },
    originalSender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },

  // For questions that need answers
  questionStatus: {
    type: String,
    enum: ['pending', 'answered', 'resolved', 'closed'],
    default: function() {
      return this.messageType === 'question' ? 'pending' : undefined;
    }
  },

  // Related messages (for question-answer pairs)
  relatedMessages: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message'
  }],

  // ==========================================
  // 📊 MESSAGE ANALYTICS
  // ==========================================
  engagement: {
    views: {
      type: Number,
      default: 0
    },
    reactions: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
      },
      reaction: {
        type: String,
        enum: ['like', 'love', 'helpful', 'confused', 'thumbs_up', 'thumbs_down'],
        required: true
      },
      reactedAt: {
        type: Date,
        default: Date.now
      }
    }],
    
    // For academic questions - helpfulness rating
    helpfulnessRating: {
      totalRatings: { type: Number, default: 0 },
      averageRating: { type: Number, default: 0 },
      ratings: [{
        user: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        },
        rating: {
          type: Number,
          min: 1,
          max: 5
        },
        comment: {
          type: String,
          maxlength: 200
        },
        ratedAt: {
          type: Date,
          default: Date.now
        }
      }]
    }
  },

  // ==========================================
  // 🕒 DELIVERY & STATUS
  // ==========================================
  deliveryStatus: {
    type: String,
    enum: ['sending', 'sent', 'delivered', 'read', 'failed'],
    default: 'sending'
  },

  readBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }],

  // ==========================================
  // 🔒 PRIVACY & MODERATION
  // ==========================================
  isPrivate: {
    type: Boolean,
    default: false
  },

  isAnonymous: {
    type: Boolean,
    default: false // For anonymous questions
  },

  moderation: {
    isReported: {
      type: Boolean,
      default: false
    },
    reportCount: {
      type: Number,
      default: 0
    },
    reports: [{
      reportedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      reason: {
        type: String,
        enum: ['spam', 'inappropriate', 'harassment', 'incorrect_info', 'other']
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
    
    moderatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    moderatedAt: {
      type: Date
    },
    moderationAction: {
      type: String,
      enum: ['none', 'warning', 'edit', 'delete', 'ban_user']
    }
  },

  // ==========================================
  // 🗑️ MESSAGE LIFECYCLE
  // ==========================================
  isDeleted: {
    type: Boolean,
    default: false
  },

  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },

  deletedAt: {
    type: Date
  },

  // For scheduled messages
  scheduledFor: {
    type: Date
  },

  isScheduled: {
    type: Boolean,
    default: false
  },

  // ==========================================
  // 📅 TIMESTAMPS
  // ==========================================
  editedAt: {
    type: Date
  },

  lastActivity: {
    type: Date,
    default: Date.now
  }

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ==========================================
// 📊 INDEXES FOR PERFORMANCE
// ==========================================
messageSchema.index({ conversationId: 1, createdAt: -1 });
messageSchema.index({ sender: 1, createdAt: -1 });
messageSchema.index({ 'content.category': 1, questionStatus: 1 });
messageSchema.index({ messageType: 1, 'content.priority': 1 });
messageSchema.index({ isDeleted: 1, createdAt: -1 });
messageSchema.index({ scheduledFor: 1, isScheduled: 1 });

// Compound indexes for complex queries
messageSchema.index({ 
  conversationId: 1, 
  isDeleted: 1, 
  createdAt: -1 
});

messageSchema.index({ 
  messageType: 1, 
  questionStatus: 1, 
  'content.category': 1 
});

// ==========================================
// 🔧 VIRTUAL FIELDS
// ==========================================

// Check if message is read by all recipients
messageSchema.virtual('isReadByAll').get(function() {
  return this.recipients.every(recipient => recipient.readAt !== null);
});

// Get unread recipients count
messageSchema.virtual('unreadCount').get(function() {
  return this.recipients.filter(recipient => recipient.readAt === null).length;
});

// Check if message is a question
messageSchema.virtual('isQuestion').get(function() {
  return this.messageType === 'question';
});

// Check if message is an answer
messageSchema.virtual('isAnswer').get(function() {
  return this.messageType === 'answer' || this.replyTo !== null;
});

// Get formatted message age
messageSchema.virtual('messageAge').get(function() {
  const now = new Date();
  const diff = now - this.createdAt;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return this.createdAt.toLocaleDateString('en-GB');
});

// Get total reactions count
messageSchema.virtual('totalReactions').get(function() {
  return this.engagement.reactions.length;
});

// ==========================================
// 📝 INSTANCE METHODS
// ==========================================

// Mark message as read by user
messageSchema.methods.markAsRead = function(userId) {
  // Update recipient's read status
  const recipient = this.recipients.find(r => r.user.toString() === userId.toString());
  if (recipient && !recipient.readAt) {
    recipient.readAt = new Date();
  }

  // Add to readBy array if not already present
  const alreadyRead = this.readBy.find(r => r.user.toString() === userId.toString());
  if (!alreadyRead) {
    this.readBy.push({
      user: userId,
      readAt: new Date()
    });
  }

  this.lastActivity = new Date();
  return this.save();
};

// Add reaction to message
messageSchema.methods.addReaction = function(userId, reactionType) {
  // Remove existing reaction by this user
  this.engagement.reactions = this.engagement.reactions.filter(
    r => r.user.toString() !== userId.toString()
  );

  // Add new reaction
  this.engagement.reactions.push({
    user: userId,
    reaction: reactionType,
    reactedAt: new Date()
  });

  this.lastActivity = new Date();
  return this.save();
};

// Remove reaction from message
messageSchema.methods.removeReaction = function(userId) {
  this.engagement.reactions = this.engagement.reactions.filter(
    r => r.user.toString() !== userId.toString()
  );

  this.lastActivity = new Date();
  return this.save();
};

// Add helpfulness rating (for answers)
messageSchema.methods.addHelpfulnessRating = function(userId, rating, comment = '') {
  // Remove existing rating by this user
  this.engagement.helpfulnessRating.ratings = this.engagement.helpfulnessRating.ratings.filter(
    r => r.user.toString() !== userId.toString()
  );

  // Add new rating
  this.engagement.helpfulnessRating.ratings.push({
    user: userId,
    rating: rating,
    comment: comment,
    ratedAt: new Date()
  });

  // Recalculate average
  const ratings = this.engagement.helpfulnessRating.ratings;
  this.engagement.helpfulnessRating.totalRatings = ratings.length;
  this.engagement.helpfulnessRating.averageRating = 
    ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length;

  this.lastActivity = new Date();
  return this.save();
};

// Soft delete message
messageSchema.methods.softDelete = function(deletedBy) {
  this.isDeleted = true;
  this.deletedBy = deletedBy;
  this.deletedAt = new Date();
  return this.save();
};

// Report message
messageSchema.methods.reportMessage = function(reportedBy, reason, description = '') {
  this.moderation.reports.push({
    reportedBy: reportedBy,
    reason: reason,
    description: description,
    reportedAt: new Date()
  });

  this.moderation.reportCount += 1;
  this.moderation.isReported = true;

  return this.save();
};

// Get message content for display (handle deleted messages)
messageSchema.methods.getDisplayContent = function() {
  if (this.isDeleted) {
    return {
      text: '⚠️ This message has been deleted',
      isDeleted: true
    };
  }

  return {
    text: this.content.text,
    subject: this.content.subject,
    category: this.content.category,
    priority: this.content.priority,
    tags: this.content.tags,
    isDeleted: false
  };
};

// ==========================================
// 📊 STATIC METHODS
// ==========================================

// Get messages for a conversation with pagination
messageSchema.statics.getConversationMessages = function(conversationId, page = 1, limit = 50) {
  const skip = (page - 1) * limit;
  
  return this.find({ 
    conversationId: conversationId,
    isDeleted: false 
  })
  .populate('sender', 'name email avatar role')
  .populate('replyTo', 'content.text sender')
  .sort({ createdAt: -1 })
  .skip(skip)
  .limit(limit)
  .lean();
};

// Get unread messages count for user
messageSchema.statics.getUnreadCount = function(userId) {
  return this.countDocuments({
    'recipients.user': userId,
    'recipients.readAt': null,
    isDeleted: false
  });
};

// Get academic questions by category
messageSchema.statics.getQuestionsByCategory = function(category, status = 'pending') {
  return this.find({
    messageType: 'question',
    'content.category': category,
    questionStatus: status,
    isDeleted: false
  })
  .populate('sender', 'name email avatar role')
  .sort({ 'content.priority': 1, createdAt: -1 });
};

// Search messages in conversation
messageSchema.statics.searchInConversation = function(conversationId, searchTerm) {
  return this.find({
    conversationId: conversationId,
    $or: [
      { 'content.text': { $regex: searchTerm, $options: 'i' } },
      { 'content.subject': { $regex: searchTerm, $options: 'i' } },
      { 'content.tags': { $in: [new RegExp(searchTerm, 'i')] } }
    ],
    isDeleted: false
  })
  .populate('sender', 'name email avatar role')
  .sort({ createdAt: -1 });
};

// Get message statistics
messageSchema.statics.getMessageStats = function(timeframe = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - timeframe);

  return this.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate },
        isDeleted: false
      }
    },
    {
      $group: {
        _id: null,
        totalMessages: { $sum: 1 },
        totalQuestions: {
          $sum: { $cond: [{ $eq: ['$messageType', 'question'] }, 1, 0] }
        },
        totalAnswers: {
          $sum: { $cond: [{ $eq: ['$messageType', 'answer'] }, 1, 0] }
        },
        avgResponseTime: { $avg: '$responseTime' },
        topCategories: { $push: '$content.category' }
      }
    }
  ]);
};

// ==========================================
// 🔄 MIDDLEWARE
// ==========================================

// Pre-save middleware
messageSchema.pre('save', function(next) {
  // Update last activity
  this.lastActivity = new Date();
  
  // Auto-generate subject for questions without one
  if (this.messageType === 'question' && !this.content.subject && this.content.text) {
    this.content.subject = this.content.text.substring(0, 50) + (this.content.text.length > 50 ? '...' : '');
  }

  // Validate recipients for private messages
  if (this.isPrivate && this.recipients.length === 0) {
    return next(new Error('Private messages must have at least one recipient'));
  }

  next();
});

// Post-save middleware for real-time notifications
messageSchema.post('save', function(doc) {
  // Emit real-time event for new messages
  if (this.isNew) {
    const io = require('../services/SocketService').getIO();
    if (io) {
      // Emit to conversation participants
      io.to(`conversation_${doc.conversationId}`).emit('newMessage', {
        messageId: doc._id,
        conversationId: doc.conversationId,
        sender: doc.sender,
        messageType: doc.messageType,
        content: doc.getDisplayContent(),
        createdAt: doc.createdAt
      });
    }
  }
});

module.exports = mongoose.model('Message', messageSchema);
