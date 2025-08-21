const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const crypto = require('crypto');
const mongoose = require('mongoose');
const File = require('../models/File');
const Folder = require('../models/Folder');
// Note: These are optional dependencies for advanced file processing
// const ffmpeg = require('fluent-ffmpeg');
// const PDFDocument = require('pdfkit');

// 📁 GyanGuru Advanced File Management Service
// Features: Multi-format upload, Processing, Compression, Security, Analytics

class FileManagementService {
  constructor() {
    this.uploadPath = 'uploads';
    this.maxFileSize = {
      'pdf_document': 50 * 1024 * 1024, // 50MB
      'audio_recording': 100 * 1024 * 1024, // 100MB
      'video_tutorial': 500 * 1024 * 1024, // 500MB
      'study_material': 50 * 1024 * 1024, // 50MB
      'image': 10 * 1024 * 1024, // 10MB
      'document': 25 * 1024 * 1024, // 25MB
      'default': 10 * 1024 * 1024 // 10MB
    };
    
    this.allowedMimeTypes = {
      'pdf_document': ['application/pdf'],
      'audio_recording': ['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/ogg', 'audio/webm'],
      'video_tutorial': ['video/mp4', 'video/avi', 'video/mov', 'video/wmv', 'video/webm'],
      'study_material': [
        'application/pdf', 'application/vnd.ms-powerpoint', 
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain', 'text/html'
      ],
      'image': ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
      'document': [
        'application/pdf', 'application/msword', 
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain', 'text/csv'
      ]
    };
    
    this.ensureDirectoriesExist();
  }

  // Initialize directory structure
  async ensureDirectoriesExist() {
    const directories = [
      'uploads',
      'uploads/pdf_documents',
      'uploads/audio_recordings',
      'uploads/video_tutorials',
      'uploads/study_materials',
      'uploads/images',
      'uploads/documents',
      'uploads/thumbnails',
      'uploads/compressed',
      'uploads/temp'
    ];

    for (const dir of directories) {
      try {
        await fs.access(dir);
      } catch {
        await fs.mkdir(dir, { recursive: true });
      }
    }
  }

  // Configure multer storage
  getMulterConfig(fileType = 'default') {
    const storage = multer.diskStorage({
      destination: (req, file, cb) => {
        const uploadDir = `uploads/${fileType}s`;
        cb(null, uploadDir);
      },
      
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const hash = crypto.createHash('md5').update(file.originalname + uniqueSuffix).digest('hex');
        const ext = path.extname(file.originalname);
        cb(null, `${hash}${ext}`);
      }
    });

