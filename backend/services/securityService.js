// Account Security & Lockout System
const mongoose = require('mongoose');

const securityEventSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  eventType: {
    type: String,
    enum: [
      'failed_login', 'successful_login', 'password_reset_request',
      'account_locked', 'account_unlocked', 'suspicious_activity',
      'ip_change', 'device_change', 'security_violation'
    ],
    required: true
  },
  
  ipAddress: {
    type: String,
    required: true
  },
  
  userAgent: String,
  
  details: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'low'
  },
  
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  }
});

// Account lockout tracking
const accountLockoutSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },
  
  failedAttempts: {
    type: Number,
    default: 0
  },
  
  lastFailedAttempt: {
    type: Date,
    default: Date.now
  },
  
  lockoutUntil: {
    type: Date,
    default: null,
    index: true
  },
  
  isLocked: {
    type: Boolean,
    default: false,
    index: true
  }
});

// Security service class
class SecurityService {
  static async recordSecurityEvent(userId, eventType, ipAddress, userAgent, details = {}) {
    try {
      const event = new SecurityEvent({
        userId,
        eventType,
        ipAddress,
        userAgent,
        details,
        severity: this.calculateSeverity(eventType, details)
      });
      
      await event.save();
      
      // Check for patterns that might indicate attacks
      await this.analyzeSecurityPatterns(userId, ipAddress);
      
      return event;
    } catch (error) {
      console.error('Security event recording failed:', error);
    }
  }
  
  static async handleFailedLogin(userId, ipAddress, userAgent) {
    try {
      // Record security event
      await this.recordSecurityEvent(userId, 'failed_login', ipAddress, userAgent);
      
      // Update lockout tracking
      let lockout = await AccountLockout.findOne({ userId });
      
      if (!lockout) {
        lockout = new AccountLockout({ userId });
      }
      
      lockout.failedAttempts += 1;
      lockout.lastFailedAttempt = new Date();
      
      // Lock account after 5 failed attempts
      if (lockout.failedAttempts >= 5) {
        lockout.isLocked = true;
        lockout.lockoutUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes
        
        await this.recordSecurityEvent(userId, 'account_locked', ipAddress, userAgent, {
          failedAttempts: lockout.failedAttempts
        });
      }
      
      await lockout.save();
      
      return {
        isLocked: lockout.isLocked,
        attemptsRemaining: Math.max(0, 5 - lockout.failedAttempts),
        lockoutUntil: lockout.lockoutUntil
      };
      
    } catch (error) {
      console.error('Failed login handling error:', error);
      return { isLocked: false, attemptsRemaining: 5 };
    }
  }
  
  static async handleSuccessfulLogin(userId, ipAddress, userAgent) {
    try {
      // Record successful login
      await this.recordSecurityEvent(userId, 'successful_login', ipAddress, userAgent);
      
      // Reset failed attempts
      await AccountLockout.findOneAndUpdate(
        { userId },
        { 
          failedAttempts: 0,
          isLocked: false,
          lockoutUntil: null
        }
      );
      
    } catch (error) {
      console.error('Successful login handling error:', error);
    }
  }
  
  static async checkAccountLockout(userId) {
    try {
      const lockout = await AccountLockout.findOne({ userId });
      
      if (!lockout || !lockout.isLocked) {
        return { isLocked: false };
      }
      
      // Check if lockout period has expired
      if (lockout.lockoutUntil && new Date() > lockout.lockoutUntil) {
        lockout.isLocked = false;
        lockout.lockoutUntil = null;
        lockout.failedAttempts = 0;
        await lockout.save();
        
        return { isLocked: false };
      }
      
      return {
        isLocked: true,
        lockoutUntil: lockout.lockoutUntil,
        remainingTime: lockout.lockoutUntil - new Date()
      };
      
    } catch (error) {
      console.error('Account lockout check error:', error);
      return { isLocked: false };
    }
  }
  
  static calculateSeverity(eventType, details) {
    const severityMap = {
      'failed_login': 'low',
      'account_locked': 'high',
      'suspicious_activity': 'critical',
      'security_violation': 'critical',
      'successful_login': 'low'
    };
    
    return severityMap[eventType] || 'low';
  }
  
  static async analyzeSecurityPatterns(userId, ipAddress) {
    try {
      const recentEvents = await SecurityEvent.find({
        $or: [{ userId }, { ipAddress }],
        timestamp: { $gte: new Date(Date.now() - 60 * 60 * 1000) } // Last hour
      });
      
      // Detect suspicious patterns
      const suspiciousPatterns = this.detectSuspiciousPatterns(recentEvents);
      
      if (suspiciousPatterns.length > 0) {
        await this.recordSecurityEvent(userId, 'suspicious_activity', ipAddress, '', {
          patterns: suspiciousPatterns
        });
      }
      
    } catch (error) {
      console.error('Security pattern analysis error:', error);
    }
  }
  
  static detectSuspiciousPatterns(events) {
    const patterns = [];
    
    // Multiple failed logins from same IP
    const failedLogins = events.filter(e => e.eventType === 'failed_login');
    if (failedLogins.length > 10) {
      patterns.push('high_failed_login_rate');
    }
    
    // Multiple IPs for same user
    const uniqueIPs = [...new Set(events.map(e => e.ipAddress))];
    if (uniqueIPs.length > 5) {
      patterns.push('multiple_ip_access');
    }
    
    return patterns;
  }
}

const SecurityEvent = mongoose.model('SecurityEvent', securityEventSchema);
const AccountLockout = mongoose.model('AccountLockout', accountLockoutSchema);

module.exports = {
  SecurityEvent,
  AccountLockout,
  SecurityService
};
