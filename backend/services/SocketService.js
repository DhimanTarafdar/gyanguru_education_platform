const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Notification = require('../models/Notification');

// 🔌 GyanGuru Socket.io Service - Real-time Features
// Features: Live notifications, Real-time updates, User presence

class SocketService {
  
  static io = null;
  static connectedUsers = new Map(); // userId -> { socketId, userInfo, lastSeen }

  // ==========================================
  // 🚀 INITIALIZE SOCKET.IO SERVER
  // ==========================================
  
  static initialize(httpServer) {
    try {
      this.io = new Server(httpServer, {
        cors: {
          origin: process.env.FRONTEND_URL || "http://localhost:3000",
          methods: ["GET", "POST"],
          credentials: true
        },
        pingTimeout: 60000,
        pingInterval: 25000
      });

      // Make io globally available for notification service
      global.io = this.io;

      // Setup authentication middleware
      this.io.use(this.authenticateSocket);

      // Setup connection handler
      this.io.on('connection', this.handleConnection);

      console.log('🔌 Socket.io server initialized successfully');
      return this.io;

    } catch (error) {
      console.error('❌ Socket.io initialization error:', error);
      throw error;
    }
  }

  // ==========================================
  // 🔐 SOCKET AUTHENTICATION
  // ==========================================
  
  static async authenticateSocket(socket, next) {
    try {
      const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
      
      if (!token) {
        // Allow anonymous connections for public features
        socket.userId = null;
        socket.user = null;
        console.log(`🔓 Anonymous socket connected: ${socket.id}`);
        return next();
      }

      // Verify JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      // Get user from database
      const user = await User.findById(decoded.id).select('-password -refreshTokens');
      
      if (!user || !user.isActive) {
        return next(new Error('Authentication failed: User not found or inactive'));
      }

      // Attach user to socket
      socket.userId = user._id.toString();
      socket.user = user;

      console.log(`🔐 Authenticated socket: ${socket.id} for user: ${user.name} (${user.role})`);
      next();

    } catch (error) {
      console.error('❌ Socket authentication error:', error);
      next(new Error('Authentication failed: Invalid token'));
    }
  }

  // ==========================================
  // 🔗 CONNECTION HANDLER
  // ==========================================
  
  static handleConnection = (socket) => {
    try {
      console.log(`🔗 Socket connected: ${socket.id}`);

      // Handle authenticated users
      if (socket.userId) {
        this.handleUserConnection(socket);
      }

      // Setup event listeners
      this.setupSocketEvents(socket);

      // Handle disconnection
      socket.on('disconnect', () => this.handleDisconnection(socket));

    } catch (error) {
      console.error('❌ Connection handling error:', error);
      socket.emit('error', { message: 'Connection handling failed' });
    }
  };

  // ==========================================
  // 👤 USER CONNECTION MANAGEMENT
  // ==========================================
  
  static handleUserConnection(socket) {
    try {
      const userId = socket.userId;
      const user = socket.user;

      // Join user-specific room
      socket.join(`user_${userId}`);
      
      // Join role-specific room
      socket.join(`role_${user.role}`);

      // Store user connection info
      this.connectedUsers.set(userId, {
        socketId: socket.id,
        userInfo: {
          _id: userId,
          name: user.name,
          role: user.role,
          avatar: user.avatar
        },
        connectedAt: new Date(),
        lastSeen: new Date()
      });

      // Update user's online status
      this.updateUserOnlineStatus(userId, true);

      // Send pending notifications
      this.sendPendingNotifications(userId);

      // Emit user connected event
      socket.emit('user_connected', {
        message: 'Successfully connected to real-time service',
        userId: userId,
        timestamp: new Date()
      });

      // Notify about unread notifications
      this.sendUnreadCount(userId);

      console.log(`👤 User ${user.name} (${user.role}) connected to room: user_${userId}`);

    } catch (error) {
      console.error('❌ User connection error:', error);
    }
  }

  // ==========================================
  // 📡 SOCKET EVENT HANDLERS
  // ==========================================
  
