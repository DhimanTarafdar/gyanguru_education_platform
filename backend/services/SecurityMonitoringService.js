const mongoose = require('mongoose');
const crypto = require('crypto');
const {
  UserSession,
  DeviceTracking,
  SecurityAlert,
  ActivityLog,
  DataExport,
  PrivacySettings,
  SecurityAudit
} = require('../models/Security');

// 🛡️ GyanGuru Security & Monitoring Service
// Features: Session Management, Device Tracking, Suspicious Activity Detection, Data Protection, Privacy Controls

class SecurityService {

  // 🔐 SESSION MANAGEMENT

  /**
   * Create new user session
   */
  async createSession(userId, req) {
    try {
      const sessionId = this.generateSessionId();
      const deviceInfo = this.extractDeviceInfo(req);
      const location = this.getLocationFromIP(req.ip);

      // Check for suspicious activity
      const riskScore = await this.calculateRiskScore(userId, deviceInfo, location);

      const session = new UserSession({
        user: userId,
        sessionId,
        deviceInfo: {
          ...deviceInfo,
          ipAddress: req.ip,
          location
        },
        securityFlags: {
          riskScore,
          isSuspicious: riskScore > 70,
          requiresVerification: riskScore > 80
        },
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
      });

      await session.save();

      // Update device tracking
      await this.trackDevice(userId, deviceInfo, req.ip, location);

      // Log the login event
      await this.logActivity({
        user: userId,
        sessionId,
        action: 'login',
        category: 'authentication',
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        location,
        success: true
      });

      return {
        sessionId,
        expiresAt: session.expiresAt,
        requiresVerification: session.securityFlags.requiresVerification,
        riskScore
      };
    } catch (error) {
      console.error('Error creating session:', error);
      throw error;
    }
  }