    const fileFilter = (req, file, cb) => {
      const allowedTypes = this.allowedMimeTypes[fileType] || [];
      
      if (allowedTypes.length === 0 || allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`), false);
      }
    };

    return multer({
      storage,
      fileFilter,
      limits: {
        fileSize: this.maxFileSize[fileType] || this.maxFileSize.default
      }
    });
  }

  // Upload single file
  async uploadFile(fileData, metadata, userId) {
    try {
      // Validate file
      await this.validateFile(fileData, metadata.fileType);
      
      // Process file based on type
      const processedFile = await this.processFile(fileData, metadata);
      
      // Create file record
      const fileRecord = new File({
        originalName: fileData.originalname,
        fileName: fileData.filename,
        filePath: fileData.path,
        fileUrl: `/uploads/${metadata.fileType}s/${fileData.filename}`,
        fileSize: fileData.size,
        mimeType: fileData.mimetype,
        fileType: metadata.fileType,
        category: metadata.category,
        uploadedBy: userId,
        uploadedByRole: metadata.userRole,
        title: metadata.title,
        description: metadata.description,
        subject: metadata.subject,
        topic: metadata.topic,
        gradeLevel: metadata.gradeLevel,
        tags: metadata.tags || [],
        visibility: metadata.visibility || 'private',
        parentFolder: metadata.folderId,
        ...processedFile
      });

      await fileRecord.save();
      
      // Update folder statistics
      if (metadata.folderId) {
        const folder = await Folder.findById(metadata.folderId);
        if (folder) {
          await folder.updateStatistics();
        }
      }
      
      // Generate thumbnail if applicable
      await this.generateThumbnail(fileRecord);
      
      return fileRecord;
    } catch (error) {
      // Clean up uploaded file if database save fails
      if (fileData.path) {
        try {
          await fs.unlink(fileData.path);
        } catch (unlinkError) {
          console.error('Error cleaning up file:', unlinkError);
        }
      }
      throw error;
    }
  }

  // Upload multiple files
  async uploadMultipleFiles(filesData, metadata, userId) {
    const uploadedFiles = [];
    const errors = [];

    for (let i = 0; i < filesData.length; i++) {
      try {
        const fileMetadata = {
          ...metadata,
          title: metadata.titles ? metadata.titles[i] : `${metadata.title || 'File'} ${i + 1}`,
          description: metadata.descriptions ? metadata.descriptions[i] : metadata.description
        };
        
        const uploadedFile = await this.uploadFile(filesData[i], fileMetadata, userId);
        uploadedFiles.push(uploadedFile);
      } catch (error) {
        errors.push({
          file: filesData[i].originalname,
          error: error.message
        });
      }
    }

    return {
      uploadedFiles,
      errors,
      totalUploaded: uploadedFiles.length,
      totalErrors: errors.length
    };
  }

  // Validate file
  async validateFile(fileData, fileType) {
    // Check file size
    const maxSize = this.maxFileSize[fileType] || this.maxFileSize.default;
    if (fileData.size > maxSize) {
      throw new Error(`File size exceeds limit. Maximum allowed: ${this.formatFileSize(maxSize)}`);
    }

    // Check mime type
    const allowedTypes = this.allowedMimeTypes[fileType] || [];
    if (allowedTypes.length > 0 && !allowedTypes.includes(fileData.mimetype)) {
      throw new Error(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`);
    }

    // Additional security checks
    await this.performSecurityChecks(fileData);
    
