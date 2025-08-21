const Question = require('../models/Question');
const User = require('../models/User');
const aiQuestionGenerator = require('../services/aiQuestionGenerator');

// Create a new question (Manual)
exports.createQuestion = async (req, res) => {
  try {
    const {
      title,
      type,
      subject,
      chapter,
      topic,
      class: classNum,
      difficulty,
      marks,
      timeLimit,
      question,
      options,
      correctAnswer,
      tags,
      keywords,
      isPublic = false
    } = req.body;

    // Validate teacher role
    if (req.user.role !== 'teacher') {
      return res.status(403).json({
        success: false,
        message: 'Only teachers can create questions'
      });
    }

    // Create question object
    const questionData = {
      title,
      type,
      subject,
      chapter,
      topic,
      class: classNum,
      difficulty,
      marks,
      timeLimit,
      question,
      correctAnswer,
      tags: tags || [],
      keywords: keywords || [],
      createdBy: req.user._id,
      source: 'manual',
      isPublic
    };

    // Add options for MCQ
    if (type === 'mcq') {
      if (!options || options.length < 2) {
        return res.status(400).json({
          success: false,
          message: 'MCQ questions must have at least 2 options'
        });
      }

      const correctCount = options.filter(opt => opt.isCorrect).length;
      if (correctCount !== 1) {
        return res.status(400).json({
          success: false,
          message: 'MCQ questions must have exactly one correct answer'
        });
      }

      questionData.options = options;
    }

    const newQuestion = new Question(questionData);
    await newQuestion.save();

    await newQuestion.populate('createdBy', 'name teacherInfo.subjects');

    res.status(201).json({
      success: true,
      message: 'Question created successfully',
      data: newQuestion
    });

  } catch (error) {
    console.error('Create question error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create question',
      error: error.message
    });
  }
};

// Get questions with filtering and pagination
exports.getQuestions = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      subject,
      chapter,
      class: classNum,
      difficulty,
      type,
      tags,
      search,
      createdBy,
      isPublic,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build query
    const query = { isActive: true };

    // Filter by creator or public questions
    if (req.user.role === 'teacher') {
      if (createdBy === 'me') {
        query.createdBy = req.user._id;
      } else if (isPublic === 'true') {
        query.isPublic = true;
      } else {
        // Show own questions + public questions
        query.$or = [
          { createdBy: req.user._id },
          { isPublic: true }
        ];
      }
    } else {
      // Students can only see public questions
      query.isPublic = true;
    }

    // Apply filters
    if (subject) query.subject = subject;
    if (chapter) query.chapter = chapter;
    if (classNum) query.class = parseInt(classNum);
    if (difficulty) query.difficulty = difficulty;
    if (type) query.type = type;
    if (tags) {
      const tagArray = tags.split(',').map(tag => tag.trim());
      query.tags = { $in: tagArray };
    }

    // Text search
    if (search) {
      query.$text = { $search: search };
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    // Execute query
    const questions = await Question.find(query)
      .populate('createdBy', 'name teacherInfo.subjects teacherInfo.rating')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Question.countDocuments(query);

    res.json({
      success: true,
      data: {
        questions,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / parseInt(limit)),
          total,
          hasNext: skip + questions.length < total,
          hasPrev: parseInt(page) > 1
        }
      }
    });

  } catch (error) {
    console.error('Get questions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get questions',
      error: error.message
    });
  }
};

// Get single question by ID
exports.getQuestionById = async (req, res) => {
  try {
    const { id } = req.params;

    const question = await Question.findById(id)
      .populate('createdBy', 'name teacherInfo.subjects teacherInfo.rating');

    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }

    // Check access permissions
    if (!question.isPublic && question.createdBy._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this question'
      });
    }

    res.json({
      success: true,
      data: question
    });

  } catch (error) {
    console.error('Get question by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get question',
      error: error.message
    });
  }
};

