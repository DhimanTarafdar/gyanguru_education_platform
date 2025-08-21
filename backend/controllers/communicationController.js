const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const User = require('../models/User');
const { NotificationService } = require('../services/NotificationService');
const SocketService = require('../services/SocketService');
const path = require('path');
const fs = require('fs');

// 💬 GyanGuru Communication Controller
// Features: Private chat, Group discussions, Q&A sessions, Announcements

// ==========================================
// 💬 CONVERSATION MANAGEMENT
// ==========================================

// Get all conversations for a user
const getUserConversations = async (req, res) => {
  try {
    const userId = req.user._id;
    const { page = 1, limit = 20, type = null } = req.query;

    console.log(`💬 Getting conversations for user: ${userId}`);

    let query = {
      'participants.user': userId,
      'participants.isActive': true,
      isActive: true
    };

    if (type) {
      query.conversationType = type;
    }

    const conversations = await Conversation.find(query)
      .populate('participants.user', 'name email avatar role')
      .populate('lastMessage.sender', 'name avatar')
      .populate('createdBy', 'name avatar role')
      .sort({ lastActivity: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    // Get unread count for each conversation
    const conversationsWithUnread = await Promise.all(
      conversations.map(async (conv) => {
        const unreadCount = await Message.countDocuments({
          conversationId: conv._id,
          'recipients.user': userId,
          'recipients.readAt': null,
          isDeleted: false
        });

        return {
          ...conv.toObject(),
          unreadCount,
          displayName: conv.conversationType === 'private' && conv.participants.length === 2 
            ? conv.participants.find(p => p.user._id.toString() !== userId.toString())?.user.name || 'Private Chat'
            : conv.displayName
        };
      })
    );

    // Get total conversations count
    const totalConversations = await Conversation.countDocuments(query);

    console.log(`✅ Found ${conversations.length} conversations`);

    res.status(200).json({
      success: true,
      message: 'Conversations retrieved successfully',
      data: {
        conversations: conversationsWithUnread,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalConversations / limit),
          totalConversations,
          hasNextPage: page * limit < totalConversations,
          hasPrevPage: page > 1
        }
      }
    });

  } catch (error) {
    console.error('❌ Get conversations error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while retrieving conversations',
      error: error.message
    });
  }
};

// Create new conversation
const createConversation = async (req, res) => {
  try {
    const userId = req.user._id;
    const {
      title,
      description,
      conversationType,
      participants = [],
      academicContext = {},
      settings = {}
    } = req.body;

    console.log(`💬 Creating new conversation: ${conversationType}`);

    // Validation
    if (!conversationType) {
      return res.status(400).json({
        success: false,
        message: 'Conversation type is required'
      });
    }

    // For private conversations, ensure only 2 participants
    if (conversationType === 'private') {
      if (participants.length !== 1) {
        return res.status(400).json({
          success: false,
          message: 'Private conversations must have exactly one other participant'
        });
      }

      // Check if private conversation already exists
      const existingConversation = await Conversation.findOne({
        conversationType: 'private',
        'participants.user': { $all: [userId, participants[0]] },
        'participants.isActive': true,
        isActive: true
      });

      if (existingConversation) {
        return res.status(200).json({
          success: true,
          message: 'Private conversation already exists',
          data: { conversation: existingConversation }
        });
      }
    }

    // Create conversation
    const conversation = new Conversation({
      title,
      description,
      conversationType,
      createdBy: userId,
      academicContext,
      settings: {
        isPrivate: conversationType === 'private',
        joinPolicy: conversationType === 'private' ? 'closed' : 'open',
        maxParticipants: conversationType === 'private' ? 2 : 100,
        ...settings
      }
    });

    // Add creator as admin
    conversation.participants.push({
      user: userId,
      role: 'admin',
      joinedAt: new Date(),
      isActive: true,
      permissions: {
        canSendMessage: true,
        canShareFiles: true,
        canAddMembers: true,
        canRemoveMembers: true,
        canManageSettings: true
      }
    });

    // Add other participants
    for (const participantId of participants) {
      if (participantId !== userId.toString()) {
        conversation.participants.push({
          user: participantId,
          role: 'member',
          joinedAt: new Date(),
          isActive: true
        });
      }
    }

    await conversation.save();

    // Populate the created conversation
    await conversation.populate([
      { path: 'participants.user', select: 'name email avatar role' },
      { path: 'createdBy', select: 'name avatar role' }
    ]);

    // Send notifications to participants
    for (const participant of conversation.participants) {
      if (participant.user._id.toString() !== userId.toString()) {
        await NotificationService.sendNotification({
          recipient: participant.user._id,
          type: 'conversation_invite',
          title: 'New Conversation',
          message: `${req.user.name} added you to a conversation`,
          data: {
            conversationId: conversation._id,
            conversationType,
            invitedBy: userId
          }
        });
      }
    }

    console.log(`✅ Conversation created successfully: ${conversation._id}`);

    res.status(201).json({
      success: true,
      message: 'Conversation created successfully',
      data: { conversation }
    });

  } catch (error) {
    console.error('❌ Create conversation error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating conversation',
      error: error.message
    });
  }
};

