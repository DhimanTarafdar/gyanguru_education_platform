const Assessment = require('../models/Assessment');
const Question = require('../models/Question');
const User = require('../models/User');
const { validationResult } = require('express-validator');
const mongoose = require('mongoose');
const { AIQuestionGenerator } = require('../services/aiQuestionGenerator');

// Utility function for error handling
const handleErrors = (error, res) => {
  console.error('Assessment Controller Error:', error);
  
  if (error.name === 'ValidationError') {
    const errors = Object.values(error.errors).map(err => err.message);
    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      errors
    });
  }
  
  if (error.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid ID format'
    });
  }
  
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
};

// @desc    Create new assessment
// @route   POST /api/assessments
// @access  Private (Teacher only)
const createAssessment = async (req, res) => {
  try {
    // Validation check
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const {
      title,
      description,
      type,
      subject,
      chapter,
      class: className,
      questions,
      configuration,
      schedule,
      participants,
      grading,
      tags,
      category,
      aiFeatures,
      liveFeatures
    } = req.body;

    // Verify all questions exist
    if (questions && questions.length > 0) {
      const questionIds = questions.map(q => q.questionId);
      const existingQuestions = await Question.find({ _id: { $in: questionIds } });
      
      if (existingQuestions.length !== questionIds.length) {
        return res.status(400).json({
          success: false,
          message: 'One or more questions not found'
        });
      }
    }

    // Create assessment
    const assessment = new Assessment({
      title,
      description,
      type,
      subject,
      chapter,
      class: className,
      questions: questions || [],
      configuration: {
        duration: configuration?.duration || 60,
        questionsPerPage: configuration?.questionsPerPage || 1,
        allowBackward: configuration?.allowBackward !== false,
        showQuestionNumbers: configuration?.showQuestionNumbers !== false,
        showProgress: configuration?.showProgress !== false,
        shuffleQuestions: configuration?.shuffleQuestions || false,
        shuffleOptions: configuration?.shuffleOptions || false,
        preventCheating: {
          fullScreen: configuration?.preventCheating?.fullScreen || false,
          disableRightClick: configuration?.preventCheating?.disableRightClick || false,
          preventCopyPaste: configuration?.preventCheating?.preventCopyPaste || false,
          disableDevTools: configuration?.preventCheating?.disableDevTools || false,
          browserLockdown: configuration?.preventCheating?.browserLockdown || false,
          webcamMonitoring: configuration?.preventCheating?.webcamMonitoring || false,
          screenRecording: configuration?.preventCheating?.screenRecording || false,
          tabSwitchDetection: configuration?.preventCheating?.tabSwitchDetection || false,
          faceDetection: configuration?.preventCheating?.faceDetection || false
        },
        maxAttempts: configuration?.maxAttempts || 1,
        attemptDelay: configuration?.attemptDelay || 0,
        showResults: {
          immediately: configuration?.showResults?.immediately !== false,
          afterDeadline: configuration?.showResults?.afterDeadline || false,
          afterAllComplete: configuration?.showResults?.afterAllComplete || false,
          manual: configuration?.showResults?.manual || false
        },
        autoGrading: configuration?.autoGrading !== false,
        partialMarking: configuration?.partialMarking || false,
        negativeMarking: {
          enabled: configuration?.negativeMarking?.enabled || false,
          percentage: configuration?.negativeMarking?.percentage || 25
        },
        showCorrectAnswers: configuration?.showCorrectAnswers !== false,
        showExplanations: configuration?.showExplanations !== false,
        detailedFeedback: configuration?.detailedFeedback !== false,
        liveUpdates: configuration?.liveUpdates || false,
        realTimeLeaderboard: configuration?.realTimeLeaderboard || false
      },
      schedule: {
        startDate: new Date(schedule.startDate),
        endDate: new Date(schedule.endDate),
        timezone: schedule.timezone || 'Asia/Dhaka',
        gracePeriod: schedule.gracePeriod || 5,
        autoSubmit: schedule.autoSubmit !== false,
        lateSubmission: {
          allowed: schedule.lateSubmission?.allowed || false,
          penaltyPercentage: schedule.lateSubmission?.penaltyPercentage || 10
        }
      },
      participants: {
        students: participants?.students || [],
        openAccess: {
          enabled: participants?.openAccess?.enabled || false,
          criteria: participants?.openAccess?.criteria || {},
          maxParticipants: participants?.openAccess?.maxParticipants || 0
        },
        accessCode: participants?.accessCode,
        ipRestrictions: {
          enabled: participants?.ipRestrictions?.enabled || false,
          allowedIPs: participants?.ipRestrictions?.allowedIPs || [],
          allowedRanges: participants?.ipRestrictions?.allowedRanges || []
        }
      },
      createdBy: req.user.id,
      grading: {
        totalMarks: grading?.totalMarks || 0,
        passingMarks: grading?.passingMarks || 0,
        gradingScale: grading?.gradingScale || new Map([
          ['A+', { min: 90, max: 100, description: 'Outstanding' }],
          ['A', { min: 80, max: 89, description: 'Excellent' }],
          ['B', { min: 70, max: 79, description: 'Good' }],
          ['C', { min: 60, max: 69, description: 'Satisfactory' }],
          ['D', { min: 50, max: 59, description: 'Acceptable' }],
          ['F', { min: 0, max: 49, description: 'Needs Improvement' }]
        ]),
        rubric: grading?.rubric || []
      },
      tags: tags || [],
      category: category || 'academic',
      aiFeatures: {
        autoQuestionGeneration: {
          enabled: aiFeatures?.autoQuestionGeneration?.enabled || false,
          provider: aiFeatures?.autoQuestionGeneration?.provider || 'groq'
        },
        intelligentGrading: {
          enabled: aiFeatures?.intelligentGrading?.enabled || false
        },
        plagiarismDetection: {
          enabled: aiFeatures?.plagiarismDetection?.enabled || false,
          threshold: aiFeatures?.plagiarismDetection?.threshold || 0.8
        },
        adaptiveTesting: {
          enabled: aiFeatures?.adaptiveTesting?.enabled || false,
          algorithm: aiFeatures?.adaptiveTesting?.algorithm || 'simple'
        }
      },
      liveFeatures: {
        enabled: liveFeatures?.enabled || false,
        realTimeMonitoring: liveFeatures?.realTimeMonitoring || false,
        liveChat: {
          enabled: liveFeatures?.liveChat?.enabled || false,
          moderatorOnly: liveFeatures?.liveChat?.moderatorOnly !== false
        },
        breakouts: {
          enabled: liveFeatures?.breakouts?.enabled || false,
          duration: liveFeatures?.breakouts?.duration,
          message: liveFeatures?.breakouts?.message
        }
      }
    });

    await assessment.save();

    // Populate the created assessment
    await assessment.populate([
      {
        path: 'questions.questionId',
        select: 'questionText type options correctAnswer difficulty marks'
      },
      {
        path: 'participants.students.studentId',
        select: 'name email studentInfo.class'
      }
    ]);

    res.status(201).json({
      success: true,
      message: 'Assessment created successfully',
      data: assessment
    });

  } catch (error) {
    handleErrors(error, res);
  }
};

