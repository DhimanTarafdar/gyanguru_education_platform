const SecurityService = require('../services/SecurityMonitoringService');
const {
  UserSession,
  DeviceTracking,
  SecurityAlert,
  ActivityLog,
  DataExport,
  PrivacySettings,
  SecurityAudit
} = require('../models/Security');

// 🛡️ GyanGuru Security & Monitoring Controller
// Features: Session Management, Device Tracking, Suspicious Activity Alerts, Data Export/Backup, Privacy Controls

class SecurityController {

  // 🔐 SESSION MANAGEMENT ENDPOINTS

  /**
   * Get user's active sessions
   */
  async getActiveSessions(req, res) {
    try {
      const userId = req.user.id;

      const sessions = await UserSession.find({
        user: userId,
        isActive: true,
        expiresAt: { $gt: new Date() }
      }).sort({ lastActivity: -1 });

      const sessionsWithDetails = sessions.map(session => ({
        sessionId: session.sessionId,
        deviceInfo: {
          name: session.deviceInfo.name || SecurityService.generateDeviceName(session.deviceInfo),
          browser: session.deviceInfo.browser,
          os: session.deviceInfo.os,
          deviceType: session.deviceInfo.deviceType
        },
        location: session.deviceInfo.location,
        loginTime: session.loginTime,
        lastActivity: session.lastActivity,
        isCurrent: session.sessionId === req.sessionId,
        riskScore: session.securityFlags.riskScore,
        isSuspicious: session.securityFlags.isSuspicious
      }));

      res.json({
        success: true,
        message: 'Active sessions retrieved successfully',
        data: {
          totalSessions: sessionsWithDetails.length,
          sessions: sessionsWithDetails
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve active sessions',
        error: error.message
      });
    }
  }

  /**
   * Terminate a specific session
   */
  async terminateSession(req, res) {
    try {
      const userId = req.user.id;
      const { sessionId } = req.params;

      // Verify session belongs to user
      const session = await UserSession.findOne({
        sessionId,
        user: userId,
        isActive: true
      });

      if (!session) {
        return res.status(404).json({
          success: false,
          message: 'Session not found or already terminated'
        });
      }

      await SecurityService.terminateSession(sessionId, 'manual_termination');

      // Log the session termination
      await SecurityService.logActivity({
        user: userId,
        action: 'session_terminated_manually',
        category: 'security',
        metadata: { terminatedSessionId: sessionId },
        success: true
      });

      res.json({
        success: true,
        message: 'Session terminated successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to terminate session',
        error: error.message
      });
    }
  }

  /**
   * Terminate all other sessions (except current)
   */
  async terminateAllOtherSessions(req, res) {
    try {
      const userId = req.user.id;
      const currentSessionId = req.sessionId;

      const sessions = await UserSession.find({
        user: userId,
        isActive: true,
        sessionId: { $ne: currentSessionId }
      });

      for (const session of sessions) {
        await SecurityService.terminateSession(session.sessionId, 'bulk_termination');
      }

      // Log the bulk termination
      await SecurityService.logActivity({
        user: userId,
        action: 'all_sessions_terminated',
        category: 'security',
        metadata: { terminatedCount: sessions.length },
        success: true
      });

      res.json({
        success: true,
        message: `${sessions.length} sessions terminated successfully`,
        data: { terminatedCount: sessions.length }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to terminate sessions',
        error: error.message
      });
    }
  }

  // 📱 DEVICE MANAGEMENT ENDPOINTS

  /**
   * Get user's devices
   */
  async getUserDevices(req, res) {
    try {
      const userId = req.user.id;
      const devices = await SecurityService.getUserDevices(userId);

      const devicesWithDetails = devices.map(device => ({
        deviceId: device.deviceId,
        name: device.deviceInfo.name,
        deviceType: device.deviceInfo.deviceType,
        browser: device.deviceInfo.browser,
        os: device.deviceInfo.os,
        trustLevel: device.trustLevel,
        firstSeen: device.firstSeen,
        lastSeen: device.lastSeen,
        loginCount: device.loginCount,
        isBlocked: device.isBlocked,
        lastLocation: device.locationHistory[device.locationHistory.length - 1],
        securityEvents: device.securityEvents.filter(event => !event.resolved).length
      }));

      res.json({
        success: true,
        message: 'User devices retrieved successfully',
        data: {
          totalDevices: devicesWithDetails.length,
          trustedDevices: devicesWithDetails.filter(d => d.trustLevel === 'trusted').length,
          suspiciousDevices: devicesWithDetails.filter(d => d.trustLevel === 'suspicious').length,
          devices: devicesWithDetails
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve user devices',
        error: error.message
      });
    }
  }

  /**
   * Update device trust level
   */
  async updateDeviceTrust(req, res) {
    try {
      const userId = req.user.id;
      const { deviceId } = req.params;
      const { trustLevel } = req.body;

      if (!['trusted', 'unknown', 'suspicious', 'blocked'].includes(trustLevel)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid trust level'
        });
      }

      const device = await DeviceTracking.findOne({
        user: userId,
        deviceId
      });

      if (!device) {
        return res.status(404).json({
          success: false,
          message: 'Device not found'
        });
      }

      device.trustLevel = trustLevel;
      device.isBlocked = trustLevel === 'blocked';
      await device.save();

      // Log the trust level change
      await SecurityService.logActivity({
        user: userId,
        action: 'device_trust_updated',
        category: 'security',
        metadata: { deviceId, newTrustLevel: trustLevel },
        success: true
      });

      res.json({
        success: true,
        message: 'Device trust level updated successfully',
        data: {
          deviceId,
          trustLevel,
          isBlocked: device.isBlocked
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to update device trust level',
        error: error.message
      });
    }
  }

  /**
   * Remove a device
   */
  async removeDevice(req, res) {
    try {
      const userId = req.user.id;
      const { deviceId } = req.params;

      const device = await DeviceTracking.findOne({
        user: userId,
        deviceId
      });

      if (!device) {
        return res.status(404).json({
          success: false,
          message: 'Device not found'
        });
      }

      device.isActive = false;
      await device.save();

      // Terminate all sessions for this device
      const sessions = await UserSession.find({
        user: userId,
        'deviceInfo.deviceFingerprint': device.deviceFingerprint,
        isActive: true
      });

      for (const session of sessions) {
        await SecurityService.terminateSession(session.sessionId, 'device_removed');
      }

      // Log the device removal
      await SecurityService.logActivity({
        user: userId,
        action: 'device_removed',
        category: 'security',
        metadata: { deviceId, terminatedSessions: sessions.length },
        success: true
      });

      res.json({
        success: true,
        message: 'Device removed successfully',
        data: { terminatedSessions: sessions.length }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to remove device',
        error: error.message
      });
    }
  }

  // 🚨 SECURITY ALERTS ENDPOINTS

  /**
   * Get security alerts for user
   */
  async getSecurityAlerts(req, res) {
    try {
      const userId = req.user.id;
      const { status = 'active', limit = 20, skip = 0 } = req.query;

      const query = { user: userId };
      if (status !== 'all') {
        query.status = status;
      }

      const alerts = await SecurityAlert.find(query)
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip(parseInt(skip));

      const totalAlerts = await SecurityAlert.countDocuments(query);

      const alertSummary = {
        active: await SecurityAlert.countDocuments({ user: userId, status: 'active' }),
        investigating: await SecurityAlert.countDocuments({ user: userId, status: 'investigating' }),
        resolved: await SecurityAlert.countDocuments({ user: userId, status: 'resolved' }),
        critical: await SecurityAlert.countDocuments({ user: userId, severity: 'critical', status: { $in: ['active', 'investigating'] } })
      };

      res.json({
        success: true,
        message: 'Security alerts retrieved successfully',
        data: {
          summary: alertSummary,
          totalAlerts,
          alerts: alerts.map(alert => ({
            id: alert._id,
            alertType: alert.alertType,
            severity: alert.severity,
            status: alert.status,
            title: alert.title,
            description: alert.description,
            riskScore: alert.riskScore,
            createdAt: alert.createdAt,
            resolvedAt: alert.resolvedAt,
            details: alert.details
          }))
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve security alerts',
        error: error.message
      });
    }
  }

  /**
   * Mark security alert as resolved
   */
  async resolveSecurityAlert(req, res) {
    try {
      const userId = req.user.id;
      const { alertId } = req.params;
      const { resolutionNotes } = req.body;

      const alert = await SecurityAlert.findOne({
        _id: alertId,
        user: userId
      });

      if (!alert) {
        return res.status(404).json({
          success: false,
          message: 'Security alert not found'
        });
      }

      alert.status = 'resolved';
      alert.resolvedAt = new Date();
      alert.resolvedBy = userId;
      if (resolutionNotes) {
        alert.resolutionNotes = resolutionNotes;
      }

      await alert.save();

      // Log the alert resolution
      await SecurityService.logActivity({
        user: userId,
        action: 'security_alert_resolved',
        category: 'security',
        metadata: { alertId, alertType: alert.alertType },
        success: true
      });

      res.json({
        success: true,
        message: 'Security alert marked as resolved',
        data: {
          alertId,
          status: alert.status,
          resolvedAt: alert.resolvedAt
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to resolve security alert',
        error: error.message
      });
    }
  }

  // 📊 ACTIVITY MONITORING ENDPOINTS

  /**
   * Get user activity history
   */
  async getActivityHistory(req, res) {
    try {
      const userId = req.user.id;
      const {
        limit = 50,
        skip = 0,
        category,
        dateFrom,
        dateTo,
        action
      } = req.query;

      const activities = await SecurityService.getUserActivityHistory(userId, {
        limit: parseInt(limit),
        skip: parseInt(skip),
        category,
        dateFrom,
        dateTo,
        action
      });

      const totalActivities = await ActivityLog.countDocuments({ user: userId });

      // Activity summary
      const activitySummary = {
        total: totalActivities,
        today: await ActivityLog.countDocuments({
          user: userId,
          createdAt: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) }
        }),
        thisWeek: await ActivityLog.countDocuments({
          user: userId,
          createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
        }),
        failed: await ActivityLog.countDocuments({ user: userId, success: false })
      };

      res.json({
        success: true,
        message: 'Activity history retrieved successfully',
        data: {
          summary: activitySummary,
          totalActivities,
          activities: activities.map(activity => ({
            id: activity._id,
            action: activity.action,
            category: activity.category,
            resource: activity.resource,
            ipAddress: activity.ipAddress,
            location: activity.location,
            success: activity.success,
            timestamp: activity.createdAt,
            userAgent: activity.userAgent
          }))
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve activity history',
        error: error.message
      });
    }
  }

  // 📤 DATA EXPORT ENDPOINTS

  /**
   * Request data export
   */
  async requestDataExport(req, res) {
    try {
      const userId = req.user.id;
      const {
        type = 'full_export',
        dataTypes = ['profile', 'courses', 'assignments'],
        format = 'json',
        dateRange
      } = req.body;

      // Check for existing pending exports
      const existingExport = await DataExport.findOne({
        user: userId,
        status: { $in: ['pending', 'processing'] }
      });

      if (existingExport) {
        return res.status(400).json({
          success: false,
          message: 'You already have a pending data export request'
        });
      }

      const exportRequest = await SecurityService.createDataExport(userId, {
        type,
        dataTypes,
        format,
        dateRange
      });

      // Log the export request
      await SecurityService.logActivity({
        user: userId,
        action: 'data_export_requested',
        category: 'data_access',
        metadata: { exportId: exportRequest._id, dataTypes, format },
        success: true
      });

      res.json({
        success: true,
        message: 'Data export request submitted successfully',
        data: {
          exportId: exportRequest._id,
          status: exportRequest.status,
          estimatedCompletion: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
          dataTypes: exportRequest.dataTypes,
          format: exportRequest.format
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to create data export request',
        error: error.message
      });
    }
  }

  /**
   * Get data export status
   */
  async getDataExportStatus(req, res) {
    try {
      const userId = req.user.id;
      const { exportId } = req.params;

      const exportRequest = await DataExport.findOne({
        _id: exportId,
        user: userId
      });

      if (!exportRequest) {
        return res.status(404).json({
          success: false,
          message: 'Export request not found'
        });
      }

      res.json({
        success: true,
        message: 'Export status retrieved successfully',
        data: {
          exportId: exportRequest._id,
          status: exportRequest.status,
          progress: exportRequest.progress,
          fileInfo: exportRequest.fileInfo,
          createdAt: exportRequest.createdAt,
          dataTypes: exportRequest.dataTypes,
          format: exportRequest.format
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve export status',
        error: error.message
      });
    }
  }

  /**
   * Get user's export history
   */
  async getDataExportHistory(req, res) {
    try {
      const userId = req.user.id;
      const { limit = 10, skip = 0 } = req.query;

      const exports = await DataExport.find({ user: userId })
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .skip(parseInt(skip));

      const totalExports = await DataExport.countDocuments({ user: userId });

      res.json({
        success: true,
        message: 'Export history retrieved successfully',
        data: {
          totalExports,
          exports: exports.map(exp => ({
            exportId: exp._id,
            requestType: exp.requestType,
            status: exp.status,
            dataTypes: exp.dataTypes,
            format: exp.format,
            fileInfo: exp.fileInfo,
            createdAt: exp.createdAt,
            progress: exp.progress
          }))
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve export history',
        error: error.message
      });
    }
  }

  // 🔒 PRIVACY CONTROL ENDPOINTS

  /**
   * Get privacy settings
   */
  async getPrivacySettings(req, res) {
    try {
      const userId = req.user.id;
      const settings = await SecurityService.getPrivacySettings(userId);

      res.json({
        success: true,
        message: 'Privacy settings retrieved successfully',
        data: settings
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve privacy settings',
        error: error.message
      });
    }
  }

  /**
   * Update privacy settings
   */
  async updatePrivacySettings(req, res) {
    try {
      const userId = req.user.id;
      const updates = req.body;

      const settings = await SecurityService.updatePrivacySettings(userId, updates);

      res.json({
        success: true,
        message: 'Privacy settings updated successfully',
        data: settings
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to update privacy settings',
        error: error.message
      });
    }
  }

  // 📊 SECURITY DASHBOARD

  /**
   * Get security dashboard overview
   */
  async getSecurityDashboard(req, res) {
    try {
      const userId = req.user.id;

      // Get active sessions count
      const activeSessions = await UserSession.countDocuments({
        user: userId,
        isActive: true,
        expiresAt: { $gt: new Date() }
      });

      // Get trusted devices count
      const trustedDevices = await DeviceTracking.countDocuments({
        user: userId,
        trustLevel: 'trusted',
        isActive: true
      });

      // Get active security alerts
      const activeAlerts = await SecurityAlert.countDocuments({
        user: userId,
        status: 'active'
      });

      // Get recent activity count (last 24 hours)
      const recentActivity = await ActivityLog.countDocuments({
        user: userId,
        createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
      });

      // Get privacy settings
      const privacySettings = await SecurityService.getPrivacySettings(userId);

      // Get recent security events
      const recentAlerts = await SecurityAlert.find({
        user: userId,
        status: { $in: ['active', 'investigating'] }
      })
      .sort({ createdAt: -1 })
      .limit(5);

      res.json({
        success: true,
        message: 'Security dashboard retrieved successfully',
        data: {
          overview: {
            activeSessions,
            trustedDevices,
            activeAlerts,
            recentActivity,
            securityScore: Math.max(100 - (activeAlerts * 10), 0)
          },
          recentAlerts: recentAlerts.map(alert => ({
            id: alert._id,
            type: alert.alertType,
            severity: alert.severity,
            title: alert.title,
            createdAt: alert.createdAt
          })),
          privacyStatus: {
            dataCollection: privacySettings.dataCollection.analytics,
            locationTracking: privacySettings.dataCollection.locationTracking,
            twoFactorEnabled: privacySettings.accessControls.twoFactorEnabled,
            loginNotifications: privacySettings.accessControls.loginNotifications
          }
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve security dashboard',
        error: error.message
      });
    }
  }
}

module.exports = new SecurityController();
