const nodemailer = require('nodemailer');
const Notification = require('../models/Notification');

// 🚀 GyanGuru Notification Service - Real-time Delivery System
// Features: Socket.io, Email, SMS, Push notifications

class NotificationService {
  
  // ==========================================
  // 📡 REAL-TIME SOCKET DELIVERY
  // ==========================================
  
  static async deliverNotification(notification) {
    try {
      console.log(`🚀 Delivering notification: ${notification._id}`);
      
      const deliveryResults = {
        inApp: false,
        email: false,
        sms: false,
        push: false
      };

      // 1. In-App Real-time Delivery (Socket.io)
      if (notification.channels.inApp.enabled) {
        deliveryResults.inApp = await this.deliverInApp(notification);
      }

      // 2. Email Delivery
      if (notification.channels.email.enabled) {
        deliveryResults.email = await this.deliverEmail(notification);
      }

      // 3. SMS Delivery (if enabled)
      if (notification.channels.sms.enabled) {
        deliveryResults.sms = await this.deliverSMS(notification);
      }

      // 4. Push Notification (if enabled)
      if (notification.channels.push.enabled) {
        deliveryResults.push = await this.deliverPush(notification);
      }

      // Update notification status
      await this.updateDeliveryStatus(notification, deliveryResults);

      console.log(`✅ Notification delivered:`, deliveryResults);
      return deliveryResults;

    } catch (error) {
      console.error('❌ Notification delivery error:', error);
      
      // Mark as failed
      notification.status = 'failed';
      notification.failureReason = error.message;
      await notification.save();
      
      throw error;
    }
  }

  // ==========================================
  // 📱 IN-APP REAL-TIME DELIVERY
  // ==========================================
  
  static async deliverInApp(notification) {
    try {
      if (!global.io) {
        console.log('⚠️ Socket.io not available');
        return false;
      }

      // Send to specific user room
      const userRoom = `user_${notification.recipient}`;
      
      const socketData = {
        _id: notification._id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        priority: notification.priority,
        icon: notification.icon,
        color: notification.color,
        category: notification.category,
        timeAgo: 'এখনই',
        data: notification.data,
        createdAt: notification.createdAt
      };

      // Emit to user's room
      global.io.to(userRoom).emit('new_notification', socketData);
      
      // Also emit unread count update
      const unreadCount = await Notification.getUnreadCount(notification.recipient);
      global.io.to(userRoom).emit('unread_count_update', { unreadCount });

      // Mark as delivered
      await notification.markAsDelivered('inApp');

      console.log(`📱 In-app notification delivered to: ${userRoom}`);
      return true;

    } catch (error) {
      console.error('❌ In-app delivery error:', error);
      return false;
    }
  }

  // ==========================================
  // 📧 EMAIL DELIVERY
  // ==========================================
  
  static async deliverEmail(notification) {
    try {
      // Get user email
      const User = require('../models/User');
      const user = await User.findById(notification.recipient);
      
      if (!user || !user.email) {
        console.log('⚠️ User email not found');
        return false;
      }

      // Send email using EmailService
      const emailSent = await EmailService.sendNotificationEmail(user, notification);
      
      if (emailSent) {
        await notification.markAsDelivered('email', emailSent.messageId);
        console.log(`📧 Email notification sent to: ${user.email}`);
        return true;
      }

      return false;

    } catch (error) {
      console.error('❌ Email delivery error:', error);
      return false;
    }
  }

  // ==========================================
  // 📱 SMS DELIVERY (Future Implementation)
  // ==========================================
  
  static async deliverSMS(notification) {
    try {
      // TODO: Implement SMS delivery using BD SMS services
      // For now, just log and return false
      console.log('📱 SMS delivery not implemented yet');
      return false;

    } catch (error) {
      console.error('❌ SMS delivery error:', error);
      return false;
    }
  }

  // ==========================================
  // 🔔 PUSH NOTIFICATION DELIVERY
  // ==========================================
  
  static async deliverPush(notification) {
    try {
      // TODO: Implement Push notification using Firebase
      // For now, just log and return false
      console.log('🔔 Push notification delivery not implemented yet');
      return false;

    } catch (error) {
      console.error('❌ Push delivery error:', error);
      return false;
    }
  }