// @desc    Get all assessments for a teacher
// @route   GET /api/assessments
// @access  Private (Teacher only)
const getAssessments = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      type,
      subject,
      class: className,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter query
    const filter = { createdBy: req.user.id };

    if (status) filter.status = status;
    if (type) filter.type = type;
    if (subject) filter.subject = new RegExp(subject, 'i');
    if (className) filter.class = className;

    // Text search
    if (search) {
      filter.$text = { $search: search };
    }

    // Sort configuration
    const sortConfig = {};
    sortConfig[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Execute query with pagination
    const skip = (page - 1) * limit;
    const assessments = await Assessment.find(filter)
      .populate('questions.questionId', 'questionText type difficulty')
      .populate('participants.students.studentId', 'name email')
      .sort(sortConfig)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Get total count
    const total = await Assessment.countDocuments(filter);

    // Calculate additional stats for each assessment
    const assessmentsWithStats = assessments.map(assessment => ({
      ...assessment,
      totalQuestions: assessment.questions?.length || 0,
      totalParticipants: assessment.participants?.students?.length || 0,
      completionRate: assessment.statistics?.totalInvited > 0 
        ? Math.round((assessment.statistics.totalCompleted / assessment.statistics.totalInvited) * 100)
        : 0
    }));

    res.json({
      success: true,
      message: 'Assessments retrieved successfully',
      data: assessmentsWithStats,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: parseInt(limit),
        hasNext: page < Math.ceil(total / limit),
        hasPrev: page > 1
      }
    });

  } catch (error) {
    handleErrors(error, res);
  }
};

