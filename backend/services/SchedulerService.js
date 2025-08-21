const cron = require('node-cron');
const Assessment = require('../models/Assessment');
const Notification = require('../models/Notification');
const { NotificationService } = require('./NotificationService');

// ⏰ GyanGuru Scheduler Service - Automated Notifications
// Features: Deadline reminders, System maintenance, Cleanup tasks

class SchedulerService {
  
  static scheduledJobs = new Map();

  // ==========================================
  // 🚀 INITIALIZE SCHEDULER
  // ==========================================
  
  static initialize() {
    try {
      console.log('⏰ Initializing scheduler service...');

      // Schedule deadline reminders
      this.scheduleDeadlineReminders();
      
      // Schedule notification cleanup
      this.scheduleNotificationCleanup();
      
      // Schedule daily analytics
      this.scheduleDailyAnalytics();

      // Schedule system health checks
      this.scheduleSystemHealthCheck();

      console.log('✅ Scheduler service initialized successfully');
      console.log(`📅 Active scheduled jobs: ${this.scheduledJobs.size}`);

    } catch (error) {
      console.error('❌ Scheduler initialization error:', error);
      throw error;
    }
  }

  // ==========================================
  // ⏰ DEADLINE REMINDER SCHEDULES
  // ==========================================
  
  static scheduleDeadlineReminders() {
    
    // Check every 30 minutes for upcoming deadlines
    const job1 = cron.schedule('*/30 * * * *', async () => {
      try {
        console.log('🔍 Checking for upcoming assessment deadlines...');
        await this.checkUpcomingDeadlines();
      } catch (error) {
        console.error('❌ Deadline check error:', error);
      }
    }, { scheduled: false });

    // Check every hour for urgent deadlines (6 hours remaining)
    const job2 = cron.schedule('0 * * * *', async () => {
      try {
        console.log('🚨 Checking for urgent deadlines...');
        await this.checkUrgentDeadlines();
      } catch (error) {
        console.error('❌ Urgent deadline check error:', error);
      }
    }, { scheduled: false });

    // Start the jobs
    job1.start();
    job2.start();

    this.scheduledJobs.set('deadline_check', job1);
    this.scheduledJobs.set('urgent_deadline_check', job2);

    console.log('⏰ Deadline reminder schedules set up successfully');
  }

  // ==========================================
  // 🔍 DEADLINE CHECKING LOGIC
  // ==========================================
  
  static async checkUpcomingDeadlines() {
    try {
      const now = new Date();
      const next24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const next48Hours = new Date(now.getTime() + 48 * 60 * 60 * 1000);

      // Find assessments ending in next 24-48 hours
      const upcomingAssessments = await Assessment.find({
        'timing.endDate': {
          $gte: next24Hours,
          $lte: next48Hours
        },
        status: 'published',
        'participants.assigned': { $exists: true, $not: { $size: 0 } }
      }).populate('teacher', 'name');

      console.log(`📋 Found ${upcomingAssessments.length} assessments with upcoming deadlines`);

      for (const assessment of upcomingAssessments) {
        await this.sendDeadlineReminders(assessment, 24);
      }

    } catch (error) {
      console.error('❌ Check upcoming deadlines error:', error);
    }
  }

  static async checkUrgentDeadlines() {
    try {
      const now = new Date();
      const next6Hours = new Date(now.getTime() + 6 * 60 * 60 * 1000);

      // Find assessments ending in next 6 hours
      const urgentAssessments = await Assessment.find({
        'timing.endDate': {
          $gte: now,
          $lte: next6Hours
        },
        status: 'published',
        'participants.assigned': { $exists: true, $not: { $size: 0 } }
      }).populate('teacher', 'name');

      console.log(`🚨 Found ${urgentAssessments.length} assessments with urgent deadlines`);

      for (const assessment of urgentAssessments) {
        await this.sendDeadlineReminders(assessment, 6);
      }

    } catch (error) {
      console.error('❌ Check urgent deadlines error:', error);
    }
  }

