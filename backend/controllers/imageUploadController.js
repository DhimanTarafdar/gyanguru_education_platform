const multer = require('multer');
const path = require('path');
const fs = require('fs');
const StudentResponse = require('../models/StudentResponse');
const Assessment = require('../models/Assessment');
const Question = require('../models/Question');
const { validationResult } = require('express-validator');
const mongoose = require('mongoose');

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadPath = path.join(__dirname, '../uploads/answer-images');
    
    // Create directory if it doesn't exist
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    
    cb(null, uploadPath);
  },
  filename: function (req, file, cb) {
    // Generate unique filename: studentId_assessmentId_questionId_timestamp.ext
    const { studentId, assessmentId, questionId } = req.body;
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const filename = `${studentId}_${assessmentId}_${questionId}_${timestamp}${ext}`;
    cb(null, filename);
  }
});

// File filter for images only
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only image files (JPEG, PNG, WebP) are allowed'), false);
  }
};

// Multer configuration
const uploadMiddleware = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 5 // Maximum 5 images per question
  },
  fileFilter: fileFilter
}).array('answerImages', 5);

// Error handling utility
const handleErrors = (error, res) => {
  console.error('Image Upload Controller Error:', error);
  
  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      message: 'File size too large. Maximum 10MB per image.'
    });
  }
  
  if (error.code === 'LIMIT_FILE_COUNT') {
    return res.status(400).json({
      success: false,
      message: 'Too many files. Maximum 5 images per question.'
    });
  }
  
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
};

// @desc    Upload answer images for CQ/Essay questions
// @route   POST /api/submissions/:assessmentId/upload-images/:questionId
// @access  Private (Student only)
const uploadAnswerImages = async (req, res) => {
  // Apply multer middleware first
  uploadMiddleware(req, res, async (err) => {
    if (err) {
      return res.status(400).json({
        success: false,
        message: err.message
      });
    }

    try {
      const { assessmentId, questionId } = req.params;
      const studentId = req.user.id;

    // Validation
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

    // Check if assessment is still active
    const assessment = await Assessment.findById(assessmentId);
    const now = new Date();
    
    if (now > assessment.schedule.endDate) {
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

    // Check if question type supports image upload
    const supportedTypes = ['Long Answer', 'Essay', 'Short Answer'];
    if (!supportedTypes.includes(questionResponse.questionType)) {
      return res.status(400).json({
        success: false,
        message: 'Image upload not supported for this question type'
      });
    }

    // Process uploaded files
    const uploadedImages = req.files.map(file => ({
      filename: file.filename,
      originalName: file.originalname,
      path: file.path,
      size: file.size,
      mimetype: file.mimetype,
      uploadedAt: new Date(),
      url: `/uploads/answer-images/${file.filename}`
    }));

    // Update question response with image URLs
    if (!questionResponse.answer.imageUrls) {
      questionResponse.answer.imageUrls = [];
    }

    // Add new image URLs
    uploadedImages.forEach(img => {
      questionResponse.answer.imageUrls.push(img.url);
    });

    // Mark as answered
    questionResponse.isAnswered = true;

    // Update attempt status
    if (currentAttempt.status === 'started') {
      currentAttempt.status = 'in_progress';
    }

    await currentAttempt.save();

    // Log activity
    currentAttempt.monitoring.activityLog.push({
      action: 'images_uploaded',
      timestamp: new Date(),
      questionId: questionId
    });

    await currentAttempt.save();

    res.status(200).json({
      success: true,
      message: `${uploadedImages.length} image(s) uploaded successfully`,
      data: {
        questionId,
        uploadedImages: uploadedImages.map(img => ({
          filename: img.filename,
          url: img.url,
          size: img.size
        })),
        totalImages: questionResponse.answer.imageUrls.length
      }
    });

    } catch (error) {
      // Clean up uploaded files on error
      if (req.files) {
        req.files.forEach(file => {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        });
      }
      
      handleErrors(error, res);
    }
  }); // Close multer callback
};

// @desc    Get uploaded images for a question
// @route   GET /api/submissions/:assessmentId/images/:questionId
// @access  Private (Student - own images, Teacher - all images)
const getAnswerImages = async (req, res) => {
  try {
    const { assessmentId, questionId } = req.params;
    const { studentId } = req.query; // For teachers to view specific student's images
    const userId = req.user.id;
    const userRole = req.user.role;

    // Validation
    if (!mongoose.Types.ObjectId.isValid(assessmentId) || 
        !mongoose.Types.ObjectId.isValid(questionId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid assessment or question ID'
      });
    }

    // Determine whose images to fetch
    let targetStudentId = userId; // Default to current user
    
    if (userRole === 'teacher' && studentId) {
      // Teacher viewing specific student's images
      targetStudentId = studentId;
      
      // Verify teacher has access to this assessment
      const assessment = await Assessment.findById(assessmentId);
      if (!assessment || assessment.createdBy.toString() !== userId) {
        const isCollaborator = assessment.collaborators.some(c => 
          c.teacherId.toString() === userId
        );
        
        if (!isCollaborator) {
          return res.status(403).json({
            success: false,
            message: 'Access denied to this assessment'
          });
        }
      }
    }

    // Find the student response
    const studentResponse = await StudentResponse.findOne({
      assessmentId,
      studentId: targetStudentId
    }).sort({ attemptNumber: -1 }); // Get latest attempt

    if (!studentResponse) {
      return res.status(404).json({
        success: false,
        message: 'No attempt found'
      });
    }

    // Find the question response
    const questionResponse = studentResponse.responses.find(
      r => r.questionId.toString() === questionId
    );

    if (!questionResponse) {
      return res.status(404).json({
        success: false,
        message: 'Question not found in this attempt'
      });
    }

    // Get image information
    const imageUrls = questionResponse.answer.imageUrls || [];
    const imageInfo = imageUrls.map(url => {
      const filename = path.basename(url);
      const fullPath = path.join(__dirname, '../uploads/answer-images', filename);
      
      return {
        url,
        filename,
        exists: fs.existsSync(fullPath),
        size: fs.existsSync(fullPath) ? fs.statSync(fullPath).size : 0
      };
    });

    res.json({
      success: true,
      message: 'Images retrieved successfully',
      data: {
        questionId,
        studentId: targetStudentId,
        totalImages: imageInfo.length,
        images: imageInfo,
        grading: {
          isGraded: questionResponse.manualGrading.marksAwarded !== undefined,
          marksAwarded: questionResponse.manualGrading.marksAwarded,
          maxMarks: questionResponse.maxMarks,
          feedback: questionResponse.manualGrading.feedback,
          gradedBy: questionResponse.manualGrading.gradedBy,
          gradedAt: questionResponse.manualGrading.gradedAt
        }
      }
    });

  } catch (error) {
    handleErrors(error, res);
  }
};

