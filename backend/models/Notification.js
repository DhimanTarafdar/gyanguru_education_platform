const mongoose = require('mongoose');

// ============================================
// 🔔 NOTIFICATION MODEL - Real-time Notifications System
// ============================================

const notificationSchema = new mongoose.Schema({
  
  // 🎯 RECIPIENT INFORMATION
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Notification recipient is required'],
    index: true // User এর সব notification quickly find করার জন্য
  },
  
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null // System notification এর ক্ষেত্রে null হবে
  },
  
  // 📧 NOTIFICATION CONTENT
  type: {
    type: String,
    enum: [
      'connection_request',     // Student teacher কে connection request পাঠালে
      'connection_approved',    // Teacher connection approve করলে
      'connection_rejected',    // Teacher connection reject করলে
      'assignment_created',     // Teacher assignment তৈরি করলে
      'assignment_due',         // Assignment deadline এর reminder
      'quiz_submitted',         // Student quiz submit করলে
      'quiz_graded',           // Teacher quiz grade করলে
      'achievement_unlocked',   // Student কোন achievement পেলে
      'system_announcement',    // Admin থেকে system announcement
      'account_verification',   // Email verification এর জন্য
      'password_reset',         // Password reset এর জন্য
      'maintenance_notice'      // System maintenance এর notice
    ],
    required: [true, 'Notification type is required'],
    index: true // Type wise filtering এর জন্য
  },
  
  title: {
    type: String,
    required: [true, 'Notification title is required'],
    maxLength: [100, 'Title cannot exceed 100 characters'],
    trim: true
  },
  
  message: {
    type: String,
    required: [true, 'Notification message is required'],
    maxLength: [500, 'Message cannot exceed 500 characters'],
    trim: true
  },
  
  // 🎨 NOTIFICATION STYLING
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal',
    index: true // Priority wise sorting এর জন্য
  },
  
  icon: {
    type: String,
    default: 'bell', // Default icon name
    enum: [
      'bell',           // General notifications
      'user-plus',      // Connection requests
      'check-circle',   // Success notifications
      'alert-triangle', // Warning notifications
      'info',          // Information
      'gift',          // Achievements
      'calendar',      // Reminders
      'mail',          // Email related
      'settings'       // System notifications
    ]
  },
  
  color: {
    type: String,
    default: 'blue',
    enum: ['blue', 'green', 'yellow', 'red', 'purple', 'gray']
  },
  
  // 📊 NOTIFICATION DATA & ACTIONS
  data: {
    // Flexible object to store notification related data
    assessmentId: mongoose.Schema.Types.ObjectId,
    questionId: mongoose.Schema.Types.ObjectId,
    submissionId: mongoose.Schema.Types.ObjectId,
    connectionId: mongoose.Schema.Types.ObjectId,
    
    // Additional metadata
    metadata: mongoose.Schema.Types.Mixed,
    
    // Action buttons data
    actions: [{
      label: String,      // Button text
      action: String,     // Action type (approve, reject, view, etc.)
      url: String,        // Redirect URL
      style: {            // Button styling
        type: String,
        enum: ['primary', 'secondary', 'success', 'danger', 'warning'],
        default: 'primary'
      }
    }]
  },
  
  // 📱 DELIVERY STATUS
  status: {
    type: String,
    enum: ['pending', 'sent', 'delivered', 'read', 'failed'],
    default: 'pending',
    index: true // Status wise queries এর জন্য
  },
  
  isRead: {
    type: Boolean,
    default: false,
    index: true // Unread notifications find করার জন্য
  },
  
  readAt: {
    type: Date,
    default: null
  },
  
  // 🚀 DELIVERY CHANNELS
  channels: {
    inApp: {
      enabled: { type: Boolean, default: true },
      delivered: { type: Boolean, default: false },
      deliveredAt: Date
    },
    
    email: {
      enabled: { type: Boolean, default: false },
      delivered: { type: Boolean, default: false },
      deliveredAt: Date,
      emailId: String // Email ID for tracking
    },
    
    sms: {
      enabled: { type: Boolean, default: false },
      delivered: { type: Boolean, default: false },
      deliveredAt: Date,
      messageId: String // SMS ID for tracking
    },
    
    push: {
      enabled: { type: Boolean, default: false },
      delivered: { type: Boolean, default: false },
      deliveredAt: Date,
      pushId: String // Push notification ID
    }
  },
  
  // ⏰ SCHEDULING & TIMING
  scheduledFor: {
    type: Date,
    default: null,
    index: true // Scheduled notifications find করার জন্য
  },
  
  expiresAt: {
    type: Date,
    default: function() {
      // Default expiry: 30 days from creation
      return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    },
    index: true // Expired notifications cleanup এর জন্য
  },
  
  // 🔄 RETRY MECHANISM
  retryCount: {
    type: Number,
    default: 0,
    max: [5, 'Maximum 5 retry attempts allowed']
  },
  
  lastRetryAt: Date,
  
  failureReason: {
    type: String,
    maxLength: [200, 'Failure reason cannot exceed 200 characters']
  },
  
  // 📈 ANALYTICS & TRACKING
  analytics: {
    deliveryTime: Number,     // Time taken to deliver (milliseconds)
    clickCount: {            // How many times user clicked
      type: Number,
      default: 0
    },
    firstClickedAt: Date,    // When user first clicked
    lastClickedAt: Date,     // When user last clicked
    
    // Device/Platform info
    deviceInfo: {
      platform: String,      // web, mobile, desktop
      browser: String,        // Chrome, Firefox, etc.
      os: String             // Windows, Android, iOS
    }
  },
  
  // 🏷️ CATEGORIZATION & FILTERING
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  
  category: {
    type: String,
    enum: ['academic', 'social', 'system', 'achievement', 'reminder', 'security'],
    default: 'academic',
    index: true
  },
  
  // 🔒 PRIVACY & SECURITY
  isPrivate: {
    type: Boolean,
    default: false // Whether notification contains sensitive data
  },
  
  requiresAuth: {
    type: Boolean,
    default: false // Whether user needs to re-authenticate to view
  }

}, {
  timestamps: true, // createdAt, updatedAt
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ==========================================
// 🔍 INDEXES FOR PERFORMANCE
// ==========================================

// User এর সব notifications (unread first)
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

// Type wise notifications
notificationSchema.index({ type: 1, status: 1 });

// Scheduled notifications (for cron jobs)
notificationSchema.index({ scheduledFor: 1, status: 1 });

// Expired notifications cleanup
notificationSchema.index({ expiresAt: 1 });

// Priority wise sorting
notificationSchema.index({ recipient: 1, priority: -1, createdAt: -1 });

// Analytics queries
notificationSchema.index({ category: 1, createdAt: -1 });

// ==========================================
// 🧮 VIRTUAL FIELDS
// ==========================================

// Check if notification is expired
notificationSchema.virtual('isExpired').get(function() {
  return this.expiresAt && this.expiresAt < new Date();
});

// Check if notification is scheduled for future
notificationSchema.virtual('isScheduled').get(function() {
  return this.scheduledFor && this.scheduledFor > new Date();
});

// Calculate time since creation
notificationSchema.virtual('timeAgo').get(function() {
  const now = new Date();
  const diffMs = now - this.createdAt;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minutes ago`;
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays < 30) return `${diffDays} days ago`;
  return this.createdAt.toLocaleDateString();
});

// Get delivery success rate
notificationSchema.virtual('deliverySuccessRate').get(function() {
  const channels = this.channels;
  let enabledCount = 0;
  let deliveredCount = 0;
  
  Object.keys(channels).forEach(channel => {
    if (channels[channel].enabled) {
      enabledCount++;
      if (channels[channel].delivered) {
        deliveredCount++;
      }
    }
  });
  
  return enabledCount > 0 ? Math.round((deliveredCount / enabledCount) * 100) : 0;
});

// ==========================================
// 🔧 MIDDLEWARE
// ==========================================

// Pre-save middleware for auto-tagging and validation
notificationSchema.pre('save', function(next) {
  // Auto-assign category based on type
  if (!this.category || this.category === 'academic') {
    const systemTypes = ['system_announcement', 'maintenance_notice', 'account_verification'];
    const socialTypes = ['connection_request', 'connection_approved', 'connection_rejected'];
    const achievementTypes = ['achievement_unlocked'];
    const reminderTypes = ['assignment_due'];
    
    if (systemTypes.includes(this.type)) {
      this.category = 'system';
    } else if (socialTypes.includes(this.type)) {
      this.category = 'social';
    } else if (achievementTypes.includes(this.type)) {
      this.category = 'achievement';
    } else if (reminderTypes.includes(this.type)) {
      this.category = 'reminder';
    }
  }
  
  // Auto-assign priority based on type
  if (this.priority === 'normal') {
    const urgentTypes = ['password_reset', 'account_verification', 'maintenance_notice'];
    const highTypes = ['assignment_due', 'connection_request'];
    
    if (urgentTypes.includes(this.type)) {
      this.priority = 'urgent';
    } else if (highTypes.includes(this.type)) {
      this.priority = 'high';
    }
  }
  
  // Set scheduled delivery time if not set
  if (!this.scheduledFor) {
    this.scheduledFor = new Date(); // Send immediately
  }
  
  next();
});

// Post-save middleware for real-time delivery
notificationSchema.post('save', function(doc) {
  // Emit socket event for real-time notification
  // This will be implemented in the socket service
  if (global.io && doc.channels.inApp.enabled) {
    global.io.to(`user_${doc.recipient}`).emit('new_notification', {
      _id: doc._id,
      type: doc.type,
      title: doc.title,
      message: doc.message,
      priority: doc.priority,
      icon: doc.icon,
      color: doc.color,
      createdAt: doc.createdAt,
      data: doc.data
    });
  }
});

// ==========================================
// 📊 INSTANCE METHODS
// ==========================================

// Mark notification as read
notificationSchema.methods.markAsRead = function(deviceInfo = {}) {
  this.isRead = true;
  this.readAt = new Date();
  this.status = 'read';
  
  // Update analytics
  if (!this.analytics.firstClickedAt) {
    this.analytics.firstClickedAt = new Date();
  }
  this.analytics.lastClickedAt = new Date();
  this.analytics.clickCount += 1;
  this.analytics.deviceInfo = deviceInfo;
  
  return this.save();
};

// Mark as delivered for specific channel
notificationSchema.methods.markAsDelivered = function(channel, deliveryId = null) {
  if (this.channels[channel]) {
    this.channels[channel].delivered = true;
    this.channels[channel].deliveredAt = new Date();
    
    // Store delivery ID for tracking
    if (deliveryId) {
      if (channel === 'email') this.channels[channel].emailId = deliveryId;
      else if (channel === 'sms') this.channels[channel].messageId = deliveryId;
      else if (channel === 'push') this.channels[channel].pushId = deliveryId;
    }
    
    // Update overall status
    if (this.status === 'pending' || this.status === 'sent') {
      this.status = 'delivered';
    }
    
    // Calculate delivery time
    if (!this.analytics.deliveryTime) {
      this.analytics.deliveryTime = Date.now() - this.createdAt.getTime();
    }
  }
  
  return this.save();
};

// Retry failed delivery
notificationSchema.methods.retryDelivery = function() {
  if (this.retryCount >= 5) {
    throw new Error('Maximum retry attempts reached');
  }
  
  this.retryCount += 1;
  this.lastRetryAt = new Date();
  this.status = 'pending';
  this.failureReason = null;
  
  return this.save();
};

// Generate notification summary
notificationSchema.methods.getSummary = function() {
  return {
    id: this._id,
    type: this.type,
    title: this.title,
    message: this.message,
    priority: this.priority,
    isRead: this.isRead,
    timeAgo: this.timeAgo,
    icon: this.icon,
    color: this.color,
    category: this.category,
    actions: this.data.actions || []
  };
};

// ==========================================
// 📈 STATIC METHODS
// ==========================================

// Get user's unread notifications
notificationSchema.statics.getUnreadNotifications = function(userId, limit = 20) {
  return this.find({
    recipient: userId,
    isRead: false,
    status: { $in: ['delivered', 'read'] },
    expiresAt: { $gt: new Date() }
  })
  .sort({ priority: -1, createdAt: -1 })
  .limit(limit)
  .populate('sender', 'name avatar');
};

// Get notification statistics for user
notificationSchema.statics.getUserStats = async function(userId) {
  const stats = await this.aggregate([
    { $match: { recipient: mongoose.Types.ObjectId(userId) } },
    {
      $group: {
        _id: null,
        total: { $sum: 1 },
        unread: { $sum: { $cond: [{ $eq: ['$isRead', false] }, 1, 0] } },
        byCategory: {
          $push: {
            category: '$category',
            isRead: '$isRead'
          }
        }
      }
    }
  ]);
  
  return stats[0] || { total: 0, unread: 0, byCategory: [] };
};

// Create bulk notifications
notificationSchema.statics.createBulkNotifications = async function(notifications) {
  try {
    const result = await this.insertMany(notifications, { ordered: false });
    return { success: true, created: result.length };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Cleanup expired notifications
notificationSchema.statics.cleanupExpired = function() {
  return this.deleteMany({
    expiresAt: { $lt: new Date() },
    isRead: true
  });
};

// Get notification analytics
notificationSchema.statics.getAnalytics = async function(dateRange = {}) {
  const matchQuery = {};
  
  if (dateRange.start && dateRange.end) {
    matchQuery.createdAt = {
      $gte: new Date(dateRange.start),
      $lte: new Date(dateRange.end)
    };
  }
  
  const analytics = await this.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: null,
        totalNotifications: { $sum: 1 },
        deliveredCount: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
        readCount: { $sum: { $cond: [{ $eq: ['$isRead', true] }, 1, 0] } },
        averageDeliveryTime: { $avg: '$analytics.deliveryTime' },
        byType: {
          $push: {
            type: '$type',
            status: '$status',
            isRead: '$isRead'
          }
        },
        byPriority: {
          $push: {
            priority: '$priority',
            isRead: '$isRead'
          }
        }
      }
    }
  ]);
  
  return analytics[0] || {};
};

module.exports = mongoose.model('Notification', notificationSchema);
