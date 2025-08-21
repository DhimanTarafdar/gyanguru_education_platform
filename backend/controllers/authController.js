const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

// JWT utility functions
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

const generateRefreshToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_REFRESH_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRE || '30d'
  });
};

const getTokenCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000
});

// User Registration
const registerUser = async (req, res) => {
  try {
    console.log('🔄 Registration request received:', { 
      email: req.body.email, 
      role: req.body.role 
    });

    const {
      name,
      email,
      password,
      phone,
      role,           // 'teacher' অথবা 'student'
      academicInfo,   // Student এর academic information (optional)
      teacherInfo     // Teacher এর professional information (optional)
    } = req.body;

    // ========== INPUT VALIDATION ==========
    
    // Required fields check করি
    if (!name || !email || !password || !phone || !role) {
      console.log('❌ Registration failed: Missing required fields');
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: name, email, password, phone, role'
      });
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address'
      });
    }

    // Password strength validation
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    // Role validation
    if (!['teacher', 'student'].includes(role)) {
      return res.status(400).json({
        success: false,
        message: 'Role must be either teacher or student'
      });
    }

    // Bangladesh phone number validation
    const phoneRegex = /^01[3-9]\d{8}$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid Bangladesh phone number (01xxxxxxxxx)'
      });
    }

    // ========== DUPLICATE USER CHECK ==========
    
    // Email already exist করে কিনা check করি
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      console.log('❌ Registration failed: Email already exists');
      return res.status(400).json({
        success: false,
        message: 'A user with this email already exists'
      });
    }

    // Phone already exist করে কিনা check করি
    const existingPhone = await User.findOne({ phone });
    if (existingPhone) {
      return res.status(400).json({
        success: false,
        message: 'A user with this phone number already exists'
      });
    }

    // ========== USER DATA PREPARATION ==========
    
    // New user object তৈরি করি
    const userData = {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password, // Password hashing automatically হবে User model এর pre-save middleware এ
      phone: phone.trim(),
      role,
      isActive: true,
      emailVerified: false, // Email verification পরে implement করব
    };

    // Role-specific data add করি
    if (role === 'student' && academicInfo) {
      // Student এর academic information validate এবং add করি
      userData.academicInfo = {
        class: academicInfo.class,
        group: academicInfo.group,
        institution: academicInfo.institution,
        subjects: academicInfo.subjects || []
      };

      // Class validation (1-12)
      if (academicInfo.class && (academicInfo.class < 1 || academicInfo.class > 12)) {
        return res.status(400).json({
          success: false,
          message: 'Class must be between 1 and 12'
        });
      }
    }

    if (role === 'teacher' && teacherInfo) {
      // Teacher এর professional information validate এবং add করি
      userData.teacherInfo = {
        qualification: teacherInfo.qualification,
        experience: teacherInfo.experience || 0,
        specialization: teacherInfo.specialization || [],
        rating: 0,           // Initial rating 0
        totalStudents: 0,    // Initial student count 0
        isVerified: false    // Teacher verification পরে করব
      };
    }

    // ========== DATABASE OPERATION ==========
    
    console.log('💾 Creating new user in database...');
    
    // New user create করি database এ
    const user = new User(userData);
    await user.save();

    console.log('✅ User created successfully:', { 
      id: user._id, 
      email: user.email, 
      role: user.role 
    });

    // ========== JWT TOKEN GENERATION ==========
    
    // JWT tokens generate করি
    const token = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Refresh token database এ save করি (security এর জন্য)
    user.refreshTokens = [refreshToken];
    await user.save();

    // ========== RESPONSE PREPARATION ==========
    
    // Response এর জন্য user data prepare করি (password বাদ দিয়ে)
    const userResponse = {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      isActive: user.isActive,
      emailVerified: user.emailVerified,
      avatar: user.avatar,
      bio: user.bio,
      academicInfo: user.academicInfo,
      teacherInfo: user.teacherInfo,
      createdAt: user.createdAt
    };

    // ========== SUCCESS RESPONSE ==========
    
    // Cookie এ token set করি
    res.cookie('token', token, getTokenCookieOptions());
    res.cookie('refreshToken', refreshToken, {
      ...getTokenCookieOptions(),
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days for refresh token
    });

    console.log('🎉 Registration completed successfully');

    // Success response পাঠাই
    res.status(201).json({
      success: true,
      message: `${role.charAt(0).toUpperCase() + role.slice(1)} account created successfully`,
      data: {
        user: userResponse,
        token,
        refreshToken
      }
    });

  } catch (error) {
    console.error('💥 Registration error:', error);

    // Mongoose validation errors handle করি
    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: validationErrors
      });
    }

    // Duplicate key error handle করি
    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      return res.status(400).json({
        success: false,
        message: `${field} already exists`
      });
    }

    // Generic server error
    res.status(500).json({
      success: false,
      message: 'Server error during registration',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// ============================================
// 🔑 USER LOGIN CONTROLLER
// ============================================

// @desc    User login (Teacher/Student)
// @route   POST /api/auth/login
// @access  Public
const loginUser = async (req, res) => {
  try {
    console.log('🔄 Login request received:', { email: req.body.email });

    // Request body থেকে credentials নিই
    const { email, password, rememberMe } = req.body;

    // ========== INPUT VALIDATION ==========
    
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // ========== USER AUTHENTICATION ==========
    
    // Database থেকে user find করি (password field include করে)
    console.log('🔍 Finding user in database...');
    const user = await User.findOne({ 
      email: email.toLowerCase().trim() 
    }).select('+password'); // Password field explicitly include করি

    // User exist করে কিনা check করি
    if (!user) {
      console.log('❌ Login failed: User not found');
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // User active আছে কিনা check করি
    if (!user.isActive) {
      console.log('❌ Login failed: User account deactivated');
      return res.status(401).json({
        success: false,
        message: 'Account has been deactivated. Please contact support.'
      });
    }

    // Password match করে কিনা check করি
    console.log('🔐 Verifying password...');
    const isPasswordMatch = await user.comparePassword(password);
    
    if (!isPasswordMatch) {
      console.log('❌ Login failed: Invalid password');
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // ========== JWT TOKEN GENERATION ==========
    
    console.log('🎫 Generating JWT tokens...');
    
    // JWT tokens generate করি
    const token = generateToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Remember me option এর based এ token expiry set করি
    const tokenExpiry = rememberMe ? '30d' : '1d';
    const extendedToken = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: tokenExpiry
    });

    // ========== UPDATE USER LOGIN STATS ==========
    
    // User এর last login time এবং login count update করি
    user.lastLogin = new Date();
    user.loginCount = (user.loginCount || 0) + 1;
    
    // Refresh token array এ add করি (maximum 5টা refresh token রাখব)
    if (!user.refreshTokens) user.refreshTokens = [];
    user.refreshTokens.push(refreshToken);
    
    // পুরাতন refresh tokens clean করি (max 5টা রাখব)
    if (user.refreshTokens.length > 5) {
      user.refreshTokens = user.refreshTokens.slice(-5);
    }

    await user.save();

    // ========== RESPONSE PREPARATION ==========
    
    // Response এর জন্য user data prepare করি (sensitive data বাদ দিয়ে)
    const userResponse = {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      isActive: user.isActive,
      emailVerified: user.emailVerified,
      avatar: user.avatar,
      bio: user.bio,
      academicInfo: user.academicInfo,
      teacherInfo: user.teacherInfo,
      lastLogin: user.lastLogin,
      loginCount: user.loginCount,
      createdAt: user.createdAt
    };

    // ========== SUCCESS RESPONSE ==========
    
    // Cookie options set করি
    const cookieOptions = {
      ...getTokenCookieOptions(),
      maxAge: rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000
    };

    // Cookies set করি
    res.cookie('token', rememberMe ? extendedToken : token, cookieOptions);
    res.cookie('refreshToken', refreshToken, {
      ...cookieOptions,
      maxAge: 30 * 24 * 60 * 60 * 1000 // Refresh token always 30 days
    });

    console.log('✅ Login successful:', { 
      userId: user._id, 
      role: user.role,
      rememberMe 
    });

    // Success response send করি
    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: userResponse,
        token: rememberMe ? extendedToken : token,
        refreshToken,
        expiresIn: rememberMe ? '30 days' : '1 day'
      }
    });

  } catch (error) {
    console.error('💥 Login error:', error);
    
    res.status(500).json({
      success: false,
      message: 'Server error during login',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// ============================================
// 🚪 USER LOGOUT CONTROLLER
// ============================================

// @desc    User logout
// @route   POST /api/auth/logout
// @access  Private
const logoutUser = async (req, res) => {
  try {
    console.log('🔄 Logout request received for user:', req.user._id);

    const { refreshToken } = req.body;
    
    // ========== REFRESH TOKEN CLEANUP ==========
    
    if (refreshToken) {
      // Database থেকে specific refresh token remove করি
      await User.findByIdAndUpdate(req.user._id, {
        $pull: { refreshTokens: refreshToken }
      });
      console.log('🗑️ Refresh token removed from database');
    }

    // ========== CLEAR COOKIES ==========
    
    // Browser cookies clear করি
    res.clearCookie('token');
    res.clearCookie('refreshToken');
    
    console.log('✅ User logged out successfully');

    // Success response
    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    console.error('💥 Logout error:', error);
    
    res.status(500).json({
      success: false,
      message: 'Server error during logout'
    });
  }
};

// ============================================
// 🔄 TOKEN REFRESH CONTROLLER
// ============================================

// @desc    Refresh access token using refresh token
// @route   POST /api/auth/refresh
// @access  Public
const refreshToken = async (req, res) => {
  try {
    console.log('🔄 Token refresh request received');

    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token is required'
      });
    }

    // ========== REFRESH TOKEN VERIFICATION ==========
    
    try {
      // Refresh token verify করি
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
      console.log('✅ Refresh token verified for user:', decoded.userId);

      // ========== USER VALIDATION ==========
      
      // User exist করে এবং refresh token valid আছে কিনা check করি
      const user = await User.findOne({
        _id: decoded.userId,
        refreshTokens: refreshToken,
        isActive: true
      });

      if (!user) {
        console.log('❌ Token refresh failed: Invalid refresh token or user');
        return res.status(401).json({
          success: false,
          message: 'Invalid refresh token'
        });
      }

      // ========== NEW TOKEN GENERATION ==========
      
      // নতুন access token generate করি
      const newAccessToken = generateToken(user._id);
      const newRefreshToken = generateRefreshToken(user._id);

      // ========== TOKEN ROTATION (Security) ==========
      
      // পুরাতন refresh token remove করি এবং নতুন add করি
      user.refreshTokens = user.refreshTokens.filter(token => token !== refreshToken);
      user.refreshTokens.push(newRefreshToken);

      // Maximum 5টা refresh token রাখি
      if (user.refreshTokens.length > 5) {
        user.refreshTokens = user.refreshTokens.slice(-5);
      }

      await user.save();

      // ========== SUCCESS RESPONSE ==========
      
      // নতুন cookies set করি
      res.cookie('token', newAccessToken, getTokenCookieOptions());
      res.cookie('refreshToken', newRefreshToken, {
        ...getTokenCookieOptions(),
        maxAge: 30 * 24 * 60 * 60 * 1000
      });

      console.log('✅ Token refreshed successfully');

      res.status(200).json({
        success: true,
        message: 'Token refreshed successfully',
        data: {
          token: newAccessToken,
          refreshToken: newRefreshToken,
          expiresIn: '7 days'
        }
      });

    } catch (jwtError) {
      console.log('❌ Invalid refresh token:', jwtError.message);
      
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired refresh token'
      });
    }

  } catch (error) {
    console.error('💥 Token refresh error:', error);
    
    res.status(500).json({
      success: false,
      message: 'Server error during token refresh'
    });
  }
};