// @desc    Get single assessment by ID
// @route   GET /api/assessments/:id
// @access  Private
const getAssessmentById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid assessment ID'
      });
    }

    const assessment = await Assessment.findById(id)
      .populate('createdBy', 'name email avatar teacherInfo')
      .populate('questions.questionId')
      .populate('participants.students.studentId', 'name email avatar studentInfo')
      .populate('collaborators.teacherId', 'name email avatar');

    if (!assessment) {
      return res.status(404).json({
        success: false,
        message: 'Assessment not found'
      });
    }

    // Check access permissions
    const userId = req.user.id;
    const userRole = req.user.role;
    
    const hasAccess = 
      assessment.createdBy._id.toString() === userId || // Creator
      assessment.collaborators.some(c => c.teacherId._id.toString() === userId) || // Collaborator
      (userRole === 'student' && (
        assessment.participants.openAccess.enabled ||
        assessment.participants.students.some(s => s.studentId._id.toString() === userId)
      ));

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this assessment'
      });
    }

    // Remove sensitive information for students
    if (userRole === 'student') {
      // Hide correct answers and explanations until appropriate time
      const now = new Date();
      const assessmentEnded = now > assessment.schedule.endDate;
      const showAnswers = assessment.configuration.showResults.immediately || 
                         (assessment.configuration.showResults.afterDeadline && assessmentEnded);

      if (!showAnswers) {
        assessment.questions = assessment.questions.map(q => {
          const question = q.questionId.toObject();
          delete question.correctAnswer;
          delete question.explanation;
          return { ...q.toObject(), questionId: question };
        });
      }
    }

    res.json({
      success: true,
      message: 'Assessment retrieved successfully',
      data: assessment
    });

  } catch (error) {
    handleErrors(error, res);
  }
};

