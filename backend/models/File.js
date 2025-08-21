const mongoose = require('mongoose');

// 📁 GyanGuru Advanced File Management System
// Features: PDF documents, Audio recordings, Video tutorials, Study materials, Bulk operations

const fileSchema = new mongoose.Schema({
  // Basic file information
  originalName: {
    type: String,
    required: true,
    trim: true
  },
  
  fileName: {
    type: String,
    required: true,
    unique: true
  },
  
  filePath: {
    type: String,
    required: true
  },
  
  fileUrl: {
    type: String,
    required: true
  },
  
  // File metadata
  fileSize: {
    type: Number,
    required: true
  },
  
  mimeType: {
    type: String,
    required: true
  },
  
  fileType: {
    type: String,
    required: true,
    enum: [
      'pdf_document',
      'audio_recording',
      'video_tutorial',
      'study_material',
      'assignment_submission',
      'answer_image',
      'profile_image',
      'document',
      'presentation',
      'spreadsheet',
      'text_file',
      'other'
    ]
  },
  
  category: {
    type: String,
    required: true,
    enum: [
      'academic_content',
      'study_materials',
      'assignments',
      'submissions',
      'tutorials',
      'recordings',
      'documents',
      'media',
      'resources',
      'other'
    ]
  },
  
  // File ownership and access
  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  uploadedByRole: {
    type: String,
    enum: ['student', 'teacher', 'admin'],
    required: true
  },
  
  // Access control
  visibility: {
    type: String,
    enum: ['private', 'public', 'shared', 'restricted'],
    default: 'private'
  },
  
  sharedWith: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    role: {
      type: String,
      enum: ['viewer', 'editor', 'admin']
    },
    sharedAt: {
      type: Date,
      default: Date.now
    },
    sharedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  
  // Academic context
  subject: {
    type: String,
    trim: true
  },
  
  topic: {
    type: String,
    trim: true
  },
  
  gradeLevel: {
    type: String,
    enum: ['6th', '7th', '8th', '9th', '10th', '11th', '12th', 'undergraduate', 'graduate'],
    trim: true
  },
  
  // Content description
  title: {
    type: String,
    trim: true
  },
  
  description: {
    type: String,
    trim: true
  },
  
  tags: [{
    type: String,
    trim: true
  }],
  
  // File processing status
  processingStatus: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  
  thumbnail: {
    type: String,
    trim: true
  },
  
  // Audio/Video specific metadata
  duration: {
    type: Number, // in seconds
    min: 0
  },
  
  quality: {
    type: String,
    enum: ['low', 'medium', 'high', 'ultra']
  },
  
  // PDF specific metadata
  pageCount: {
    type: Number,
    min: 1
  },
  
  textExtracted: {
    type: String
  },
  
  // Download and usage tracking
  downloadCount: {
    type: Number,
    default: 0
  },
  
  viewCount: {
    type: Number,
    default: 0
  },
  
  lastAccessed: {
    type: Date
  },
  
  // File versioning
  version: {
    type: Number,
    default: 1
  },
  
  previousVersions: [{
    fileName: String,
    filePath: String,
    version: Number,
    uploadedAt: Date,
    fileSize: Number
  }],
  
  // Security and scanning
  virusScanned: {
    type: Boolean,
    default: false
  },
  
  scanResults: {
    type: String,
    enum: ['clean', 'infected', 'suspicious', 'unknown'],
    default: 'unknown'
  },
  
  // File organization
  folder: {
    type: String,
    trim: true
  },
  
  parentFolder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Folder'
  },
  
  // Backup and storage
  isBackedUp: {
    type: Boolean,
    default: false
  },
  
  backupLocation: {
    type: String
  },
  
  cloudStorageId: {
    type: String
  },
  
  // File relationships
  relatedFiles: [{
    fileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'File'
    },
    relationship: {
      type: String,
      enum: ['supplement', 'prerequisite', 'followup', 'alternative', 'translation']
    }
  }],
  
  // Associated entities
  associatedAssessment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Assessment'
  },
  
  associatedQuestion: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question'
  },
  
  associatedSubmission: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Submission'
  },
  
  // Compression and optimization
  isCompressed: {
    type: Boolean,
    default: false
  },
  
  originalSize: {
    type: Number
  },
  
  compressionRatio: {
    type: Number
  },
  
  // File quality and rating
  qualityRating: {
    type: Number,
    min: 1,
    max: 5
  },
  
  userRatings: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    comment: String,
    ratedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // File analytics
  analytics: {
    dailyViews: [{
      date: Date,
      count: Number
    }],
    topViewers: [{
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      viewCount: Number,
      lastViewed: Date
    }],
    averageViewTime: Number,
    popularityScore: Number
  },
  
  // Workflow and approval
  approvalStatus: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'under_review'],
    default: 'pending'
  },
  
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  approvedAt: {
    type: Date
  },
  
  rejectionReason: {
    type: String
  },
  
  // Expiry and lifecycle
  expiresAt: {
    type: Date
  },
  
  isArchived: {
    type: Boolean,
    default: false
  },
  
  archivedAt: {
    type: Date
  },
  
  // File flags and status
  isFeatured: {
    type: Boolean,
    default: false
  },
  
  isRecommended: {
    type: Boolean,
    default: false
  },
  
  flags: [{
    type: {
      type: String,
      enum: ['inappropriate', 'copyright', 'spam', 'low_quality', 'other']
    },
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reason: String,
    reportedAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ['pending', 'reviewed', 'resolved', 'dismissed'],
      default: 'pending'
    }
  }],
  
  // Timestamps
  uploadedAt: {
    type: Date,
    default: Date.now
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for performance
fileSchema.index({ uploadedBy: 1, uploadedAt: -1 });
fileSchema.index({ fileType: 1, category: 1 });
fileSchema.index({ subject: 1, topic: 1 });
fileSchema.index({ tags: 1 });
fileSchema.index({ visibility: 1, approvalStatus: 1 });
fileSchema.index({ mimeType: 1 });
fileSchema.index({ uploadedAt: -1 });
fileSchema.index({ downloadCount: -1 });
fileSchema.index({ viewCount: -1 });
fileSchema.index({ 'analytics.popularityScore': -1 });

// Virtual fields
fileSchema.virtual('fileSizeFormatted').get(function() {
  const bytes = this.fileSize;
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
});

fileSchema.virtual('durationFormatted').get(function() {
  if (!this.duration) return null;
  const hours = Math.floor(this.duration / 3600);
  const minutes = Math.floor((this.duration % 3600) / 60);
  const seconds = this.duration % 60;
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
});

fileSchema.virtual('ageInDays').get(function() {
  return Math.floor((Date.now() - this.uploadedAt) / (1000 * 60 * 60 * 24));
});

fileSchema.virtual('averageRating').get(function() {
  if (!this.userRatings || this.userRatings.length === 0) return 0;
  const sum = this.userRatings.reduce((acc, rating) => acc + rating.rating, 0);
  return (sum / this.userRatings.length).toFixed(1);
});

// Instance methods
fileSchema.methods.updateAnalytics = function() {
  // Update popularity score based on views, downloads, and ratings
  const viewScore = Math.log(this.viewCount + 1) * 2;
  const downloadScore = Math.log(this.downloadCount + 1) * 3;
  const ratingScore = this.averageRating * 4;
  const ageScore = Math.max(0, 30 - this.ageInDays) / 30 * 2;
  
  this.analytics.popularityScore = viewScore + downloadScore + ratingScore + ageScore;
  return this.save();
};

fileSchema.methods.incrementView = async function(userId) {
  this.viewCount += 1;
  this.lastAccessed = new Date();
  
  // Update daily views
  const today = new Date().toDateString();
  const dailyView = this.analytics.dailyViews.find(dv => 
    new Date(dv.date).toDateString() === today
  );
  
  if (dailyView) {
    dailyView.count += 1;
  } else {
    this.analytics.dailyViews.push({ date: new Date(), count: 1 });
  }
  
  // Update top viewers
  if (userId) {
    const topViewer = this.analytics.topViewers.find(tv => 
      tv.userId.toString() === userId.toString()
    );
    
    if (topViewer) {
      topViewer.viewCount += 1;
      topViewer.lastViewed = new Date();
    } else {
      this.analytics.topViewers.push({
        userId,
        viewCount: 1,
        lastViewed: new Date()
      });
    }
  }
  
  await this.updateAnalytics();
  return this.save();
};

fileSchema.methods.incrementDownload = async function() {
  this.downloadCount += 1;
  await this.updateAnalytics();
  return this.save();
};

fileSchema.methods.addRating = function(userId, rating, comment = '') {
  // Remove existing rating from this user
  this.userRatings = this.userRatings.filter(r => 
    r.userId.toString() !== userId.toString()
  );
  
  // Add new rating
  this.userRatings.push({
    userId,
    rating,
    comment,
    ratedAt: new Date()
  });
  
  return this.updateAnalytics();
};

fileSchema.methods.shareWith = function(userId, role = 'viewer', sharedBy) {
  // Remove existing share with this user
  this.sharedWith = this.sharedWith.filter(sw => 
    sw.userId.toString() !== userId.toString()
  );
  
  // Add new share
  this.sharedWith.push({
    userId,
    role,
    sharedAt: new Date(),
    sharedBy
  });
  
  return this.save();
};

fileSchema.methods.removeShare = function(userId) {
  this.sharedWith = this.sharedWith.filter(sw => 
    sw.userId.toString() !== userId.toString()
  );
  return this.save();
};

fileSchema.methods.canAccess = function(userId, userRole) {
  // File owner can always access
  if (this.uploadedBy.toString() === userId.toString()) {
    return true;
  }
  
  // Public files can be accessed by all
  if (this.visibility === 'public' && this.approvalStatus === 'approved') {
    return true;
  }
  
  // Check if specifically shared with user
  const sharedAccess = this.sharedWith.find(sw => 
    sw.userId.toString() === userId.toString()
  );
  if (sharedAccess) {
    return true;
  }
  
  // Admin can access all files
  if (userRole === 'admin') {
    return true;
  }
  
  return false;
};

fileSchema.methods.archive = function() {
  this.isArchived = true;
  this.archivedAt = new Date();
  return this.save();
};

fileSchema.methods.restore = function() {
  this.isArchived = false;
  this.archivedAt = null;
  return this.save();
};

// Static methods
fileSchema.statics.getPopularFiles = function(limit = 10, category = null) {
  const query = { 
    visibility: 'public', 
    approvalStatus: 'approved',
    isArchived: false
  };
  
  if (category) {
    query.category = category;
  }
  
  return this.find(query)
    .sort({ 'analytics.popularityScore': -1 })
    .limit(limit)
    .populate('uploadedBy', 'username fullName role');
};

fileSchema.statics.getRecentFiles = function(limit = 10, fileType = null) {
  const query = { 
    visibility: 'public', 
    approvalStatus: 'approved',
    isArchived: false
  };
  
  if (fileType) {
    query.fileType = fileType;
  }
  
  return this.find(query)
    .sort({ uploadedAt: -1 })
    .limit(limit)
    .populate('uploadedBy', 'username fullName role');
};

fileSchema.statics.searchFiles = function(searchTerm, options = {}) {
  const query = {
    $and: [
      {
        $or: [
          { title: { $regex: searchTerm, $options: 'i' } },
          { description: { $regex: searchTerm, $options: 'i' } },
          { tags: { $regex: searchTerm, $options: 'i' } },
          { originalName: { $regex: searchTerm, $options: 'i' } }
        ]
      },
      { visibility: 'public' },
      { approvalStatus: 'approved' },
      { isArchived: false }
    ]
  };
  
  if (options.fileType) {
    query.$and.push({ fileType: options.fileType });
  }
  
  if (options.category) {
    query.$and.push({ category: options.category });
  }
  
  if (options.subject) {
    query.$and.push({ subject: options.subject });
  }
  
  return this.find(query)
    .sort({ 'analytics.popularityScore': -1 })
    .limit(options.limit || 20)
    .populate('uploadedBy', 'username fullName role');
};

fileSchema.statics.getFileAnalytics = async function(timeframe = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - timeframe);
  
  const pipeline = [
    {
      $match: {
        uploadedAt: { $gte: startDate },
        isArchived: false
      }
    },
    {
      $group: {
        _id: null,
        totalFiles: { $sum: 1 },
        totalSize: { $sum: '$fileSize' },
        totalViews: { $sum: '$viewCount' },
        totalDownloads: { $sum: '$downloadCount' },
        avgRating: { $avg: '$qualityRating' },
        filesByType: {
          $push: {
            fileType: '$fileType',
            category: '$category'
          }
        }
      }
    }
  ];
  
  return this.aggregate(pipeline);
};

// Pre-save middleware
fileSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // Update popularity score if analytics changed
  if (this.isModified('viewCount') || this.isModified('downloadCount') || this.isModified('userRatings')) {
    this.updateAnalytics();
  }
  
  next();
});

// Pre-remove middleware
fileSchema.pre('remove', function(next) {
  // Clean up physical file when document is removed
  const fs = require('fs');
  const path = require('path');
  
  if (fs.existsSync(this.filePath)) {
    fs.unlinkSync(this.filePath);
  }
  
  // Clean up thumbnail if exists
  if (this.thumbnail && fs.existsSync(this.thumbnail)) {
    fs.unlinkSync(this.thumbnail);
  }
  
  next();
});

module.exports = mongoose.model('File', fileSchema);
