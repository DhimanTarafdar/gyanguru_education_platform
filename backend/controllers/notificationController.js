const Notification = require('../models/Notification');
const User = require('../models/User');
const Assessment = require('../models/Assessment');
const { NotificationService, EmailService } = require('../services/NotificationService');

// 🔔 GyanGuru Real-time Notification Controller
// Features: Instant notifications, Grade alerts, Assignment reminders, Teacher messages

// ==========================================
// 📱 GET USER NOTIFICATIONS
// ==========================================

// Get all notifications for current user
const getNotifications = async (req, res) => {
  try {
    const userId = req.user._id;
    const { 
      page = 1, 
      limit = 20, 
      type = null, 
      unreadOnly = false, 
      category = null,
      priority = null 
    } = req.query;

    console.log(`📱 Getting notifications for user: ${userId}`);

    // Build query
    const query = { recipient: userId };
    if (type) query.type = type;
    if (unreadOnly === 'true') query.isRead = false;
    if (category) query.category = category;
    if (priority) query.priority = priority;

    // Get notifications with pagination
    const notifications = await Notification.find(query)
      .populate('sender', 'name avatar teacherInfo.expertise')
      .populate('data.assessmentId', 'title type')
      .sort({ priority: -1, createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    // Get total count for pagination
    const totalCount = await Notification.countDocuments(query);
    const unreadCount = await Notification.getUnreadCount(userId);

    // Format notifications for frontend
    const formattedNotifications = notifications.map(notification => ({
      ...notification,
      timeAgo: getTimeAgo(notification.createdAt),
      actionUrl: generateActionUrl(notification),
      isExpired: notification.expiresAt < new Date()
    }));

    console.log(`✅ Retrieved ${notifications.length} notifications`);

    res.status(200).json({
      success: true,
      message: 'Notifications retrieved successfully',
      data: {
        notifications: formattedNotifications,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: totalCount,
          pages: Math.ceil(totalCount / limit)
        },
        counts: {
          total: totalCount,
          unread: unreadCount
        }
      }
    });

  } catch (error) {
    console.error('❌ Get notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while retrieving notifications',
      error: error.message
    });
  }
};

// Get unread notifications count
const getUnreadCount = async (req, res) => {
  try {
    const userId = req.user._id;
    
    const unreadCount = await Notification.getUnreadCount(userId);
    
    res.status(200).json({
      success: true,
      data: { unreadCount }
    });

  } catch (error) {
    console.error('❌ Get unread count error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while getting unread count',
      error: error.message
    });
  }
};

// ==========================================
// ✅ MARK NOTIFICATIONS AS READ
// ==========================================

// Mark single notification as read
const markAsRead = async (req, res) => {
  try {
    const { notificationId } = req.params;
    const userId = req.user._id;
    const deviceInfo = {
      platform: req.get('User-Agent')?.includes('Mobile') ? 'mobile' : 'web',
      browser: req.get('User-Agent'),
      userAgent: req.get('User-Agent')
    };

    console.log(`📖 Marking notification as read: ${notificationId}`);

    // Find and update notification
    const notification = await Notification.findOne({
      _id: notificationId,
      recipient: userId
    });

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    if (!notification.isRead) {
      await notification.markAsRead(deviceInfo);
      
      // Emit real-time update
      if (global.io) {
        global.io.to(`user_${userId}`).emit('notification_read', {
          notificationId,
          unreadCount: await Notification.getUnreadCount(userId)
        });
      }
    }

    console.log(`✅ Notification marked as read`);

    res.status(200).json({
      success: true,
      message: 'Notification marked as read',
      data: { notification: notification.getSummary() }
    });

  } catch (error) {
    console.error('❌ Mark as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while marking notification as read',
      error: error.message
    });
  }
};