// Update question
exports.updateQuestion = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const question = await Question.findById(id);

    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }

    // Check ownership
    if (question.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own questions'
      });
    }

    // Validate MCQ options if updating
    if (updates.type === 'mcq' || (question.type === 'mcq' && updates.options)) {
      const options = updates.options || question.options;
      if (options && options.length >= 2) {
        const correctCount = options.filter(opt => opt.isCorrect).length;
        if (correctCount !== 1) {
          return res.status(400).json({
            success: false,
            message: 'MCQ questions must have exactly one correct answer'
          });
        }
      }
    }

    // Update question
    Object.keys(updates).forEach(key => {
      if (key !== '_id' && key !== 'createdBy' && key !== 'createdAt') {
        question[key] = updates[key];
      }
    });

    // Increment version
    question.version += 1;

    await question.save();
    await question.populate('createdBy', 'name teacherInfo.subjects');

    res.json({
      success: true,
      message: 'Question updated successfully',
      data: question
    });

  } catch (error) {
    console.error('Update question error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update question',
      error: error.message
    });
  }
};

// Delete question (soft delete)
exports.deleteQuestion = async (req, res) => {
  try {
    const { id } = req.params;

    const question = await Question.findById(id);

    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found'
      });
    }

    // Check ownership
    if (question.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own questions'
      });
    }

    // Soft delete
    question.isActive = false;
    await question.save();

    res.json({
      success: true,
      message: 'Question deleted successfully'
    });

  } catch (error) {
    console.error('Delete question error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete question',
      error: error.message
    });
  }
};

// Get random questions for practice/test
exports.getRandomQuestions = async (req, res) => {
  try {
    const {
      subject,
      chapter,
      class: classNum,
      difficulty,
      type,
      count = 10
    } = req.query;

    const criteria = {};
    if (subject) criteria.subject = subject;
    if (chapter) criteria.chapter = chapter;
    if (classNum) criteria.class = parseInt(classNum);
    if (difficulty) criteria.difficulty = difficulty;
    if (type) criteria.type = type;

    const questions = await Question.getRandomQuestions(criteria, parseInt(count));

    res.json({
      success: true,
      data: questions,
      count: questions.length
    });

  } catch (error) {
    console.error('Get random questions error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get random questions',
      error: error.message
    });
  }
};

// Get question statistics for teacher
exports.getQuestionStats = async (req, res) => {
  try {
    const teacherId = req.user._id;

    const stats = await Question.aggregate([
      { $match: { createdBy: teacherId, isActive: true } },
      {
        $group: {
          _id: null,
          totalQuestions: { $sum: 1 },
          mcqCount: { $sum: { $cond: [{ $eq: ['$type', 'mcq'] }, 1, 0] } },
          cqCount: { $sum: { $cond: [{ $eq: ['$type', 'cq'] }, 1, 0] } },
          easyCount: { $sum: { $cond: [{ $eq: ['$difficulty', 'easy'] }, 1, 0] } },
          mediumCount: { $sum: { $cond: [{ $eq: ['$difficulty', 'medium'] }, 1, 0] } },
          hardCount: { $sum: { $cond: [{ $eq: ['$difficulty', 'hard'] }, 1, 0] } },
          totalAttempts: { $sum: '$usageStats.totalAttempts' },
          averageSuccessRate: { $avg: { $multiply: [{ $divide: ['$usageStats.correctAttempts', '$usageStats.totalAttempts'] }, 100] } }
        }
      }
    ]);

    const result = stats[0] || {
      totalQuestions: 0,
      mcqCount: 0,
      cqCount: 0,
      easyCount: 0,
      mediumCount: 0,
      hardCount: 0,
      totalAttempts: 0,
      averageSuccessRate: 0
    };

    res.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Get question stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get question statistics',
      error: error.message
    });
  }
};

