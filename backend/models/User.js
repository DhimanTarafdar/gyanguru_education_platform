const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  // Basic Information
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxLength: [50, 'Name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minLength: [6, 'Password must be at least 6 characters'],
    select: false // Don't include password in queries by default
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    match: [/^01[3-9]\d{8}$/, 'Please enter a valid Bangladesh phone number']
  },
  
  // Role & Status
  role: {
    type: String,
    enum: ['student', 'teacher', 'admin'],
    required: [true, 'Role is required']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  emailVerified: {
    type: Boolean,
    default: false
  },
  
  // Profile Information
  avatar: {
    type: String, // URL to profile image
    default: null
  },
  bio: {
    type: String,
    maxLength: [500, 'Bio cannot exceed 500 characters']
  },
  dateOfBirth: {
    type: Date
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other']
  },
  address: {
    district: String,
    upazila: String,
    details: String
  },
  
  // Academic Information (for students)
  academicInfo: {
    class: {
      type: Number,
      min: [1, 'Class must be between 1-12'],
      max: [12, 'Class must be between 1-12']
    },
    group: {
      type: String,
      enum: ['science', 'commerce', 'arts']
    },
    institution: String,
    subjects: [String] // Array of subject names
  },
  
  // Professional Information (for teachers)
  teacherInfo: {
    qualification: String,
    experience: Number, // Years of experience
    specialization: [String], // Array of subjects
    subjects: [String], // Subjects teacher can teach
    classes: [Number], // Classes teacher can handle (1-12)
    rating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    totalStudents: {
      type: Number,
      default: 0
    },
    isVerified: {
      type: Boolean,
      default: false
    },
    acceptingStudents: {
      type: Boolean,
      default: true
    },
    preferredMode: {
      type: String,
      enum: ['online', 'offline', 'both'],
      default: 'both'
    }
  },
  
  // Relationships
  connectedTeachers: [{
    teacher: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    requestDate: {
      type: Date,
      default: Date.now
    },
    approvedDate: Date
  }],
  
  connectedStudents: [{
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    requestDate: {
      type: Date,
      default: Date.now
    },
    approvedDate: Date
  }],
  
  // Security & Tracking
  lastLogin: {
    type: Date,
    default: Date.now
  },
  loginCount: {
    type: Number,
    default: 0
  },
  refreshTokens: [String], // For JWT refresh tokens
  
  // Password Reset
  resetPasswordToken: String,
  resetPasswordExpire: Date,
  
  // Email Verification
  emailVerificationToken: String,
  emailVerificationExpire: Date

}, {
  timestamps: true, // Adds createdAt and updatedAt
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for full name formatting
userSchema.virtual('displayName').get(function() {
  return this.role === 'teacher' ? `${this.name} (Teacher)` : this.name;
});

// Virtual for age calculation
userSchema.virtual('age').get(function() {
  if (!this.dateOfBirth) return null;
  return Math.floor((Date.now() - this.dateOfBirth.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
});

// Index for better query performance
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ 'teacherInfo.specialization': 1 });
userSchema.index({ 'academicInfo.class': 1, 'academicInfo.subjects': 1 });

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  // Only hash password if it's modified
  if (!this.isModified('password')) return next();
  
  try {
    // Hash password with cost of 12
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Instance method to check password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Instance method to generate auth token (will be implemented with JWT)
userSchema.methods.generateAuthToken = function() {
  // This will be implemented in auth controller
  return null;
};

// Static method to find active teachers by subject
userSchema.statics.findTeachersBySubject = function(subject) {
  return this.find({
    role: 'teacher',
    isActive: true,
    'teacherInfo.specialization': { $in: [subject] }
  }).select('name teacherInfo.rating teacherInfo.experience teacherInfo.specialization');
};

// Static method to find students by class
userSchema.statics.findStudentsByClass = function(classNumber) {
  return this.find({
    role: 'student',
    isActive: true,
    'academicInfo.class': classNumber
  }).select('name academicInfo');
};

module.exports = mongoose.model('User', userSchema);