// @desc    Update assessment
// @route   PUT /api/assessments/:id
// @access  Private (Creator or Collaborator with edit permission)
const updateAssessment = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid assessment ID'
      });
    }

    const assessment = await Assessment.findById(id);

    if (!assessment) {
      return res.status(404).json({
        success: false,
        message: 'Assessment not found'
      });
    }

    // Check permissions
    const userId = req.user.id;
    const isCreator = assessment.createdBy.toString() === userId;
    const isCollaborator = assessment.collaborators.some(c => 
      c.teacherId.toString() === userId && 
      (c.role === 'co-creator' || c.permissions.includes('edit'))
    );

    if (!isCreator && !isCollaborator) {
      return res.status(403).json({
        success: false,
        message: 'Permission denied to update this assessment'
      });
    }

    // Check if assessment is active/completed (some fields shouldn't be modified)
    const isActiveOrCompleted = ['active', 'completed'].includes(assessment.status);
    
    if (isActiveOrCompleted && req.body.questions) {
      return res.status(400).json({
        success: false,
        message: 'Cannot modify questions of an active or completed assessment'
      });
    }

    // Validate questions if provided
    if (req.body.questions && req.body.questions.length > 0) {
      const questionIds = req.body.questions.map(q => q.questionId);
      const existingQuestions = await Question.find({ _id: { $in: questionIds } });
      
      if (existingQuestions.length !== questionIds.length) {
        return res.status(400).json({
          success: false,
          message: 'One or more questions not found'
        });
      }
    }

    // Update assessment
    const updatedAssessment = await Assessment.findByIdAndUpdate(
      id,
      { 
        ...req.body,
        updatedAt: new Date()
      },
      { 
        new: true, 
        runValidators: true 
      }
    ).populate([
      { path: 'createdBy', select: 'name email avatar' },
      { path: 'questions.questionId', select: 'questionText type options difficulty' },
      { path: 'participants.students.studentId', select: 'name email' }
    ]);

    // Add to audit trail
    updatedAssessment.auditTrail.push({
      action: 'assessment_updated',
      performedBy: userId,
      details: { updatedFields: Object.keys(req.body) }
    });

    await updatedAssessment.save();

    res.json({
      success: true,
      message: 'Assessment updated successfully',
      data: updatedAssessment
    });

  } catch (error) {
    handleErrors(error, res);
  }
};

// @desc    Delete assessment
// @route   DELETE /api/assessments/:id
// @access  Private (Creator only)
const deleteAssessment = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid assessment ID'
      });
    }

    const assessment = await Assessment.findById(id);

    if (!assessment) {
      return res.status(404).json({
        success: false,
        message: 'Assessment not found'
      });
    }

    // Only creator can delete
    if (assessment.createdBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Only the creator can delete this assessment'
      });
    }

    // Check if assessment has started
    if (['active', 'completed'].includes(assessment.status)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete an active or completed assessment. Archive it instead.'
      });
    }

    await Assessment.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'Assessment deleted successfully'
    });

  } catch (error) {
    handleErrors(error, res);
  }
};

// @desc    Publish assessment
// @route   POST /api/assessments/:id/publish
// @access  Private (Creator or Co-creator)
const publishAssessment = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid assessment ID'
      });
    }

    const assessment = await Assessment.findById(id);

    if (!assessment) {
      return res.status(404).json({
        success: false,
        message: 'Assessment not found'
      });
    }

    // Check permissions
    const userId = req.user.id;
    const isCreator = assessment.createdBy.toString() === userId;
    const isCoCreator = assessment.collaborators.some(c => 
      c.teacherId.toString() === userId && c.role === 'co-creator'
    );

    if (!isCreator && !isCoCreator) {
      return res.status(403).json({
        success: false,
        message: 'Permission denied to publish this assessment'
      });
    }

    // Validate assessment before publishing
    if (!assessment.questions || assessment.questions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot publish assessment without questions'
      });
    }

    if (assessment.schedule.startDate <= new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Start date must be in the future'
      });
    }

    if (assessment.status === 'published') {
      return res.status(400).json({
        success: false,
        message: 'Assessment is already published'
      });
    }

    // Publish assessment
    await assessment.publishAssessment(userId);

    res.json({
      success: true,
      message: 'Assessment published successfully',
      data: assessment
    });

  } catch (error) {
    handleErrors(error, res);
  }
};

