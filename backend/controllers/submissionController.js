const Assessment = require('../models/Assessment');
const StudentResponse = require('../models/StudentResponse');
const Question = require('../models/Question');
const User = require('../models/User');
const { validationResult } = require('express-validator');
const mongoose = require('mongoose');

// Utility function for error handling
const handleErrors = (error, res) => {
  console.error('Submission Controller Error:', error);
  
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

// @desc    Start assessment attempt
// @route   POST /api/assessments/:id/start
// @access  Private (Student only)
const startAssessment = async (req, res) => {
  try {
    const { id: assessmentId } = req.params;
    const studentId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(assessmentId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid assessment ID'
      });
    }

    // Get assessment with full details
    const assessment = await Assessment.findById(assessmentId)
      .populate('questions.questionId')
      .populate('createdBy', 'name');

    if (!assessment) {
      return res.status(404).json({
        success: false,
        message: 'Assessment not found'
      });
    }

    // Check if assessment is accessible
    const now = new Date();
    const startTime = assessment.schedule.startDate;
    const endTime = assessment.schedule.endDate;

    if (now < startTime) {
      return res.status(400).json({
        success: false,
        message: 'Assessment has not started yet',
        data: { startTime }
      });
    }

    if (now > endTime) {
      return res.status(400).json({
        success: false,
        message: 'Assessment has ended',
        data: { endTime }
      });
    }

    // Check if student is allowed to take assessment
    const isParticipant = assessment.participants.students.some(
      p => p.studentId.toString() === studentId
    );
    
    const hasOpenAccess = assessment.participants.openAccess.enabled;

    if (!isParticipant && !hasOpenAccess) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to take this assessment'
      });
    }

    // Check existing attempts
    const existingAttempts = await StudentResponse.find({ 
      assessmentId, 
      studentId 
    }).sort({ attemptNumber: -1 });

    const maxAttempts = assessment.configuration.maxAttempts;
    
    if (existingAttempts.length >= maxAttempts) {
      return res.status(400).json({
        success: false,
        message: 'Maximum attempts reached',
        data: { 
          attemptsUsed: existingAttempts.length,
          maxAttempts 
        }
      });
    }

    // Check if there's an ongoing attempt
    const ongoingAttempt = existingAttempts.find(attempt => 
      ['started', 'in_progress', 'paused'].includes(attempt.status)
    );

    if (ongoingAttempt) {
      return res.status(200).json({
        success: true,
        message: 'Resuming existing attempt',
        data: ongoingAttempt
      });
    }

    // Create new attempt
    const attemptNumber = existingAttempts.length + 1;
    const timeRemaining = assessment.configuration.duration;

    // Prepare questions for the response
    let questions = assessment.questions;

    // Shuffle questions if enabled
    if (assessment.configuration.shuffleQuestions) {
      questions = [...questions].sort(() => Math.random() - 0.5);
    }

    // Create response structure
    const responses = questions.map((q, index) => ({
      questionId: q.questionId._id,
      questionOrder: index + 1,
      questionType: q.questionId.type,
      maxMarks: q.marks,
      answer: {},
      timeSpent: 0,
      isAnswered: false,
      isMarkedForReview: false,
      autoGrading: {},
      manualGrading: {},
      finalMarks: 0
    }));

    const studentResponse = new StudentResponse({
      assessmentId,
      studentId,
      attemptNumber,
      status: 'started',
      startedAt: new Date(),
      timeRemaining,
      responses,
      scoring: {
        totalMarks: assessment.grading.totalMarks,
        marksObtained: 0,
        percentage: 0
      },
      submissionData: {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        submissionSource: req.get('User-Agent').includes('Mobile') ? 'mobile' : 'web'
      }
    });

    await studentResponse.save();

    // Update assessment participant status
    await assessment.updateParticipantStatus(studentId, 'started');

    // Prepare response data (hide sensitive information)
    const responseData = {
      _id: studentResponse._id,
      assessmentId,
      attemptNumber,
      status: studentResponse.status,
      startedAt: studentResponse.startedAt,
      timeRemaining: studentResponse.timeRemaining,
      assessment: {
        title: assessment.title,
        description: assessment.description,
        type: assessment.type,
        subject: assessment.subject,
        class: assessment.class,
        configuration: {
          duration: assessment.configuration.duration,
          questionsPerPage: assessment.configuration.questionsPerPage,
          allowBackward: assessment.configuration.allowBackward,
          showQuestionNumbers: assessment.configuration.showQuestionNumbers,
          showProgress: assessment.configuration.showProgress,
          preventCheating: assessment.configuration.preventCheating
        },
        totalQuestions: questions.length,
        totalMarks: assessment.grading.totalMarks
      },
      questions: questions.map((q, index) => {
        const question = q.questionId.toObject();
        
        // Remove correct answers and explanations for students
        delete question.correctAnswer;
        delete question.explanation;
        delete question.teacherNotes;
        
        // Shuffle options if enabled
        if (assessment.configuration.shuffleOptions && question.options) {
          question.options = [...question.options].sort(() => Math.random() - 0.5);
        }
        
        return {
          _id: question._id,
          questionText: question.questionText,
          type: question.type,
          options: question.options,
          marks: q.marks,
          order: index + 1,
          timeLimit: q.timeLimit || 0,
          isOptional: q.isOptional,
          images: question.images,
          mathNotation: question.mathNotation
        };
      })
    };

    res.status(201).json({
      success: true,
      message: 'Assessment started successfully',
      data: responseData
    });

  } catch (error) {
    handleErrors(error, res);
  }
};