// Mark all notifications as read
const markAllAsRead = async (req, res) => {
  try {
    const userId = req.user._id;

    console.log(`📖 Marking all notifications as read for user: ${userId}`);

    // Update all unread notifications
    const result = await Notification.updateMany(
      {
        recipient: userId,
        isRead: false
      },
      {
        $set: {
          isRead: true,
          readAt: new Date(),
          status: 'read'
        }
      }
    );

    // Emit real-time update
    if (global.io) {
      global.io.to(`user_${userId}`).emit('all_notifications_read', {
        updatedCount: result.modifiedCount,
        unreadCount: 0
      });
    }

    console.log(`✅ Marked ${result.modifiedCount} notifications as read`);

    res.status(200).json({
      success: true,
      message: `Marked ${result.modifiedCount} notifications as read`,
      data: { updatedCount: result.modifiedCount }
    });

  } catch (error) {
    console.error('❌ Mark all as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while marking notifications as read',
      error: error.message
    });
  }
};

// ==========================================
// 🚀 SEND NOTIFICATIONS (Admin/System)
// ==========================================

// Send individual notification
const sendNotification = async (req, res) => {
  try {
    const {
      recipientId,
      type,
      title,
      message,
      priority = 'normal',
      data = {},
      channels = { inApp: { enabled: true } },
      scheduledFor = null
    } = req.body;

    console.log(`🚀 Sending notification to user: ${recipientId}`);

    // Validate recipient
    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({
        success: false,
        message: 'Recipient not found'
      });
    }

    // Create notification
    const notification = new Notification({
      recipient: recipientId,
      sender: req.user._id,
      type,
      title,
      message,
      priority,
      data,
      channels,
      scheduledFor: scheduledFor ? new Date(scheduledFor) : new Date(),
      status: 'pending'
    });

    await notification.save();

    // Send notification through various channels
    const deliveryResult = await NotificationService.deliverNotification(notification);

    console.log(`✅ Notification sent successfully`);

    res.status(201).json({
      success: true,
      message: 'Notification sent successfully',
      data: {
        notification: notification.getSummary(),
        delivery: deliveryResult
      }
    });

  } catch (error) {
    console.error('❌ Send notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while sending notification',
      error: error.message
    });
  }
};

// Send bulk notifications
const sendBulkNotification = async (req, res) => {
  try {
    const {
      recipientIds,
      type,
      title,
      message,
      priority = 'normal',
      data = {},
      channels = { inApp: { enabled: true } }
    } = req.body;

    console.log(`🚀 Sending bulk notification to ${recipientIds.length} users`);

    // Validate recipients
    const recipients = await User.find({ _id: { $in: recipientIds } });
    if (recipients.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No valid recipients found'
      });
    }

    // Create notifications for all recipients
    const notifications = recipients.map(recipient => ({
      recipient: recipient._id,
      sender: req.user._id,
      type,
      title,
      message,
      priority,
      data,
      channels,
      scheduledFor: new Date(),
      status: 'pending'
    }));

    const result = await Notification.insertMany(notifications);

    // Send notifications through various channels
    const deliveryPromises = result.map(notification => 
      NotificationService.deliverNotification(notification)
    );
    
    const deliveryResults = await Promise.allSettled(deliveryPromises);
    const successCount = deliveryResults.filter(r => r.status === 'fulfilled').length;

    console.log(`✅ Bulk notification sent to ${successCount}/${recipients.length} users`);

    res.status(201).json({
      success: true,
      message: `Bulk notification sent successfully to ${successCount} users`,
      data: {
        totalSent: successCount,
        totalRecipients: recipients.length,
        notifications: result.map(n => n.getSummary())
      }
    });

  } catch (error) {
    console.error('❌ Send bulk notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while sending bulk notification',
      error: error.message
    });
  }
};

// ==========================================
// 🤖 AUTOMATIC NOTIFICATION TRIGGERS
// ==========================================

