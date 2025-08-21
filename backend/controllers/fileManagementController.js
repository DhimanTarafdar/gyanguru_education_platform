const FileManagementService = require('../services/FileManagementService');
const File = require('../models/File');
const Folder = require('../models/Folder');
const path = require('path');
const fs = require('fs').promises;

// 📁 GyanGuru Advanced File Management Controller
// Features: Upload, Download, Processing, Organization, Analytics, Bulk Operations

class FileManagementController {

  // 📤 Upload single file
  async uploadFile(req, res) {
    try {
      const { fileType, category, title, description, subject, topic, gradeLevel, tags, visibility, folderId } = req.body;
      
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded'
        });
      }

      const metadata = {
        fileType: fileType || 'document',
        category: category || 'documents',
        title: title || req.file.originalname,
        description,
        subject,
        topic,
        gradeLevel,
        tags: tags ? (Array.isArray(tags) ? tags : tags.split(',').map(tag => tag.trim())) : [],
        visibility: visibility || 'private',
        folderId,
        userRole: req.user.role
      };

      const uploadedFile = await FileManagementService.uploadFile(req.file, metadata, req.user.id);

      res.status(201).json({
        success: true,
        message: 'File uploaded successfully',
        data: {
          file: uploadedFile,
          uploadInfo: {
            originalName: req.file.originalname,
            size: req.file.size,
            type: req.file.mimetype,
            processed: true
          }
        }
      });
    } catch (error) {
      console.error('File upload error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'File upload failed',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  // 📤 Upload multiple files
  async uploadMultipleFiles(req, res) {
    try {
      const { fileType, category, titles, descriptions, subject, topic, gradeLevel, tags, visibility, folderId } = req.body;
      
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'No files uploaded'
        });
      }

      const metadata = {
        fileType: fileType || 'document',
        category: category || 'documents',
        titles: titles ? (Array.isArray(titles) ? titles : titles.split(',').map(t => t.trim())) : null,
        descriptions: descriptions ? (Array.isArray(descriptions) ? descriptions : descriptions.split(',').map(d => d.trim())) : null,
        title: 'Bulk Upload',
        description,
        subject,
        topic,
        gradeLevel,
        tags: tags ? (Array.isArray(tags) ? tags : tags.split(',').map(tag => tag.trim())) : [],
        visibility: visibility || 'private',
        folderId,
        userRole: req.user.role
      };

      const result = await FileManagementService.uploadMultipleFiles(req.files, metadata, req.user.id);

      res.status(201).json({
        success: true,
        message: `${result.totalUploaded} files uploaded successfully`,
        data: {
          uploadedFiles: result.uploadedFiles,
          errors: result.errors,
          summary: {
            totalFiles: req.files.length,
            successfulUploads: result.totalUploaded,
            failedUploads: result.totalErrors
          }
        }
      });
    } catch (error) {
      console.error('Multiple file upload error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Multiple file upload failed',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      });
    }
  }

  // 📥 Download file
  async downloadFile(req, res) {
    try {
      const { fileId } = req.params;
      
      const downloadInfo = await FileManagementService.downloadFile(fileId, req.user.id);
      
      res.setHeader('Content-Disposition', `attachment; filename="${downloadInfo.fileName}"`);
      res.setHeader('Content-Type', downloadInfo.mimeType);
      
      res.download(downloadInfo.filePath, downloadInfo.fileName, (err) => {
        if (err) {
          console.error('Download error:', err);
          if (!res.headersSent) {
            res.status(500).json({
              success: false,
              message: 'Download failed'
            });
          }
        }
      });
    } catch (error) {
      console.error('File download error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'File download failed'
      });
    }
  }

  // 📥 Bulk download
  async bulkDownload(req, res) {
    try {
      const { fileIds } = req.body;
      
      if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'File IDs are required'
        });
      }

      const zipInfo = await FileManagementService.bulkDownload(fileIds, req.user.id);
      
      res.setHeader('Content-Disposition', `attachment; filename="files_${Date.now()}.zip"`);
      res.setHeader('Content-Type', 'application/zip');
      
      res.download(zipInfo.zipPath, `files_${Date.now()}.zip`, async (err) => {
        if (err) {
          console.error('Bulk download error:', err);
          if (!res.headersSent) {
            res.status(500).json({
              success: false,
              message: 'Bulk download failed'
            });
          }
        }
        
        // Clean up temporary zip file
        try {
          await fs.unlink(zipInfo.zipPath);
        } catch (cleanupError) {
          console.error('Error cleaning up zip file:', cleanupError);
        }
      });
    } catch (error) {
      console.error('Bulk download error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Bulk download failed'
      });
    }
  }

  // 📋 Get user files
  async getUserFiles(req, res) {
    try {
      const { 
        page = 1, 
        limit = 20, 
        fileType, 
        category, 
        subject, 
        folderId, 
        search,
        sortBy = 'uploadedAt',
        sortOrder = 'desc'
      } = req.query;

      const query = {
        uploadedBy: req.user.id,
        isArchived: false
      };

      // Apply filters
      if (fileType) query.fileType = fileType;
      if (category) query.category = category;
      if (subject) query.subject = subject;
      if (folderId) query.parentFolder = folderId === 'null' ? null : folderId;
      
      // Apply search
      if (search) {
        query.$or = [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { originalName: { $regex: search, $options: 'i' } },
          { tags: { $regex: search, $options: 'i' } }
        ];
      }

      const sort = {};
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

      const files = await File.find(query)
        .sort(sort)
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit))
        .populate('uploadedBy', 'username fullName')
        .populate('parentFolder', 'name path');

      const totalFiles = await File.countDocuments(query);
      const totalPages = Math.ceil(totalFiles / parseInt(limit));

      res.json({
        success: true,
        message: 'Files retrieved successfully',
        data: {
          files,
          pagination: {
            currentPage: parseInt(page),
            totalPages,
            totalFiles,
            hasNextPage: parseInt(page) < totalPages,
            hasPrevPage: parseInt(page) > 1,
            limit: parseInt(limit)
          },
          filters: {
            fileType,
            category,
            subject,
            folderId,
            search
          }
        }
      });
    } catch (error) {
      console.error('Get user files error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve files'
      });
    }
  }

  // 📋 Get public files
  async getPublicFiles(req, res) {
    try {
      const { 
        page = 1, 
        limit = 20, 
        fileType, 
        category, 
        subject, 
        search,
        sortBy = 'analytics.popularityScore',
        sortOrder = 'desc'
      } = req.query;

      const query = {
        visibility: 'public',
        approvalStatus: 'approved',
        isArchived: false
      };

      // Apply filters
      if (fileType) query.fileType = fileType;
      if (category) query.category = category;
      if (subject) query.subject = subject;
      
      // Apply search
      if (search) {
        query.$or = [
          { title: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { tags: { $regex: search, $options: 'i' } }
        ];
      }

      const sort = {};
      sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

      const files = await File.find(query)
        .sort(sort)
        .limit(parseInt(limit))
        .skip((parseInt(page) - 1) * parseInt(limit))
        .populate('uploadedBy', 'username fullName');

      const totalFiles = await File.countDocuments(query);

      res.json({
        success: true,
        message: 'Public files retrieved successfully',
        data: {
          files,
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(totalFiles / parseInt(limit)),
            totalFiles,
            hasNextPage: parseInt(page) < Math.ceil(totalFiles / parseInt(limit)),
            hasPrevPage: parseInt(page) > 1
          }
        }
      });
    } catch (error) {
      console.error('Get public files error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve public files'
      });
    }
  }

  // 📄 Get file details
  async getFileDetails(req, res) {
    try {
      const { fileId } = req.params;
      
      const file = await File.findById(fileId)
        .populate('uploadedBy', 'username fullName role')
        .populate('parentFolder', 'name path')
        .populate('sharedWith.userId', 'username fullName')
        .populate('userRatings.userId', 'username fullName');

      if (!file) {
        return res.status(404).json({
          success: false,
          message: 'File not found'
        });
      }

      // Check access permissions
      if (!file.canAccess(req.user.id, req.user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      // Increment view count
      await file.incrementView(req.user.id);

      // Get related files
      const relatedFiles = await File.find({
        $or: [
          { subject: file.subject, topic: file.topic },
          { tags: { $in: file.tags } }
        ],
        _id: { $ne: file._id },
        visibility: 'public',
        approvalStatus: 'approved',
        isArchived: false
      }).limit(5).populate('uploadedBy', 'username fullName');

      res.json({
        success: true,
        message: 'File details retrieved successfully',
        data: {
          file,
          relatedFiles,
          canEdit: file.uploadedBy._id.toString() === req.user.id || req.user.role === 'admin',
          canDelete: file.uploadedBy._id.toString() === req.user.id || req.user.role === 'admin'
        }
      });
    } catch (error) {
      console.error('Get file details error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve file details'
      });
    }
  }

  // ✏️ Update file
  async updateFile(req, res) {
    try {
      const { fileId } = req.params;
      const updates = req.body;
      
      const file = await File.findById(fileId);
      
      if (!file) {
        return res.status(404).json({
          success: false,
          message: 'File not found'
        });
      }

      // Check permissions
      if (file.uploadedBy.toString() !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      // Update allowed fields
      const allowedUpdates = [
        'title', 'description', 'subject', 'topic', 'gradeLevel', 
        'tags', 'visibility', 'parentFolder'
      ];
      
      allowedUpdates.forEach(field => {
        if (updates[field] !== undefined) {
          file[field] = updates[field];
        }
      });

      await file.save();

      res.json({
        success: true,
        message: 'File updated successfully',
        data: { file }
      });
    } catch (error) {
      console.error('Update file error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to update file'
      });
    }
  }

  // 🗑️ Delete file
  async deleteFile(req, res) {
    try {
      const { fileId } = req.params;
      
      const file = await File.findById(fileId);
      
      if (!file) {
        return res.status(404).json({
          success: false,
          message: 'File not found'
        });
      }

      // Check permissions
      if (file.uploadedBy.toString() !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
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
      await File.findByIdAndDelete(fileId);

      // Update folder statistics
      if (file.parentFolder) {
        const folder = await Folder.findById(file.parentFolder);
        if (folder) {
          await folder.updateStatistics();
        }
      }

      res.json({
        success: true,
        message: 'File deleted successfully',
        data: { deletedFileId: fileId }
      });
    } catch (error) {
      console.error('Delete file error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete file'
      });
    }
  }

  // 🗑️ Bulk delete files
  async bulkDeleteFiles(req, res) {
    try {
      const { fileIds } = req.body;
      
      if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'File IDs are required'
        });
      }

      const result = await FileManagementService.bulkDelete(fileIds, req.user.id, req.user.role);

      res.json({
        success: true,
        message: `${result.totalDeleted} files deleted successfully`,
        data: {
          deletedFiles: result.deletedFiles,
          errors: result.errors,
          summary: {
            totalRequested: fileIds.length,
            successfulDeletes: result.totalDeleted,
            failedDeletes: result.totalErrors
          }
        }
      });
    } catch (error) {
      console.error('Bulk delete error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Bulk delete failed'
      });
    }
  }

  // 📁 Move files to folder
  async moveFiles(req, res) {
    try {
      const { fileIds, targetFolderId } = req.body;
      
      if (!fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'File IDs are required'
        });
      }

      const result = await FileManagementService.bulkMove(fileIds, targetFolderId, req.user.id);

      res.json({
        success: true,
        message: `${result.movedFiles} files moved successfully`,
        data: result
      });
    } catch (error) {
      console.error('Move files error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to move files'
      });
    }
  }

  // 🎯 Share file
  async shareFile(req, res) {
    try {
      const { fileId } = req.params;
      const { userId, role = 'viewer' } = req.body;
      
      const file = await File.findById(fileId);
      
      if (!file) {
        return res.status(404).json({
          success: false,
          message: 'File not found'
        });
      }

      // Check permissions
      if (file.uploadedBy.toString() !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      await file.shareWith(userId, role, req.user.id);

      res.json({
        success: true,
        message: 'File shared successfully',
        data: {
          fileId,
          sharedWith: userId,
          role
        }
      });
    } catch (error) {
      console.error('Share file error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to share file'
      });
    }
  }

  // 🚫 Remove file share
  async removeFileShare(req, res) {
    try {
      const { fileId } = req.params;
      const { userId } = req.body;
      
      const file = await File.findById(fileId);
      
      if (!file) {
        return res.status(404).json({
          success: false,
          message: 'File not found'
        });
      }

      // Check permissions
      if (file.uploadedBy.toString() !== req.user.id && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      await file.removeShare(userId);

      res.json({
        success: true,
        message: 'File share removed successfully',
        data: {
          fileId,
          removedShare: userId
        }
      });
    } catch (error) {
      console.error('Remove file share error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to remove file share'
      });
    }
  }

  // ⭐ Rate file
  async rateFile(req, res) {
    try {
      const { fileId } = req.params;
      const { rating, comment } = req.body;
      
      if (!rating || rating < 1 || rating > 5) {
        return res.status(400).json({
          success: false,
          message: 'Rating must be between 1 and 5'
        });
      }

      const file = await File.findById(fileId);
      
      if (!file) {
        return res.status(404).json({
          success: false,
          message: 'File not found'
        });
      }

      // Check access
      if (!file.canAccess(req.user.id, req.user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      await file.addRating(req.user.id, rating, comment);

      res.json({
        success: true,
        message: 'File rated successfully',
        data: {
          fileId,
          rating,
          comment,
          averageRating: file.averageRating
        }
      });
    } catch (error) {
      console.error('Rate file error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to rate file'
      });
    }
  }

  // 🗜️ Compress file
  async compressFile(req, res) {
    try {
      const { fileId } = req.params;
      
      const compressedFile = await FileManagementService.compressFile(fileId, req.user.id);

      res.json({
        success: true,
        message: 'File compressed successfully',
        data: {
          file: compressedFile,
          compressionInfo: {
            originalSize: compressedFile.originalSize,
            compressedSize: compressedFile.fileSize,
            compressionRatio: compressedFile.compressionRatio,
            spaceSaved: compressedFile.originalSize - compressedFile.fileSize
          }
        }
      });
    } catch (error) {
      console.error('Compress file error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to compress file'
      });
    }
  }

  // 📊 Get file analytics
  async getFileAnalytics(req, res) {
    try {
      const { timeframe = 30 } = req.query;
      
      const analytics = await FileManagementService.getFileAnalytics(req.user.id, parseInt(timeframe));

      res.json({
        success: true,
        message: 'File analytics retrieved successfully',
        data: {
          analytics,
          timeframe: parseInt(timeframe)
        }
      });
    } catch (error) {
      console.error('Get file analytics error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve file analytics'
      });
    }
  }

  // 🔍 Search files
  async searchFiles(req, res) {
    try {
      const { 
        q: searchTerm, 
        fileType, 
        category, 
        subject,
        limit = 20 
      } = req.query;

      if (!searchTerm) {
        return res.status(400).json({
          success: false,
          message: 'Search term is required'
        });
      }

      const searchOptions = {
        fileType,
        category,
        subject,
        limit: parseInt(limit)
      };

      const files = await File.searchFiles(searchTerm, searchOptions);

      res.json({
        success: true,
        message: 'Search completed successfully',
        data: {
          files,
          searchTerm,
          resultCount: files.length,
          filters: searchOptions
        }
      });
    } catch (error) {
      console.error('Search files error:', error);
      res.status(500).json({
        success: false,
        message: 'Search failed'
      });
    }
  }

  // 📈 Get popular files
  async getPopularFiles(req, res) {
    try {
      const { limit = 10, category } = req.query;
      
      const popularFiles = await File.getPopularFiles(parseInt(limit), category);

      res.json({
        success: true,
        message: 'Popular files retrieved successfully',
        data: {
          files: popularFiles,
          category,
          limit: parseInt(limit)
        }
      });
    } catch (error) {
      console.error('Get popular files error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve popular files'
      });
    }
  }

  // 🆕 Get recent files
  async getRecentFiles(req, res) {
    try {
      const { limit = 10, fileType } = req.query;
      
      const recentFiles = await File.getRecentFiles(parseInt(limit), fileType);

      res.json({
        success: true,
        message: 'Recent files retrieved successfully',
        data: {
          files: recentFiles,
          fileType,
          limit: parseInt(limit)
        }
      });
    } catch (error) {
      console.error('Get recent files error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve recent files'
      });
    }
  }

  // 📊 Get file statistics
  async getFileStatistics(req, res) {
    try {
      const { timeframe = 30 } = req.query;
      
      const statistics = await File.getFileAnalytics(parseInt(timeframe));

      res.json({
        success: true,
        message: 'File statistics retrieved successfully',
        data: {
          statistics: statistics.length > 0 ? statistics[0] : {},
          timeframe: parseInt(timeframe)
        }
      });
    } catch (error) {
      console.error('Get file statistics error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve file statistics'
      });
    }
  }
}

module.exports = FileManagementController;