// Get conversation details
const getConversationDetails = async (req, res) => {
  try {
    const userId = req.user._id;
    const { conversationId } = req.params;

    console.log(`💬 Getting conversation details: ${conversationId}`);

    const conversation = await Conversation.findOne({
      _id: conversationId,
      'participants.user': userId,
      'participants.isActive': true,
      isActive: true
    })
    .populate('participants.user', 'name email avatar role lastSeen')
    .populate('createdBy', 'name avatar role')
    .populate('lastMessage.sender', 'name avatar');

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found or access denied'
      });
    }

    // Get user's role in conversation
    const userParticipant = conversation.participants.find(
      p => p.user._id.toString() === userId.toString()
    );

    // Get recent messages count
    const recentMessagesCount = await Message.countDocuments({
      conversationId: conversation._id,
      isDeleted: false
    });

    // Get unread messages count
    const unreadCount = await Message.countDocuments({
      conversationId: conversation._id,
      'recipients.user': userId,
      'recipients.readAt': null,
      isDeleted: false
    });

    const conversationDetails = {
      ...conversation.toObject(),
      userRole: userParticipant?.role,
      userPermissions: userParticipant?.permissions,
      totalMessages: recentMessagesCount,
      unreadCount,
      displayName: conversation.conversationType === 'private' && conversation.participants.length === 2 
        ? conversation.participants.find(p => p.user._id.toString() !== userId.toString())?.user.name || 'Private Chat'
        : conversation.displayName
    };

    console.log(`✅ Conversation details retrieved`);

    res.status(200).json({
      success: true,
      message: 'Conversation details retrieved successfully',
      data: { conversation: conversationDetails }
    });

  } catch (error) {
    console.error('❌ Get conversation details error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while retrieving conversation details',
      error: error.message
    });
  }
};

// ==========================================
// 📨 MESSAGE MANAGEMENT
// ==========================================

