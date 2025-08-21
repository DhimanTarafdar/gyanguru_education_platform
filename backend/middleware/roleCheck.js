// Role-based access control middleware
// ভূমিকা-ভিত্তিক access control

const roleCheck = (allowedRoles = []) => {
  return (req, res, next) => {
    try {
      // Check if user is authenticated
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required'
        });
      }

      const userRole = req.user.role;

      // Check if user role is in allowed roles
      if (allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
        return res.status(403).json({
          success: false,
          message: `Access denied. Required role(s): ${allowedRoles.join(', ')}. Your role: ${userRole}`
        });
      }

      // Check for specific permissions if user is a teacher
      if (userRole === 'teacher' && req.params.assessmentId) {
        // This check will be done in the controller for assessment-specific permissions
        // Here we just ensure the basic role check passes
      }

      next();
    } catch (error) {
      console.error('Role check middleware error:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal server error in role check'
      });
    }
  };
};

module.exports = roleCheck;