  static async sendDeadlineReminders(assessment, hoursRemaining) {
    try {
      // Get students who haven't submitted yet
      const pendingStudents = assessment.participants.assigned.filter(
        participant => participant.status === 'assigned' || participant.status === 'started'
      );

      if (pendingStudents.length === 0) {
        console.log(`✅ All students have submitted for assessment: ${assessment.title}`);
        return;
      }

      // Check if we already sent reminders for this timeframe
      const existingReminders = await Notification.find({
        type: 'assignment_due',
        'data.assessmentId': assessment._id,
        'data.metadata.hoursRemaining': hoursRemaining,
        createdAt: { $gte: new Date(Date.now() - 2 * 60 * 60 * 1000) } // Last 2 hours
      });

      if (existingReminders.length > 0) {
        console.log(`⚠️ Reminders already sent for assessment: ${assessment.title} (${hoursRemaining}h)`);
        return;
      }

      // Create reminder notifications
      const notifications = [];

      for (const participant of pendingStudents) {
        const notification = new Notification({
          recipient: participant.studentId,
          sender: assessment.teacher._id,
          type: 'assignment_due',
          title: '⏰ ডেডলাইন রিমাইন্ডার!',
          message: `"${assessment.title}" এর জমা দেওয়ার সময় ${hoursRemaining} ঘণ্টা বাকি আছে। এখনই সম্পন্ন করুন।`,
          priority: hoursRemaining <= 6 ? 'urgent' : 'high',
          icon: 'alert-triangle',
          color: hoursRemaining <= 6 ? 'red' : 'yellow',
          category: 'reminder',
          data: {
            assessmentId: assessment._id,
            metadata: {
              dueDate: assessment.timing?.endDate,
              hoursRemaining,
              reminderType: hoursRemaining <= 6 ? 'urgent' : 'normal'
            },
            actions: [{
              label: hoursRemaining <= 6 ? 'এখনই সম্পন্ন করুন' : 'এসাইনমেন্ট দেখুন',
              action: 'complete_assessment',
              url: `/assessments/${assessment._id}`,
              style: hoursRemaining <= 6 ? 'danger' : 'warning'
            }]
          },
          channels: {
            inApp: { enabled: true },
            email: { enabled: true },
            sms: { enabled: hoursRemaining <= 6 } // SMS for urgent only
          }
        });

        notifications.push(notification);
      }

      // Save all notifications
      const savedNotifications = await Notification.insertMany(notifications);

      // Send notifications through delivery service
      await NotificationService.deliverBulkNotifications(savedNotifications);

      console.log(`✅ Sent ${notifications.length} deadline reminders for "${assessment.title}" (${hoursRemaining}h remaining)`);

    } catch (error) {
      console.error('❌ Send deadline reminders error:', error);
    }
  }

  // ==========================================
  // 🧹 CLEANUP SCHEDULES
  // ==========================================
  
  static scheduleNotificationCleanup() {
    
    // Clean up expired notifications daily at 2 AM
    const cleanupJob = cron.schedule('0 2 * * *', async () => {
      try {
        console.log('🧹 Starting notification cleanup...');
        await this.cleanupExpiredNotifications();
      } catch (error) {
        console.error('❌ Notification cleanup error:', error);
      }
    }, { scheduled: false });

    cleanupJob.start();
    this.scheduledJobs.set('notification_cleanup', cleanupJob);

    console.log('🧹 Notification cleanup schedule set up successfully');
  }

  static async cleanupExpiredNotifications() {
    try {
      const now = new Date();
      
      // Delete expired and read notifications
      const deleteResult = await Notification.deleteMany({
        $or: [
          { expiresAt: { $lt: now } },
          { 
            isRead: true, 
            readAt: { $lt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) } // 30 days old read notifications
          }
        ]
      });

      console.log(`🧹 Cleaned up ${deleteResult.deletedCount} expired notifications`);

      // Update delivery statistics
      const failedNotifications = await Notification.updateMany(
        {
          status: 'pending',
          createdAt: { $lt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) } // 7 days old
        },
        {
          $set: {
            status: 'failed',
            failureReason: 'Expired pending notification'
          }
        }
      );