// Send message
const sendMessage = async (req, res) => {
  try {
    const userId = req.user._id;
    const { conversationId } = req.params;
    const {
      messageType = 'text',
      content = {},
      replyTo = null,
      isPrivate = false,
      isAnonymous = false,
      scheduledFor = null
    } = req.body;

    console.log(`📨 Sending message to conversation: ${conversationId}`);

    // Get conversation and validate access
    const conversation = await Conversation.findOne({
      _id: conversationId,
      isActive: true
    }).populate('participants.user', 'name email avatar');

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    // Check if user can send message
    if (!conversation.canUserSendMessage(userId)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to send messages in this conversation'
      });
    }

    // Validate message content
    if (!content.text && !req.files?.length) {
      return res.status(400).json({
        success: false,
        message: 'Message content or attachment is required'
      });
    }

    // Prepare recipients (all active participants except sender)
    const recipients = conversation.participants
      .filter(p => p.isActive && p.user._id.toString() !== userId.toString())
      .map(p => ({
        user: p.user._id,
        deliveredAt: new Date()
      }));

    // Create message
    const message = new Message({
      conversationId: conversation._id,
      sender: userId,
      recipients,
      messageType,
      content,
      replyTo,
      isPrivate,
      isAnonymous,
      scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
      isScheduled: !!scheduledFor,
      deliveryStatus: 'sent'
    });

    // Handle file attachments
    if (req.files && req.files.length > 0) {
      message.attachments = req.files.map(file => ({
        fileName: file.filename,
        originalName: file.originalname,
        fileType: file.mimetype,
        fileSize: file.size,
        filePath: file.path,
        uploadedAt: new Date()
      }));
    }

    await message.save();

    // Update conversation last message
    await conversation.updateLastMessage(message);

    // Populate message for response
    await message.populate([
      { path: 'sender', select: 'name email avatar role' },
      { path: 'replyTo', select: 'content.text sender', populate: { path: 'sender', select: 'name avatar' } }
    ]);

    // Send real-time notification
    const io = SocketService.getIO();
    if (io) {
      conversation.participants.forEach(participant => {
        if (participant.user._id.toString() !== userId.toString() && participant.isActive) {
          io.to(`user_${participant.user._id}`).emit('newMessage', {
            messageId: message._id,
            conversationId: conversation._id,
            sender: {
              _id: req.user._id,
              name: isAnonymous ? 'Anonymous' : req.user.name,
              avatar: isAnonymous ? null : req.user.avatar
            },
            messageType,
            content: message.getDisplayContent(),
            createdAt: message.createdAt
          });
        }
      });
    }

    // Send push notifications
    for (const recipient of recipients) {
      await NotificationService.sendNotification({
        recipient: recipient.user,
        type: 'new_message',
        title: conversation.displayName,
        message: isAnonymous ? 'New anonymous message' : `${req.user.name}: ${content.text?.substring(0, 100) || '[Attachment]'}`,
        data: {
          conversationId: conversation._id,
          messageId: message._id,
          senderId: userId
        }
      });
    }

    console.log(`✅ Message sent successfully: ${message._id}`);

    res.status(201).json({
      success: true,
      message: 'Message sent successfully',
      data: { message }
    });

  } catch (error) {
    console.error('❌ Send message error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while sending message',
      error: error.message
    });
  }
};

// Get messages in conversation
const getConversationMessages = async (req, res) => {
  try {
    const userId = req.user._id;
    const { conversationId } = req.params;
    const { page = 1, limit = 50, before = null, search = null } = req.query;

    console.log(`📨 Getting messages for conversation: ${conversationId}`);

    // Verify user access to conversation
    const conversation = await Conversation.findOne({
      _id: conversationId,
      'participants.user': userId,
      'participants.isActive': true,
      isActive: true
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found or access denied'
      });
    }

    let query = {
      conversationId: conversationId,
      isDeleted: false
    };

    // Add search filter
    if (search) {
      query.$or = [
        { 'content.text': { $regex: search, $options: 'i' } },
        { 'content.subject': { $regex: search, $options: 'i' } }
      ];
    }

    // Add before filter for pagination
    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }

    const messages = await Message.find(query)
      .populate('sender', 'name email avatar role')
      .populate('replyTo', 'content.text sender createdAt')
      .populate('replyTo.sender', 'name avatar')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    // Mark messages as read
    const messageIds = messages.map(m => m._id);
    await Message.updateMany(
      {
        _id: { $in: messageIds },
        'recipients.user': userId,
        'recipients.readAt': null
      },
      {
        $set: { 'recipients.$.readAt': new Date() }
      }
    );

    // Add read status and format for response
    const formattedMessages = messages.reverse().map(message => ({
      ...message.toObject(),
      content: message.getDisplayContent(),
      isOwnMessage: message.sender._id.toString() === userId.toString(),
      readBy: message.readBy.length,
      reactions: message.engagement.reactions,
      canEdit: message.sender._id.toString() === userId.toString() && 
               (Date.now() - message.createdAt.getTime()) < 15 * 60 * 1000, // 15 minutes
      canDelete: message.sender._id.toString() === userId.toString() ||
                conversation.participants.find(p => p.user.toString() === userId.toString())?.role === 'admin'
    }));

    console.log(`✅ Retrieved ${messages.length} messages`);

    res.status(200).json({
      success: true,
      message: 'Messages retrieved successfully',
      data: {
        messages: formattedMessages,
        pagination: {
          currentPage: parseInt(page),
          hasMore: messages.length === parseInt(limit),
          totalMessages: await Message.countDocuments({ conversationId, isDeleted: false })
        }
      }
    });

  } catch (error) {
    console.error('❌ Get messages error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while retrieving messages',
      error: error.message
    });
  }
};