    return true;
  }

  // Security checks
  async performSecurityChecks(fileData) {
    // Basic virus scanning (placeholder - integrate with actual antivirus)
    const suspiciousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.pif', '.com'];
    const ext = path.extname(fileData.originalname).toLowerCase();
    
    if (suspiciousExtensions.includes(ext)) {
      throw new Error('File type not allowed for security reasons');
    }

    // Check for embedded scripts in documents (basic check)
    if (fileData.mimetype.includes('pdf') || fileData.mimetype.includes('document')) {
      // Placeholder for more sophisticated content scanning
      return true;
    }

    return true;
  }

  // Process file based on type
  async processFile(fileData, metadata) {
    const processedData = {};

    switch (metadata.fileType) {
      case 'pdf_document':
        processedData.pageCount = await this.getPdfPageCount(fileData.path);
        processedData.textExtracted = await this.extractPdfText(fileData.path);
        break;
        
      case 'audio_recording':
        processedData.duration = await this.getAudioDuration(fileData.path);
        processedData.quality = await this.analyzeAudioQuality(fileData.path);
        break;
        
      case 'video_tutorial':
        const videoInfo = await this.getVideoInfo(fileData.path);
        processedData.duration = videoInfo.duration;
        processedData.quality = videoInfo.quality;
        break;
        
      case 'study_material':
        if (fileData.mimetype === 'application/pdf') {
          processedData.pageCount = await this.getPdfPageCount(fileData.path);
        }
        break;
    }

    // Set processing status
    processedData.processingStatus = 'completed';
    
    return processedData;
  }

  // PDF processing
  async getPdfPageCount(filePath) {
    try {
      // Placeholder for PDF processing
      // In production, use libraries like pdf-parse or pdf2pic
      return 1;
    } catch (error) {
      console.error('Error getting PDF page count:', error);
      return null;
    }
  }

  async extractPdfText(filePath) {
    try {
      // Placeholder for text extraction
      // In production, use libraries like pdf-parse
      return 'Text extraction not implemented';
    } catch (error) {
      console.error('Error extracting PDF text:', error);
      return null;
    }
  }

  // Audio processing
  async getAudioDuration(filePath) {
    return new Promise((resolve, reject) => {
      try {
        const ffmpeg = require('fluent-ffmpeg');
        ffmpeg.ffprobe(filePath, (err, metadata) => {
          if (err) {
            console.error('Error getting audio duration:', err);
            resolve(null);
          } else {
            resolve(metadata.format.duration);
          }
        });
      } catch (error) {
        console.error('FFmpeg not available:', error);
        resolve(null);
      }
    });
  }

  async analyzeAudioQuality(filePath) {
    try {
      // Placeholder for audio quality analysis
      // In production, analyze bitrate, sample rate, etc.
      return 'medium';
    } catch (error) {
      console.error('Error analyzing audio quality:', error);
      return 'unknown';
    }
  }

  // Video processing
  async getVideoInfo(filePath) {
    return new Promise((resolve, reject) => {
      try {
        const ffmpeg = require('fluent-ffmpeg');
        ffmpeg.ffprobe(filePath, (err, metadata) => {
          if (err) {
            console.error('Error getting video info:', err);
            resolve({ duration: null, quality: 'unknown' });
          } else {
            const videoStream = metadata.streams.find(stream => stream.codec_type === 'video');
            const quality = this.determineVideoQuality(videoStream);
            
            resolve({
              duration: metadata.format.duration,
              quality
            });
          }
        });
      } catch (error) {
        console.error('FFmpeg not available:', error);
        resolve({ duration: null, quality: 'unknown' });
      }
    });
  }

  determineVideoQuality(videoStream) {
    if (!videoStream) return 'unknown';
    
    const height = videoStream.height;
    if (height >= 1080) return 'high';
    if (height >= 720) return 'medium';
    return 'low';
  }

  // Thumbnail generation
  async generateThumbnail(fileRecord) {
    try {
      const thumbnailPath = `uploads/thumbnails/${fileRecord.fileName}_thumb.jpg`;
      
      switch (fileRecord.fileType) {
        case 'video_tutorial':
          await this.generateVideoThumbnail(fileRecord.filePath, thumbnailPath);
          break;
          
        case 'pdf_document':
          await this.generatePdfThumbnail(fileRecord.filePath, thumbnailPath);
          break;
          
        case 'image':
          await this.generateImageThumbnail(fileRecord.filePath, thumbnailPath);
          break;
      }
      
      // Update file record with thumbnail path
      fileRecord.thumbnail = thumbnailPath;
      await fileRecord.save();
      
    } catch (error) {
      console.error('Error generating thumbnail:', error);
    }
  }

  async generateVideoThumbnail(videoPath, thumbnailPath) {
    return new Promise((resolve, reject) => {
      try {
        const ffmpeg = require('fluent-ffmpeg');
        ffmpeg(videoPath)
          .screenshots({
            timestamps: ['10%'],
            filename: path.basename(thumbnailPath),
            folder: path.dirname(thumbnailPath),
            size: '320x240'
          })
          .on('end', resolve)
          .on('error', reject);
      } catch (error) {
        console.error('FFmpeg not available for thumbnail generation:', error);
        resolve();
      }
    });
  }

  async generatePdfThumbnail(pdfPath, thumbnailPath) {
    // Placeholder for PDF thumbnail generation
    // In production, use libraries like pdf2pic
    return Promise.resolve();
  }

  async generateImageThumbnail(imagePath, thumbnailPath) {
    // Placeholder for image thumbnail generation
    // In production, use libraries like sharp or jimp
    return Promise.resolve();
  }

  // File compression
  async compressFile(fileId, userId) {
    try {
      const file = await File.findById(fileId);
      if (!file) {
        throw new Error('File not found');
      }

      if (!file.canAccess(userId)) {
        throw new Error('Access denied');
      }

      const compressedPath = `uploads/compressed/${file.fileName}_compressed${path.extname(file.fileName)}`;
      
      switch (file.fileType) {
        case 'video_tutorial':
          await this.compressVideo(file.filePath, compressedPath);
          break;
          
        case 'audio_recording':
          await this.compressAudio(file.filePath, compressedPath);
          break;
          
        case 'pdf_document':
          await this.compressPdf(file.filePath, compressedPath);
          break;
          
        default:
          throw new Error('File type not supported for compression');
      }

      // Update file record
      const compressedStats = await fs.stat(compressedPath);
      file.originalSize = file.fileSize;
      file.fileSize = compressedStats.size;
      file.filePath = compressedPath;
      file.isCompressed = true;
      file.compressionRatio = file.originalSize / file.fileSize;
      
      await file.save();
      
      return file;
    } catch (error) {
      throw error;
    }
  }

  async compressVideo(inputPath, outputPath) {
    return new Promise((resolve, reject) => {
      try {
        const ffmpeg = require('fluent-ffmpeg');
        ffmpeg(inputPath)
          .videoCodec('libx264')
          .audioCodec('aac')
          .videoBitrate('1000k')
          .audioBitrate('128k')
          .output(outputPath)
          .on('end', resolve)
          .on('error', reject)
          .run();
      } catch (error) {
        console.error('FFmpeg not available for video compression:', error);
        reject(new Error('Video compression not available'));
      }
    });
  }

  async compressAudio(inputPath, outputPath) {
    return new Promise((resolve, reject) => {
      try {
        const ffmpeg = require('fluent-ffmpeg');
        ffmpeg(inputPath)
          .audioCodec('libmp3lame')
          .audioBitrate('128k')
          .output(outputPath)
          .on('end', resolve)
          .on('error', reject)
          .run();
      } catch (error) {
        console.error('FFmpeg not available for audio compression:', error);
        reject(new Error('Audio compression not available'));
      }
    });
  }

  async compressPdf(inputPath, outputPath) {
    // Placeholder for PDF compression
    // In production, use libraries like pdf-lib or ghostscript
    return Promise.resolve();
  }

  // File download
  async downloadFile(fileId, userId) {
    try {
      const file = await File.findById(fileId).populate('uploadedBy', 'username fullName');
      
      if (!file) {
        throw new Error('File not found');
      }

      if (!file.canAccess(userId)) {
        throw new Error('Access denied');
      }

      // Increment download count
      await file.incrementDownload();
      
      // Check if file exists
      try {
        await fs.access(file.filePath);
      } catch {
        throw new Error('File not found on disk');
      }

      return {
        file,
        filePath: file.filePath,
        fileName: file.originalName,
        mimeType: file.mimeType
      };
    } catch (error) {
      throw error;
    }
  }

  // Bulk file operations
  async bulkDownload(fileIds, userId) {
    try {
      const archiver = require('archiver');
      const files = await File.find({ 
        _id: { $in: fileIds },
        $or: [
          { uploadedBy: userId },
          { visibility: 'public' },
          { 'sharedWith.userId': userId }
        ]
      });

      if (files.length === 0) {
        throw new Error('No accessible files found');
      }

      // Create zip archive
      const archive = archiver('zip', { zlib: { level: 9 } });
      const zipPath = `uploads/temp/bulk_download_${Date.now()}.zip`;
      const output = require('fs').createWriteStream(zipPath);
      
      archive.pipe(output);

      for (const file of files) {
        try {
          await fs.access(file.filePath);
          archive.file(file.filePath, { name: file.originalName });
          await file.incrementDownload();
        } catch (error) {
          console.error(`Error adding file ${file.originalName} to archive:`, error);
        }
      }

      await archive.finalize();
      
      return new Promise((resolve, reject) => {
        output.on('close', () => {
          resolve({
            zipPath,
            fileCount: files.length,
            totalSize: archive.pointer()
          });
        });
        
        output.on('error', reject);
      });
      
    } catch (error) {
      throw error;
    }
  }

  async bulkDelete(fileIds, userId, userRole) {
    try {
      const files = await File.find({ _id: { $in: fileIds } });
      const deletedFiles = [];
      const errors = [];

      for (const file of files) {
        try {
          // Check permissions
          if (file.uploadedBy.toString() !== userId.toString() && userRole !== 'admin') {
            errors.push({
              fileId: file._id,
              fileName: file.originalName,
              error: 'Access denied'
            });
            continue;
          }

          // Delete physical file
          try {
            await fs.unlink(file.filePath);
          } catch (unlinkError) {
            console.error('Error deleting physical file:', unlinkError);
          }

          // Delete thumbnail
          if (file.thumbnail) {
            try {
              await fs.unlink(file.thumbnail);
            } catch (unlinkError) {
              console.error('Error deleting thumbnail:', unlinkError);
            }
          }

          // Delete database record
          await File.findByIdAndDelete(file._id);
          deletedFiles.push(file._id);

        } catch (error) {
          errors.push({
            fileId: file._id,
            fileName: file.originalName,
            error: error.message
          });
        }
      }

      return {
        deletedFiles,
        errors,
        totalDeleted: deletedFiles.length,
        totalErrors: errors.length
      };
    } catch (error) {
      throw error;
    }
  }

  async bulkMove(fileIds, targetFolderId, userId) {
    try {
      const files = await File.find({ 
        _id: { $in: fileIds },
        uploadedBy: userId 
      });

      if (files.length === 0) {
        throw new Error('No files found or access denied');
      }

      // Validate target folder
      if (targetFolderId) {
        const targetFolder = await Folder.findById(targetFolderId);
        if (!targetFolder || !targetFolder.canAccess(userId)) {
          throw new Error('Target folder not found or access denied');
        }
      }

      // Update files
      await File.updateMany(
        { _id: { $in: fileIds }, uploadedBy: userId },
        { parentFolder: targetFolderId }
      );

      // Update folder statistics
      const uniqueFolderIds = [...new Set([
        ...files.map(f => f.parentFolder).filter(Boolean),
        targetFolderId
      ].filter(Boolean))];

      for (const folderId of uniqueFolderIds) {
        const folder = await Folder.findById(folderId);
        if (folder) {
          await folder.updateStatistics();
        }
      }

      return {
        movedFiles: files.length,
        targetFolder: targetFolderId
      };
    } catch (error) {
      throw error;
    }
  }

  // Utility methods
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  getFileIcon(mimeType, fileType) {
    const iconMap = {
      'application/pdf': 'file-pdf',
      'audio/': 'file-audio',
      'video/': 'file-video',
      'image/': 'file-image',
      'text/': 'file-text',
      'application/msword': 'file-word',
      'application/vnd.ms-excel': 'file-excel',
      'application/vnd.ms-powerpoint': 'file-powerpoint'
    };

    for (const [type, icon] of Object.entries(iconMap)) {
      if (mimeType.startsWith(type)) {
        return icon;
      }
    }

    return 'file';
  }

  // File analytics
  async getFileAnalytics(userId, timeframe = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - timeframe);

      const pipeline = [
        {
          $match: {
            uploadedBy: mongoose.Types.ObjectId(userId),
            uploadedAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: null,
            totalFiles: { $sum: 1 },
            totalSize: { $sum: '$fileSize' },
            totalViews: { $sum: '$viewCount' },
            totalDownloads: { $sum: '$downloadCount' },
            avgRating: { $avg: '$qualityRating' },
            filesByType: {
              $push: {
                fileType: '$fileType',
                category: '$category',
                size: '$fileSize'
              }
            }
          }
        }
      ];

      const analytics = await File.aggregate(pipeline);
      
      return analytics.length > 0 ? analytics[0] : {
        totalFiles: 0,
        totalSize: 0,
        totalViews: 0,
        totalDownloads: 0,
        avgRating: 0,
        filesByType: []
      };
    } catch (error) {
      throw error;
    }
  }

  // Cleanup expired files
  async cleanupExpiredFiles() {
    try {
      const expiredFiles = await File.find({
        expiresAt: { $lt: new Date() },
        isArchived: false
      });

      let cleanedCount = 0;
      
      for (const file of expiredFiles) {
        try {
          // Delete physical file
          await fs.unlink(file.filePath);
          
          // Delete thumbnail
          if (file.thumbnail) {
            await fs.unlink(file.thumbnail);
          }
          
          // Archive or delete record
          await File.findByIdAndDelete(file._id);
          cleanedCount++;
          
        } catch (error) {
          console.error(`Error cleaning up file ${file._id}:`, error);
        }
      }

      return {
        cleanedCount,
        totalExpired: expiredFiles.length
      };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = FileManagementService;
