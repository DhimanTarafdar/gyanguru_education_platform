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

// Configure multer for different file types
const uploadConfigs = {
  pdf: FileManagementService.getMulterConfig('pdf'),
  audio: FileManagementService.getMulterConfig('audio'),
  video: FileManagementService.getMulterConfig('video'),
  image: FileManagementService.getMulterConfig('image'),
  document: FileManagementService.getMulterConfig('document'),
  general: FileManagementService.getMulterConfig('default')
};

// 📤 UPLOAD ROUTES

// Upload single PDF document
router.post('/upload/pdf', 
  auth, 
  uploadConfigs.pdf.single('file'), 
  (req, res) => fileController.uploadFile(req, res)
);

// Upload single audio recording
router.post('/upload/audio', 
  auth, 
  uploadConfigs.audio.single('file'), 
  (req, res) => fileController.uploadFile(req, res)
);

// Upload single video tutorial
router.post('/upload/video', 
  auth, 
  uploadConfigs.video.single('file'), 
  (req, res) => fileController.uploadFile(req, res)
);

// Upload single image
router.post('/upload/image', 
  auth, 
  uploadConfigs.image.single('file'), 
  (req, res) => fileController.uploadFile(req, res)
);

// Upload single document
router.post('/upload/document', 
  auth, 
  uploadConfigs.document.single('file'), 
  (req, res) => fileController.uploadFile(req, res)
);

// Upload general file
router.post('/upload/general', 
  auth, 
  uploadConfigs.general.single('file'), 
  (req, res) => fileController.uploadFile(req, res)
);

// 📤 BULK UPLOAD ROUTES

// Upload multiple PDFs
router.post('/upload/bulk/pdf', 
  auth, 
  uploadConfigs.pdf.array('files', 10), 
  (req, res) => fileController.uploadMultipleFiles(req, res)
);

// Upload multiple audio files
router.post('/upload/bulk/audio', 
  auth, 
  uploadConfigs.audio.array('files', 10), 
  (req, res) => fileController.uploadMultipleFiles(req, res)
);

// Upload multiple videos
router.post('/upload/bulk/video', 
  auth, 
  uploadConfigs.video.array('files', 5), 
  (req, res) => fileController.uploadMultipleFiles(req, res)
);

// Upload multiple images
router.post('/upload/bulk/image', 
  auth, 
  uploadConfigs.image.array('files', 20), 
  (req, res) => fileController.uploadMultipleFiles(req, res)
);

// Upload multiple documents
router.post('/upload/bulk/document', 
  auth, 
  uploadConfigs.document.array('files', 10), 
  (req, res) => fileController.uploadMultipleFiles(req, res)
);

// Upload multiple general files
router.post('/upload/bulk/general', 
  auth, 
  uploadConfigs.general.array('files', 10), 
  (req, res) => fileController.uploadMultipleFiles(req, res)
);

// Upload mixed file types
router.post('/upload/bulk/mixed', 
  auth, 
  uploadConfigs.general.array('files', 15), 
  (req, res) => fileController.uploadMultipleFiles(req, res)
);

// 📥 DOWNLOAD ROUTES

// Download single file
router.get('/download/:fileId', auth, (req, res) => fileController.downloadFile(req, res));

// Bulk download files
router.post('/download/bulk', auth, (req, res) => fileController.bulkDownload(req, res));

// 📁 FILE LISTING ROUTES

// Get user's files with filtering and pagination
router.get('/my-files', auth, (req, res) => fileController.getUserFiles(req, res));

// Get public files
router.get('/public', (req, res) => fileController.getPublicFiles(req, res));

// Search files
router.get('/search', auth, (req, res) => fileController.searchFiles(req, res));

// Get popular files
router.get('/popular', (req, res) => fileController.getPopularFiles(req, res));

// Get recent files
router.get('/recent', auth, (req, res) => fileController.getRecentFiles(req, res));

// 📊 FILE DETAILS AND METADATA

// Get file details
router.get('/:fileId', auth, (req, res) => fileController.getFileDetails(req, res));

// Update file metadata
router.put('/:fileId', auth, (req, res) => fileController.updateFileMetadata(req, res));

// Delete file
router.delete('/:fileId', auth, (req, res) => fileController.deleteFile(req, res));

// 🔄 FILE OPERATIONS

// Copy file
router.post('/:fileId/copy', auth, (req, res) => fileController.copyFile(req, res));

// Move file
router.post('/:fileId/move', auth, (req, res) => fileController.moveFile(req, res));

// Rename file
router.patch('/:fileId/rename', auth, (req, res) => fileController.renameFile(req, res));

// 🔗 SHARING ROUTES

// Share file
router.post('/:fileId/share', auth, (req, res) => fileController.shareFile(req, res));

// Get shared files
router.get('/shared/with-me', auth, (req, res) => fileController.getSharedFiles(req, res));

// Get files shared by user
router.get('/shared/by-me', auth, (req, res) => fileController.getFilesSharedByUser(req, res));

// Update sharing permissions
router.put('/:fileId/share/:shareId', auth, (req, res) => fileController.updateSharingPermissions(req, res));

// Remove sharing
router.delete('/:fileId/share/:shareId', auth, (req, res) => fileController.removeSharingPermissions(req, res));

// 🏷️ TAGGING AND CATEGORIZATION

// Add tags to file
router.post('/:fileId/tags', auth, (req, res) => fileController.addTags(req, res));

// Remove tags from file
router.delete('/:fileId/tags', auth, (req, res) => fileController.removeTags(req, res));

// Get files by tag
router.get('/tags/:tag', auth, (req, res) => fileController.getFilesByTag(req, res));