// Mark message as read
const markMessageAsRead = async (req, res) => {
  try {
    const userId = req.user._id;
    const { messageId } = req.params;

    console.log(`👁️ Marking message as read: ${messageId}`);

    const message = await Message.findById(messageId);
    
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    await message.markAsRead(userId);

    // Emit read receipt
    const io = SocketService.getIO();
    if (io) {
      io.to(`user_${message.sender}`).emit('messageRead', {
        messageId: message._id,
        readBy: userId,
        readAt: new Date()
      });
    }

    console.log(`✅ Message marked as read`);

    res.status(200).json({
      success: true,
      message: 'Message marked as read'
    });

  } catch (error) {
    console.error('❌ Mark as read error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while marking message as read',
      error: error.message
    });
  }
};

// ==========================================
// 🎯 ACADEMIC Q&A FEATURES
// ==========================================

// Ask academic question
const askQuestion = async (req, res) => {
  try {
    const userId = req.user._id;
    const {
      subject,
      category,
      questionText,
      priority = 'medium',
      tags = [],
      isAnonymous = false,
      attachments = []
    } = req.body;

    console.log(`❓ New academic question in ${subject}`);

    // Find or create Q&A conversation for the subject
    let conversation = await Conversation.findOne({
      conversationType: 'qa_session',
      'academicContext.subject': subject,
      isActive: true,
      'settings.joinPolicy': { $in: ['open', 'approval_required'] }
    });

    if (!conversation) {
      // Create new Q&A session
      conversation = new Conversation({
        title: `${subject.charAt(0).toUpperCase() + subject.slice(1)} Q&A Session`,
        conversationType: 'qa_session',
        createdBy: userId,
        academicContext: {
          subject: subject,
          topics: tags
        },
        settings: {
          joinPolicy: 'open',
          allowAnonymousQuestions: true,
          maxParticipants: 500
        }
      });

      // Add creator
      conversation.participants.push({
        user: userId,
        role: 'admin',
        isActive: true
      });

      await conversation.save();
    } else {
      // Add user to existing conversation if not already a participant
      const isParticipant = conversation.participants.some(
        p => p.user.toString() === userId.toString() && p.isActive
      );

      if (!isParticipant) {
        await conversation.addParticipant(userId);
      }
    }

    // Create question message
    const questionMessage = new Message({
      conversationId: conversation._id,
      sender: userId,
      recipients: [], // Will be populated when teachers respond
      messageType: 'question',
      content: {
        text: questionText,
        subject: `Question about ${subject}`,
        category: category,
        priority: priority,
        tags: tags
      },
      isAnonymous: isAnonymous,
      questionStatus: 'pending'
    });

    // Handle attachments
    if (req.files && req.files.length > 0) {
      questionMessage.attachments = req.files.map(file => ({
        fileName: file.filename,
        originalName: file.originalname,
        fileType: file.mimetype,
        fileSize: file.size,
        filePath: file.path
      }));
    }

    await questionMessage.save();
    await conversation.updateLastMessage(questionMessage);

    // Populate for response
    await questionMessage.populate('sender', 'name email avatar role');

    // Notify relevant teachers
    const teachers = await User.find({
      role: 'teacher',
      'teachingSubjects': subject,
      isActive: true
    });

    for (const teacher of teachers) {
      await NotificationService.sendNotification({
        recipient: teacher._id,
        type: 'new_question',
        title: `New ${subject} Question`,
        message: isAnonymous ? 'New anonymous question posted' : `${req.user.name} asked a question`,
        data: {
          conversationId: conversation._id,
          questionId: questionMessage._id,
          subject: subject,
          category: category
        }
      });
    }

    console.log(`✅ Question posted successfully: ${questionMessage._id}`);

    res.status(201).json({
      success: true,
      message: 'Question posted successfully',
      data: {
        question: questionMessage,
        conversation: conversation
      }
    });

  } catch (error) {
    console.error('❌ Ask question error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while posting question',
      error: error.message
    });
  }
};

