// Teacher Rating & Review Model
// শিক্ষক রেটিং এবং রিভিউ সিস্টেম

const mongoose = require('mongoose');

// ============================================
// 📝 TEACHER REVIEW SCHEMA
// ============================================

const teacherReviewSchema = new mongoose.Schema({
  // WHO & WHAT
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Student ID is required'],
    index: true
  },
  
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Teacher ID is required'],
    index: true
  },
  
  // ⭐ RATING SYSTEM
  rating: {
    overall: {
      type: Number,
      required: [true, 'Overall rating is required'],
      min: [1, 'Rating must be at least 1'],
      max: [5, 'Rating cannot exceed 5']
    },
    
    // Detailed ratings
    teaching: {
      type: Number,
      min: [1, 'Teaching rating must be at least 1'],
      max: [5, 'Teaching rating cannot exceed 5']
    },
    
    communication: {
      type: Number,
      min: [1, 'Communication rating must be at least 1'],
      max: [5, 'Communication rating cannot exceed 5']
    },
    
    punctuality: {
      type: Number,
      min: [1, 'Punctuality rating must be at least 1'],
      max: [5, 'Punctuality rating cannot exceed 5']
    },
    
    helpfulness: {
      type: Number,
      min: [1, 'Helpfulness rating must be at least 1'],
      max: [5, 'Helpfulness rating cannot exceed 5']
    }
  },
  
  // 💬 REVIEW CONTENT
  review: {
    title: {
      type: String,
      required: [true, 'Review title is required'],
      maxLength: [100, 'Review title cannot exceed 100 characters'],
      trim: true
    },
    
    content: {
      type: String,
      required: [true, 'Review content is required'],
      maxLength: [1000, 'Review content cannot exceed 1000 characters'],
      trim: true
    },
    
    pros: [{
      type: String,
      maxLength: [200, 'Each pro cannot exceed 200 characters']
    }],
    
    cons: [{
      type: String,
      maxLength: [200, 'Each con cannot exceed 200 characters']
    }],
    
    // Study experience duration
    studyDuration: {
      type: String,
      enum: ['1-3 months', '3-6 months', '6-12 months', '1+ years'],
      required: true
    }
  },
  
  // 👍👎 LIKE/DISLIKE SYSTEM
  reactions: {
    likes: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      timestamp: {
        type: Date,
        default: Date.now
      }
    }],
    
    dislikes: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      timestamp: {
        type: Date,
        default: Date.now
      }
    }],
    
    // Calculated counts
    likeCount: {
      type: Number,
      default: 0,
      min: 0
    },
    
    dislikeCount: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  
  // 📊 ENGAGEMENT METRICS
  engagement: {
    helpfulVotes: {
      type: Number,
      default: 0,
      min: 0
    },
    
    reportCount: {
      type: Number,
      default: 0,
      min: 0
    },
    
    viewCount: {
      type: Number,
      default: 0,
      min: 0
    },
    
    responseFromTeacher: {
      content: String,
      timestamp: Date
    }
  },
  
  // 🔍 VERIFICATION STATUS
  verification: {
    isVerified: {
      type: Boolean,
      default: false
    },
    
    verificationMethod: {
      type: String,
      enum: ['assessment_completed', 'long_term_study', 'admin_verified'],
      default: null
    },
    
    verifiedAt: Date
  },
  
  // 📅 TIMESTAMPS
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  },
  
  // 🏷️ STATUS
  status: {
    type: String,
    enum: ['active', 'hidden', 'reported', 'approved', 'rejected'],
    default: 'active',
    index: true
  },
  
  // 🔒 MODERATION
  moderation: {
    flaggedReasons: [{
      type: String,
      enum: ['inappropriate', 'spam', 'fake', 'offensive', 'irrelevant']
    }],
    
    moderatorNotes: String,
    
    moderatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    
    moderatedAt: Date
  }
});

// ============================================
// 📊 TEACHER RATING SUMMARY SCHEMA
// ============================================

const teacherRatingSummarySchema = new mongoose.Schema({
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },
  
  // 📈 OVERALL STATISTICS
  overall: {
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    
    totalReviews: {
      type: Number,
      default: 0,
      min: 0
    },
    
    totalLikes: {
      type: Number,
      default: 0,
      min: 0
    },
    
    totalDislikes: {
      type: Number,
      default: 0,
      min: 0
    },
    
    verifiedReviews: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  
  // ⭐ DETAILED RATINGS
  detailed: {
    teaching: {
      average: { type: Number, default: 0, min: 0, max: 5 },
      count: { type: Number, default: 0, min: 0 }
    },
    
    communication: {
      average: { type: Number, default: 0, min: 0, max: 5 },
      count: { type: Number, default: 0, min: 0 }
    },
    
    punctuality: {
      average: { type: Number, default: 0, min: 0, max: 5 },
      count: { type: Number, default: 0, min: 0 }
    },
    
    helpfulness: {
      average: { type: Number, default: 0, min: 0, max: 5 },
      count: { type: Number, default: 0, min: 0 }
    }
  },
  
  // 📊 RATING DISTRIBUTION
  ratingDistribution: {
    oneStar: { type: Number, default: 0, min: 0 },
    twoStar: { type: Number, default: 0, min: 0 },
    threeStar: { type: Number, default: 0, min: 0 },
    fourStar: { type: Number, default: 0, min: 0 },
    fiveStar: { type: Number, default: 0, min: 0 }
  },
  
  // 🏆 TEACHER RANKING
  ranking: {
    overallRank: {
      type: Number,
      min: 1
    },
    
    subjectRank: {
      type: Number,
      min: 1
    },
    
    classRank: {
      type: Number,
      min: 1
    },
    
    lastUpdated: {
      type: Date,
      default: Date.now
    }
  },
  
  // 📅 TIMESTAMP
  lastUpdated: {
    type: Date,
    default: Date.now
  }
});

