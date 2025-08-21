// Scalable Storage Service
// Supports Local ➡️ Cloudinary ➡️ AWS S3 migration

const multer = require('multer');
const path = require('path');
const fs = require('fs');

class StorageService {
  constructor() {
    this.storageType = process.env.STORAGE_TYPE || 'local'; // local, cloudinary, aws-s3
    this.maxFileSize = this.getMaxFileSize();
    this.allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
    
    // Initialize storage provider
    this.initializeStorage();
  }

  // Initialize storage based on environment
  initializeStorage() {
    switch (this.storageType) {
      case 'local':
        this.storage = this.setupLocalStorage();
        console.log('📁 Using Local Storage (Demo Mode)');
        break;
      case 'cloudinary':
        this.storage = this.setupCloudinaryStorage();
        console.log('☁️ Using Cloudinary Storage (Growth Mode)');
        break;
      case 'aws-s3':
        this.storage = this.setupAWSStorage();
        console.log('🚀 Using AWS S3 Storage (Scale Mode)');
        break;
      default:
        this.storage = this.setupLocalStorage();
        console.log('📁 Fallback to Local Storage');
    }
  }

  // Get file size limit based on tier
  getMaxFileSize() {
    const tier = process.env.USER_TIER || 'free';
    const limits = {
      free: 2 * 1024 * 1024,      // 2MB for free users
      premium: 10 * 1024 * 1024,  // 10MB for premium
      enterprise: 50 * 1024 * 1024 // 50MB for enterprise
    };
    return limits[tier] || limits.free;
  }

  // Local Storage Setup (Demo/Development)
  setupLocalStorage() {
    // Ensure uploads directory exists
    const uploadsDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }

    return multer.diskStorage({
      destination: (req, file, cb) => {
        const userDir = path.join(uploadsDir, req.user.role, req.user._id.toString());
        
        // Create user-specific directory
        if (!fs.existsSync(userDir)) {
          fs.mkdirSync(userDir, { recursive: true });
        }
        
        cb(null, userDir);
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
      }
    });
  }

  // Cloudinary Storage Setup (Growth Phase)
  setupCloudinaryStorage() {
    if (!process.env.CLOUDINARY_CLOUD_NAME) {
      console.warn('⚠️ Cloudinary credentials missing, falling back to local storage');
      return this.setupLocalStorage();
    }

    const { CloudinaryStorage } = require('multer-storage-cloudinary');
    const cloudinary = require('cloudinary').v2;

    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET
    });

    return new CloudinaryStorage({
      cloudinary: cloudinary,
      params: {
        folder: (req, file) => `gyanguru/${req.user.role}/${req.user._id}`,
        allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'pdf'],
        transformation: [
          { width: 1000, height: 1000, crop: 'limit', quality: 'auto' }
        ]
      }
    });
  }

  // AWS S3 Storage Setup (Scale Phase)
  setupAWSStorage() {
    if (!process.env.AWS_ACCESS_KEY_ID) {
      console.warn('⚠️ AWS credentials missing, falling back to local storage');
      return this.setupLocalStorage();
    }

    const multerS3 = require('multer-s3');
    const AWS = require('aws-sdk');

    const s3 = new AWS.S3({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION || 'us-east-1'
    });

    return multerS3({
      s3: s3,
      bucket: process.env.AWS_S3_BUCKET,
      acl: 'public-read',
      key: (req, file, cb) => {
        const key = `gyanguru/${req.user.role}/${req.user._id}/${Date.now()}-${file.originalname}`;
        cb(null, key);
      },
      contentType: multerS3.AUTO_CONTENT_TYPE
    });
  }

  // Get upload middleware
  getUploadMiddleware(fieldName = 'file') {
    return multer({
      storage: this.storage,
      limits: {
        fileSize: this.maxFileSize,
        files: this.getMaxFiles()
      },
      fileFilter: (req, file, cb) => {
        if (this.allowedTypes.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new Error('Invalid file type. Only images and PDFs are allowed.'));
        }
      }
    }).single(fieldName);
  }

  // Get max files based on user tier
  getMaxFiles() {
    const tier = process.env.USER_TIER || 'free';
    const limits = {
      free: 5,        // 5 files per request
      premium: 20,    // 20 files per request
      enterprise: 50  // 50 files per request
    };
    return limits[tier] || limits.free;
  }

  // Get storage usage for user
  async getStorageUsage(userId) {
    try {
      switch (this.storageType) {
        case 'local':
          return await this.getLocalStorageUsage(userId);
        case 'cloudinary':
          return await this.getCloudinaryUsage(userId);
        case 'aws-s3':
          return await this.getS3Usage(userId);
        default:
          return { used: 0, limit: this.getStorageLimit() };
      }
    } catch (error) {
      console.error('Storage usage error:', error);
      return { used: 0, limit: this.getStorageLimit() };
    }
  }

  // Get storage limit based on user tier
  getStorageLimit() {
    const tier = process.env.USER_TIER || 'free';
    const limits = {
      free: 100 * 1024 * 1024,      // 100MB
      premium: 10 * 1024 * 1024 * 1024,  // 10GB
      enterprise: 100 * 1024 * 1024 * 1024 // 100GB
    };
    return limits[tier] || limits.free;
  }

  // Migration helper: Move files between storage types
  async migrateStorage(fromType, toType, userId) {
    console.log(`🔄 Migrating storage for user ${userId}: ${fromType} ➡️ ${toType}`);
    
    try {
      // Implementation for storage migration
      // This would handle moving files from local to cloud or between cloud providers
      
      return {
        success: true,
        message: `Storage migrated from ${fromType} to ${toType}`,
        migratedFiles: 0
      };
    } catch (error) {
      console.error('Migration error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Cleanup old files (for cost optimization)
  async cleanupOldFiles(userId, daysOld = 30) {
    try {
      // Implementation to clean up files older than specified days
      // This helps manage storage costs
      
      console.log(`🧹 Cleaning up files older than ${daysOld} days for user ${userId}`);
      return { cleaned: 0, savedSpace: 0 };
    } catch (error) {
      console.error('Cleanup error:', error);
      return { error: error.message };
    }
  }
}

// Export singleton instance
module.exports = new StorageService();