// Get subjects and chapters for dropdown
exports.getSubjectsAndChapters = async (req, res) => {
  try {
    const { class: classNum } = req.query;

    const pipeline = [
      { $match: { isActive: true, isPublic: true } }
    ];

    if (classNum) {
      pipeline[0].$match.class = parseInt(classNum);
    }

    pipeline.push(
      {
        $group: {
          _id: '$subject',
          chapters: { $addToSet: '$chapter' },
          questionCount: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    );

    const subjects = await Question.aggregate(pipeline);

    res.json({
      success: true,
      data: subjects
    });

  } catch (error) {
    console.error('Get subjects and chapters error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get subjects and chapters',
      error: error.message
    });
  }
};

// AI Question Generation
exports.generateQuestionsWithAI = async (req, res) => {
  try {
    const {
      type = 'mcq', // 'mcq' or 'cq'
      subject,
      chapter,
      topic,
      class: classNum,
      difficulty = 'medium',
      count = 5,
      language = 'bengali',
      saveToDatabase = false
    } = req.body;

    // Validate teacher role
    if (req.user.role !== 'teacher') {
      return res.status(403).json({
        success: false,
        message: 'Only teachers can generate questions'
      });
    }

    // Validate required fields
    if (!subject || !chapter || !classNum) {
      return res.status(400).json({
        success: false,
        message: 'Subject, chapter, and class are required'
      });
    }

    // Check if count is reasonable (to manage costs)
    if (count > 10) {
      return res.status(400).json({
        success: false,
        message: 'Cannot generate more than 10 questions at once to manage API costs'
      });
    }

    let generatedQuestions;

    // Generate questions based on type
    if (type === 'mcq') {
      generatedQuestions = await aiQuestionGenerator.generateMCQ({
        subject,
        chapter,
        topic,
        class: classNum,
        difficulty,
        count,
        language
      });
    } else if (type === 'cq') {
      generatedQuestions = await aiQuestionGenerator.generateCreativeQuestions({
        subject,
        chapter,
        topic,
        class: classNum,
        difficulty,
        count,
        language
      });
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid question type. Use "mcq" or "cq"'
      });
    }

    // Add creator information
    const questionsWithCreator = generatedQuestions.map(q => ({
      ...q,
      createdBy: req.user._id
    }));

    // Save to database if requested
    let savedQuestions = [];
    if (saveToDatabase) {
      try {
        savedQuestions = await Question.insertMany(questionsWithCreator);
      } catch (saveError) {
        console.error('Failed to save generated questions:', saveError);
        // Return generated questions even if save fails
      }
    }

    res.json({
      success: true,
      message: `Successfully generated ${generatedQuestions.length} ${type.toUpperCase()} questions`,
      data: {
        generatedQuestions: questionsWithCreator,
        savedQuestions: savedQuestions.length > 0 ? savedQuestions : null,
        metadata: {
          provider: await aiQuestionGenerator.getAvailableProvider(),
          generatedAt: new Date(),
          totalCount: generatedQuestions.length
        }
      }
    });

  } catch (error) {
    console.error('AI Generation Error:', error);
    
    // Handle specific AI errors
    if (error.message.includes('No AI provider available')) {
      return res.status(503).json({
        success: false,
        message: 'AI service is currently unavailable. Please configure API keys or try again later.',
        error: 'SERVICE_UNAVAILABLE'
      });
    }

    if (error.message.includes('rate limit')) {
      return res.status(429).json({
        success: false,
        message: 'AI service rate limit exceeded. Please try again in a few minutes.',
        error: 'RATE_LIMIT_EXCEEDED'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to generate questions with AI',
      error: error.message
    });
  }
};

// Get AI Provider Status
exports.getAIProviderStatus = async (req, res) => {
  try {
    const status = await aiQuestionGenerator.checkProviderStatus();
    
    res.json({
      success: true,
      data: {
        providers: status,
        available: Object.values(status).some(p => p.enabled && p.hasApiKey),
        recommendation: getProviderRecommendation(status)
      }
    });

  } catch (error) {
    console.error('Get AI status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get AI provider status',
      error: error.message
    });
  }
};

// Helper function for provider recommendations
function getProviderRecommendation(status) {
  const recommendations = [];
  
  if (!status.groq.hasApiKey) {
    recommendations.push({
      provider: 'Groq',
      reason: 'FREE API with excellent performance',
      steps: 'Get free API key from https://console.groq.com/',
      cost: 'FREE (Rate limited)',
      priority: 'HIGH'
    });
  }
  
  if (!status.openrouter.hasApiKey) {
    recommendations.push({
      provider: 'OpenRouter',
      reason: 'FREE tier available with multiple models',
      steps: 'Get API key from https://openrouter.ai/',
      cost: 'FREE tier + paid options',
      priority: 'HIGH'
    });
  }
  
  if (!status.huggingface.hasApiKey) {
    recommendations.push({
      provider: 'Hugging Face',
      reason: 'FREE inference API',
      steps: 'Get token from https://huggingface.co/settings/tokens',
      cost: 'FREE (Rate limited)',
      priority: 'MEDIUM'
    });
  }
  
  return recommendations;
}