// ============================================
// 🔍 COMPOUND INDEXES FOR PERFORMANCE
// ============================================

// Review query optimization
teacherReviewSchema.index({ teacherId: 1, status: 1, createdAt: -1 });
teacherReviewSchema.index({ studentId: 1, teacherId: 1 }, { unique: true }); // One review per student-teacher pair

// Search and filter optimization
teacherReviewSchema.index({ 'rating.overall': -1, createdAt: -1 });
teacherReviewSchema.index({ 'verification.isVerified': 1, 'rating.overall': -1 });

// Engagement tracking
teacherReviewSchema.index({ 'reactions.likeCount': -1 });
teacherReviewSchema.index({ 'engagement.helpfulVotes': -1 });

// ============================================
// 📊 MIDDLEWARE FOR AUTO-CALCULATION
// ============================================

// Auto-update like/dislike counts
teacherReviewSchema.pre('save', function(next) {
  if (this.isModified('reactions.likes') || this.isModified('reactions.dislikes')) {
    this.reactions.likeCount = this.reactions.likes.length;
    this.reactions.dislikeCount = this.reactions.dislikes.length;
  }
  
  if (this.isModified()) {
    this.updatedAt = new Date();
  }
  
  next();
});

// Update teacher rating summary after review changes
teacherReviewSchema.post('save', async function() {
  try {
    await updateTeacherRatingSummary(this.teacherId);
  } catch (error) {
    console.error('Error updating teacher rating summary:', error);
  }
});

teacherReviewSchema.post('remove', async function() {
  try {
    await updateTeacherRatingSummary(this.teacherId);
  } catch (error) {
    console.error('Error updating teacher rating summary after removal:', error);
  }
});

// ============================================
// 🔢 RATING SUMMARY UPDATE FUNCTION
// ============================================

async function updateTeacherRatingSummary(teacherId) {
  const TeacherReview = mongoose.model('TeacherReview');
  const TeacherRatingSummary = mongoose.model('TeacherRatingSummary');
  
  // Aggregate all reviews for this teacher
  const aggregation = await TeacherReview.aggregate([
    { $match: { teacherId: mongoose.Types.ObjectId(teacherId), status: 'active' } },
    {
      $group: {
        _id: '$teacherId',
        totalReviews: { $sum: 1 },
        averageRating: { $avg: '$rating.overall' },
        totalLikes: { $sum: '$reactions.likeCount' },
        totalDislikes: { $sum: '$reactions.dislikeCount' },
        verifiedReviews: { 
          $sum: { $cond: ['$verification.isVerified', 1, 0] } 
        },
        
        // Detailed averages
        avgTeaching: { $avg: '$rating.teaching' },
        avgCommunication: { $avg: '$rating.communication' },
        avgPunctuality: { $avg: '$rating.punctuality' },
        avgHelpfulness: { $avg: '$rating.helpfulness' },
        
        // Rating distribution
        oneStarCount: { 
          $sum: { $cond: [{ $eq: ['$rating.overall', 1] }, 1, 0] } 
        },
        twoStarCount: { 
          $sum: { $cond: [{ $eq: ['$rating.overall', 2] }, 1, 0] } 
        },
        threeStarCount: { 
          $sum: { $cond: [{ $eq: ['$rating.overall', 3] }, 1, 0] } 
        },
        fourStarCount: { 
          $sum: { $cond: [{ $eq: ['$rating.overall', 4] }, 1, 0] } 
        },
        fiveStarCount: { 
          $sum: { $cond: [{ $eq: ['$rating.overall', 5] }, 1, 0] } 
        }
      }
    }
  ]);
  
  const data = aggregation[0] || {};
  
  // Update or create summary
  await TeacherRatingSummary.findOneAndUpdate(
    { teacherId },
    {
      'overall.averageRating': data.averageRating || 0,
      'overall.totalReviews': data.totalReviews || 0,
      'overall.totalLikes': data.totalLikes || 0,
      'overall.totalDislikes': data.totalDislikes || 0,
      'overall.verifiedReviews': data.verifiedReviews || 0,
      
      'detailed.teaching.average': data.avgTeaching || 0,
      'detailed.communication.average': data.avgCommunication || 0,
      'detailed.punctuality.average': data.avgPunctuality || 0,
      'detailed.helpfulness.average': data.avgHelpfulness || 0,
      
      'ratingDistribution.oneStar': data.oneStarCount || 0,
      'ratingDistribution.twoStar': data.twoStarCount || 0,
      'ratingDistribution.threeStar': data.threeStarCount || 0,
      'ratingDistribution.fourStar': data.fourStarCount || 0,
      'ratingDistribution.fiveStar': data.fiveStarCount || 0,
      
      lastUpdated: new Date()
    },
    { upsert: true, new: true }
  );
}

// ============================================
// 📤 EXPORT MODELS
// ============================================

const TeacherReview = mongoose.model('TeacherReview', teacherReviewSchema);
const TeacherRatingSummary = mongoose.model('TeacherRatingSummary', teacherRatingSummarySchema);

module.exports = {
  TeacherReview,
  TeacherRatingSummary,
  updateTeacherRatingSummary
};