// Trigger grade published notification
const notifyGradePublished = async (assessmentId, studentId, gradeData) => {
  try {
    const assessment = await Assessment.findById(assessmentId).populate('teacher');
    const student = await User.findById(studentId);

    if (!assessment || !student) {
      throw new Error('Assessment or student not found');
    }

    const notification = new Notification({
      recipient: studentId,
      sender: assessment.teacher._id,
      type: 'quiz_graded',
      title: '🎉 গ্রেড প্রকাশিত হয়েছে!',
      message: `আপনার "${assessment.title}" এর ফলাফল প্রকাশিত হয়েছে। আপনি ${gradeData.percentage}% স্কোর করেছেন।`,
      priority: 'high',
      icon: 'check-circle',
      color: gradeData.percentage >= 80 ? 'green' : gradeData.percentage >= 60 ? 'yellow' : 'red',
      data: {
        assessmentId,
        metadata: gradeData,
        actions: [{
          label: 'ফলাফল দেখুন',
          action: 'view_result',
          url: `/results/${assessmentId}`,
          style: 'primary'
        }]
      },
      channels: {
        inApp: { enabled: true },
        email: { enabled: true }
      }
    });

    await notification.save();
    await NotificationService.deliverNotification(notification);

    console.log(`✅ Grade published notification sent to student: ${studentId}`);
    return notification;

  } catch (error) {
    console.error('❌ Grade notification error:', error);
    throw error;
  }
};

// Trigger new assignment notification
const notifyNewAssignment = async (assessmentId, studentIds) => {
  try {
    const assessment = await Assessment.findById(assessmentId).populate('teacher');
    
    if (!assessment) {
      throw new Error('Assessment not found');
    }

    const notifications = studentIds.map(studentId => ({
      recipient: studentId,
      sender: assessment.teacher._id,
      type: 'assignment_created',
      title: '📚 নতুন এসাইনমেন্ট!',
      message: `আপনার জন্য নতুন এসাইনমেন্ট "${assessment.title}" তৈরি করা হয়েছে।`,
      priority: 'high',
      icon: 'calendar',
      color: 'blue',
      data: {
        assessmentId,
        metadata: {
          dueDate: assessment.timing?.endDate,
          subject: assessment.subject,
          totalMarks: assessment.grading?.totalMarks
        },
        actions: [{
          label: 'শুরু করুন',
          action: 'start_assessment',
          url: `/assessments/${assessmentId}`,
          style: 'primary'
        }]
      },
      channels: {
        inApp: { enabled: true },
        email: { enabled: true }
      }
    }));

    const result = await Notification.insertMany(notifications);
    
    // Send notifications
    const deliveryPromises = result.map(notification => 
      NotificationService.deliverNotification(notification)
    );
    
    await Promise.allSettled(deliveryPromises);

    console.log(`✅ New assignment notifications sent to ${studentIds.length} students`);
    return result;

  } catch (error) {
    console.error('❌ Assignment notification error:', error);
    throw error;
  }
};

// Trigger deadline reminder
const notifyDeadlineReminder = async (assessmentId, hoursRemaining = 24) => {
  try {
    const assessment = await Assessment.findById(assessmentId).populate('teacher');
    
    if (!assessment) {
      throw new Error('Assessment not found');
    }

    // Get students who haven't submitted yet
    const pendingStudents = assessment.participants.assigned.filter(
      p => p.status === 'assigned' || p.status === 'started'
    );

    if (pendingStudents.length === 0) {
      return [];
    }

    const notifications = pendingStudents.map(participant => ({
      recipient: participant.studentId,
      sender: assessment.teacher._id,
      type: 'assignment_due',
      title: '⏰ ডেডলাইন রিমাইন্ডার!',
      message: `"${assessment.title}" এর জমা দেওয়ার সময় ${hoursRemaining} ঘণ্টা বাকি আছে।`,
      priority: hoursRemaining <= 6 ? 'urgent' : 'high',
      icon: 'alert-triangle',
      color: hoursRemaining <= 6 ? 'red' : 'yellow',
      data: {
        assessmentId,
        metadata: {
          dueDate: assessment.timing?.endDate,
          hoursRemaining
        },
        actions: [{
          label: 'এখনই সম্পন্ন করুন',
          action: 'complete_assessment',
          url: `/assessments/${assessmentId}`,
          style: 'danger'
        }]
      },
      channels: {
        inApp: { enabled: true },
        email: { enabled: true },
        sms: { enabled: hoursRemaining <= 6 } // SMS for urgent reminders
      }
    }));

    const result = await Notification.insertMany(notifications);
    
    // Send notifications
    const deliveryPromises = result.map(notification => 
      NotificationService.deliverNotification(notification)
    );
    
    await Promise.allSettled(deliveryPromises);

    console.log(`✅ Deadline reminder sent to ${pendingStudents.length} students`);
    return result;

  } catch (error) {
    console.error('❌ Deadline notification error:', error);
    throw error;
  }
};