// @desc    Add participants to assessment
// @route   POST /api/assessments/:id/participants
// @access  Private (Creator or Collaborator with manage_participants permission)
const addParticipants = async (req, res) => {
  try {
    const { id } = req.params;
    const { studentIds, openAccess } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid assessment ID'
      });
    }

    const assessment = await Assessment.findById(id);

    if (!assessment) {
      return res.status(404).json({
        success: false,
        message: 'Assessment not found'
      });
    }

    // Check permissions
    const userId = req.user.id;
    const hasPermission = 
      assessment.createdBy.toString() === userId ||
      assessment.collaborators.some(c => 
        c.teacherId.toString() === userId && 
        (c.role === 'co-creator' || c.permissions.includes('manage_participants'))
      );

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: 'Permission denied to manage participants'
      });
    }

    // Add individual students
    if (studentIds && Array.isArray(studentIds)) {
      // Verify students exist
      const students = await User.find({
        _id: { $in: studentIds },
        role: 'student'
      });

      if (students.length !== studentIds.length) {
        return res.status(400).json({
          success: false,
          message: 'One or more students not found'
        });
      }

      // Add participants
      for (const studentId of studentIds) {
        await assessment.addParticipant(studentId, userId);
      }
    }

    // Update open access settings
    if (openAccess) {
      assessment.participants.openAccess = {
        ...assessment.participants.openAccess,
        ...openAccess
      };
      await assessment.save();
    }

    await assessment.populate('participants.students.studentId', 'name email avatar studentInfo');

    res.json({
      success: true,
      message: 'Participants added successfully',
      data: {
        participants: assessment.participants,
        statistics: assessment.statistics
      }
    });

  } catch (error) {
    handleErrors(error, res);
  }
};

// @desc    Generate AI questions for assessment
// @route   POST /api/assessments/:id/generate-questions
// @access  Private (Creator or Co-creator)
const generateAIQuestions = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      count = 5, 
      difficulty = 'medium', 
      questionTypes = ['MCQ'], 
      topics = [] 
    } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid assessment ID'
      });
    }

    const assessment = await Assessment.findById(id);

    if (!assessment) {
      return res.status(404).json({
        success: false,
        message: 'Assessment not found'
      });
    }

    // Check permissions
    const userId = req.user.id;
    const hasPermission = 
      assessment.createdBy.toString() === userId ||
      assessment.collaborators.some(c => 
        c.teacherId.toString() === userId && c.role === 'co-creator'
      );

    if (!hasPermission) {
      return res.status(403).json({
        success: false,
        message: 'Permission denied to generate questions'
      });
    }

    // Check if AI features are enabled
    if (!assessment.aiFeatures.autoQuestionGeneration.enabled) {
      return res.status(400).json({
        success: false,
        message: 'AI question generation is not enabled for this assessment'
      });
    }

    // Generate questions using AI service
    const aiService = new AIQuestionGenerator();
    
    const generationParams = {
      subject: assessment.subject,
      class: assessment.class,
      chapter: assessment.chapter,
      count,
      difficulty,
      questionTypes,
      topics,
      provider: assessment.aiFeatures.autoQuestionGeneration.provider
    };

    const generatedQuestions = await aiService.generateQuestionsForAssessment(generationParams);

    // Save generated questions
    const savedQuestions = [];
    for (let i = 0; i < generatedQuestions.length; i++) {
      const questionData = generatedQuestions[i];
      
      const question = new Question({
        ...questionData,
        createdBy: userId,
        subject: assessment.subject,
        class: assessment.class,
        chapter: assessment.chapter,
        isAIGenerated: true,
        aiMetadata: {
          provider: assessment.aiFeatures.autoQuestionGeneration.provider,
          generatedAt: new Date(),
          assessmentId: id
        }
      });

      await question.save();
      savedQuestions.push(question);
    }

    // Add questions to assessment
    const newQuestions = savedQuestions.map((q, index) => ({
      questionId: q._id,
      marks: 1, // Default marks, can be customized
      order: assessment.questions.length + index + 1,
      difficulty: q.difficulty || difficulty
    }));

    assessment.questions.push(...newQuestions);
    assessment.aiFeatures.autoQuestionGeneration.lastGenerated = new Date();

    await assessment.save();

    // Add to audit trail
    assessment.auditTrail.push({
      action: 'ai_questions_generated',
      performedBy: userId,
      details: { 
        count: savedQuestions.length, 
        difficulty, 
        questionTypes,
        provider: assessment.aiFeatures.autoQuestionGeneration.provider
      }
    });

    await assessment.save();

    res.json({
      success: true,
      message: `${savedQuestions.length} AI questions generated and added successfully`,
      data: {
        generatedQuestions: savedQuestions,
        assessment: {
          totalQuestions: assessment.questions.length,
          totalMarks: assessment.grading.totalMarks
        }
      }
    });

  } catch (error) {
    handleErrors(error, res);
  }
};