// Answer question
const answerQuestion = async (req, res) => {
  try {
    const userId = req.user._id;
    const { questionId } = req.params;
    const { answerText, isDetailed = false } = req.body;

    console.log(`✅ Answering question: ${questionId}`);

    const question = await Message.findOne({
      _id: questionId,
      messageType: 'question',
      isDeleted: false
    }).populate('conversationId');

    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }

    // Check if user is a teacher or authorized to answer
    if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only teachers can answer questions'
      });
    }

    // Create answer message
    const answerMessage = new Message({
      conversationId: question.conversationId,
      sender: userId,
      recipients: [{ user: question.sender, deliveredAt: new Date() }],
      messageType: 'answer',
      content: {
        text: answerText,
        subject: `Answer to: ${question.content.subject}`,
        category: question.content.category
      },
      replyTo: question._id
    });

    // Handle attachments
    if (req.files && req.files.length > 0) {
      answerMessage.attachments = req.files.map(file => ({
        fileName: file.filename,
        originalName: file.originalname,
        fileType: file.mimetype,
        fileSize: file.size,
        filePath: file.path
      }));
    }

    await answerMessage.save();

    // Update question status
    question.questionStatus = 'answered';
    question.relatedMessages.push(answerMessage._id);
    await question.save();

    // Update conversation
    await question.conversationId.updateLastMessage(answerMessage);

    // Populate for response
    await answerMessage.populate('sender', 'name email avatar role');

    // Notify question asker
    await NotificationService.sendNotification({
      recipient: question.sender,
      type: 'question_answered',
      title: 'Your Question Answered',
      message: `${req.user.name} answered your question`,
      data: {
        questionId: question._id,
        answerId: answerMessage._id,
        conversationId: question.conversationId._id
      }
    });

    console.log(`✅ Answer posted successfully: ${answerMessage._id}`);

    res.status(201).json({
      success: true,
      message: 'Answer posted successfully',
      data: { answer: answerMessage }
    });

  } catch (error) {
    console.error('❌ Answer question error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while posting answer',
      error: error.message
    });
  }
};

// ==========================================
// 📢 ANNOUNCEMENTS
// ==========================================

