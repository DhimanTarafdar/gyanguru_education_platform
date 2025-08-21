const mongoose = require('mongoose');

// 🛡️ GyanGuru Security & Monitoring Database Models
// Features: Session Management, Device Tracking, Suspicious Activity Alerts, Data Export/Backup, Privacy Controls

// 1. User Session Management Schema
const UserSessionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  sessionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  deviceInfo: {
    userAgent: String,
    browser: String,
    browserVersion: String,
    os: String,
    osVersion: String,
    device: String,
    deviceType: {
      type: String,
      enum: ['desktop', 'mobile', 'tablet', 'unknown'],
      default: 'unknown'
    },
    platform: String,
    ipAddress: String,
    location: {
      country: String,
      region: String,
      city: String,
      coordinates: {
        lat: Number,
        lng: Number
      }
    }
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  },
  loginTime: {
    type: Date,
    default: Date.now,
    index: true
  },
  lastActivity: {
    type: Date,
    default: Date.now,
    index: true
  },
  logoutTime: Date,
  sessionDuration: Number, // in seconds
  activities: [{
    action: String,
    timestamp: {
      type: Date,
      default: Date.now
    },
    ipAddress: String,
    userAgent: String,
    metadata: mongoose.Schema.Types.Mixed
  }],
  securityFlags: {
    isSuspicious: {
      type: Boolean,
      default: false
    },
    isCompromised: {
      type: Boolean,
      default: false
    },
    requiresVerification: {
      type: Boolean,
      default: false
    },
    riskScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    }
  },
  expiresAt: {
    type: Date,
    index: { expireAfterSeconds: 0 }
  }
}, {
  timestamps: true,
  collection: 'user_sessions'
});

// Index for efficient queries
UserSessionSchema.index({ user: 1, isActive: 1 });
UserSessionSchema.index({ sessionId: 1, isActive: 1 });
UserSessionSchema.index({ 'deviceInfo.ipAddress': 1 });
UserSessionSchema.index({ createdAt: -1 });

// 2. Device Tracking Schema
const DeviceTrackingSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  deviceId: {
    type: String,
    required: true,
    index: true
  },
  deviceFingerprint: {
    type: String,
    required: true,
    index: true
  },
  deviceInfo: {
    name: String,
    userAgent: String,
    browser: String,
    browserVersion: String,
    os: String,
    osVersion: String,
    platform: String,
    screenResolution: String,
    timezone: String,
    language: String,
    cookiesEnabled: Boolean,
    javaEnabled: Boolean,
    plugins: [String]
  },
  trustLevel: {
    type: String,
    enum: ['trusted', 'unknown', 'suspicious', 'blocked'],
    default: 'unknown',
    index: true
  },
  firstSeen: {
    type: Date,
    default: Date.now
  },
  lastSeen: {
    type: Date,
    default: Date.now,
    index: true
  },
  loginCount: {
    type: Number,
    default: 1
  },
  locationHistory: [{
    ipAddress: String,
    country: String,
    region: String,
    city: String,
    coordinates: {
      lat: Number,
      lng: Number
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  securityEvents: [{
    eventType: {
      type: String,
      enum: ['suspicious_login', 'failed_verification', 'location_change', 'device_change', 'security_alert']
    },
    description: String,
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'low'
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    resolved: {
      type: Boolean,
      default: false
    }
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  isBlocked: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true,
  collection: 'device_tracking'
});

// Indexes for device tracking
DeviceTrackingSchema.index({ user: 1, trustLevel: 1 });
DeviceTrackingSchema.index({ deviceFingerprint: 1 });
DeviceTrackingSchema.index({ lastSeen: -1 });

// 3. Security Alert Schema
const SecurityAlertSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  alertType: {
    type: String,
    enum: [
      'suspicious_login',
      'multiple_failed_attempts',
      'new_device_login',
      'location_anomaly',
      'unusual_activity',
      'data_breach_attempt',
      'privilege_escalation',
      'account_compromise',
      'malicious_behavior',
      'system_intrusion'
    ],
    required: true,
    index: true
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium',
    index: true
  },
  status: {
    type: String,
    enum: ['active', 'investigating', 'resolved', 'false_positive'],
    default: 'active',
    index: true
  },
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  details: {
    ipAddress: String,
    userAgent: String,
    location: {
      country: String,
      region: String,
      city: String
    },
    deviceInfo: mongoose.Schema.Types.Mixed,
    sessionInfo: mongoose.Schema.Types.Mixed,
    additionalData: mongoose.Schema.Types.Mixed
  },
  riskScore: {
    type: Number,
    min: 0,
    max: 100,
    default: 50
  },
  autoGenerated: {
    type: Boolean,
    default: true
  },
  triggeredBy: {
    system: String,
    rule: String,
    threshold: mongoose.Schema.Types.Mixed
  },
  actions: [{
    action: {
      type: String,
      enum: ['email_sent', 'sms_sent', 'account_locked', 'session_terminated', 'admin_notified', 'device_blocked']
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    performedBy: {
      type: String,
      enum: ['system', 'admin', 'user'],
      default: 'system'
    },
    details: mongoose.Schema.Types.Mixed
  }],
  resolvedAt: Date,
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  resolutionNotes: String
}, {
  timestamps: true,
  collection: 'security_alerts'
});

// Indexes for security alerts
SecurityAlertSchema.index({ user: 1, status: 1 });
SecurityAlertSchema.index({ alertType: 1, severity: 1 });
SecurityAlertSchema.index({ createdAt: -1 });
SecurityAlertSchema.index({ status: 1, severity: 1 });

// 4. Activity Log Schema
const ActivityLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  sessionId: String,
  action: {
    type: String,
    required: true,
    index: true
  },
  category: {
    type: String,
    enum: ['authentication', 'authorization', 'data_access', 'data_modification', 'system_access', 'security', 'admin'],
    default: 'system_access',
    index: true
  },
  resource: {
    type: String,
    index: true
  },
  resourceId: String,
  method: String,
  endpoint: String,
  ipAddress: {
    type: String,
    index: true
  },
  userAgent: String,
  location: {
    country: String,
    region: String,
    city: String
  },
  success: {
    type: Boolean,
    default: true,
    index: true
  },
  statusCode: Number,
  errorMessage: String,
  responseTime: Number, // in milliseconds
  dataSize: Number, // in bytes
  metadata: {
    requestBody: mongoose.Schema.Types.Mixed,
    queryParams: mongoose.Schema.Types.Mixed,
    headers: mongoose.Schema.Types.Mixed,
    customData: mongoose.Schema.Types.Mixed
  },
  riskIndicators: [{
    indicator: String,
    value: mongoose.Schema.Types.Mixed,
    riskLevel: {
      type: String,
      enum: ['low', 'medium', 'high']
    }
  }]
}, {
  timestamps: true,
  collection: 'activity_logs'
});

