const express = require('express');
const router = express.Router();
const {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  sendNotification,
  sendBulkNotification,
  getAnalytics
} = require('../controllers/notificationController');

const { authenticateUser, authorizeRoles } = require('../middleware/auth');

// ==========================================
// 📱 USER NOTIFICATION ROUTES
// ==========================================

// @route   GET /api/notifications
// @desc    Get user's notifications with filters and pagination
// @access  Private (Student/Teacher)
router.get('/', authenticateUser, getNotifications);

// @route   GET /api/notifications/unread-count
// @desc    Get user's unread notifications count
// @access  Private (Student/Teacher)
router.get('/unread-count', authenticateUser, getUnreadCount);

// @route   PUT /api/notifications/:notificationId/read
// @desc    Mark single notification as read
// @access  Private (Student/Teacher)
router.put('/:notificationId/read', authenticateUser, markAsRead);

// @route   PUT /api/notifications/mark-all-read
// @desc    Mark all notifications as read for current user
// @access  Private (Student/Teacher)
router.put('/mark-all-read', authenticateUser, markAllAsRead);

// ==========================================
// 👨‍🏫 TEACHER NOTIFICATION ROUTES
// ==========================================

// @route   POST /api/notifications/send
// @desc    Send notification to specific user (Teacher/Admin only)
// @access  Private (Teacher/Admin)
router.post('/send', 
  authenticateUser, 
  authorizeRoles('teacher', 'admin'), 
  sendNotification
);

// @route   POST /api/notifications/send-bulk
// @desc    Send bulk notifications to multiple users (Teacher/Admin only)
// @access  Private (Teacher/Admin)
router.post('/send-bulk', 
  authenticateUser, 
  authorizeRoles('teacher', 'admin'), 
  sendBulkNotification
);

// ==========================================
// 📊 ANALYTICS ROUTES
// ==========================================

// @route   GET /api/notifications/analytics
// @desc    Get notification analytics (Admin only gets system-wide, others get personal)
// @access  Private (Student/Teacher/Admin)
router.get('/analytics', authenticateUser, getAnalytics);

// ==========================================
// 🤖 WEBHOOK ROUTES (Internal Use)
// ==========================================

// @route   POST /api/notifications/webhook/grade-published
// @desc    Webhook for grade published notifications (Internal)
// @access  Private (System/Teacher)
router.post('/webhook/grade-published', 
  authenticateUser, 
  authorizeRoles('teacher', 'admin'),
  async (req, res) => {
    try {
      const { assessmentId, studentId, gradeData } = req.body;
      const { NotificationService } = require('../services/NotificationService');
      
      const notification = await NotificationService.sendGradeNotification(
        assessmentId, 
        studentId, 
        gradeData
      );

      res.status(200).json({
        success: true,
        message: 'Grade notification sent successfully',
        data: { notification: notification.getSummary() }
      });

    } catch (error) {
      console.error('Grade notification webhook error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to send grade notification',
        error: error.message
      });
    }
  }
);

// @route   POST /api/notifications/webhook/assignment-created
// @desc    Webhook for new assignment notifications (Internal)
// @access  Private (Teacher/Admin)
router.post('/webhook/assignment-created', 
  authenticateUser, 
  authorizeRoles('teacher', 'admin'),
  async (req, res) => {
    try {
      const { assessmentId, studentIds } = req.body;
      const { NotificationService } = require('../services/NotificationService');
      
      const notifications = await NotificationService.sendAssignmentNotification(
        assessmentId, 
        studentIds
      );

      res.status(200).json({
        success: true,
        message: `Assignment notifications sent to ${studentIds.length} students`,
        data: { 
          count: notifications.length,
          notifications: notifications.map(n => n.getSummary())
        }
      });

    } catch (error) {
      console.error('Assignment notification webhook error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to send assignment notifications',
        error: error.message
      });
    }
  }
);

// @route   POST /api/notifications/webhook/system-announcement
// @desc    Send system-wide announcement (Admin only)
// @access  Private (Admin)
router.post('/webhook/system-announcement', 
  authenticateUser, 
  authorizeRoles('admin'),
  async (req, res) => {
    try {
      const { title, message, recipientIds, priority = 'normal' } = req.body;
      const { NotificationService } = require('../services/NotificationService');
      
      const notifications = await NotificationService.sendSystemAnnouncement(
        title, 
        message, 
        recipientIds, 
        priority
      );

      res.status(200).json({
        success: true,
        message: `System announcement sent to ${recipientIds.length} users`,
        data: { 
          count: notifications.length,
          notifications: notifications.map(n => n.getSummary())
        }
      });

    } catch (error) {
      console.error('System announcement webhook error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to send system announcement',
        error: error.message
      });
    }
  }
);

// ==========================================
// 🔧 TESTING ROUTES (Development Only)
// ==========================================

if (process.env.NODE_ENV === 'development') {
  
  // @route   POST /api/notifications/test/send-sample
  // @desc    Send sample notification for testing (Development only)
  // @access  Private (Any authenticated user)
  router.post('/test/send-sample', authenticateUser, async (req, res) => {
    try {
      const { NotificationService } = require('../services/NotificationService');
      
      const notification = await NotificationService.sendTeacherMessage(
        req.user._id, // sender
        req.user._id, // recipient (send to self for testing)
        'Test Notification',
        'This is a test notification from GyanGuru notification system. If you receive this, the system is working correctly!'
      );

      res.status(200).json({
        success: true,
        message: 'Test notification sent successfully',
        data: { notification: notification.getSummary() }
      });

    } catch (error) {
      console.error('Test notification error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to send test notification',
        error: error.message
      });
    }
  });

  // @route   GET /api/notifications/test/socket-status
  // @desc    Get socket connection status (Development only)
  // @access  Private (Any authenticated user)
  router.get('/test/socket-status', authenticateUser, (req, res) => {
    try {
      const SocketService = require('../services/SocketService');
      
      const status = {
        socketInitialized: !!global.io,
        connectedUsers: SocketService.getConnectedUsersCount(),
        usersByRole: SocketService.getConnectedUsersByRole(),
        userOnline: SocketService.isUserOnline(req.user._id.toString())
      };

      res.status(200).json({
        success: true,
        message: 'Socket status retrieved successfully',
        data: status
      });

    } catch (error) {
      console.error('Socket status error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get socket status',
        error: error.message
      });
    }
  });
}

module.exports = router;