      console.log(`🧹 Marked ${failedNotifications.modifiedCount} old pending notifications as failed`);

    } catch (error) {
      console.error('❌ Cleanup expired notifications error:', error);
    }
  }

  // ==========================================
  // 📊 ANALYTICS SCHEDULES
  // ==========================================
  
  static scheduleDailyAnalytics() {
    
    // Generate daily analytics at 1 AM
    const analyticsJob = cron.schedule('0 1 * * *', async () => {
      try {
        console.log('📊 Generating daily analytics...');
        await this.generateDailyAnalytics();
      } catch (error) {
        console.error('❌ Daily analytics error:', error);
      }
    }, { scheduled: false });

    analyticsJob.start();
    this.scheduledJobs.set('daily_analytics', analyticsJob);

    console.log('📊 Daily analytics schedule set up successfully');
  }

  static async generateDailyAnalytics() {
    try {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Get notification statistics for yesterday
      const dailyStats = await Notification.aggregate([
        {
          $match: {
            createdAt: {
              $gte: yesterday,
              $lt: today
            }
          }
        },
        {
          $group: {
            _id: null,
            totalNotifications: { $sum: 1 },
            deliveredCount: { $sum: { $cond: [{ $eq: ['$status', 'delivered'] }, 1, 0] } },
            readCount: { $sum: { $cond: [{ $eq: ['$isRead', true] }, 1, 0] } },
            byType: {
              $push: {
                type: '$type',
                delivered: { $eq: ['$status', 'delivered'] },
                read: '$isRead'
              }
            },
            byPriority: {
              $push: {
                priority: '$priority',
                delivered: { $eq: ['$status', 'delivered'] }
              }
            }
          }
        }
      ]);

      if (dailyStats.length > 0) {
        const stats = dailyStats[0];
        const deliveryRate = ((stats.deliveredCount / stats.totalNotifications) * 100).toFixed(2);
        const readRate = ((stats.readCount / stats.totalNotifications) * 100).toFixed(2);

        console.log(`📊 Daily Analytics (${yesterday.toDateString()}):
          Total Notifications: ${stats.totalNotifications}
          Delivery Rate: ${deliveryRate}%
          Read Rate: ${readRate}%
        `);

        // Store analytics in database or send to admin dashboard
        // Implementation depends on requirements
      }

    } catch (error) {
      console.error('❌ Generate daily analytics error:', error);
    }
  }

  // ==========================================
  // 🏥 SYSTEM HEALTH CHECK
  // ==========================================
  
  static scheduleSystemHealthCheck() {
    
    // System health check every 15 minutes
    const healthCheckJob = cron.schedule('*/15 * * * *', async () => {
      try {
        await this.performSystemHealthCheck();
      } catch (error) {
        console.error('❌ System health check error:', error);
      }
    }, { scheduled: false });

    healthCheckJob.start();
    this.scheduledJobs.set('health_check', healthCheckJob);

    console.log('🏥 System health check schedule set up successfully');
  }

  static async performSystemHealthCheck() {
    try {
      const issues = [];

      // Check for stuck notifications (pending for more than 1 hour)
      const stuckNotifications = await Notification.countDocuments({
        status: 'pending',
        createdAt: { $lt: new Date(Date.now() - 60 * 60 * 1000) }
      });

      if (stuckNotifications > 0) {
        issues.push(`${stuckNotifications} notifications stuck in pending status`);
      }

      // Check for high failure rate (more than 10% in last hour)
      const recentNotifications = await Notification.countDocuments({
        createdAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) }
      });

      const failedNotifications = await Notification.countDocuments({
        status: 'failed',
        createdAt: { $gte: new Date(Date.now() - 60 * 60 * 1000) }
      });

      if (recentNotifications > 0) {
        const failureRate = (failedNotifications / recentNotifications) * 100;
        if (failureRate > 10) {
          issues.push(`High notification failure rate: ${failureRate.toFixed(2)}%`);
        }
      }

      // Check socket.io health
      if (!global.io) {
        issues.push('Socket.io not initialized');
      }

      // Log health status
      if (issues.length > 0) {
        console.log(`🚨 System health issues detected:`, issues);
        
        // TODO: Send alert to admins
        // await this.sendHealthAlert(issues);
      } else {
        console.log('✅ System health check passed');
      }

    } catch (error) {
      console.error('❌ System health check error:', error);
    }
  }

  // ==========================================
  // 🛠️ SCHEDULER MANAGEMENT
  // ==========================================
  
  // Stop all scheduled jobs
  static stopAllJobs() {
    try {
      this.scheduledJobs.forEach((job, name) => {
        job.stop();
        console.log(`⏹️ Stopped scheduled job: ${name}`);
      });

      this.scheduledJobs.clear();
      console.log('✅ All scheduled jobs stopped');

    } catch (error) {
      console.error('❌ Stop jobs error:', error);
    }
  }

  // Get job status
  static getJobStatus() {
    const status = {};
    
    this.scheduledJobs.forEach((job, name) => {
      status[name] = {
        running: job.running,
        scheduled: job.scheduled
      };
    });

    return status;
  }

  // Manually trigger deadline check
  static async triggerDeadlineCheck() {
    try {
      console.log('🔧 Manually triggering deadline check...');
      await this.checkUpcomingDeadlines();
      await this.checkUrgentDeadlines();
      console.log('✅ Manual deadline check completed');
    } catch (error) {
      console.error('❌ Manual deadline check error:', error);
      throw error;
    }
  }
}

module.exports = SchedulerService;