  static setupSocketEvents(socket) {
    
    // Handle notification read
    socket.on('mark_notification_read', async (data) => {
      try {
        if (!socket.userId) return;

        const { notificationId } = data;
        
        const notification = await Notification.findOne({
          _id: notificationId,
          recipient: socket.userId
        });

        if (notification && !notification.isRead) {
          await notification.markAsRead({
            platform: 'web',
            browser: socket.handshake.headers['user-agent']
          });

          // Send updated unread count
          this.sendUnreadCount(socket.userId);

          socket.emit('notification_marked_read', {
            notificationId,
            success: true
          });
        }

      } catch (error) {
        console.error('❌ Mark notification read error:', error);
        socket.emit('notification_marked_read', {
          notificationId: data.notificationId,
          success: false,
          error: error.message
        });
      }
    });

    // Handle mark all notifications as read
    socket.on('mark_all_notifications_read', async () => {
      try {
        if (!socket.userId) return;

        await Notification.updateMany(
          {
            recipient: socket.userId,
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

        // Send updated unread count (should be 0)
        this.sendUnreadCount(socket.userId);

        socket.emit('all_notifications_marked_read', {
          success: true,
          unreadCount: 0
        });

      } catch (error) {
        console.error('❌ Mark all notifications read error:', error);
        socket.emit('all_notifications_marked_read', {
          success: false,
          error: error.message
        });
      }
    });

    // Handle user presence updates
    socket.on('user_activity', () => {
      if (socket.userId) {
        this.updateUserLastSeen(socket.userId);
      }
    });

    // Handle ping for connection health
    socket.on('ping', () => {
      socket.emit('pong', { timestamp: Date.now() });
    });

    // Handle join assessment room (for live monitoring)
    socket.on('join_assessment', (data) => {
      if (socket.userId) {
        const { assessmentId } = data;
        socket.join(`assessment_${assessmentId}`);
        console.log(`📚 User ${socket.userId} joined assessment room: ${assessmentId}`);
      }
    });

    // Handle leave assessment room
    socket.on('leave_assessment', (data) => {
      if (socket.userId) {
        const { assessmentId } = data;
        socket.leave(`assessment_${assessmentId}`);
        console.log(`📚 User ${socket.userId} left assessment room: ${assessmentId}`);
      }
    });

    // ==========================================
    // 💬 COMMUNICATION EVENT HANDLERS
    // ==========================================

    // Join conversation room
    socket.on('join_conversation', (data) => {
      if (socket.userId) {
        const { conversationId } = data;
        socket.join(`conversation_${conversationId}`);
        console.log(`💬 User ${socket.userId} joined conversation: ${conversationId}`);
        
        // Notify other participants
        socket.to(`conversation_${conversationId}`).emit('user_joined_conversation', {
          userId: socket.userId,
          userName: socket.user.name,
          timestamp: new Date()
        });
      }
    });

    // Leave conversation room
    socket.on('leave_conversation', (data) => {
      if (socket.userId) {
        const { conversationId } = data;
        socket.leave(`conversation_${conversationId}`);
        console.log(`💬 User ${socket.userId} left conversation: ${conversationId}`);
        
        // Notify other participants
        socket.to(`conversation_${conversationId}`).emit('user_left_conversation', {
          userId: socket.userId,
          userName: socket.user.name,
          timestamp: new Date()
        });
      }
    });

    // Handle typing indicators
    socket.on('typing_start', (data) => {
      if (socket.userId) {
        const { conversationId } = data;
        socket.to(`conversation_${conversationId}`).emit('user_typing', {
          userId: socket.userId,
          userName: socket.user.name,
          conversationId,
          timestamp: new Date()
        });
      }
    });

    socket.on('typing_stop', (data) => {
      if (socket.userId) {
        const { conversationId } = data;
        socket.to(`conversation_${conversationId}`).emit('user_stopped_typing', {
          userId: socket.userId,
          conversationId,
          timestamp: new Date()
        });
      }
    });

    // Handle message delivery confirmation
    socket.on('message_delivered', (data) => {
      if (socket.userId) {
        const { messageId, conversationId } = data;
        socket.to(`conversation_${conversationId}`).emit('message_delivery_confirmed', {
          messageId,
          deliveredBy: socket.userId,
          timestamp: new Date()
        });
      }
    });

    // Handle online presence in conversation
    socket.on('conversation_presence', (data) => {
      if (socket.userId) {
        const { conversationId, status } = data; // status: 'active', 'away', 'busy'
        socket.to(`conversation_${conversationId}`).emit('participant_presence_updated', {
          userId: socket.userId,
          status,
          timestamp: new Date()
        });
      }
    });

    // Handle custom events
    socket.on('custom_event', (data) => {
      try {
        console.log('🎯 Custom event received:', data);
        
        // Process custom events based on type
        this.handleCustomEvent(socket, data);
        
      } catch (error) {
        console.error('❌ Custom event error:', error);
      }
    });
  }

  // ==========================================
  // 🔌 DISCONNECTION HANDLER
  // ==========================================
  
  static handleDisconnection(socket) {
    try {
      console.log(`🔌 Socket disconnected: ${socket.id}`);

      if (socket.userId) {
        // Update last seen
        this.updateUserLastSeen(socket.userId);
        
        // Update online status after delay (user might reconnect quickly)
        setTimeout(() => {
          this.updateUserOnlineStatus(socket.userId, false);
        }, 30000); // 30 seconds delay

        // Remove from connected users
        this.connectedUsers.delete(socket.userId);

        console.log(`👤 User ${socket.userId} disconnected`);
      }

    } catch (error) {
      console.error('❌ Disconnection handling error:', error);
    }
  }

  // ==========================================
  // 📢 NOTIFICATION BROADCASTING
  // ==========================================
  
  // Send notification to specific user
  static sendNotificationToUser(userId, notification) {
    try {
      this.io.to(`user_${userId}`).emit('new_notification', {
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
      });

      console.log(`📢 Notification sent to user: ${userId}`);
      return true;

    } catch (error) {
      console.error('❌ Send notification error:', error);
      return false;
    }
  }

  // Broadcast to all users of specific role
  static broadcastToRole(role, event, data) {
    try {
      this.io.to(`role_${role}`).emit(event, data);
      console.log(`📡 Broadcasted "${event}" to all ${role}s`);
      return true;

    } catch (error) {
      console.error('❌ Broadcast error:', error);
      return false;
    }
  }

  // Send system announcement to all users
  static sendSystemAnnouncement(announcement) {
    try {
      this.io.emit('system_announcement', {
        title: announcement.title,
        message: announcement.message,
        priority: announcement.priority,
        timestamp: new Date()
      });

      console.log('📡 System announcement broadcasted to all users');
      return true;

    } catch (error) {
      console.error('❌ System announcement error:', error);
      return false;
    }
  }

  // ==========================================
  // 🔄 UTILITY METHODS
  // ==========================================
  
  // Send pending notifications to user
  static async sendPendingNotifications(userId) {
    try {
      const pendingNotifications = await Notification.find({
        recipient: userId,
        status: 'pending',
        scheduledFor: { $lte: new Date() }
      }).limit(10);

      for (const notification of pendingNotifications) {
        this.sendNotificationToUser(userId, notification);
        
        // Mark as delivered
        notification.status = 'delivered';
        await notification.save();
      }

      console.log(`📬 Sent ${pendingNotifications.length} pending notifications to user: ${userId}`);

    } catch (error) {
      console.error('❌ Send pending notifications error:', error);
    }
  }

  // Send unread count to user
  static async sendUnreadCount(userId) {
    try {
      const unreadCount = await Notification.getUnreadCount(userId);
      
      this.io.to(`user_${userId}`).emit('unread_count_update', {
        unreadCount,
        timestamp: new Date()
      });

    } catch (error) {
      console.error('❌ Send unread count error:', error);
    }
  }

  // Update user online status
  static updateUserOnlineStatus(userId, isOnline) {
    try {
      // Update in database if needed
      // For now, just log
      console.log(`👤 User ${userId} is now ${isOnline ? 'online' : 'offline'}`);
      
      // Emit presence update to relevant rooms
      this.io.emit('user_presence_update', {
        userId,
        isOnline,
        timestamp: new Date()
      });

    } catch (error) {
      console.error('❌ Update online status error:', error);
    }
  }

  // Update user last seen
  static updateUserLastSeen(userId) {
    try {
      const userConnection = this.connectedUsers.get(userId);
      if (userConnection) {
        userConnection.lastSeen = new Date();
        this.connectedUsers.set(userId, userConnection);
      }

    } catch (error) {
      console.error('❌ Update last seen error:', error);
    }
  }

  // Handle custom events
  static handleCustomEvent(socket, data) {
    try {
      const { type, payload } = data;

      switch (type) {
        case 'assessment_progress':
          // Handle assessment progress updates
          this.handleAssessmentProgress(socket, payload);
          break;

        case 'chat_message':
          // Handle chat messages
          this.handleChatMessage(socket, payload);
          break;

        case 'typing_indicator':
          // Handle typing indicators
          this.handleTypingIndicator(socket, payload);
          break;

        default:
          console.log(`🤷 Unknown custom event type: ${type}`);
      }

    } catch (error) {
      console.error('❌ Custom event handling error:', error);
    }
  }

  // Get connected users count
  static getConnectedUsersCount() {
    return this.connectedUsers.size;
  }

  // Get connected users by role
  static getConnectedUsersByRole() {
    const usersByRole = {
      student: 0,
      teacher: 0,
      admin: 0
    };

    this.connectedUsers.forEach(user => {
      if (user.userInfo && user.userInfo.role) {
        usersByRole[user.userInfo.role]++;
      }
    });

    return usersByRole;
  }

  // Check if user is online
  static isUserOnline(userId) {
    return this.connectedUsers.has(userId);
  }

  // ==========================================
  // 💬 COMMUNICATION HELPER METHODS
  // ==========================================

  // Send new message to conversation participants
  static sendNewMessage(conversationId, message, senderInfo) {
    try {
      if (!this.io) return;

      this.io.to(`conversation_${conversationId}`).emit('new_message', {
        message,
        sender: senderInfo,
        conversationId,
        timestamp: new Date()
      });

      console.log(`💬 New message sent to conversation: ${conversationId}`);

    } catch (error) {
      console.error('❌ Send new message error:', error);
    }
  }

  // Send message update (edit/delete)
  static sendMessageUpdate(conversationId, messageId, updateType, updateData) {
    try {
      if (!this.io) return;

      this.io.to(`conversation_${conversationId}`).emit('message_updated', {
        messageId,
        updateType, // 'edited', 'deleted', 'reaction_added', etc.
        updateData,
        conversationId,
        timestamp: new Date()
      });

      console.log(`💬 Message update sent to conversation: ${conversationId}`);

    } catch (error) {
      console.error('❌ Send message update error:', error);
    }
  }

  // Send conversation update
  static sendConversationUpdate(conversationId, updateType, updateData) {
    try {
      if (!this.io) return;

      this.io.to(`conversation_${conversationId}`).emit('conversation_updated', {
        conversationId,
        updateType, // 'participant_added', 'participant_removed', 'title_changed', etc.
        updateData,
        timestamp: new Date()
      });

      console.log(`💬 Conversation update sent: ${conversationId}`);

    } catch (error) {
      console.error('❌ Send conversation update error:', error);
    }
  }

  // Send new question to relevant users
  static sendNewQuestion(question, targetUsers = []) {
    try {
      if (!this.io) return;

      const questionData = {
        question,
        timestamp: new Date()
      };

      // Send to specific users if provided
      if (targetUsers.length > 0) {
        targetUsers.forEach(userId => {
          this.io.to(`user_${userId}`).emit('new_question', questionData);
        });
      } else {
        // Send to all teachers
        this.io.to('role_teacher').emit('new_question', questionData);
      }

      console.log(`❓ New question broadcasted to ${targetUsers.length || 'all'} teachers`);

    } catch (error) {
      console.error('❌ Send new question error:', error);
    }
  }

  // Send new answer notification
  static sendNewAnswer(questionId, answer, questionAuthor) {
    try {
      if (!this.io) return;

      const answerData = {
        questionId,
        answer,
        timestamp: new Date()
      };

      // Send to question author
      this.io.to(`user_${questionAuthor}`).emit('new_answer', answerData);

      // Send to conversation participants if in a conversation
      if (answer.conversationId) {
        this.io.to(`conversation_${answer.conversationId}`).emit('new_answer', answerData);
      }

      console.log(`💡 New answer sent for question: ${questionId}`);

    } catch (error) {
      console.error('❌ Send new answer error:', error);
    }
  }

  // Send announcement to target audience
  static sendAnnouncement(announcement, targetAudience = 'all') {
    try {
      if (!this.io) return;

      const announcementData = {
        announcement,
        timestamp: new Date()
      };

      if (targetAudience === 'all') {
        this.io.emit('new_announcement', announcementData);
      } else if (Array.isArray(targetAudience)) {
        // Send to specific users
        targetAudience.forEach(userId => {
          this.io.to(`user_${userId}`).emit('new_announcement', announcementData);
        });
      } else {
        // Send to specific role
        this.io.to(`role_${targetAudience}`).emit('new_announcement', announcementData);
      }

      console.log(`📢 Announcement sent to: ${targetAudience}`);

    } catch (error) {
      console.error('❌ Send announcement error:', error);
    }
  }

  // Get online participants in a conversation
  static getOnlineParticipants(participantIds) {
    try {
      const onlineParticipants = participantIds.filter(userId => 
        this.connectedUsers.has(userId.toString())
      );

      return onlineParticipants.map(userId => ({
        userId,
        ...this.connectedUsers.get(userId.toString())
      }));

    } catch (error) {
      console.error('❌ Get online participants error:', error);
      return [];
    }
  }

  // Send read receipt to conversation
  static sendReadReceipt(conversationId, messageId, readBy) {
    try {
      if (!this.io) return;

      this.io.to(`conversation_${conversationId}`).emit('message_read', {
        messageId,
        readBy,
        timestamp: new Date()
      });

    } catch (error) {
      console.error('❌ Send read receipt error:', error);
    }
  }
}

module.exports = SocketService;