// Create announcement
const createAnnouncement = async (req, res) => {
  try {
    const userId = req.user._id;
    const {
      title,
      content,
      priority = 'medium',
      targetAudience = 'all', // all, teachers, students, specific_class
      classFilter = null,
      subjectFilter = null,
      scheduledFor = null
    } = req.body;

    console.log(`📢 Creating announcement: ${title}`);

    // Check if user is authorized to create announcements
    if (req.user.role !== 'teacher' && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only teachers and admins can create announcements'
      });
    }

    // Find or create announcement conversation
    let conversation = await Conversation.findOne({
      conversationType: 'announcement',
      createdBy: userId,
      isActive: true
    });

    if (!conversation) {
      conversation = new Conversation({
        title: 'Announcements',
        conversationType: 'announcement',
        createdBy: userId,
        settings: {
          joinPolicy: 'closed',
          maxParticipants: 1000
        }
      });

      conversation.participants.push({
        user: userId,
        role: 'admin',
        isActive: true
      });

      await conversation.save();
    }

    // Create announcement message
    const announcement = new Message({
      conversationId: conversation._id,
      sender: userId,
      recipients: [], // Will be populated based on target audience
      messageType: 'announcement',
      content: {
        text: content,
        subject: title,
        priority: priority
      },
      scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
      isScheduled: !!scheduledFor
    });

    // Determine target users based on audience
    let targetUsers = [];
    
    if (targetAudience === 'all') {
      targetUsers = await User.find({ isActive: true, role: { $in: ['student', 'teacher'] } });
    } else if (targetAudience === 'students') {
      let query = { isActive: true, role: 'student' };
      if (classFilter) query['academicInfo.class'] = classFilter;
      targetUsers = await User.find(query);
    } else if (targetAudience === 'teachers') {
      let query = { isActive: true, role: 'teacher' };
      if (subjectFilter) query.teachingSubjects = subjectFilter;
      targetUsers = await User.find(query);
    }

    // Add recipients
    announcement.recipients = targetUsers.map(user => ({
      user: user._id,
      deliveredAt: new Date()
    }));

    await announcement.save();
    await conversation.updateLastMessage(announcement);

    // Send notifications to all recipients
    for (const user of targetUsers) {
      await NotificationService.sendNotification({
        recipient: user._id,
        type: 'announcement',
        title: title,
        message: content.substring(0, 200),
        data: {
          announcementId: announcement._id,
          conversationId: conversation._id,
          priority: priority
        }
      });
    }

    console.log(`✅ Announcement created: ${announcement._id} (${targetUsers.length} recipients)`);

    res.status(201).json({
      success: true,
      message: 'Announcement created successfully',
      data: {
        announcement,
        recipientCount: targetUsers.length
      }
    });

  } catch (error) {
    console.error('❌ Create announcement error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while creating announcement',
      error: error.message
    });
  }
};

// ==========================================
// 🔍 SEARCH & DISCOVERY
// ==========================================

// Search conversations and messages
const searchCommunication = async (req, res) => {
  try {
    const userId = req.user._id;
    const { query, type = 'all', subject = null, page = 1, limit = 20 } = req.query;

    console.log(`🔍 Searching communications: ${query}`);

    let results = {
      conversations: [],
      messages: [],
      questions: []
    };

    if (!query || query.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 2 characters long'
      });
    }

    // Search conversations
    if (type === 'all' || type === 'conversations') {
      let convQuery = {
        'participants.user': userId,
        'participants.isActive': true,
        isActive: true,
        $or: [
          { title: { $regex: query, $options: 'i' } },
          { description: { $regex: query, $options: 'i' } }
        ]
      };

      if (subject) {
        convQuery['academicContext.subject'] = subject;
      }

      results.conversations = await Conversation.find(convQuery)
        .populate('createdBy', 'name avatar')
        .sort({ lastActivity: -1 })
        .limit(parseInt(limit));
    }

    // Search messages
    if (type === 'all' || type === 'messages') {
      const userConversations = await Conversation.find({
        'participants.user': userId,
        'participants.isActive': true,
        isActive: true
      }).select('_id');

      const conversationIds = userConversations.map(c => c._id);

      let msgQuery = {
        conversationId: { $in: conversationIds },
        isDeleted: false,
        $or: [
          { 'content.text': { $regex: query, $options: 'i' } },
          { 'content.subject': { $regex: query, $options: 'i' } }
        ]
      };

      results.messages = await Message.find(msgQuery)
        .populate('sender', 'name avatar')
        .populate('conversationId', 'title conversationType')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit));
    }

    // Search academic questions
    if (type === 'all' || type === 'questions') {
      let questionQuery = {
        messageType: 'question',
        isDeleted: false,
        $or: [
          { 'content.text': { $regex: query, $options: 'i' } },
          { 'content.subject': { $regex: query, $options: 'i' } },
          { 'content.tags': { $in: [new RegExp(query, 'i')] } }
        ]
      };

      if (subject) {
        questionQuery['content.category'] = subject;
      }

      results.questions = await Message.find(questionQuery)
        .populate('sender', 'name avatar')
        .populate('conversationId', 'title')
        .sort({ createdAt: -1 })
        .limit(parseInt(limit));
    }

    const totalResults = results.conversations.length + results.messages.length + results.questions.length;

    console.log(`✅ Search completed: ${totalResults} results found`);

    res.status(200).json({
      success: true,
      message: 'Search completed successfully',
      data: {
        results,
        totalResults,
        searchQuery: query,
        searchType: type
      }
    });

  } catch (error) {
    console.error('❌ Search error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while searching',
      error: error.message
    });
  }
};

