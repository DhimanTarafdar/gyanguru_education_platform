const express = require('express');
const router = express.Router();
const multer = require('multer');
const mongoose = require('mongoose');
const File = require('../models/File');
const auth = require('../middleware/auth');
const FileManagementController = require('../controllers/fileManagementController');
const FileManagementService = require('../services/FileManagementService');

// Create controller instance
const fileController = new FileManagementController();

// 📁 GyanGuru Advanced File Management Routes
// Features: Upload, Download, Processing, Organization, Analytics, Bulk Operations

// File upload middleware configurations for different file types
const uploadConfigs = {
  pdf: FileManagementService.getMulterConfig('pdf_document'),
  audio: FileManagementService.getMulterConfig('audio_recording'),
  video: FileManagementService.getMulterConfig('video_tutorial'),
  study: FileManagementService.getMulterConfig('study_material'),
  image: FileManagementService.getMulterConfig('image'),
  document: FileManagementService.getMulterConfig('document'),
  general: FileManagementService.getMulterConfig('default')
};

// 📤 UPLOAD ROUTES

// Upload single PDF document
router.post('/upload/pdf', 
  auth, 
  uploadConfigs.pdf.single('file'), 
  fileController.uploadFile.bind(fileController)
);

// Upload single audio recording
router.post('/upload/audio', 
  auth, 
  uploadConfigs.audio.single('file'), 
  FileManagementController.uploadFile
);

// Upload single video tutorial
router.post('/upload/video', 
  auth, 
  uploadConfigs.video.single('file'), 
  FileManagementController.uploadFile
);

// Upload single study material
router.post('/upload/study-material', 
  auth, 
  uploadConfigs.study.single('file'), 
  FileManagementController.uploadFile
);

// Upload single image
router.post('/upload/image', 
  auth, 
  uploadConfigs.image.single('file'), 
  FileManagementController.uploadFile
);

// Upload single document
router.post('/upload/document', 
  auth, 
  uploadConfigs.document.single('file'), 
  FileManagementController.uploadFile
);

// Upload general file (auto-detect type)
router.post('/upload/general', 
  auth, 
  uploadConfigs.general.single('file'), 
  FileManagementController.uploadFile
);

// 📤 BULK UPLOAD ROUTES

// Upload multiple PDF documents
router.post('/upload/bulk/pdf', 
  auth, 
  uploadConfigs.pdf.array('files', 20), 
  FileManagementController.uploadMultipleFiles
);

// Upload multiple audio recordings
router.post('/upload/bulk/audio', 
  auth, 
  uploadConfigs.audio.array('files', 10), 
  FileManagementController.uploadMultipleFiles
);

// Upload multiple video tutorials
router.post('/upload/bulk/video', 
  auth, 
  uploadConfigs.video.array('files', 5), 
  FileManagementController.uploadMultipleFiles
);

// Upload multiple study materials
router.post('/upload/bulk/study-materials', 
  auth, 
  uploadConfigs.study.array('files', 20), 
  FileManagementController.uploadMultipleFiles
);

// Upload multiple images
router.post('/upload/bulk/images', 
  auth, 
  uploadConfigs.image.array('files', 50), 
  FileManagementController.uploadMultipleFiles
);

// Upload multiple documents
router.post('/upload/bulk/documents', 
  auth, 
  uploadConfigs.document.array('files', 30), 
  FileManagementController.uploadMultipleFiles
);

// Upload multiple general files
router.post('/upload/bulk/general', 
  auth, 
  uploadConfigs.general.array('files', 25), 
  FileManagementController.uploadMultipleFiles
);

// 📥 DOWNLOAD ROUTES

// Download single file
router.get('/download/:fileId', 
  auth, 
  FileManagementController.downloadFile
);

// Bulk download files as ZIP
router.post('/download/bulk', 
  auth, 
  FileManagementController.bulkDownload
);

// 📋 FILE LISTING AND SEARCH ROUTES

// Get user's files with filtering and pagination
router.get('/my-files', 
  auth, 
  FileManagementController.getUserFiles
);

// Get public files
router.get('/public', 
  auth, 
  FileManagementController.getPublicFiles
);

// Search files
router.get('/search', 
  auth, 
  FileManagementController.searchFiles
);

// Get popular files
router.get('/popular', 
  auth, 
  FileManagementController.getPopularFiles
);

// Get recent files
router.get('/recent', 
  auth, 
  FileManagementController.getRecentFiles
);

// 📄 FILE DETAILS AND MANAGEMENT ROUTES

// Get file details
router.get('/:fileId', 
  auth, 
  FileManagementController.getFileDetails
);

// Update file metadata
router.put('/:fileId', 
  auth, 
  FileManagementController.updateFile
);

// Delete single file
router.delete('/:fileId', 
  auth, 
  FileManagementController.deleteFile
);

// 🎯 FILE SHARING ROUTES