// @desc    Get current assessment attempt
// @route   GET /api/assessments/:id/attempt
// @access  Private (Student only)
const getCurrentAttempt = async (req, res) => {
  try {
    const { id: assessmentId } = req.params;
    const studentId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(assessmentId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid assessment ID'
      });
    }

    const currentAttempt = await StudentResponse.findOne({
      assessmentId,
      studentId,
      status: { $in: ['started', 'in_progress', 'paused'] }
    }).populate('assessmentId', 'title type subject class configuration grading');

    if (!currentAttempt) {
      return res.status(404).json({
        success: false,
        message: 'No active attempt found'
      });
    }

    // Check if time has expired
    const timeElapsed = Math.floor((new Date() - currentAttempt.startedAt) / (1000 * 60));
    const totalTime = currentAttempt.assessmentId.configuration.duration;
    
    if (timeElapsed >= totalTime) {
      // Auto-submit the assessment
      currentAttempt.status = 'auto_submitted';
      currentAttempt.submittedAt = new Date();
      currentAttempt.timeTaken = totalTime;
      await currentAttempt.save();

      return res.status(200).json({
        success: false,
        message: 'Assessment time expired. Automatically submitted.',
        data: { timeExpired: true }
      });
    }

    // Update time remaining
    currentAttempt.timeRemaining = Math.max(0, totalTime - timeElapsed);
    await currentAttempt.save();

    res.json({
      success: true,
      message: 'Current attempt retrieved successfully',
      data: currentAttempt
    });

  } catch (error) {
    handleErrors(error, res);
  }
};