  // ==========================================
  // 📊 DELIVERY STATUS UPDATE
  // ==========================================
  
  static async updateDeliveryStatus(notification, results) {
    try {
      let overallStatus = 'failed';
      
      // If any delivery method succeeded, mark as delivered
      if (Object.values(results).some(result => result === true)) {
        overallStatus = 'delivered';
      }

      // Update notification status
      notification.status = overallStatus;
      await notification.save();

      return overallStatus;

    } catch (error) {
      console.error('❌ Status update error:', error);
      throw error;
    }
  }

  // ==========================================
  // 🎯 BULK NOTIFICATION DELIVERY
  // ==========================================
  
  static async deliverBulkNotifications(notifications) {
    try {
      console.log(`🚀 Delivering ${notifications.length} bulk notifications`);

      const deliveryPromises = notifications.map(notification => 
        this.deliverNotification(notification)
      );

      const results = await Promise.allSettled(deliveryPromises);
      
      const successCount = results.filter(r => r.status === 'fulfilled').length;
      const failureCount = results.length - successCount;

      console.log(`✅ Bulk delivery completed: ${successCount} success, ${failureCount} failed`);

      return {
        total: notifications.length,
        success: successCount,
        failed: failureCount,
        results
      };

    } catch (error) {
      console.error('❌ Bulk delivery error:', error);
      throw error;
    }
  }

  // ==========================================
  // ⚡ QUICK NOTIFICATION HELPERS
  // ==========================================
  
