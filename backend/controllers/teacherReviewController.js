// Teacher Review Controller
// শিক্ষক রেটিং এবং রিভিউ ম্যানেজমেন্ট

const { TeacherReview, TeacherRatingSummary } = require('../models/TeacherReview');
const User = require('../models/User');
const mongoose = require('mongoose');
const { validationResult } = require('express-validator');

// ============================================
// 📝 CREATE TEACHER REVIEW
// ============================================

// @desc    Create a new teacher review
// @route   POST /api/reviews/teacher/:teacherId
// @access  Private (Student only)
const createTeacherReview = async (req, res) => {
  try {
    console.log('📝 Creating teacher review...');

    // Input validation
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { teacherId } = req.params;
    const studentId = req.user._id;
    
    const {
      rating,
      review,
      studyDuration
    } = req.body;

    // Validate teacher exists and is a teacher
    const teacher = await User.findById(teacherId);
    if (!teacher || teacher.role !== 'teacher') {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found'
      });
    }

    // Check if student already reviewed this teacher
    const existingReview = await TeacherReview.findOne({ studentId, teacherId });
    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: 'You have already reviewed this teacher. You can update your existing review.'
      });
    }

    // Verify student has connection with teacher
    const student = await User.findById(studentId);
    const hasConnection = student.connectedTeachers?.some(
      connection => connection.teacher.toString() === teacherId && 
                   connection.status === 'approved'
    );

    if (!hasConnection) {
      return res.status(403).json({
        success: false,
        message: 'You must have an approved connection with this teacher to leave a review'
      });
    }

    // Create review
    const newReview = new TeacherReview({
      studentId,
      teacherId,
      rating: {
        overall: rating.overall,
        teaching: rating.teaching || rating.overall,
        communication: rating.communication || rating.overall,
        punctuality: rating.punctuality || rating.overall,
        helpfulness: rating.helpfulness || rating.overall
      },
      review: {
        title: review.title,
        content: review.content,
        pros: review.pros || [],
        cons: review.cons || [],
        studyDuration
      },
      verification: {
        isVerified: true, // Auto-verify if student has connection
        verificationMethod: 'assessment_completed'
      }
    });

    await newReview.save();

    // Populate response
    const populatedReview = await TeacherReview.findById(newReview._id)
      .populate('studentId', 'name avatar')
      .populate('teacherId', 'name avatar');

    console.log('✅ Teacher review created successfully');

    res.status(201).json({
      success: true,
      message: 'Review created successfully',
      data: {
        review: populatedReview
      }
    });

  } catch (error) {
    console.error('💥 Create teacher review error:', error);
    
    res.status(500).json({
      success: false,
      message: 'Server error while creating review',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// ============================================
// 📊 GET TEACHER REVIEWS
// ============================================

// @desc    Get all reviews for a specific teacher
// @route   GET /api/reviews/teacher/:teacherId
// @access  Public
const getTeacherReviews = async (req, res) => {
  try {
    console.log('📊 Getting teacher reviews...');

    const { teacherId } = req.params;
    const {
      page = 1,
      limit = 10,
      sortBy = 'recent', // recent, rating, helpful
      rating = 'all', // all, 5, 4, 3, 2, 1
      verified = 'all' // all, verified, unverified
    } = req.query;

    // Build filter
    const filter = { 
      teacherId: mongoose.Types.ObjectId(teacherId),
      status: 'active'
    };

    // Rating filter
    if (rating !== 'all') {
      filter['rating.overall'] = parseInt(rating);
    }

    // Verification filter
    if (verified === 'verified') {
      filter['verification.isVerified'] = true;
    } else if (verified === 'unverified') {
      filter['verification.isVerified'] = false;
    }

    // Build sort
    let sortOptions = {};
    switch (sortBy) {
      case 'rating':
        sortOptions = { 'rating.overall': -1, createdAt: -1 };
        break;
      case 'helpful':
        sortOptions = { 'engagement.helpfulVotes': -1, createdAt: -1 };
        break;
      case 'likes':
        sortOptions = { 'reactions.likeCount': -1, createdAt: -1 };
        break;
      default:
        sortOptions = { createdAt: -1 };
    }

    // Get reviews with pagination
    const reviews = await TeacherReview.find(filter)
      .populate('studentId', 'name avatar academicInfo.class')
      .sort(sortOptions)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    // Get total count
    const total = await TeacherReview.countDocuments(filter);

    // Get teacher rating summary
    const ratingSummary = await TeacherRatingSummary.findOne({ teacherId })
      .lean();

    console.log('✅ Teacher reviews retrieved successfully');

    res.status(200).json({
      success: true,
      message: 'Teacher reviews retrieved successfully',
      data: {
        reviews,
        ratingSummary,
        pagination: {
          current: parseInt(page),
          total: Math.ceil(total / limit),
          count: reviews.length,
          totalReviews: total
        }
      }
    });

  } catch (error) {
    console.error('💥 Get teacher reviews error:', error);
    
    res.status(500).json({
      success: false,
      message: 'Server error while getting reviews',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// ============================================
// 👍 LIKE/DISLIKE REVIEW
// ============================================

// @desc    Like or dislike a teacher review
// @route   POST /api/reviews/:reviewId/react
// @access  Private
const reactToReview = async (req, res) => {
  try {
    console.log('👍 Reacting to review...');

    const { reviewId } = req.params;
    const { reaction } = req.body; // 'like' or 'dislike'
    const userId = req.user._id;

    if (!['like', 'dislike'].includes(reaction)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid reaction. Must be "like" or "dislike"'
      });
    }

    const review = await TeacherReview.findById(reviewId);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    // Check if user already reacted
    const likeIndex = review.reactions.likes.findIndex(
      like => like.userId.toString() === userId.toString()
    );
    const dislikeIndex = review.reactions.dislikes.findIndex(
      dislike => dislike.userId.toString() === userId.toString()
    );

    if (reaction === 'like') {
      if (likeIndex >= 0) {
        // Remove like (unlike)
        review.reactions.likes.splice(likeIndex, 1);
      } else {
        // Add like and remove dislike if exists
        if (dislikeIndex >= 0) {
          review.reactions.dislikes.splice(dislikeIndex, 1);
        }
        review.reactions.likes.push({
          userId,
          timestamp: new Date()
        });
      }
    } else {
      if (dislikeIndex >= 0) {
        // Remove dislike (undislike)
        review.reactions.dislikes.splice(dislikeIndex, 1);
      } else {
        // Add dislike and remove like if exists
        if (likeIndex >= 0) {
          review.reactions.likes.splice(likeIndex, 1);
        }
        review.reactions.dislikes.push({
          userId,
          timestamp: new Date()
        });
      }
    }

    await review.save();

    console.log('✅ Review reaction updated successfully');

    res.status(200).json({
      success: true,
      message: `Review ${reaction}d successfully`,
      data: {
        likeCount: review.reactions.likeCount,
        dislikeCount: review.reactions.dislikeCount,
        userReaction: likeIndex >= 0 || dislikeIndex >= 0 ? 
          (likeIndex >= 0 ? 'like' : 'dislike') : 'none'
      }
    });

  } catch (error) {
    console.error('💥 React to review error:', error);
    
    res.status(500).json({
      success: false,
      message: 'Server error while reacting to review',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// ============================================
// ✏️ UPDATE TEACHER REVIEW
// ============================================

// @desc    Update an existing teacher review
// @route   PUT /api/reviews/:reviewId
// @access  Private (Student who created the review)
const updateTeacherReview = async (req, res) => {
  try {
    console.log('✏️ Updating teacher review...');

    const { reviewId } = req.params;
    const studentId = req.user._id;
    const { rating, review } = req.body;

    // Validation
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    // Find review and check ownership
    const existingReview = await TeacherReview.findById(reviewId);
    if (!existingReview) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    if (existingReview.studentId.toString() !== studentId.toString()) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own reviews'
      });
    }

    // Update review
    if (rating) {
      existingReview.rating = {
        overall: rating.overall,
        teaching: rating.teaching || rating.overall,
        communication: rating.communication || rating.overall,
        punctuality: rating.punctuality || rating.overall,
        helpfulness: rating.helpfulness || rating.overall
      };
    }

    if (review) {
      existingReview.review = {
        ...existingReview.review,
        ...review
      };
    }

    existingReview.updatedAt = new Date();

    await existingReview.save();

    // Populate response
    const updatedReview = await TeacherReview.findById(reviewId)
      .populate('studentId', 'name avatar')
      .populate('teacherId', 'name avatar');

    console.log('✅ Teacher review updated successfully');

    res.status(200).json({
      success: true,
      message: 'Review updated successfully',
      data: {
        review: updatedReview
      }
    });

  } catch (error) {
    console.error('💥 Update teacher review error:', error);
    
    res.status(500).json({
      success: false,
      message: 'Server error while updating review',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// ============================================
// 🗑️ DELETE TEACHER REVIEW
// ============================================

// @desc    Delete a teacher review
// @route   DELETE /api/reviews/:reviewId
// @access  Private (Student who created the review or Admin)
const deleteTeacherReview = async (req, res) => {
  try {
    console.log('🗑️ Deleting teacher review...');

    const { reviewId } = req.params;
    const userId = req.user._id;
    const userRole = req.user.role;

    const review = await TeacherReview.findById(reviewId);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    // Check permission (owner or admin)
    if (review.studentId.toString() !== userId.toString() && userRole !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own reviews'
      });
    }

    await TeacherReview.findByIdAndDelete(reviewId);

    console.log('✅ Teacher review deleted successfully');

    res.status(200).json({
      success: true,
      message: 'Review deleted successfully'
    });

  } catch (error) {
    console.error('💥 Delete teacher review error:', error);
    
    res.status(500).json({
      success: false,
      message: 'Server error while deleting review',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// ============================================
// 🏆 GET TOP RATED TEACHERS
// ============================================

// @desc    Get top rated teachers
// @route   GET /api/reviews/teachers/top-rated
// @access  Public
const getTopRatedTeachers = async (req, res) => {
  try {
    console.log('🏆 Getting top rated teachers...');

    const {
      limit = 10,
      subject,
      class: classFilter,
      minReviews = 3
    } = req.query;

    // Build teacher filter
    const teacherFilter = { role: 'teacher', isActive: true };
    
    if (subject) {
      teacherFilter['teacherInfo.subjects'] = subject;
    }
    
    if (classFilter) {
      teacherFilter['teacherInfo.classes'] = parseInt(classFilter);
    }

    // Get top rated teachers
    const topTeachers = await TeacherRatingSummary.aggregate([
      {
        $match: {
          'overall.totalReviews': { $gte: parseInt(minReviews) }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'teacherId',
          foreignField: '_id',
          as: 'teacher'
        }
      },
      {
        $unwind: '$teacher'
      },
      {
        $match: {
          teacher: teacherFilter
        }
      },
      {
        $sort: {
          'overall.averageRating': -1,
          'overall.totalReviews': -1
        }
      },
      {
        $limit: parseInt(limit)
      },
      {
        $project: {
          teacherId: 1,
          'teacher.name': 1,
          'teacher.avatar': 1,
          'teacher.teacherInfo': 1,
          'teacher.bio': 1,
          overall: 1,
          detailed: 1,
          ratingDistribution: 1
        }
      }
    ]);

    console.log('✅ Top rated teachers retrieved successfully');

    res.status(200).json({
      success: true,
      message: 'Top rated teachers retrieved successfully',
      data: {
        teachers: topTeachers,
        count: topTeachers.length
      }
    });

  } catch (error) {
    console.error('💥 Get top rated teachers error:', error);
    
    res.status(500).json({
      success: false,
      message: 'Server error while getting top rated teachers',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// ============================================
// 📊 GET TEACHER RATING SUMMARY
// ============================================

// @desc    Get detailed rating summary for a teacher
// @route   GET /api/reviews/teacher/:teacherId/summary
// @access  Public
const getTeacherRatingSummary = async (req, res) => {
  try {
    console.log('📊 Getting teacher rating summary...');

    const { teacherId } = req.params;

    // Get teacher info
    const teacher = await User.findById(teacherId)
      .select('name avatar bio teacherInfo')
      .lean();

    if (!teacher || teacher.role !== 'teacher') {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found'
      });
    }

    // Get rating summary
    const ratingSummary = await TeacherRatingSummary.findOne({ teacherId })
      .lean();

    // Get recent reviews preview
    const recentReviews = await TeacherReview.find({
      teacherId,
      status: 'active'
    })
      .populate('studentId', 'name avatar academicInfo.class')
      .sort({ createdAt: -1 })
      .limit(3)
      .lean();

    console.log('✅ Teacher rating summary retrieved successfully');

    res.status(200).json({
      success: true,
      message: 'Teacher rating summary retrieved successfully',
      data: {
        teacher,
        ratingSummary: ratingSummary || {
          teacherId,
          overall: { averageRating: 0, totalReviews: 0 },
          detailed: {},
          ratingDistribution: {}
        },
        recentReviews
      }
    });

  } catch (error) {
    console.error('💥 Get teacher rating summary error:', error);
    
    res.status(500).json({
      success: false,
      message: 'Server error while getting teacher rating summary',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// ============================================
// 📤 EXPORT CONTROLLERS
// ============================================

module.exports = {
  createTeacherReview,
  getTeacherReviews,
  reactToReview,
  updateTeacherReview,
  deleteTeacherReview,
  getTopRatedTeachers,
  getTeacherRatingSummary
};
