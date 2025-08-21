const User = require('../models/User');
const bcrypt = require('bcryptjs');
const path = require('path');
const fs = require('fs');

// Get current user profile
const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('-password -refreshTokens')
      .populate('connectedTeachers.teacher', 'name email avatar teacherInfo')
      .populate('connectedStudents.student', 'name email avatar academicInfo');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: user
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching profile'
    });
  }
};

// Update user profile
const updateUserProfile = async (req, res) => {
  try {
    const userId = req.user._id;
    const updates = req.body;

    // Fields that can be updated
    const allowedUpdates = [
      'name', 'phone', 'bio', 'avatar',
      'academicInfo', 'teacherInfo'
    ];

    // Filter only allowed fields
    const filteredUpdates = {};
    Object.keys(updates).forEach(key => {
      if (allowedUpdates.includes(key)) {
        filteredUpdates[key] = updates[key];
      }
    });

    // Validate phone number if provided
    if (filteredUpdates.phone) {
      const phoneRegex = /^01[3-9]\d{8}$/;
      if (!phoneRegex.test(filteredUpdates.phone)) {
        return res.status(400).json({
          success: false,
          message: 'Please provide a valid Bangladesh phone number'
        });
      }
    }

    // Update user
    const user = await User.findByIdAndUpdate(
      userId,
      { $set: filteredUpdates },
      { new: true, runValidators: true }
    ).select('-password -refreshTokens');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: user
    });

  } catch (error) {
    console.error('Update profile error:', error);
    
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error while updating profile'
    });
  }
};

// Upload/Update avatar
const uploadAvatar = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload an image file'
      });
    }

    const userId = req.user._id;
    const avatarPath = `/uploads/avatars/${req.file.filename}`;

    // Update user avatar path
    const user = await User.findByIdAndUpdate(
      userId,
      { avatar: avatarPath },
      { new: true }
    ).select('-password -refreshTokens');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Avatar uploaded successfully',
      data: {
        avatar: avatarPath,
        user: user
      }
    });

  } catch (error) {
    console.error('Avatar upload error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while uploading avatar'
    });
  }
};

// Get all teachers (for students)
const getTeachers = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, subject, experience } = req.query;
    
    // Build filter query
    const filter = { role: 'teacher', isActive: true };
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { 'teacherInfo.subjects': { $regex: search, $options: 'i' } }
      ];
    }

    if (subject) {
      filter['teacherInfo.subjects'] = { $in: [subject] };
    }

    if (experience) {
      filter['teacherInfo.experience'] = { $gte: parseInt(experience) };
    }

    const teachers = await User.find(filter)
      .select('name email avatar bio teacherInfo createdAt')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: teachers,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    });

  } catch (error) {
    console.error('Get teachers error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching teachers'
    });
  }
};

// Get all students (for teachers)
const getStudents = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, class: className, institution } = req.query;
    
    // Build filter query
    const filter = { role: 'student', isActive: true };
    
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { 'academicInfo.institution': { $regex: search, $options: 'i' } }
      ];
    }

    if (className) {
      filter['academicInfo.class'] = className;
    }

    if (institution) {
      filter['academicInfo.institution'] = { $regex: institution, $options: 'i' };
    }

    const students = await User.find(filter)
      .select('name email avatar bio academicInfo createdAt')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await User.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: students,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    });

  } catch (error) {
    console.error('Get students error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching students'
    });
  }
};

// Send connection request
const sendConnectionRequest = async (req, res) => {
  try {
    const { targetUserId, message } = req.body;
    const currentUser = req.user;

    if (!targetUserId) {
      return res.status(400).json({
        success: false,
        message: 'Target user ID is required'
      });
    }

    if (targetUserId === currentUser._id.toString()) {
      return res.status(400).json({
        success: false,
        message: 'Cannot send connection request to yourself'
      });
    }

    // Find target user
    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if users have different roles
    if (currentUser.role === targetUser.role) {
      return res.status(400).json({
        success: false,
        message: 'Connection requests can only be sent between teachers and students'
      });
    }

    // Check if connection already exists
    const currentUserConnections = currentUser.role === 'teacher' ? 
      currentUser.connectedStudents : currentUser.connectedTeachers;
    
    const existingConnection = currentUserConnections.find(
      conn => conn[currentUser.role === 'teacher' ? 'student' : 'teacher'].toString() === targetUserId
    );

    if (existingConnection) {
      return res.status(400).json({
        success: false,
        message: `Connection already exists with status: ${existingConnection.status}`
      });
    }

    // Create connection request
    const connectionData = {
      requestDate: new Date(),
      status: 'pending',
      message: message || `${currentUser.name} wants to connect with you`
    };

    if (currentUser.role === 'teacher') {
      // Teacher requesting to connect with student
      connectionData.student = targetUserId;
      currentUser.connectedStudents.push(connectionData);
      
      // Add to student's connected teachers
      const studentConnectionData = {
        teacher: currentUser._id,
        status: 'pending',
        requestDate: new Date(),
        message: connectionData.message
      };
      targetUser.connectedTeachers.push(studentConnectionData);
    } else {
      // Student requesting to connect with teacher
      connectionData.teacher = targetUserId;
      currentUser.connectedTeachers.push(connectionData);
      
      // Add to teacher's connected students
      const teacherConnectionData = {
        student: currentUser._id,
        status: 'pending',
        requestDate: new Date(),
        message: connectionData.message
      };
      targetUser.connectedStudents.push(teacherConnectionData);
    }

    // Save both users
    await currentUser.save();
    await targetUser.save();

    res.status(201).json({
      success: true,
      message: 'Connection request sent successfully',
      data: {
        targetUser: {
          _id: targetUser._id,
          name: targetUser.name,
          email: targetUser.email,
          role: targetUser.role
        },
        status: 'pending'
      }
    });

  } catch (error) {
    console.error('Send connection request error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while sending connection request'
    });
  }
};