  // Send grade published notification
  static async sendGradeNotification(assessmentId, studentId, gradeData) {
    try {
      const Assessment = require('../models/Assessment');
      const User = require('../models/User');

      const assessment = await Assessment.findById(assessmentId).populate('teacher');
      const student = await User.findById(studentId);

      if (!assessment || !student) {
        throw new Error('Assessment or student not found');
      }

      const notification = new Notification({
        recipient: studentId,
        sender: assessment.teacher._id,
        type: 'quiz_graded',
        title: '🎉 ফলাফল প্রকাশিত!',
        message: `আপনার "${assessment.title}" এর ফলাফল প্রকাশিত হয়েছে। স্কোর: ${gradeData.percentage}%`,
        priority: 'high',
        icon: 'check-circle',
        color: gradeData.percentage >= 80 ? 'green' : gradeData.percentage >= 60 ? 'yellow' : 'red',
        category: 'academic',
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
      await this.deliverNotification(notification);

      return notification;

    } catch (error) {
      console.error('❌ Grade notification error:', error);
      throw error;
    }
  }

  // Send assignment notification
  static async sendAssignmentNotification(assessmentId, studentIds) {
    try {
      const Assessment = require('../models/Assessment');
      
      const assessment = await Assessment.findById(assessmentId).populate('teacher');
      
      if (!assessment) {
        throw new Error('Assessment not found');
      }

      const notifications = [];

      for (const studentId of studentIds) {
        const notification = new Notification({
          recipient: studentId,
          sender: assessment.teacher._id,
          type: 'assignment_created',
          title: '📚 নতুন এসাইনমেন্ট!',
          message: `নতুন এসাইনমেন্ট "${assessment.title}" পাওয়া গেছে।`,
          priority: 'high',
          icon: 'calendar',
          color: 'blue',
          category: 'academic',
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
        });

        await notification.save();
        notifications.push(notification);
      }

      // Deliver all notifications
      await this.deliverBulkNotifications(notifications);

      return notifications;

    } catch (error) {
      console.error('❌ Assignment notification error:', error);
      throw error;
    }
  }

  // Send system announcement
  static async sendSystemAnnouncement(title, message, recipientIds, priority = 'normal') {
    try {
      const notifications = [];

      for (const recipientId of recipientIds) {
        const notification = new Notification({
          recipient: recipientId,
          sender: null, // System notification
          type: 'system_announcement',
          title: `📢 ${title}`,
          message: message,
          priority: priority,
          icon: 'info',
          color: 'blue',
          category: 'system',
          data: {
            metadata: { isSystemAnnouncement: true },
            actions: []
          },
          channels: {
            inApp: { enabled: true },
            email: { enabled: priority === 'urgent' }
          }
        });

        await notification.save();
        notifications.push(notification);
      }

      // Deliver all notifications
      await this.deliverBulkNotifications(notifications);

      return notifications;

    } catch (error) {
      console.error('❌ System announcement error:', error);
      throw error;
    }
  }

  // Send teacher message notification
  static async sendTeacherMessage(teacherId, studentId, title, message) {
    try {
      const notification = new Notification({
        recipient: studentId,
        sender: teacherId,
        type: 'teacher_message',
        title: `💬 ${title}`,
        message: message,
        priority: 'normal',
        icon: 'mail',
        color: 'blue',
        category: 'social',
        data: {
          metadata: { isTeacherMessage: true },
          actions: [{
            label: 'উত্তর দিন',
            action: 'reply_message',
            url: `/messages/${teacherId}`,
            style: 'primary'
          }]
        },
        channels: {
          inApp: { enabled: true },
          email: { enabled: false } // Optional email for messages
        }
      });

      await notification.save();
      await this.deliverNotification(notification);

      return notification;

    } catch (error) {
      console.error('❌ Teacher message notification error:', error);
      throw error;
    }
  }
}

// ==========================================
// 📧 EMAIL SERVICE
// ==========================================

class EmailService {
  
  static emailTransporter = null;

  // Initialize email transporter
  static initializeTransporter() {
    try {
      if (!process.env.SMTP_EMAIL || !process.env.SMTP_PASSWORD) {
        console.log('⚠️ Email configuration not found in environment variables');
        return false;
      }

      this.emailTransporter = nodemailer.createTransporter({
        service: 'gmail', // Use Gmail SMTP
        auth: {
          user: process.env.SMTP_EMAIL,
          pass: process.env.SMTP_PASSWORD // App password
        },
        secure: true
      });

      console.log('📧 Email transporter initialized');
      return true;

    } catch (error) {
      console.error('❌ Email transporter initialization failed:', error);
      return false;
    }
  }

  // Send notification email
  static async sendNotificationEmail(user, notification) {
    try {
      if (!this.emailTransporter) {
        this.initializeTransporter();
      }

      if (!this.emailTransporter) {
        console.log('⚠️ Email transporter not available');
        return false;
      }

      // Generate email content based on notification type
      const emailContent = this.generateEmailContent(notification);

      const mailOptions = {
        from: {
          name: 'GyanGuru',
          address: process.env.SMTP_EMAIL || 'noreply@gyanguru.com'
        },
        to: user.email,
        subject: `[GyanGuru] ${notification.title}`,
        html: emailContent,
        text: notification.message // Fallback text version
      };

      const result = await this.emailTransporter.sendMail(mailOptions);
      
      console.log(`📧 Email sent successfully: ${result.messageId}`);
      return result;

    } catch (error) {
      console.error('❌ Email sending error:', error);
      return false;
    }
  }

  // Generate email HTML content
  static generateEmailContent(notification) {
    const actionButtons = notification.data?.actions?.map(action => 
      `<a href="${action.url}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 5px;">${action.label}</a>`
    ).join('') || '';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>GyanGuru Notification</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0;">🎓 GyanGuru</h1>
            <p style="color: white; margin: 5px 0;">শিক্ষার নতুন দিগন্ত</p>
          </div>
          
          <div style="background: white; padding: 30px; border: 1px solid #ddd; border-radius: 0 0 10px 10px;">
            <h2 style="color: #333; margin-top: 0;">${notification.title}</h2>
            <p style="font-size: 16px; line-height: 1.8;">${notification.message}</p>
            
            ${actionButtons ? `
            <div style="margin: 30px 0; text-align: center;">
              ${actionButtons}
            </div>
            ` : ''}
            
            <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
            
            <p style="font-size: 14px; color: #666;">
              এই ইমেইলটি GyanGuru প্ল্যাটফর্ম থেকে স্বয়ংক্রিয়ভাবে পাঠানো হয়েছে।<br>
              যদি আপনার কোন প্রশ্ন থাকে, আমাদের সাথে যোগাযোগ করুন: support@gyanguru.com
            </p>
            
            <div style="text-align: center; margin-top: 20px;">
              <p style="font-size: 12px; color: #999;">
                © 2025 GyanGuru. সকল অধিকার সংরক্ষিত।
              </p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}

module.exports = {
  NotificationService,
  EmailService
};