// Share file with user
router.post('/:fileId/share', 
  auth, 
  FileManagementController.shareFile
);

// Remove file share
router.delete('/:fileId/share', 
  auth, 
  FileManagementController.removeFileShare
);

// ⭐ FILE RATING ROUTES

// Rate file
router.post('/:fileId/rate', 
  auth, 
  FileManagementController.rateFile
);

// 🗜️ FILE PROCESSING ROUTES

// Compress file
router.post('/:fileId/compress', 
  auth, 
  FileManagementController.compressFile
);

// 📊 ANALYTICS ROUTES

// Get file analytics for user
router.get('/analytics/my-analytics', 
  auth, 
  FileManagementController.getFileAnalytics
);

// Get overall file statistics
router.get('/analytics/statistics', 
  auth, 
  FileManagementController.getFileStatistics
);

// 🔧 BULK OPERATIONS ROUTES

// Bulk delete files
router.delete('/bulk/delete', 
  auth, 
  FileManagementController.bulkDeleteFiles
);

// Bulk move files to folder
router.put('/bulk/move', 
  auth, 
  FileManagementController.moveFiles
);

// 📁 CATEGORY-SPECIFIC ROUTES

// Get PDF documents
router.get('/category/pdf-documents', auth, (req, res, next) => {
  req.query.fileType = 'pdf_document';
  FileManagementController.getUserFiles(req, res, next);
});

// Get audio recordings
router.get('/category/audio-recordings', auth, (req, res, next) => {
  req.query.fileType = 'audio_recording';
  FileManagementController.getUserFiles(req, res, next);
});

// Get video tutorials
router.get('/category/video-tutorials', auth, (req, res, next) => {
  req.query.fileType = 'video_tutorial';
  FileManagementController.getUserFiles(req, res, next);
});

// Get study materials
router.get('/category/study-materials', auth, (req, res, next) => {
  req.query.fileType = 'study_material';
  FileManagementController.getUserFiles(req, res, next);
});

// Get images
router.get('/category/images', auth, (req, res, next) => {
  req.query.fileType = 'image';
  FileManagementController.getUserFiles(req, res, next);
});

// Get documents
router.get('/category/documents', auth, (req, res, next) => {
  req.query.fileType = 'document';
  FileManagementController.getUserFiles(req, res, next);
});

// 🎓 ACADEMIC CONTEXT ROUTES

// Get files by subject
router.get('/subject/:subject', auth, (req, res, next) => {
  req.query.subject = req.params.subject;
  FileManagementController.getPublicFiles(req, res, next);
});

// Get files by grade level
router.get('/grade/:gradeLevel', auth, (req, res, next) => {
  req.query.gradeLevel = req.params.gradeLevel;
  FileManagementController.getPublicFiles(req, res, next);
});

// 🔍 ADVANCED SEARCH ROUTES

// Search PDF documents
router.get('/search/pdf-documents', auth, (req, res, next) => {
  req.query.fileType = 'pdf_document';
  FileManagementController.searchFiles(req, res, next);
});

// Search audio recordings
router.get('/search/audio-recordings', auth, (req, res, next) => {
  req.query.fileType = 'audio_recording';
  FileManagementController.searchFiles(req, res, next);
});

// Search video tutorials
router.get('/search/video-tutorials', auth, (req, res, next) => {
  req.query.fileType = 'video_tutorial';
  FileManagementController.searchFiles(req, res, next);
});

// Search study materials
router.get('/search/study-materials', auth, (req, res, next) => {
  req.query.fileType = 'study_material';
  FileManagementController.searchFiles(req, res, next);
});

// 📈 TRENDING AND FEATURED ROUTES

// Get trending files (most viewed recently)
router.get('/trending/files', auth, (req, res, next) => {
  req.query.sortBy = 'viewCount';
  req.query.sortOrder = 'desc';
  FileManagementController.getPublicFiles(req, res, next);
});

// Get featured files
router.get('/featured/files', auth, async (req, res) => {
  try {
    const featuredFiles = await File.find({
      isFeatured: true,
      visibility: 'public',
      approvalStatus: 'approved',
      isArchived: false
    })
    .populate('uploadedBy', 'username fullName')
    .sort({ 'analytics.popularityScore': -1 })
    .limit(20);

    res.json({
      success: true,
      message: 'Featured files retrieved successfully',
      data: { files: featuredFiles }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve featured files'
    });
  }
});

// Get recommended files (personalized)
router.get('/recommended/files', auth, async (req, res) => {
  try {
    // Simple recommendation based on user's subjects and recent activity
    const userFiles = await File.find({ uploadedBy: req.user.id })
      .select('subject topic tags')
      .limit(10);

    const userSubjects = [...new Set(userFiles.map(f => f.subject).filter(Boolean))];
    const userTags = [...new Set(userFiles.flatMap(f => f.tags))];

    const recommendedFiles = await File.find({
      $or: [
        { subject: { $in: userSubjects } },
        { tags: { $in: userTags } }
      ],
      uploadedBy: { $ne: req.user.id },
      visibility: 'public',
      approvalStatus: 'approved',
      isArchived: false
    })
    .populate('uploadedBy', 'username fullName')
    .sort({ 'analytics.popularityScore': -1 })
    .limit(15);

    res.json({
      success: true,
      message: 'Recommended files retrieved successfully',
      data: { files: recommendedFiles }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve recommended files'
    });
  }
});