  /**
   * Validate and refresh session
   */
  async validateSession(sessionId, req) {
    try {
      const session = await UserSession.findOne({
        sessionId,
        isActive: true,
        expiresAt: { $gt: new Date() }
      }).populate('user');

      if (!session) {
        return null;
      }

      // Update last activity
      session.lastActivity = new Date();
      session.activities.push({
        action: 'activity',
        timestamp: new Date(),
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      await session.save();
      return session;
    } catch (error) {
      console.error('Error validating session:', error);
      throw error;
    }
  }

  /**
   * Terminate session
   */
  async terminateSession(sessionId, reason = 'logout') {
    try {
      const session = await UserSession.findOne({ sessionId, isActive: true });
      
      if (session) {
        session.isActive = false;
        session.logoutTime = new Date();
        session.sessionDuration = Math.floor((Date.now() - session.loginTime) / 1000);
        await session.save();

        // Log the logout event
        await this.logActivity({
          user: session.user,
          sessionId,
          action: 'logout',
          category: 'authentication',
          success: true,
          metadata: { reason }
        });
      }

      return true;
    } catch (error) {
      console.error('Error terminating session:', error);
      throw error;
    }
  }

  // 📱 DEVICE TRACKING

  /**
   * Track and manage user devices
   */
  async trackDevice(userId, deviceInfo, ipAddress, location) {
    try {
      const deviceFingerprint = this.generateDeviceFingerprint(deviceInfo);
      
      let device = await DeviceTracking.findOne({
        user: userId,
        deviceFingerprint
      });

      if (device) {
        // Update existing device
        device.lastSeen = new Date();
        device.loginCount += 1;
        device.locationHistory.push({
          ipAddress,
          ...location,
          timestamp: new Date()
        });
      } else {
        // Create new device entry
        device = new DeviceTracking({
          user: userId,
          deviceId: crypto.randomUUID(),
          deviceFingerprint,
          deviceInfo: {
            ...deviceInfo,
            name: this.generateDeviceName(deviceInfo)
          },
          locationHistory: [{
            ipAddress,
            ...location,
            timestamp: new Date()
          }]
        });
      }

      await device.save();
      return device;
    } catch (error) {
      console.error('Error tracking device:', error);
      throw error;
    }
  }

  /**
   * Get user's trusted devices
   */
  async getUserDevices(userId) {
    try {
      return await DeviceTracking.find({
        user: userId,
        isActive: true
      }).sort({ lastSeen: -1 });
    } catch (error) {
      console.error('Error getting user devices:', error);
      throw error;
    }
  }

  // 🚨 SECURITY ALERTS & MONITORING

  /**
   * Create security alert
   */
  async createSecurityAlert(alertData) {
    try {
      const alert = new SecurityAlert(alertData);
      await alert.save();
      return alert;
    } catch (error) {
      console.error('Error creating security alert:', error);
      throw error;
    }
  }

  /**
   * Calculate risk score for login attempt
   */
  async calculateRiskScore(userId, deviceInfo, location) {
    try {
      let riskScore = 0;

      // Check if device is known
      const knownDevice = await DeviceTracking.findOne({
        user: userId,
        deviceFingerprint: this.generateDeviceFingerprint(deviceInfo)
      });

      if (!knownDevice) {
        riskScore += 30; // New device
      }

      // Check location
      if (location && location.country) {
        const userLocations = await UserSession.find({
          user: userId,
          createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
        }).distinct('deviceInfo.location.country');

        if (!userLocations.includes(location.country)) {
          riskScore += 40; // New country
        }
      }

      return Math.min(Math.max(riskScore, 0), 100);
    } catch (error) {
      console.error('Error calculating risk score:', error);
      return 50; // Default medium risk
    }
  }

  // 📊 ACTIVITY LOGGING

  /**
   * Log user activity
   */
  async logActivity(activityData) {
    try {
      const log = new ActivityLog(activityData);
      await log.save();
      return log;
    } catch (error) {
      console.error('Error logging activity:', error);
      throw error;
    }
  }

  /**
   * Get user activity history
   */
  async getUserActivityHistory(userId, options = {}) {
    try {
      const {
        limit = 100,
        skip = 0,
        category,
        dateFrom,
        dateTo,
        action
      } = options;

      const query = { user: userId };

      if (category) query.category = category;
      if (action) query.action = action;
      if (dateFrom || dateTo) {
        query.createdAt = {};
        if (dateFrom) query.createdAt.$gte = new Date(dateFrom);
        if (dateTo) query.createdAt.$lte = new Date(dateTo);
      }

      return await ActivityLog.find(query)
        .sort({ createdAt: -1 })
        .limit(limit)
        .skip(skip);
    } catch (error) {
      console.error('Error getting activity history:', error);
      throw error;
    }
  }

  // 📤 DATA EXPORT & BACKUP

  /**
   * Create data export request
   */
  async createDataExport(userId, exportOptions) {
    try {
      const exportRequest = new DataExport({
        user: userId,
        requestType: exportOptions.type || 'full_export',
        dataTypes: exportOptions.dataTypes || ['profile', 'courses', 'assignments'],
        format: exportOptions.format || 'json',
        dateRange: exportOptions.dateRange
      });

      await exportRequest.save();
      return exportRequest;
    } catch (error) {
      console.error('Error creating data export:', error);
      throw error;
    }
  }

  // 🔒 PRIVACY CONTROLS

  /**
   * Get user privacy settings
   */
  async getPrivacySettings(userId) {
    try {
      let settings = await PrivacySettings.findOne({ user: userId });
      
      if (!settings) {
        // Create default privacy settings
        settings = new PrivacySettings({ user: userId });
        await settings.save();
      }

      return settings;
    } catch (error) {
      console.error('Error getting privacy settings:', error);
      throw error;
    }
  }

  /**
   * Update privacy settings
   */
  async updatePrivacySettings(userId, updates) {
    try {
      const settings = await PrivacySettings.findOneAndUpdate(
        { user: userId },
        { $set: updates },
        { new: true, upsert: true }
      );

      // Log privacy change
      await this.logActivity({
        user: userId,
        action: 'privacy_settings_updated',
        category: 'security',
        metadata: { updates },
        success: true
      });

      return settings;
    } catch (error) {
      console.error('Error updating privacy settings:', error);
      throw error;
    }
  }

  // 🛠️ UTILITY METHODS

  /**
   * Generate secure session ID
   */
  generateSessionId() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Extract device information from request
   */
  extractDeviceInfo(req) {
    const userAgent = req.get('User-Agent') || '';
    
    // Simple user agent parsing
    const isMobile = /Mobile|Android|iPhone|iPad/i.test(userAgent);
    const isTablet = /iPad|Tablet/i.test(userAgent);
    
    let browser = 'Unknown';
    let os = 'Unknown';
    
    if (userAgent.includes('Chrome')) browser = 'Chrome';
    else if (userAgent.includes('Firefox')) browser = 'Firefox';
    else if (userAgent.includes('Safari')) browser = 'Safari';
    else if (userAgent.includes('Edge')) browser = 'Edge';
    
    if (userAgent.includes('Windows')) os = 'Windows';
    else if (userAgent.includes('Mac')) os = 'macOS';
    else if (userAgent.includes('Linux')) os = 'Linux';
    else if (userAgent.includes('Android')) os = 'Android';
    else if (userAgent.includes('iOS')) os = 'iOS';

    return {
      userAgent,
      browser,
      os,
      device: 'Unknown',
      deviceType: isTablet ? 'tablet' : (isMobile ? 'mobile' : 'desktop'),
      platform: 'Unknown'
    };
  }

  /**
   * Get location from IP address (simplified)
   */
  getLocationFromIP(ip) {
    // Simplified location detection
    // In production, use a proper GeoIP service
    return {
      country: 'Unknown',
      region: 'Unknown',
      city: 'Unknown',
      coordinates: { lat: 0, lng: 0 }
    };
  }

  /**
   * Generate device fingerprint
   */
  generateDeviceFingerprint(deviceInfo) {
    const fingerprint = `${deviceInfo.userAgent}-${deviceInfo.platform}`;
    return crypto.createHash('sha256').update(fingerprint).digest('hex');
  }

  /**
   * Generate human-readable device name
   */
  generateDeviceName(deviceInfo) {
    const browser = deviceInfo.browser || 'Unknown Browser';
    const os = deviceInfo.os || 'Unknown OS';
    const device = deviceInfo.device !== 'Unknown' ? deviceInfo.device : deviceInfo.deviceType;
    
    return `${browser} on ${os} (${device})`;
  }
}

module.exports = new SecurityService();