// ==========================================
// 📊 NOTIFICATION ANALYTICS
// ==========================================

// Get notification analytics
const getAnalytics = async (req, res) => {
  try {
    const userId = req.user._id;
    const { startDate, endDate, type } = req.query;

    console.log(`📊 Getting notification analytics for user: ${userId}`);

    // Build date range
    const dateRange = {};
    if (startDate) dateRange.start = new Date(startDate);
    if (endDate) dateRange.end = new Date(endDate);

    // Get user notification statistics
    const userStats = await Notification.getUserStats(userId);
    
    // Get system-wide analytics (admin only)
    let systemAnalytics = null;
    if (req.user.role === 'admin') {
      systemAnalytics = await Notification.getAnalytics(dateRange);
    }

    // Get notification trends
    const trends = await getNotificationTrends(userId, dateRange);

    res.status(200).json({
      success: true,
      message: 'Analytics retrieved successfully',
      data: {
        userStats,
        systemAnalytics,
        trends
      }
    });

  } catch (error) {
    console.error('❌ Analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while retrieving analytics',
      error: error.message
    });
  }
};

// ==========================================
// 🛠️ UTILITY FUNCTIONS
// ==========================================

// Generate action URL based on notification type
const generateActionUrl = (notification) => {
  const { type, data } = notification;
  
  switch (type) {
    case 'quiz_graded':
      return `/results/${data.assessmentId}`;
    case 'assignment_created':
    case 'assignment_due':
      return `/assessments/${data.assessmentId}`;
    case 'connection_request':
      return `/connections/requests`;
    case 'connection_approved':
      return `/teachers/${notification.sender}`;
    default:
      return '/notifications';
  }
};

// Get time ago string
const getTimeAgo = (date) => {
  const now = new Date();
  const diffMs = now - new Date(date);
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffMins < 1) return 'এখনই';
  if (diffMins < 60) return `${diffMins} মিনিট আগে`;
  if (diffHours < 24) return `${diffHours} ঘণ্টা আগে`;
  if (diffDays < 30) return `${diffDays} দিন আগে`;
  return new Date(date).toLocaleDateString('bn-BD');
};

// Get notification trends
const getNotificationTrends = async (userId, dateRange) => {
  const matchQuery = { recipient: userId };
  
  if (dateRange.start && dateRange.end) {
    matchQuery.createdAt = {
      $gte: dateRange.start,
      $lte: dateRange.end
    };
  }
  
  const trends = await Notification.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: {
          date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          type: '$type'
        },
        count: { $sum: 1 },
        readCount: { $sum: { $cond: [{ $eq: ['$isRead', true] }, 1, 0] } }
      }
    },
    {
      $group: {
        _id: '$_id.date',
        total: { $sum: '$count' },
        totalRead: { $sum: '$readCount' },
        byType: {
          $push: {
            type: '$_id.type',
            count: '$count',
            readCount: '$readCount'
          }
        }
      }
    },
    { $sort: { _id: 1 } }
  ]);
  
  return trends;
};

module.exports = {
  // Basic notification operations
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  
  // Admin operations
  sendNotification,
  sendBulkNotification,
  
  // Automatic triggers (for internal use)
  notifyGradePublished,
  notifyNewAssignment,
  notifyDeadlineReminder,
  
  // Analytics
  getAnalytics
};