// 🎵 AUDIO-SPECIFIC ROUTES

// Get audio recordings by quality
router.get('/audio/by-quality/:quality', auth, async (req, res) => {
  try {
    const { quality } = req.params;
    const audioFiles = await File.find({
      fileType: 'audio_recording',
      quality,
      $or: [
        { uploadedBy: req.user.id },
        { visibility: 'public', approvalStatus: 'approved' }
      ],
      isArchived: false
    })
    .populate('uploadedBy', 'username fullName')
    .sort({ uploadedAt: -1 });

    res.json({
      success: true,
      message: `Audio recordings with ${quality} quality retrieved successfully`,
      data: { files: audioFiles }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve audio recordings'
    });
  }
});

// 🎥 VIDEO-SPECIFIC ROUTES

// Get video tutorials by quality
router.get('/video/by-quality/:quality', auth, async (req, res) => {
  try {
    const { quality } = req.params;
    const videoFiles = await File.find({
      fileType: 'video_tutorial',
      quality,
      $or: [
        { uploadedBy: req.user.id },
        { visibility: 'public', approvalStatus: 'approved' }
      ],
      isArchived: false
    })
    .populate('uploadedBy', 'username fullName')
    .sort({ uploadedAt: -1 });

    res.json({
      success: true,
      message: `Video tutorials with ${quality} quality retrieved successfully`,
      data: { files: videoFiles }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve video tutorials'
    });
  }
});

// Get video tutorials by duration range
router.get('/video/by-duration', auth, async (req, res) => {
  try {
    const { minDuration = 0, maxDuration = 3600 } = req.query; // Default: 0 to 1 hour
    
    const videoFiles = await File.find({
      fileType: 'video_tutorial',
      duration: { $gte: parseInt(minDuration), $lte: parseInt(maxDuration) },
      $or: [
        { uploadedBy: req.user.id },
        { visibility: 'public', approvalStatus: 'approved' }
      ],
      isArchived: false
    })
    .populate('uploadedBy', 'username fullName')
    .sort({ uploadedAt: -1 });

    res.json({
      success: true,
      message: `Video tutorials with duration ${minDuration}-${maxDuration} seconds retrieved successfully`,
      data: { files: videoFiles }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve video tutorials'
    });
  }
});

// 📚 STUDY MATERIAL ROUTES

// Get study materials by type
router.get('/study-materials/by-type', auth, async (req, res) => {
  try {
    const { mimeType } = req.query;
    const query = {
      fileType: 'study_material',
      $or: [
        { uploadedBy: req.user.id },
        { visibility: 'public', approvalStatus: 'approved' }
      ],
      isArchived: false
    };

    if (mimeType) {
      query.mimeType = { $regex: mimeType, $options: 'i' };
    }

    const studyMaterials = await File.find(query)
      .populate('uploadedBy', 'username fullName')
      .sort({ uploadedAt: -1 });

    res.json({
      success: true,
      message: 'Study materials retrieved successfully',
      data: { files: studyMaterials }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve study materials'
    });
  }
});

// 🏷️ TAG-BASED ROUTES

// Get files by tag
router.get('/by-tag/:tag', auth, async (req, res) => {
  try {
    const { tag } = req.params;
    const files = await File.find({
      tags: { $regex: tag, $options: 'i' },
      $or: [
        { uploadedBy: req.user.id },
        { visibility: 'public', approvalStatus: 'approved' }
      ],
      isArchived: false
    })
    .populate('uploadedBy', 'username fullName')
    .sort({ 'analytics.popularityScore': -1 });

    res.json({
      success: true,
      message: `Files with tag "${tag}" retrieved successfully`,
      data: { files }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve files by tag'
    });
  }
});

// Get all unique tags
router.get('/tags/all', auth, async (req, res) => {
  try {
    const tags = await File.distinct('tags', {
      $or: [
        { uploadedBy: req.user.id },
        { visibility: 'public', approvalStatus: 'approved' }
      ],
      isArchived: false
    });

    res.json({
      success: true,
      message: 'All tags retrieved successfully',
      data: { tags: tags.filter(tag => tag && tag.trim()) }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve tags'
    });
  }
});

// Error handling middleware for file uploads
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        message: 'File size too large'
      });
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        success: false,
        message: 'Too many files'
      });
    }
  }
  
  res.status(500).json({
    success: false,
    message: error.message || 'File operation failed'
  });
});

module.exports = router;