// @desc    Save answer for a question
// @route   POST /api/assessments/:id/answer
// @access  Private (Student only)
const saveAnswer = async (req, res) => {
  try {
    const { id: assessmentId } = req.params;
    const { questionId, answer, timeSpent, isMarkedForReview } = req.body;
    const studentId = req.user.id;

    // Validation
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    if (!mongoose.Types.ObjectId.isValid(assessmentId) || 
        !mongoose.Types.ObjectId.isValid(questionId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid assessment or question ID'
      });
    }

    // Find current attempt
    const currentAttempt = await StudentResponse.findOne({
      assessmentId,
      studentId,
      status: { $in: ['started', 'in_progress', 'paused'] }
    });

    if (!currentAttempt) {
      return res.status(404).json({
        success: false,
        message: 'No active attempt found'
      });
    }

    // Check if time has expired
    const timeElapsed = Math.floor((new Date() - currentAttempt.startedAt) / (1000 * 60));
    const assessment = await Assessment.findById(assessmentId);
    const totalTime = assessment.configuration.duration;
    
    if (timeElapsed >= totalTime) {
      return res.status(400).json({
        success: false,
        message: 'Assessment time has expired'
      });
    }

    // Find the question response
    const questionResponse = currentAttempt.responses.find(
      r => r.questionId.toString() === questionId
    );

    if (!questionResponse) {
      return res.status(404).json({
        success: false,
        message: 'Question not found in this assessment'
      });
    }

    // Update the response
    questionResponse.answer = answer;
    questionResponse.timeSpent = (questionResponse.timeSpent || 0) + (timeSpent || 0);
    questionResponse.isAnswered = true;
    questionResponse.isMarkedForReview = isMarkedForReview || false;

    // Perform auto-grading for objective questions
    if (['MCQ', 'True/False', 'Fill in the Blanks'].includes(questionResponse.questionType)) {
      const question = await Question.findById(questionId);
      
      if (question) {
        let isCorrect = false;
        let marksAwarded = 0;

        if (questionResponse.questionType === 'MCQ' || questionResponse.questionType === 'True/False') {
          isCorrect = answer.selectedOption === question.correctAnswer;
          marksAwarded = isCorrect ? questionResponse.maxMarks : 0;
          
          // Apply negative marking if enabled
          if (!isCorrect && assessment.configuration.negativeMarking.enabled) {
            const negativePercentage = assessment.configuration.negativeMarking.percentage;
            marksAwarded = -(questionResponse.maxMarks * negativePercentage / 100);
          }
        } else if (questionResponse.questionType === 'Fill in the Blanks') {
          // Simple string comparison (can be enhanced with fuzzy matching)
          const correctAnswers = question.correctAnswer;
          const studentAnswers = answer.fillAnswers || [];
          
          let correctCount = 0;
          studentAnswers.forEach((ans, index) => {
            if (correctAnswers[index] && 
                ans.toLowerCase().trim() === correctAnswers[index].toLowerCase().trim()) {
              correctCount++;
            }
          });
          
          marksAwarded = (correctCount / correctAnswers.length) * questionResponse.maxMarks;
          isCorrect = correctCount === correctAnswers.length;
        }

        questionResponse.autoGrading = {
          isCorrect,
          marksAwarded: Math.max(marksAwarded, 0), // Ensure non-negative
          confidence: 1.0
        };

        questionResponse.finalMarks = questionResponse.autoGrading.marksAwarded;
      }
    }

    // Update attempt status
    if (currentAttempt.status === 'started') {
      currentAttempt.status = 'in_progress';
    }

    // Update time remaining
    currentAttempt.timeRemaining = Math.max(0, totalTime - timeElapsed);

    await currentAttempt.save();

    // Add security event for answer save
    currentAttempt.monitoring.activityLog.push({
      action: 'answer_saved',
      timestamp: new Date(),
      questionId: questionId
    });

    await currentAttempt.save();

    res.json({
      success: true,
      message: 'Answer saved successfully',
      data: {
        questionId,
        isAnswered: questionResponse.isAnswered,
        autoGrading: questionResponse.autoGrading,
        timeRemaining: currentAttempt.timeRemaining
      }
    });

  } catch (error) {
    handleErrors(error, res);
  }
};

