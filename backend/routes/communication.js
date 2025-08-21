const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const communicationController = require('../controllers/communicationController');
const { authenticateUser, studentOnly, teacherOnly } = require('../middleware/auth');

// 💬 GyanGuru Communication API Routes
// Features: Private chat, Group discussions, Q&A sessions, Announcements

// ==========================================
// 🔒 MIDDLEWARE: All routes require authentication
// ==========================================
router.use(authenticateUser);

// ==========================================
// 📁 FILE UPLOAD CONFIGURATION
// ==========================================

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads/messages');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    // Generate unique filename
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, `msg_${uniqueSuffix}${extension}`);
  }
});

// File filter for allowed types
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    // Images
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    // Documents
    'application/pdf', 'application/msword', 
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain', 'text/csv',
    // Audio
    'audio/mpeg', 'audio/wav', 'audio/ogg',
    // Video
    'video/mp4', 'video/webm', 'video/ogg'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} is not allowed`), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
    files: 5 // Maximum 5 files per message
  }
});

// ==========================================
// 💬 CONVERSATION MANAGEMENT ROUTES
// ==========================================

/**
 * @route   GET /api/communication/conversations
 * @desc    Get all conversations for the authenticated user
 * @access  Private (All authenticated users)
 * @query   {Number} page - Page number (default: 1)
 * @query   {Number} limit - Items per page (default: 20)
 * @query   {String} type - Filter by conversation type
 * @returns {Object} User's conversations with pagination
 */
router.get('/conversations', communicationController.getUserConversations);

/**
 * @route   POST /api/communication/conversations
 * @desc    Create a new conversation
 * @access  Private (All authenticated users)
 * @body    {Object} Conversation data
 * @returns {Object} Created conversation
 */
router.post('/conversations', communicationController.createConversation);

/**
 * @route   GET /api/communication/conversations/:conversationId
 * @desc    Get conversation details and participants
 * @access  Private (Conversation participants only)
 * @param   {String} conversationId - Conversation ID
 * @returns {Object} Detailed conversation information
 */
router.get('/conversations/:conversationId', communicationController.getConversationDetails);

/**
 * @route   POST /api/communication/conversations/:conversationId/join
 * @desc    Join a public conversation
 * @access  Private (All authenticated users)
 * @param   {String} conversationId - Conversation ID
 * @returns {Object} Join confirmation
 */
router.post('/conversations/:conversationId/join', communicationController.joinConversation);

/**
 * @route   POST /api/communication/conversations/:conversationId/leave
 * @desc    Leave a conversation
 * @access  Private (Conversation participants)
 * @param   {String} conversationId - Conversation ID
 * @returns {Object} Leave confirmation
 */
router.post('/conversations/:conversationId/leave', communicationController.leaveConversation);

// ==========================================
// 📨 MESSAGE MANAGEMENT ROUTES
// ==========================================

/**
 * @route   GET /api/communication/conversations/:conversationId/messages
 * @desc    Get messages in a conversation
 * @access  Private (Conversation participants)
 * @param   {String} conversationId - Conversation ID
 * @query   {Number} page - Page number
 * @query   {Number} limit - Messages per page
 * @query   {String} before - Get messages before this timestamp
 * @query   {String} search - Search term for message content
 * @returns {Object} Messages with pagination
 */
router.get('/conversations/:conversationId/messages', communicationController.getConversationMessages);

/**
 * @route   POST /api/communication/conversations/:conversationId/messages
 * @desc    Send a message in a conversation
 * @access  Private (Conversation participants)
 * @param   {String} conversationId - Conversation ID
 * @body    {Object} Message data
 * @returns {Object} Sent message
 */
router.post('/conversations/:conversationId/messages', 
  upload.array('attachments', 5), 
  communicationController.sendMessage
);

/**
 * @route   PUT /api/communication/messages/:messageId/read
 * @desc    Mark a message as read
 * @access  Private (Message recipients)
 * @param   {String} messageId - Message ID
 * @returns {Object} Read confirmation
 */
router.put('/messages/:messageId/read', communicationController.markMessageAsRead);

/**
 * @route   POST /api/communication/messages/:messageId/reaction
 * @desc    Add or remove reaction to a message
 * @access  Private (All authenticated users)
 * @param   {String} messageId - Message ID
 * @body    {Object} Reaction data
 */
router.post('/messages/:messageId/reaction', async (req, res) => {
  try {
    const { messageId } = req.params;
    const { reactionType, action = 'add' } = req.body; // add or remove
    const userId = req.user._id;

    console.log(`👍 ${action}ing reaction to message: ${messageId}`);

    const Message = require('../models/Message');
    const message = await Message.findById(messageId);

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }

    if (action === 'add') {
      await message.addReaction(userId, reactionType);
    } else {
      await message.removeReaction(userId);
    }

    // Emit real-time update
    const SocketService = require('../services/SocketService');
    const io = SocketService.getIO();
    if (io) {
      io.to(`conversation_${message.conversationId}`).emit('messageReaction', {
        messageId: message._id,
        reactions: message.engagement.reactions,
        totalReactions: message.totalReactions
      });
    }

    res.status(200).json({
      success: true,
      message: `Reaction ${action}ed successfully`,
      data: {
        reactions: message.engagement.reactions,
        totalReactions: message.totalReactions
      }
    });

  } catch (error) {
    console.error('❌ Message reaction error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while processing reaction',
      error: error.message
    });
  }
});

// ==========================================
// 🎓 ACADEMIC Q&A ROUTES
// ==========================================

/**
 * @route   POST /api/communication/questions
 * @desc    Ask an academic question
 * @access  Private (Students and Teachers)
 * @body    {Object} Question data
 * @returns {Object} Posted question
 */
router.post('/questions', 
  upload.array('attachments', 3), 
  communicationController.askQuestion
);

/**
 * @route   POST /api/communication/questions/:questionId/answer
 * @desc    Answer an academic question
 * @access  Private (Teachers only)
 * @param   {String} questionId - Question message ID
 * @body    {Object} Answer data
 * @returns {Object} Posted answer
 */
router.post('/questions/:questionId/answer', 
  teacherOnly,
  upload.array('attachments', 3), 
  communicationController.answerQuestion
);

/**
 * @route   GET /api/communication/questions
 * @desc    Get academic questions by category/subject
 * @access  Private (All authenticated users)
 * @query   {String} subject - Filter by subject
 * @query   {String} category - Filter by category
 * @query   {String} status - Filter by status (pending/answered/resolved)
 * @query   {String} priority - Filter by priority
 * @returns {Object} Academic questions list
 */
router.get('/questions', async (req, res) => {
  try {
    const {
      subject = null,
      category = null,
      status = 'pending',
      priority = null,
      page = 1,
      limit = 20
    } = req.query;

    console.log(`❓ Getting academic questions - Subject: ${subject}, Status: ${status}`);

    const Message = require('../models/Message');
    
    let query = {
      messageType: 'question',
      isDeleted: false
    };

    if (subject) query['content.category'] = subject;
    if (status) query.questionStatus = status;
    if (priority) query['content.priority'] = priority;

    const questions = await Message.find(query)
      .populate('sender', 'name email avatar role')
      .populate('conversationId', 'title academicContext')
      .sort({ 'content.priority': 1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const totalQuestions = await Message.countDocuments(query);

    // Add answer count for each question
    const questionsWithAnswers = await Promise.all(
      questions.map(async (question) => {
        const answerCount = await Message.countDocuments({
          replyTo: question._id,
          messageType: 'answer',
          isDeleted: false
        });

        return {
          ...question.toObject(),
          answerCount,
          canAnswer: req.user.role === 'teacher' || req.user.role === 'admin',
          isOwnQuestion: question.sender._id.toString() === req.user._id.toString()
        };
      })
    );

    res.status(200).json({
      success: true,
      message: 'Academic questions retrieved successfully',
      data: {
        questions: questionsWithAnswers,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalQuestions / limit),
          totalQuestions,
          hasNextPage: page * limit < totalQuestions
        },
        filters: { subject, category, status, priority }
      }
    });

  } catch (error) {
    console.error('❌ Get questions error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while retrieving questions',
      error: error.message
    });
  }
});

/**
 * @route   GET /api/communication/questions/:questionId/answers
 * @desc    Get answers for a specific question
 * @access  Private (All authenticated users)
 * @param   {String} questionId - Question message ID
 * @returns {Object} Question answers
 */
router.get('/questions/:questionId/answers', async (req, res) => {
  try {
    const { questionId } = req.params;

    console.log(`📖 Getting answers for question: ${questionId}`);

    const Message = require('../models/Message');
    
    const answers = await Message.find({
      replyTo: questionId,
      messageType: 'answer',
      isDeleted: false
    })
    .populate('sender', 'name email avatar role')
    .sort({ createdAt: 1 });

    // Add helpfulness ratings and user's rating
    const answersWithRatings = answers.map(answer => ({
      ...answer.toObject(),
      averageRating: answer.engagement.helpfulnessRating.averageRating,
      totalRatings: answer.engagement.helpfulnessRating.totalRatings,
      userRating: answer.engagement.helpfulnessRating.ratings.find(
        r => r.user.toString() === req.user._id.toString()
      )?.rating || null,
      canRate: answer.sender._id.toString() !== req.user._id.toString()
    }));

    res.status(200).json({
      success: true,
      message: 'Question answers retrieved successfully',
      data: {
        questionId,
        answers: answersWithRatings,
        totalAnswers: answers.length
      }
    });

  } catch (error) {
    console.error('❌ Get answers error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while retrieving answers',
      error: error.message
    });
  }
});

/**
 * @route   POST /api/communication/answers/:answerId/rate
 * @desc    Rate the helpfulness of an answer
 * @access  Private (All authenticated users except answer author)
 * @param   {String} answerId - Answer message ID
 * @body    {Object} Rating data
 * @returns {Object} Rating confirmation
 */
router.post('/answers/:answerId/rate', async (req, res) => {
  try {
    const { answerId } = req.params;
    const { rating, comment = '' } = req.body;
    const userId = req.user._id;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5'
      });
    }

    console.log(`⭐ Rating answer: ${answerId} - Rating: ${rating}`);

    const Message = require('../models/Message');
    const answer = await Message.findOne({
      _id: answerId,
      messageType: 'answer',
      isDeleted: false
    });

    if (!answer) {
      return res.status(404).json({
        success: false,
        message: 'Answer not found'
      });
    }

    if (answer.sender.toString() === userId.toString()) {
      return res.status(400).json({
        success: false,
        message: 'You cannot rate your own answer'
      });
    }

    await answer.addHelpfulnessRating(userId, rating, comment);

    res.status(200).json({
      success: true,
      message: 'Answer rated successfully',
      data: {
        averageRating: answer.engagement.helpfulnessRating.averageRating,
        totalRatings: answer.engagement.helpfulnessRating.totalRatings
      }
    });

  } catch (error) {
    console.error('❌ Rate answer error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while rating answer',
      error: error.message
    });
  }
});

// ==========================================
// 📢 ANNOUNCEMENT ROUTES
// ==========================================

/**
 * @route   POST /api/communication/announcements
 * @desc    Create an announcement
 * @access  Private (Teachers and Admins only)
 * @body    {Object} Announcement data
 * @returns {Object} Created announcement
 */
router.post('/announcements', 
  teacherOnly,
  upload.array('attachments', 3), 
  communicationController.createAnnouncement
);

/**
 * @route   GET /api/communication/announcements
 * @desc    Get announcements for the user
 * @access  Private (All authenticated users)
 * @query   {Number} page - Page number
 * @query   {Number} limit - Items per page
 * @query   {String} priority - Filter by priority
 * @returns {Object} User's announcements
 */
router.get('/announcements', async (req, res) => {
  try {
    const userId = req.user._id;
    const { page = 1, limit = 20, priority = null } = req.query;

    console.log(`📢 Getting announcements for user: ${userId}`);

    const Message = require('../models/Message');
    
    let query = {
      messageType: 'announcement',
      'recipients.user': userId,
      isDeleted: false
    };

    if (priority) {
      query['content.priority'] = priority;
    }

    const announcements = await Message.find(query)
      .populate('sender', 'name email avatar role')
      .populate('conversationId', 'title')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const totalAnnouncements = await Message.countDocuments(query);

    // Mark announcements as read
    const unreadAnnouncements = announcements.filter(
      ann => !ann.recipients.find(r => r.user.toString() === userId.toString())?.readAt
    );

    if (unreadAnnouncements.length > 0) {
      await Message.updateMany(
        {
          _id: { $in: unreadAnnouncements.map(a => a._id) },
          'recipients.user': userId
        },
        {
          $set: { 'recipients.$.readAt': new Date() }
        }
      );
    }

    res.status(200).json({
      success: true,
      message: 'Announcements retrieved successfully',
      data: {
        announcements,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(totalAnnouncements / limit),
          totalAnnouncements,
          hasNextPage: page * limit < totalAnnouncements
        }
      }
    });

  } catch (error) {
    console.error('❌ Get announcements error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while retrieving announcements',
      error: error.message
    });
  }
});

// ==========================================
// 🔍 SEARCH & DISCOVERY ROUTES
// ==========================================

/**
 * @route   GET /api/communication/search
 * @desc    Search conversations, messages, and questions
 * @access  Private (All authenticated users)
 * @query   {String} query - Search term
 * @query   {String} type - Search type (all/conversations/messages/questions)
 * @query   {String} subject - Filter by subject
 * @returns {Object} Search results
 */
router.get('/search', communicationController.searchCommunication);

/**
 * @route   GET /api/communication/public
 * @desc    Get public conversations available to join
 * @access  Private (All authenticated users)
 * @query   {String} subject - Filter by subject
 * @query   {String} type - Filter by conversation type
 * @returns {Object} Public conversations
 */
router.get('/public', communicationController.getPublicConversations);

// ==========================================
// 📊 ANALYTICS & STATISTICS ROUTES
// ==========================================

/**
 * @route   GET /api/communication/analytics
 * @desc    Get communication analytics and statistics
 * @access  Private (All authenticated users)
 * @returns {Object} Communication statistics
 */
router.get('/analytics', async (req, res) => {
  try {
    const userId = req.user._id;
    const { timeframe = 30 } = req.query; // days

    console.log(`📊 Getting communication analytics for user: ${userId}`);

    const Message = require('../models/Message');
    const Conversation = require('../models/Conversation');
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(timeframe));

    // User's conversation statistics
    const userConversations = await Conversation.find({
      'participants.user': userId,
      'participants.isActive': true,
      isActive: true
    });

    const conversationIds = userConversations.map(c => c._id);

    // Message statistics
    const messageStats = await Message.aggregate([
      {
        $match: {
          conversationId: { $in: conversationIds },
          createdAt: { $gte: startDate },
          isDeleted: false
        }
      },
      {
        $group: {
          _id: null,
          totalMessages: { $sum: 1 },
          messagesSent: {
            $sum: { $cond: [{ $eq: ['$sender', userId] }, 1, 0] }
          },
          messagesReceived: {
            $sum: { $cond: [{ $ne: ['$sender', userId] }, 1, 0] }
          },
          questionsAsked: {
            $sum: { $cond: [{ $and: [{ $eq: ['$messageType', 'question'] }, { $eq: ['$sender', userId] }] }, 1, 0] }
          },
          questionsAnswered: {
            $sum: { $cond: [{ $and: [{ $eq: ['$messageType', 'answer'] }, { $eq: ['$sender', userId] }] }, 1, 0] }
          }
        }
      }
    ]);

    // Conversation type breakdown
    const conversationTypes = await Conversation.aggregate([
      {
        $match: {
          'participants.user': userId,
          'participants.isActive': true,
          isActive: true
        }
      },
      {
        $group: {
          _id: '$conversationType',
          count: { $sum: 1 }
        }
      }
    ]);

    // Subject-wise activity
    const subjectActivity = await Message.aggregate([
      {
        $match: {
          conversationId: { $in: conversationIds },
          createdAt: { $gte: startDate },
          'content.category': { $exists: true },
          isDeleted: false
        }
      },
      {
        $group: {
          _id: '$content.category',
          messageCount: { $sum: 1 },
          questionsCount: {
            $sum: { $cond: [{ $eq: ['$messageType', 'question'] }, 1, 0] }
          }
        }
      },
      {
        $sort: { messageCount: -1 }
      }
    ]);

    // Recent activity (last 7 days)
    const recentActivity = await Message.aggregate([
      {
        $match: {
          conversationId: { $in: conversationIds },
          createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
          isDeleted: false
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          messages: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    const analytics = {
      summary: {
        totalConversations: userConversations.length,
        activeConversations: userConversations.filter(c => c.lastActivity > startDate).length,
        ...((messageStats[0] || {
          totalMessages: 0,
          messagesSent: 0,
          messagesReceived: 0,
          questionsAsked: 0,
          questionsAnswered: 0
        }))
      },
      
      conversationTypes: conversationTypes.reduce((acc, type) => {
        acc[type._id] = type.count;
        return acc;
      }, {}),
      
      subjectActivity,
      recentActivity,
      
      engagement: {
        averageMessagesPerDay: messageStats[0]?.totalMessages ? 
          Math.round(messageStats[0].totalMessages / timeframe) : 0,
        mostActiveSubject: subjectActivity[0]?._id || 'None',
        responseRate: messageStats[0]?.messagesReceived ? 
          Math.round((messageStats[0].messagesSent / messageStats[0].messagesReceived) * 100) : 0
      }
    };

    console.log(`✅ Communication analytics generated`);

    res.status(200).json({
      success: true,
      message: 'Communication analytics retrieved successfully',
      data: analytics
    });

  } catch (error) {
    console.error('❌ Communication analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while generating analytics',
      error: error.message
    });
  }
});

// ==========================================
// 📁 FILE DOWNLOAD ROUTE
// ==========================================

/**
 * @route   GET /api/communication/files/:filename
 * @desc    Download uploaded file
 * @access  Private (All authenticated users)
 * @param   {String} filename - File name
 * @returns {File} Downloaded file
 */
router.get('/files/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(uploadsDir, filename);

    console.log(`📁 Downloading file: ${filename}`);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'File not found'
      });
    }

    // Verify user has access to this file (check if it's in a conversation they're part of)
    const Message = require('../models/Message');
    const message = await Message.findOne({
      'attachments.fileName': filename
    }).populate('conversationId');

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'File not found in any accessible conversation'
      });
    }

    // Check if user is participant in the conversation
    const isParticipant = message.conversationId.participants.some(
      p => p.user.toString() === req.user._id.toString() && p.isActive
    );

    if (!isParticipant) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this file'
      });
    }

    // Update download count
    const attachment = message.attachments.find(a => a.fileName === filename);
    if (attachment) {
      attachment.downloadCount += 1;
      await message.save();
    }

    // Send file
    res.sendFile(filePath);

  } catch (error) {
    console.error('❌ File download error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while downloading file',
      error: error.message
    });
  }
});

// ==========================================
// 🚨 ERROR HANDLING MIDDLEWARE
// ==========================================

// Handle multer upload errors
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File size too large. Maximum size is 50MB.'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files. Maximum 5 files per message.'
      });
    }
  }

  if (error.message.includes('File type') && error.message.includes('not allowed')) {
    return res.status(400).json({
      success: false,
      message: error.message
    });
  }

  next(error);
});

// Handle 404 for communication routes
router.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Communication endpoint not found',
    availableEndpoints: [
      'GET /conversations',
      'POST /conversations',
      'GET /conversations/:id',
      'POST /conversations/:id/join',
      'POST /conversations/:id/leave',
      'GET /conversations/:id/messages',
      'POST /conversations/:id/messages',
      'PUT /messages/:id/read',
      'POST /questions',
      'POST /questions/:id/answer',
      'GET /questions',
      'POST /announcements',
      'GET /announcements',
      'GET /search',
      'GET /public',
      'GET /analytics'
    ]
  });
});

// Error handling middleware
router.use((error, req, res, next) => {
  console.error('🚨 Communication route error:', error);
  
  res.status(error.status || 500).json({
    success: false,
    message: error.message || 'Internal server error in communication system',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});

module.exports = router;