// @desc    Grade student's image answers (Teacher only)
// @route   POST /api/submissions/:assessmentId/grade/:questionId
// @access  Private (Teacher only)
const gradeImageAnswer = async (req, res) => {
  try {
    const { assessmentId, questionId } = req.params;
    const { 
      studentId, 
      marksAwarded, 
      feedback, 
      rubricScores 
    } = req.body;
    const teacherId = req.user.id;

    // Validation
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    // Validate IDs
    if (!mongoose.Types.ObjectId.isValid(assessmentId) || 
        !mongoose.Types.ObjectId.isValid(questionId) ||
        !mongoose.Types.ObjectId.isValid(studentId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid assessment, question, or student ID'
      });
    }

    // Verify teacher has access to this assessment
    const assessment = await Assessment.findById(assessmentId);
    if (!assessment) {
      return res.status(404).json({
        success: false,
        message: 'Assessment not found'
      });
    }

    const hasAccess = 
      assessment.createdBy.toString() === teacherId ||
      assessment.collaborators.some(c => 
        c.teacherId.toString() === teacherId && 
        (c.role === 'co-creator' || c.permissions.includes('grade'))
      );

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Permission denied to grade this assessment'
      });
    }

    // Find the student response (latest attempt)
    const studentResponse = await StudentResponse.findOne({
      assessmentId,
      studentId,
      status: { $in: ['submitted', 'auto_submitted', 'graded'] }
    }).sort({ attemptNumber: -1 });

    if (!studentResponse) {
      return res.status(404).json({
        success: false,
        message: 'No submitted attempt found for this student'
      });
    }

    // Find the question response
    const questionResponse = studentResponse.responses.find(
      r => r.questionId.toString() === questionId
    );

    if (!questionResponse) {
      return res.status(404).json({
        success: false,
        message: 'Question not found in this attempt'
      });
    }

    // Validate marks
    if (marksAwarded < 0 || marksAwarded > questionResponse.maxMarks) {
      return res.status(400).json({
        success: false,
        message: `Marks must be between 0 and ${questionResponse.maxMarks}`
      });
    }

    // Update manual grading
    questionResponse.manualGrading = {
      marksAwarded: parseFloat(marksAwarded),
      feedback: feedback || '',
      gradedBy: teacherId,
      gradedAt: new Date(),
      rubricScores: rubricScores || []
    };

    // Update final marks
    questionResponse.finalMarks = questionResponse.manualGrading.marksAwarded;

    // Recalculate total scores
    const totalMarksObtained = studentResponse.responses.reduce((total, response) => {
      return total + (response.finalMarks || 0);
    }, 0);

    studentResponse.scoring.marksObtained = totalMarksObtained;
    studentResponse.scoring.percentage = Math.round(
      (totalMarksObtained / studentResponse.scoring.totalMarks) * 100
    );

    // Update grade
    studentResponse.calculateFinalGrade(assessment.grading.gradingScale);

    // Update status to graded if all questions are graded
    const allGraded = studentResponse.responses.every(response => 
      response.finalMarks !== undefined && response.finalMarks >= 0
    );

    if (allGraded && studentResponse.status !== 'graded') {
      studentResponse.status = 'graded';
    }

    await studentResponse.save();

    // Update assessment statistics
    await assessment.updateStatistics({
      score: studentResponse.scoring.percentage,
      timeTaken: studentResponse.timeTaken,
      studentId
    });

    res.json({
      success: true,
      message: 'Answer graded successfully',
      data: {
        questionId,
        studentId,
        grading: {
          marksAwarded: questionResponse.manualGrading.marksAwarded,
          maxMarks: questionResponse.maxMarks,
          feedback: questionResponse.manualGrading.feedback,
          gradedAt: questionResponse.manualGrading.gradedAt
        },
        updatedScores: {
          totalMarks: studentResponse.scoring.totalMarks,
          marksObtained: studentResponse.scoring.marksObtained,
          percentage: studentResponse.scoring.percentage,
          grade: studentResponse.scoring.grade
        },
        isFullyGraded: allGraded
      }
    });

  } catch (error) {
    handleErrors(error, res);
  }
};