// Accept/Reject connection request
const respondToConnectionRequest = async (req, res) => {
  try {
    const { connectionId, action } = req.body;
    const currentUser = req.user;

    if (!connectionId || !action) {
      return res.status(400).json({
        success: false,
        message: 'Connection ID and action are required'
      });
    }

    if (!['accept', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Action must be either accept or reject'
      });
    }

    // Find the connection in current user's connections
    let connection;
    let otherUserId;
    
    if (currentUser.role === 'teacher') {
      connection = currentUser.connectedStudents.id(connectionId);
      otherUserId = connection?.student;
    } else {
      connection = currentUser.connectedTeachers.id(connectionId);
      otherUserId = connection?.teacher;
    }

    if (!connection) {
      return res.status(404).json({
        success: false,
        message: 'Connection request not found'
      });
    }

    if (connection.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Connection request is already ${connection.status}`
      });
    }

    // Update connection status
    const newStatus = action === 'accept' ? 'approved' : 'rejected';
    connection.status = newStatus;
    
    if (action === 'accept') {
      connection.approvedDate = new Date();
    }

    // Update the corresponding connection in other user
    const otherUser = await User.findById(otherUserId);
    if (otherUser) {
      let otherConnection;
      
      if (currentUser.role === 'teacher') {
        otherConnection = otherUser.connectedTeachers.find(
          conn => conn.teacher.toString() === currentUser._id.toString()
        );
      } else {
        otherConnection = otherUser.connectedStudents.find(
          conn => conn.student.toString() === currentUser._id.toString()
        );
      }

      if (otherConnection) {
        otherConnection.status = newStatus;
        if (action === 'accept') {
          otherConnection.approvedDate = new Date();
        }
        await otherUser.save();
      }
    }

    await currentUser.save();

    res.status(200).json({
      success: true,
      message: `Connection request ${action}ed successfully`,
      data: {
        connectionId,
        status: newStatus,
        otherUser: {
          _id: otherUser._id,
          name: otherUser.name,
          email: otherUser.email,
          role: otherUser.role
        }
      }
    });

  } catch (error) {
    console.error('Respond to connection request error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while responding to connection request'
    });
  }
};

// Get user connections
const getUserConnections = async (req, res) => {
  try {
    const { status } = req.query;
    const user = await User.findById(req.user._id)
      .populate('connectedTeachers.teacher', 'name email avatar bio teacherInfo')
      .populate('connectedStudents.student', 'name email avatar bio academicInfo');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    let connections = [];
    
    if (user.role === 'teacher') {
      connections = user.connectedStudents.map(conn => ({
        _id: conn._id,
        user: conn.student,
        status: conn.status,
        requestDate: conn.requestDate,
        approvedDate: conn.approvedDate,
        message: conn.message
      }));
    } else {
      connections = user.connectedTeachers.map(conn => ({
        _id: conn._id,
        user: conn.teacher,
        status: conn.status,
        requestDate: conn.requestDate,
        approvedDate: conn.approvedDate,
        message: conn.message
      }));
    }

    // Filter by status if provided
    if (status) {
      connections = connections.filter(conn => conn.status === status);
    }

    // Sort by request date (newest first)
    connections.sort((a, b) => new Date(b.requestDate) - new Date(a.requestDate));

    res.status(200).json({
      success: true,
      data: connections,
      total: connections.length
    });

  } catch (error) {
    console.error('Get connections error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching connections'
    });
  }
};

module.exports = {
  getUserProfile,
  updateUserProfile,
  uploadAvatar,
  getTeachers,
  getStudents,
  sendConnectionRequest,
  respondToConnectionRequest,
  getUserConnections
};