// @desc    Get assessment analytics
// @route   GET /api/assessments/:id/analytics
// @access  Private (Creator or Collaborator)
const getAssessmentAnalytics = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid assessment ID'
      });
    }

    const assessment = await Assessment.findById(id)
      .populate('participants.students.studentId', 'name email avatar')
      .populate('questions.questionId', 'questionText type difficulty');

    if (!assessment) {
      return res.status(404).json({
        success: false,
        message: 'Assessment not found'
      });
    }

    // Check permissions
    const userId = req.user.id;
    const hasAccess = 
      assessment.createdBy.toString() === userId ||
      assessment.collaborators.some(c => c.teacherId.toString() === userId);

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to view analytics'
      });
    }

    // Calculate detailed analytics
    const analytics = {
      overview: {
        totalQuestions: assessment.questions.length,
        totalMarks: assessment.grading.totalMarks,
        duration: assessment.configuration.duration,
        participantStats: {
          invited: assessment.statistics.totalInvited,
          started: assessment.statistics.totalStarted,
          completed: assessment.statistics.totalCompleted,
          participationRate: assessment.participationRate
        }
      },
      
      performance: {
        averageScore: assessment.statistics.averageScore,
        averageTime: assessment.statistics.averageTime,
        highestScore: assessment.statistics.highestScore,
        lowestScore: assessment.statistics.lowestScore,
        passRate: assessment.statistics.passRate,
        scoreDistribution: [], // TODO: Calculate from submissions
        timeDistribution: []   // TODO: Calculate from submissions
      },
      
      questions: assessment.statistics.questionAnalytics.map(qa => {
        const question = assessment.questions.find(q => 
          q.questionId._id.toString() === qa.questionId.toString()
        );
        
        return {
          questionId: qa.questionId,
          questionText: question?.questionId?.questionText?.substring(0, 100) + '...',
          type: question?.questionId?.type,
          difficulty: question?.difficulty,
          correctAnswers: qa.correctAnswers,
          totalAttempts: qa.totalAttempts,
          successRate: qa.successRate,
          averageTime: qa.averageTime
        };
      }),
      
      timeline: [], // TODO: Add submission timeline data
      
      insights: assessment.aiFeatures.insights || []
    };

    res.json({
      success: true,
      message: 'Assessment analytics retrieved successfully',
      data: analytics
    });

  } catch (error) {
    handleErrors(error, res);
  }
};

// @desc    Archive assessment
// @route   POST /api/assessments/:id/archive
// @access  Private (Creator only)
const archiveAssessment = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid assessment ID'
      });
    }

    const assessment = await Assessment.findById(id);

    if (!assessment) {
      return res.status(404).json({
        success: false,
        message: 'Assessment not found'
      });
    }

    // Only creator can archive
    if (assessment.createdBy.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Only the creator can archive this assessment'
      });
    }

    assessment.status = 'archived';
    assessment.archivedAt = new Date();

    // Add to audit trail
    assessment.auditTrail.push({
      action: 'assessment_archived',
      performedBy: req.user.id,
      details: { archivedAt: assessment.archivedAt }
    });

    await assessment.save();

    res.json({
      success: true,
      message: 'Assessment archived successfully',
      data: assessment
    });

  } catch (error) {
    handleErrors(error, res);
  }
};

module.exports = {
  createAssessment,
  getAssessments,
  getAssessmentById,
  updateAssessment,
  deleteAssessment,
  publishAssessment,
  addParticipants,
  generateAIQuestions,
  getAssessmentAnalytics,
  archiveAssessment
};