// @desc    Submit assessment
// @route   POST /api/assessments/:id/submit
// @access  Private (Student only)
const submitAssessment = async (req, res) => {
  try {
    const { id: assessmentId } = req.params;
    const studentId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(assessmentId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid assessment ID'
      });
    }

    // Find current attempt
    const currentAttempt = await StudentResponse.findOne({
      assessmentId,
      studentId,
      status: { $in: ['started', 'in_progress', 'paused'] }
    });

    if (!currentAttempt) {
      return res.status(404).json({
        success: false,
        message: 'No active attempt found'
      });
    }

    const assessment = await Assessment.findById(assessmentId);
    if (!assessment) {
      return res.status(404).json({
        success: false,
        message: 'Assessment not found'
      });
    }

    // Calculate final scores
    let totalMarksObtained = 0;
    let negativeMarks = 0;

    currentAttempt.responses.forEach(response => {
      if (response.finalMarks > 0) {
        totalMarksObtained += response.finalMarks;
      } else if (response.finalMarks < 0) {
        negativeMarks += Math.abs(response.finalMarks);
      }
    });

    // Update scoring
    currentAttempt.scoring.marksObtained = Math.max(0, totalMarksObtained - negativeMarks);
    currentAttempt.scoring.negativeMarks = negativeMarks;
    currentAttempt.scoring.percentage = Math.round(
      (currentAttempt.scoring.marksObtained / currentAttempt.scoring.totalMarks) * 100
    );

    // Calculate grade
    currentAttempt.calculateFinalGrade(assessment.grading.gradingScale);

    // Update status and timing
    currentAttempt.status = 'submitted';
    currentAttempt.submittedAt = new Date();
    currentAttempt.timeTaken = Math.floor(
      (currentAttempt.submittedAt - currentAttempt.startedAt) / (1000 * 60)
    );

    await currentAttempt.save();

    // Update assessment participant status
    await assessment.updateParticipantStatus(studentId, 'completed', {
      score: currentAttempt.scoring.percentage,
      grade: currentAttempt.scoring.grade,
      submittedAt: currentAttempt.submittedAt
    });

    // Update assessment statistics
    await assessment.updateStatistics({
      score: currentAttempt.scoring.percentage,
      timeTaken: currentAttempt.timeTaken,
      studentId
    });

    // Prepare result data
    const showResults = assessment.configuration.showResults.immediately;
    const resultData = {
      submissionId: currentAttempt._id,
      status: 'submitted',
      submittedAt: currentAttempt.submittedAt,
      timeTaken: currentAttempt.timeTaken
    };

    if (showResults) {
      resultData.results = {
        totalMarks: currentAttempt.scoring.totalMarks,
        marksObtained: currentAttempt.scoring.marksObtained,
        percentage: currentAttempt.scoring.percentage,
        grade: currentAttempt.scoring.grade,
        isPassed: currentAttempt.scoring.percentage >= ((assessment.grading.passingMarks / assessment.grading.totalMarks) * 100),
        breakdown: currentAttempt.scoring.breakdown
      };

      // Include question-wise results if configured
      if (assessment.configuration.showCorrectAnswers) {
        resultData.questionResults = await Promise.all(
          currentAttempt.responses.map(async (response) => {
            const question = await Question.findById(response.questionId);
            return {
              questionId: response.questionId,
              questionText: question.questionText.substring(0, 100) + '...',
              studentAnswer: response.answer,
              correctAnswer: question.correctAnswer,
              isCorrect: response.autoGrading.isCorrect,
              marksAwarded: response.finalMarks,
              maxMarks: response.maxMarks,
              explanation: assessment.configuration.showExplanations ? question.explanation : undefined
            };
          })
        );
      }
    }

    res.json({
      success: true,
      message: 'Assessment submitted successfully',
      data: resultData
    });

  } catch (error) {
    handleErrors(error, res);
  }
};

// @desc    Get assessment results
// @route   GET /api/assessments/:id/results
// @access  Private (Student only - own results)
const getResults = async (req, res) => {
  try {
    const { id: assessmentId } = req.params;
    const studentId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(assessmentId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid assessment ID'
      });
    }

    const assessment = await Assessment.findById(assessmentId);
    if (!assessment) {
      return res.status(404).json({
        success: false,
        message: 'Assessment not found'
      });
    }

    // Get all attempts by the student
    const attempts = await StudentResponse.find({
      assessmentId,
      studentId,
      status: { $in: ['submitted', 'auto_submitted', 'graded'] }
    }).sort({ attemptNumber: -1 });

    if (attempts.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No completed attempts found'
      });
    }

    // Check if results should be shown
    const now = new Date();
    const assessmentEnded = now > assessment.schedule.endDate;
    const showResults = 
      assessment.configuration.showResults.immediately ||
      (assessment.configuration.showResults.afterDeadline && assessmentEnded) ||
      (assessment.configuration.showResults.afterAllComplete && assessment.status === 'completed');

    if (!showResults) {
      return res.status(403).json({
        success: false,
        message: 'Results are not available yet'
      });
    }

    // Get the best attempt (highest score)
    const bestAttempt = attempts.reduce((best, current) => 
      current.scoring.percentage > best.scoring.percentage ? current : best
    );

    // Prepare results data
    const resultsData = {
      assessment: {
        title: assessment.title,
        type: assessment.type,
        subject: assessment.subject,
        class: assessment.class,
        totalMarks: assessment.grading.totalMarks,
        passingMarks: assessment.grading.passingMarks
      },
      
      bestAttempt: {
        attemptNumber: bestAttempt.attemptNumber,
        marksObtained: bestAttempt.scoring.marksObtained,
        totalMarks: bestAttempt.scoring.totalMarks,
        percentage: bestAttempt.scoring.percentage,
        grade: bestAttempt.scoring.grade,
        isPassed: bestAttempt.scoring.percentage >= ((assessment.grading.passingMarks / assessment.grading.totalMarks) * 100),
        timeTaken: bestAttempt.timeTaken,
        submittedAt: bestAttempt.submittedAt,
        breakdown: bestAttempt.scoring.breakdown
      },
      
      allAttempts: attempts.map(attempt => ({
        attemptNumber: attempt.attemptNumber,
        percentage: attempt.scoring.percentage,
        grade: attempt.scoring.grade,
        timeTaken: attempt.timeTaken,
        submittedAt: attempt.submittedAt,
        status: attempt.status
      })),
      
      teacherFeedback: bestAttempt.teacherFeedback
    };

    // Add detailed question results if enabled
    if (assessment.configuration.showCorrectAnswers || assessment.configuration.showExplanations) {
      resultsData.questionDetails = await Promise.all(
        bestAttempt.responses.map(async (response) => {
          const question = await Question.findById(response.questionId);
          const questionDetail = {
            questionId: response.questionId,
            questionText: question.questionText,
            questionType: response.questionType,
            maxMarks: response.maxMarks,
            marksAwarded: response.finalMarks,
            studentAnswer: response.answer
          };

          if (assessment.configuration.showCorrectAnswers) {
            questionDetail.correctAnswer = question.correctAnswer;
            questionDetail.isCorrect = response.autoGrading.isCorrect;
          }

          if (assessment.configuration.showExplanations) {
            questionDetail.explanation = question.explanation;
          }

          return questionDetail;
        })
      );
    }

    res.json({
      success: true,
      message: 'Results retrieved successfully',
      data: resultsData
    });

  } catch (error) {
    handleErrors(error, res);
  }
};