// Get all tags for user
router.get('/tags', auth, (req, res) => fileController.getUserTags(req, res));

// 📊 ANALYTICS ROUTES

// Get file analytics
router.get('/:fileId/analytics', auth, (req, res) => fileController.getFileAnalytics(req, res));

// Get user's file statistics
router.get('/analytics/stats', auth, (req, res) => fileController.getUserFileStats(req, res));

// Get popular downloads
router.get('/analytics/popular-downloads', auth, (req, res) => fileController.getPopularDownloads(req, res));

// Get storage usage
router.get('/analytics/storage', auth, (req, res) => fileController.getStorageUsage(req, res));

// 🗄️ BULK OPERATIONS

// Bulk delete files
router.delete('/bulk/delete', auth, (req, res) => fileController.bulkDeleteFiles(req, res));

// Bulk move files
router.post('/bulk/move', auth, (req, res) => fileController.bulkMoveFiles(req, res));

// Bulk copy files
router.post('/bulk/copy', auth, (req, res) => fileController.bulkCopyFiles(req, res));

// Bulk tag files
router.post('/bulk/tag', auth, (req, res) => fileController.bulkTagFiles(req, res));

// Bulk share files
router.post('/bulk/share', auth, (req, res) => fileController.bulkShareFiles(req, res));

// 🔄 VERSION CONTROL

// Get file versions
router.get('/:fileId/versions', auth, (req, res) => fileController.getFileVersions(req, res));

// Upload new version
router.post('/:fileId/versions', 
  auth, 
  uploadConfigs.general.single('file'), 
  (req, res) => fileController.uploadNewVersion(req, res)
);

// Download specific version
router.get('/:fileId/versions/:versionId/download', auth, (req, res) => fileController.downloadFileVersion(req, res));

// Restore file version
router.post('/:fileId/versions/:versionId/restore', auth, (req, res) => fileController.restoreFileVersion(req, res));

// Delete file version
router.delete('/:fileId/versions/:versionId', auth, (req, res) => fileController.deleteFileVersion(req, res));

// 🔒 SECURITY ROUTES

// Scan file for security issues
router.post('/:fileId/scan', auth, (req, res) => fileController.scanFile(req, res));

// Get security scan results
router.get('/:fileId/scan-results', auth, (req, res) => fileController.getSecurityScanResults(req, res));

// Report file
router.post('/:fileId/report', auth, (req, res) => fileController.reportFile(req, res));

// 📱 MOBILE-SPECIFIC ROUTES

// Get optimized file for mobile
router.get('/:fileId/mobile-optimized', auth, (req, res) => fileController.getMobileOptimizedFile(req, res));

// Get file thumbnail
router.get('/:fileId/thumbnail', (req, res) => fileController.getFileThumbnail(req, res));

// Get file preview
router.get('/:fileId/preview', auth, (req, res) => fileController.getFilePreview(req, res));

// 🔄 FILE PROCESSING

// Convert file format
router.post('/:fileId/convert', auth, (req, res) => fileController.convertFile(req, res));

// Compress file
router.post('/:fileId/compress', auth, (req, res) => fileController.compressFile(req, res));

// Extract text from file
router.post('/:fileId/extract-text', auth, (req, res) => fileController.extractTextFromFile(req, res));

// Generate file summary
router.post('/:fileId/summarize', auth, (req, res) => fileController.generateFileSummary(req, res));

// 📚 EDUCATIONAL CONTENT ROUTES

// Get assignment files
router.get('/category/assignments', auth, (req, res) => fileController.getAssignmentFiles(req, res));

// Get study materials
router.get('/category/study-materials', auth, (req, res) => fileController.getStudyMaterials(req, res));

// Get video tutorials
router.get('/category/tutorials', (req, res) => fileController.getVideoTutorials(req, res));

// Get audio recordings
router.get('/category/recordings', auth, (req, res) => fileController.getAudioRecordings(req, res));

// 📊 ADVANCED ANALYTICS

// Get file engagement metrics
router.get('/:fileId/engagement', auth, (req, res) => fileController.getFileEngagement(req, res));

// Get download trends
router.get('/analytics/download-trends', auth, (req, res) => fileController.getDownloadTrends(req, res));

// Get file type distribution
router.get('/analytics/file-types', auth, (req, res) => fileController.getFileTypeDistribution(req, res));

// Get user activity timeline
router.get('/analytics/activity-timeline', auth, (req, res) => fileController.getUserActivityTimeline(req, res));

// 🌟 FAVORITES AND BOOKMARKS

// Add file to favorites
router.post('/:fileId/favorite', auth, (req, res) => fileController.addToFavorites(req, res));

// Remove file from favorites
router.delete('/:fileId/favorite', auth, (req, res) => fileController.removeFromFavorites(req, res));

// Get favorite files
router.get('/favorites', auth, (req, res) => fileController.getFavoriteFiles(req, res));

// 💬 COMMENTS AND REVIEWS

// Add comment to file
router.post('/:fileId/comments', auth, (req, res) => fileController.addComment(req, res));

// Get file comments
router.get('/:fileId/comments', auth, (req, res) => fileController.getFileComments(req, res));

// Update comment
router.put('/:fileId/comments/:commentId', auth, (req, res) => fileController.updateComment(req, res));

// Delete comment
router.delete('/:fileId/comments/:commentId', auth, (req, res) => fileController.deleteComment(req, res));

// Add file rating
router.post('/:fileId/rating', auth, (req, res) => fileController.addRating(req, res));

// Get file ratings
router.get('/:fileId/ratings', (req, res) => fileController.getFileRatings(req, res));

module.exports = router;