// ============================================
// 👤 GET CURRENT USER CONTROLLER
// ============================================

// @desc    Get current logged-in user profile
// @route   GET /api/auth/me
// @access  Private
const getCurrentUser = async (req, res) => {
  try {
    console.log('🔄 Get current user request for:', req.user._id);

    // req.user already available from auth middleware
    const user = req.user;

    // User response prepare করি
    const userResponse = {
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      isActive: user.isActive,
      emailVerified: user.emailVerified,
      avatar: user.avatar,
      bio: user.bio,
      dateOfBirth: user.dateOfBirth,
      gender: user.gender,
      address: user.address,
      academicInfo: user.academicInfo,
      teacherInfo: user.teacherInfo,
      lastLogin: user.lastLogin,
      loginCount: user.loginCount,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    res.status(200).json({
      success: true,
      message: 'User profile retrieved successfully',
      data: {
        user: userResponse
      }
    });

  } catch (error) {
    console.error('💥 Get current user error:', error);
    
    res.status(500).json({
      success: false,
      message: 'Server error while fetching user profile'
    });
  }
};

// ============================================
// 📧 PASSWORD RESET REQUEST CONTROLLER
// ============================================

// @desc    Request password reset (send email)
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res) => {
  try {
    console.log('🔄 Password reset request for:', req.body.email);

    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required'
      });
    }

    // ========== USER LOOKUP ==========
    
    const user = await User.findOne({ 
      email: email.toLowerCase().trim(),
      isActive: true 
    });

    // Security: সবসময় success message দিই (email exist করে কিনা reveal করি না)
    const successMessage = 'If an account with that email exists, we have sent a password reset link';

    if (!user) {
      console.log('❌ Password reset: User not found');
      return res.status(200).json({
        success: true,
        message: successMessage
      });
    }

    // ========== RESET TOKEN GENERATION ==========
    
    // Reset token generate করি
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    // Token hash করে database এ save করি
    user.resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000; // 10 minutes

    await user.save();

    // ========== EMAIL SENDING ==========
    
    // Reset URL তৈরি করি
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password/${resetToken}`;

    // Email content
    const emailSubject = 'Password Reset Request - GyanGuru';
    const emailMessage = `
      Hello ${user.name},
      
      You have requested a password reset for your GyanGuru account.
      
      Please click the link below to reset your password:
      ${resetUrl}
      
      This link will expire in 10 minutes.
      
      If you did not request this, please ignore this email.
      
      Best regards,
      GyanGuru Team
    `;

    // Email sending logic এখানে implement করব (পরে email service তৈরি করব)
    console.log('📧 Password reset email would be sent to:', user.email);
    console.log('🔗 Reset URL:', resetUrl);

    console.log('✅ Password reset token generated successfully');

    res.status(200).json({
      success: true,
      message: successMessage
    });

  } catch (error) {
    console.error('💥 Forgot password error:', error);
    
    res.status(500).json({
      success: false,
      message: 'Server error while processing password reset request'
    });
  }
};

// ============================================
// 🔒 RESET PASSWORD CONTROLLER
// ============================================

// @desc    Reset password using reset token
// @route   POST /api/auth/reset-password/:resetToken
// @access  Public
const resetPassword = async (req, res) => {
  try {
    console.log('🔄 Password reset attempt with token');

    const { resetToken } = req.params;
    const { password, confirmPassword } = req.body;

    // ========== INPUT VALIDATION ==========
    
    if (!password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide password and confirm password'
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    // ========== TOKEN VERIFICATION ==========
    
    // Reset token hash করি
    const hashedToken = crypto.createHash('sha256').update(resetToken).digest('hex');

    // User find করি reset token এবং expiry দিয়ে
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() },
      isActive: true
    });

    if (!user) {
      console.log('❌ Password reset failed: Invalid or expired token');
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset token'
      });
    }

    // ========== PASSWORD UPDATE ==========
    
    // নতুন password set করি
    user.password = password; // Hashing automatically হবে pre-save middleware এ
    
    // Reset token fields clear করি
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    
    // সব refresh tokens invalidate করি (security)
    user.refreshTokens = [];

    await user.save();

    console.log('✅ Password reset successful for user:', user.email);

    res.status(200).json({
      success: true,
      message: 'Password reset successful. Please login with your new password.'
    });

  } catch (error) {
    console.error('💥 Reset password error:', error);
    
    res.status(500).json({
      success: false,
      message: 'Server error while resetting password'
    });
  }
};

// ============================================
// 📤 EXPORT ALL CONTROLLERS
// ============================================

module.exports = {
  registerUser,      // POST /api/auth/register
  loginUser,         // POST /api/auth/login
  logoutUser,        // POST /api/auth/logout
  refreshToken,      // POST /api/auth/refresh
  getCurrentUser,    // GET /api/auth/me
  forgotPassword,    // POST /api/auth/forgot-password
  resetPassword      // POST /api/auth/reset-password/:resetToken
};