// Get public academic conversations
const getPublicConversations = async (req, res) => {
  try {
    const { subject = null, type = null, page = 1, limit = 20 } = req.query;

    console.log(`🌐 Getting public conversations`);

    let query = {
      isActive: true,
      'settings.joinPolicy': { $in: ['open', 'approval_required'] },
      conversationType: { $in: ['study_group', 'qa_session', 'class_discussion'] }
    };

    if (subject) {
      query['academicContext.subject'] = subject;
    }

    if (type) {
      query.conversationType = type;
    }

    const conversations = await Conversation.find(query)
      .populate('createdBy', 'name avatar role')
      .populate('participants.user', 'name avatar role')
      .sort({ lastActivity: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const totalConversations = await Conversation.countDocuments(query);

    // Add participant count and recent activity info
    const conversationsWithInfo = conversations.map(conv => ({
      ...conv.toObject(),
      activeParticipantsCount: conv.activeParticipantsCount,
      canJoin: conv.settings.joinPolicy === 'open' || conv.settings.joinPolicy === 'approval_required'
    }));

    console.log(`✅ Found ${conversations.length} public conversations`);

    res.status(200).json({
      success: true,
      message: 'Public conversations retrieved successfully',
      data: {
        conversations: conversationsWithInfo,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalConversations / limit),
          totalConversations,
          hasNextPage: page * limit < totalConversations
        }
      }
    });

  } catch (error) {
    console.error('❌ Get public conversations error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while retrieving public conversations',
      error: error.message
    });
  }
};

// ==========================================
// 👥 CONVERSATION ACTIONS
// ==========================================

// Join conversation
const joinConversation = async (req, res) => {
  try {
    const userId = req.user._id;
    const { conversationId } = req.params;

    console.log(`👥 Joining conversation: ${conversationId}`);

    const conversation = await Conversation.findOne({
      _id: conversationId,
      isActive: true
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    // Check join policy
    if (conversation.settings.joinPolicy === 'closed') {
      return res.status(403).json({
        success: false,
        message: 'This conversation is closed to new members'
      });
    }

    if (conversation.settings.joinPolicy === 'invite_only') {
      return res.status(403).json({
        success: false,
        message: 'This conversation is invite-only'
      });
    }

    // Add user to conversation
    await conversation.addParticipant(userId, 'member');

    console.log(`✅ User joined conversation successfully`);

    res.status(200).json({
      success: true,
      message: 'Joined conversation successfully'
    });

  } catch (error) {
    console.error('❌ Join conversation error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error while joining conversation',
      error: error.message
    });
  }
};

// Leave conversation
const leaveConversation = async (req, res) => {
  try {
    const userId = req.user._id;
    const { conversationId } = req.params;

    console.log(`👋 Leaving conversation: ${conversationId}`);

    const conversation = await Conversation.findOne({
      _id: conversationId,
      isActive: true
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }

    // Remove user from conversation
    await conversation.removeParticipant(userId);

    console.log(`✅ User left conversation successfully`);

    res.status(200).json({
      success: true,
      message: 'Left conversation successfully'
    });

  } catch (error) {
    console.error('❌ Leave conversation error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error while leaving conversation',
      error: error.message
    });
  }
};

module.exports = {
  // Conversation management
  getUserConversations,
  createConversation,
  getConversationDetails,
  joinConversation,
  leaveConversation,
  
  // Message management
  sendMessage,
  getConversationMessages,
  markMessageAsRead,
  
  // Academic Q&A
  askQuestion,
  answerQuestion,
  
  // Announcements
  createAnnouncement,
  
  // Search & discovery
  searchCommunication,
  getPublicConversations
};