// @desc    Pause assessment
// @route   POST /api/assessments/:id/pause
// @access  Private (Student only)
const pauseAssessment = async (req, res) => {
  try {
    const { id: assessmentId } = req.params;
    const studentId = req.user.id;

    const currentAttempt = await StudentResponse.findOne({
      assessmentId,
      studentId,
      status: { $in: ['started', 'in_progress'] }
    });

    if (!currentAttempt) {
      return res.status(404).json({
        success: false,
        message: 'No active attempt found'
      });
    }

    currentAttempt.status = 'paused';
    await currentAttempt.save();

    res.json({
      success: true,
      message: 'Assessment paused successfully'
    });

  } catch (error) {
    handleErrors(error, res);
  }
};

// @desc    Resume assessment
// @route   POST /api/assessments/:id/resume
// @access  Private (Student only)
const resumeAssessment = async (req, res) => {
  try {
    const { id: assessmentId } = req.params;
    const studentId = req.user.id;

    const currentAttempt = await StudentResponse.findOne({
      assessmentId,
      studentId,
      status: 'paused'
    });

    if (!currentAttempt) {
      return res.status(404).json({
        success: false,
        message: 'No paused attempt found'
      });
    }

    currentAttempt.status = 'in_progress';
    await currentAttempt.save();

    res.json({
      success: true,
      message: 'Assessment resumed successfully',
      data: currentAttempt
    });

  } catch (error) {
    handleErrors(error, res);
  }
};

// @desc    Report security violation
// @route   POST /api/assessments/:id/security-event
// @access  Private (Student only)
const reportSecurityEvent = async (req, res) => {
  try {
    const { id: assessmentId } = req.params;
    const { eventType, details, severity } = req.body;
    const studentId = req.user.id;

    const currentAttempt = await StudentResponse.findOne({
      assessmentId,
      studentId,
      status: { $in: ['started', 'in_progress', 'paused'] }
    });

    if (!currentAttempt) {
      return res.status(404).json({
        success: false,
        message: 'No active attempt found'
      });
    }

    await currentAttempt.addSecurityEvent(eventType, details, severity);

    res.json({
      success: true,
      message: 'Security event recorded'
    });

  } catch (error) {
    handleErrors(error, res);
  }
};

module.exports = {
  startAssessment,
  getCurrentAttempt,
  saveAnswer,
  submitAssessment,
  getResults,
  pauseAssessment,
  resumeAssessment,
  reportSecurityEvent
};
