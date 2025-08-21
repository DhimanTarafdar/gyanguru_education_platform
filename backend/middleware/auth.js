const jwt = require('jsonwebtoken');
const User = require('../models/User');

// JWT Authentication Middleware
const authenticateUser = async (req, res, next) => {
  try {
    console.log('🔐 Authentication middleware started');

    let token;

    // Token extraction from different sources
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
      console.log('📧 Token found in Authorization header');
    }
    else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
      console.log('🍪 Token found in cookies');
    }
    else if (req.body.token) {
      token = req.body.token;
      console.log('📝 Token found in request body');
    }

    // Token না পাওয়া গেলে unauthorized response
    if (!token) {
      console.log('❌ Authentication failed: No token provided');
      return res.status(401).json({
        success: false,
        message: 'Access denied. No authentication token provided.'
      });
    }

    // ========== TOKEN VERIFICATION ==========
    
    try {
      // JWT token verify করি
      console.log('🔍 Verifying JWT token...');
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      console.log('✅ Token verified successfully for user:', decoded.userId);

      // ========== USER VALIDATION ==========
      
      // Database থেকে user find করি
      console.log('👤 Finding user in database...');
      const user = await User.findById(decoded.userId).select('-password -refreshTokens');
      
      if (!user) {
        console.log('❌ Authentication failed: User not found');
        return res.status(401).json({
          success: false,
          message: 'Invalid token. User not found.'
        });
      }

      // User active আছে কিনা check করি
      if (!user.isActive) {
        console.log('❌ Authentication failed: User account deactivated');
        return res.status(401).json({
          success: false,
          message: 'Account has been deactivated. Please contact support.'
        });
      }

      // ========== SUCCESS ==========
      
      // User object req.user এ attach করি পরবর্তী middleware/controller এর জন্য
      req.user = user;
      
      console.log('✅ Authentication successful for:', { 
        userId: user._id, 
        email: user.email, 
        role: user.role 
      });

      // Next middleware/controller এ pass করি
      next();

    } catch (jwtError) {
      console.log('❌ JWT verification failed:', jwtError.message);
      
      // Token expired বা invalid হলে specific message
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token has expired. Please login again.',
          code: 'TOKEN_EXPIRED'
        });
      }
      
      if (jwtError.name === 'JsonWebTokenError') {
        return res.status(401).json({
          success: false,
          message: 'Invalid token. Please login again.',
          code: 'INVALID_TOKEN'
        });
      }

      // অন্যান্য JWT errors
      return res.status(401).json({
        success: false,
        message: 'Authentication failed. Please login again.',
        code: 'AUTH_FAILED'
      });
    }

  } catch (error) {
    console.error('💥 Authentication middleware error:', error);
    
    res.status(500).json({
      success: false,
      message: 'Server error during authentication',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// ============================================
// 👨‍🏫 ROLE-BASED ACCESS CONTROL MIDDLEWARE
// ============================================

// @desc    User এর role check করে access control করার middleware
// @param   allowedRoles - Array of allowed roles ['teacher', 'student', 'admin']
// @usage   Specific role এর জন্য protected routes এ ব্যবহার করব
const authorizeRoles = (...allowedRoles) => {
  return (req, res, next) => {
    console.log('🔒 Role authorization started');
    console.log('👤 User role:', req.user?.role);
    console.log('✅ Allowed roles:', allowedRoles);

    // User authenticate আছে কিনা check করি (authenticateUser middleware আগে run হওয়া উচিত)
    if (!req.user) {
      console.log('❌ Authorization failed: User not authenticated');
      return res.status(401).json({
        success: false,
        message: 'Access denied. Please login first.'
      });
    }

    // User এর role allowed roles এর মধ্যে আছে কিনা check করি
    if (!allowedRoles.includes(req.user.role)) {
      console.log('❌ Authorization failed: Insufficient permissions');
      return res.status(403).json({
        success: false,
        message: `Access denied. This action requires ${allowedRoles.join(' or ')} role.`,
        userRole: req.user.role,
        requiredRoles: allowedRoles
      });
    }

    console.log('✅ Role authorization successful');
    next();
  };
};

// ============================================
// 🏫 TEACHER-SPECIFIC AUTHORIZATION
// ============================================

// @desc    শুধু teacher দের জন্য access control
// @usage   Teacher-only routes এ ব্যবহার করব
const teacherOnly = authorizeRoles('teacher');

// ============================================
// 🎓 STUDENT-SPECIFIC AUTHORIZATION  
// ============================================

// @desc    শুধু student দের জন্য access control
// @usage   Student-only routes এ ব্যবহার করব
const studentOnly = authorizeRoles('student');

// ============================================
// 👨‍💼 ADMIN-SPECIFIC AUTHORIZATION
// ============================================

// @desc    শুধু admin দের জন্য access control
// @usage   Admin-only routes এ ব্যবহার করব
const adminOnly = authorizeRoles('admin');

// ============================================
// 🔍 RESOURCE OWNERSHIP VERIFICATION
// ============================================

// @desc    User তার নিজের resource access করছে কিনা check করার middleware
// @param   resourceField - কোন field এ user ID check করব (default: 'createdBy')
// @usage   User শুধু তার নিজের data access করতে পারবে
const checkResourceOwnership = (resourceField = 'createdBy') => {
  return async (req, res, next) => {
    try {
      console.log('🔍 Checking resource ownership...');

      const userId = req.user._id.toString();
      const resourceId = req.params.id;

      if (!resourceId) {
        return res.status(400).json({
          success: false,
          message: 'Resource ID is required'
        });
      }

      // Resource find করার জন্য model determine করি route based এ
      let Model;
      const path = req.route.path;
      
      if (path.includes('/questions')) {
        Model = require('../models/Question');
      } else if (path.includes('/assessments')) {
        Model = require('../models/Assessment');
      } else if (path.includes('/submissions')) {
        Model = require('../models/Submission');
      }

      if (!Model) {
        console.log('⚠️ Resource ownership check skipped: Model not determined');
        return next();
      }

      // Resource find করি
      const resource = await Model.findById(resourceId);

      if (!resource) {
        return res.status(404).json({
          success: false,
          message: 'Resource not found'
        });
      }

      // Admin সব access পারবে
      if (req.user.role === 'admin') {
        console.log('✅ Admin access granted');
        return next();
      }

      // Resource owner check করি
      const resourceOwnerId = resource[resourceField]?.toString();

      if (resourceOwnerId !== userId) {
        console.log('❌ Access denied: Not resource owner');
        return res.status(403).json({
          success: false,
          message: 'Access denied. You can only access your own resources.'
        });
      }

      console.log('✅ Resource ownership verified');
      next();

    } catch (error) {
      console.error('💥 Resource ownership check error:', error);
      
      res.status(500).json({
        success: false,
        message: 'Server error during resource ownership verification'
      });
    }
  };
};

// ============================================
// 🤝 TEACHER-STUDENT CONNECTION VERIFICATION
// ============================================

// @desc    Teacher এবং Student এর মধ্যে connection আছে কিনা verify করার middleware
// @usage   Teacher-Student specific operations এ ব্যবহার করব
const verifyTeacherStudentConnection = async (req, res, next) => {
  try {
    console.log('🤝 Verifying teacher-student connection...');

    const currentUser = req.user;
    let teacherId, studentId;

    // Request থেকে teacher এবং student ID determine করি
    if (currentUser.role === 'teacher') {
      teacherId = currentUser._id;
      studentId = req.body.studentId || req.params.studentId;
    } else if (currentUser.role === 'student') {
      studentId = currentUser._id;
      teacherId = req.body.teacherId || req.params.teacherId;
    } else {
      // Admin সব access পারবে
      return next();
    }

    if (!teacherId || !studentId) {
      return res.status(400).json({
        success: false,
        message: 'Teacher ID and Student ID are required'
      });
    }

    // Teacher find করি এবং connected students check করি
    const teacher = await User.findById(teacherId);
    if (!teacher || teacher.role !== 'teacher') {
      return res.status(404).json({
        success: false,
        message: 'Teacher not found'
      });
    }

    // Connection check করি
    const isConnected = teacher.connectedStudents.some(
      connection => connection.student.toString() === studentId.toString() && 
                   connection.status === 'approved'
    );

    if (!isConnected) {
      console.log('❌ Access denied: No approved teacher-student connection');
      return res.status(403).json({
        success: false,
        message: 'Access denied. Teacher and student must have an approved connection.'
      });
    }

    console.log('✅ Teacher-student connection verified');
    next();

  } catch (error) {
    console.error('💥 Teacher-student connection verification error:', error);
    
    res.status(500).json({
      success: false,
      message: 'Server error during connection verification'
    });
  }
};

// ============================================
// ⏰ OPTIONAL AUTHENTICATION MIDDLEWARE
// ============================================

// @desc    Optional authentication - token থাকলে user attach করবে, না থাকলে continue করবে
// @usage   Public routes যেখানে authenticated user এর জন্য extra feature আছে
const optionalAuth = async (req, res, next) => {
  try {
    console.log('🔓 Optional authentication started');

    let token;

    // Token নেওয়ার চেষ্টা করি (same as authenticateUser)
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      console.log('ℹ️ No token provided - continuing as guest');
      return next();
    }

    try {
      // Token verify করার চেষ্টা করি
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId).select('-password -refreshTokens');
      
      if (user && user.isActive) {
        req.user = user;
        console.log('✅ Optional authentication successful for:', user.email);
      }
    } catch (jwtError) {
      console.log('⚠️ Optional authentication failed, continuing as guest');
    }

    next();

  } catch (error) {
    console.error('💥 Optional authentication error:', error);
    // Error হলেও continue করি
    next();
  }
};

// ============================================
// 📤 EXPORT ALL MIDDLEWARE
// ============================================

module.exports = {
  protect: authenticateUser,     // Alias for protect
  authorize: authorizeRoles,     // Alias for authorize
  authenticateUser,              // JWT authentication
  authorizeRoles,               // Role-based authorization
  teacherOnly,                  // Teacher-only access
  studentOnly,                  // Student-only access  
  adminOnly,                    // Admin-only access
  checkResourceOwnership,       // Resource ownership verification
  verifyTeacherStudentConnection, // Teacher-student connection check
  optionalAuth                  // Optional authentication
};