// Indexes for activity logs
ActivityLogSchema.index({ user: 1, createdAt: -1 });
ActivityLogSchema.index({ action: 1, category: 1 });
ActivityLogSchema.index({ ipAddress: 1, createdAt: -1 });
ActivityLogSchema.index({ success: 1, createdAt: -1 });

// 5. Data Export Request Schema
const DataExportSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  requestType: {
    type: String,
    enum: ['full_export', 'partial_export', 'backup', 'gdpr_compliance'],
    required: true,
    index: true
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'expired'],
    default: 'pending',
    index: true
  },
  dataTypes: [{
    type: String,
    enum: [
      'profile',
      'courses',
      'assignments',
      'grades',
      'messages',
      'activity_logs',
      'files',
      'settings',
      'achievements',
      'progress'
    ]
  }],
  format: {
    type: String,
    enum: ['json', 'csv', 'pdf', 'zip'],
    default: 'json'
  },
  dateRange: {
    from: Date,
    to: Date
  },
  fileInfo: {
    filename: String,
    size: Number, // in bytes
    downloadUrl: String,
    expiresAt: Date
  },
  progress: {
    percentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    currentStep: String,
    estimatedCompletion: Date
  },
  downloadHistory: [{
    downloadedAt: {
      type: Date,
      default: Date.now
    },
    ipAddress: String,
    userAgent: String
  }],
  retentionPeriod: {
    type: Number,
    default: 30 // days
  }
}, {
  timestamps: true,
  collection: 'data_exports'
});

// Indexes for data exports
DataExportSchema.index({ user: 1, status: 1 });
DataExportSchema.index({ createdAt: -1 });
DataExportSchema.index({ 'fileInfo.expiresAt': 1 });