// @desc    Get all students' submissions for grading (Teacher only)
// @route   GET /api/assessments/:assessmentId/submissions
// @access  Private (Teacher only)
const getSubmissionsForGrading = async (req, res) => {
  try {
    const { assessmentId } = req.params;
    const { 
      page = 1, 
      limit = 20, 
      status = 'submitted',
      questionType = 'all' 
    } = req.query;
    const teacherId = req.user.id;

    // Verify teacher has access
    const assessment = await Assessment.findById(assessmentId);
    if (!assessment) {
      return res.status(404).json({
        success: false,
        message: 'Assessment not found'
      });
    }

    const hasAccess = 
      assessment.createdBy.toString() === teacherId ||
      assessment.collaborators.some(c => c.teacherId.toString() === teacherId);

    if (!hasAccess) {
      return res.status(403).json({
        success: false,
        message: 'Access denied to this assessment'
      });
    }

    // Build filter query
    const filter = { 
      assessmentId,
      status: { $in: ['submitted', 'auto_submitted', 'graded'] }
    };

    if (status !== 'all') {
      filter.status = status;
    }

    // Execute query with pagination
    const skip = (page - 1) * limit;
    const submissions = await StudentResponse.find(filter)
      .populate('studentId', 'name email avatar studentInfo')
      .populate('responses.questionId', 'questionText type')
      .sort({ submittedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Filter by question type if specified
    let filteredSubmissions = submissions;
    if (questionType !== 'all') {
      filteredSubmissions = submissions.map(submission => ({
        ...submission.toObject(),
        responses: submission.responses.filter(response => {
          if (questionType === 'subjective') {
            return ['Long Answer', 'Essay', 'Short Answer'].includes(response.questionType);
          }
          return response.questionType === questionType;
        })
      })).filter(submission => submission.responses.length > 0);
    }

    // Get pending grading count
    const pendingGradingCount = await StudentResponse.countDocuments({
      assessmentId,
      status: { $in: ['submitted', 'auto_submitted'] },
      'responses.manualGrading.marksAwarded': { $exists: false }
    });

    const total = await StudentResponse.countDocuments(filter);

    res.json({
      success: true,
      message: 'Submissions retrieved successfully',
      data: {
        submissions: filteredSubmissions,
        statistics: {
          totalSubmissions: total,
          pendingGrading: pendingGradingCount,
          averageScore: assessment.statistics.averageScore,
          completionRate: assessment.participationRate
        },
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        }
      }
    });

  } catch (error) {
    handleErrors(error, res);
  }
};

// @desc    Serve uploaded images
// @route   GET /uploads/answer-images/:filename
// @access  Private (with proper authentication)
const serveImage = (req, res) => {
  try {
    const { filename } = req.params;
    const imagePath = path.join(__dirname, '../uploads/answer-images', filename);
    
    // Check if file exists
    if (!fs.existsSync(imagePath)) {
      return res.status(404).json({
        success: false,
        message: 'Image not found'
      });
    }
    
    // Security check - ensure filename doesn't contain path traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return res.status(400).json({
        success: false,
        message: 'Invalid filename'
      });
    }
    
    // Set appropriate headers
    const ext = path.extname(filename).toLowerCase();
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp'
    };
    
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400'); // Cache for 1 day
    
    // Stream the file
    const fileStream = fs.createReadStream(imagePath);
    fileStream.pipe(res);
    
  } catch (error) {
    console.error('Error serving image:', error);
    res.status(500).json({
      success: false,
      message: 'Error serving image'
    });
  }
};

module.exports = {
  uploadMiddleware, // Middleware for handling multiple file uploads
  uploadAnswerImages,
  getAnswerImages,
  gradeImageAnswer,
  getSubmissionsForGrading,
  serveImage
};