// 6. Privacy Settings Schema
const PrivacySettingsSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true,
    index: true
  },
  dataCollection: {
    analytics: {
      type: Boolean,
      default: true
    },
    behaviorTracking: {
      type: Boolean,
      default: true
    },
    locationTracking: {
      type: Boolean,
      default: false
    },
    deviceTracking: {
      type: Boolean,
      default: true
    },
    performanceMetrics: {
      type: Boolean,
      default: true
    }
  },
  dataSharing: {
    anonymizedData: {
      type: Boolean,
      default: false
    },
    researchPurposes: {
      type: Boolean,
      default: false
    },
    thirdPartyServices: {
      type: Boolean,
      default: false
    },
    marketingPartners: {
      type: Boolean,
      default: false
    }
  },
  communications: {
    emailNotifications: {
      type: Boolean,
      default: true
    },
    smsNotifications: {
      type: Boolean,
      default: false
    },
    pushNotifications: {
      type: Boolean,
      default: true
    },
    marketingEmails: {
      type: Boolean,
      default: false
    },
    securityAlerts: {
      type: Boolean,
      default: true
    }
  },
  profileVisibility: {
    publicProfile: {
      type: Boolean,
      default: false
    },
    showAchievements: {
      type: Boolean,
      default: true
    },
    showProgress: {
      type: Boolean,
      default: false
    },
    showActivity: {
      type: Boolean,
      default: false
    }
  },
  dataRetention: {
    activityLogs: {
      type: Number,
      default: 90, // days
      min: 30,
      max: 365
    },
    sessionHistory: {
      type: Number,
      default: 30, // days
      min: 7,
      max: 90
    },
    deletedDataRetention: {
      type: Number,
      default: 30, // days
      min: 0,
      max: 90
    }
  },
  accessControls: {
    twoFactorEnabled: {
      type: Boolean,
      default: false
    },
    sessionTimeout: {
      type: Number,
      default: 30, // minutes
      min: 5,
      max: 240
    },
    deviceManagement: {
      type: Boolean,
      default: true
    },
    loginNotifications: {
      type: Boolean,
      default: true
    }
  },
  consentHistory: [{
    consentType: String,
    granted: Boolean,
    timestamp: {
      type: Date,
      default: Date.now
    },
    version: String,
    ipAddress: String
  }]
}, {
  timestamps: true,
  collection: 'privacy_settings'
});

// 7. Security Audit Log Schema
const SecurityAuditSchema = new mongoose.Schema({
  eventType: {
    type: String,
    enum: [
      'login_attempt',
      'login_success',
      'login_failure',
      'logout',
      'password_change',
      'email_change',
      'permission_change',
      'data_access',
      'data_export',
      'privacy_change',
      'device_added',
      'device_removed',
      'suspicious_activity'
    ],
    required: true,
    index: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  performer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  sessionId: String,
  ipAddress: {
    type: String,
    index: true
  },
  userAgent: String,
  location: {
    country: String,
    region: String,
    city: String
  },
  success: {
    type: Boolean,
    default: true,
    index: true
  },
  details: {
    oldValue: mongoose.Schema.Types.Mixed,
    newValue: mongoose.Schema.Types.Mixed,
    reason: String,
    metadata: mongoose.Schema.Types.Mixed
  },
  riskAssessment: {
    riskLevel: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'low'
    },
    riskFactors: [String],
    automated: {
      type: Boolean,
      default: true
    }
  }
}, {
  timestamps: true,
  collection: 'security_audit'
});

// Indexes for security audit
SecurityAuditSchema.index({ eventType: 1, createdAt: -1 });
SecurityAuditSchema.index({ user: 1, createdAt: -1 });
SecurityAuditSchema.index({ ipAddress: 1, createdAt: -1 });
SecurityAuditSchema.index({ success: 1, 'riskAssessment.riskLevel': 1 });

// Virtual fields for UserSession
UserSessionSchema.virtual('isExpired').get(function() {
  return this.expiresAt && this.expiresAt < new Date();
});

UserSessionSchema.virtual('durationMinutes').get(function() {
  if (this.sessionDuration) {
    return Math.floor(this.sessionDuration / 60);
  }
  return 0;
});

// Virtual fields for DeviceTracking
DeviceTrackingSchema.virtual('daysSinceFirstSeen').get(function() {
  return Math.floor((Date.now() - this.firstSeen) / (1000 * 60 * 60 * 24));
});

DeviceTrackingSchema.virtual('daysSinceLastSeen').get(function() {
  return Math.floor((Date.now() - this.lastSeen) / (1000 * 60 * 60 * 24));
});

// Model exports
const UserSession = mongoose.model('UserSession', UserSessionSchema);
const DeviceTracking = mongoose.model('DeviceTracking', DeviceTrackingSchema);
const SecurityAlert = mongoose.model('SecurityAlert', SecurityAlertSchema);
const ActivityLog = mongoose.model('ActivityLog', ActivityLogSchema);
const DataExport = mongoose.model('DataExport', DataExportSchema);
const PrivacySettings = mongoose.model('PrivacySettings', PrivacySettingsSchema);
const SecurityAudit = mongoose.model('SecurityAudit', SecurityAuditSchema);

module.exports = {
  UserSession,
  DeviceTracking,
  SecurityAlert,
  ActivityLog,
  DataExport,
  PrivacySettings,
  SecurityAudit
};
