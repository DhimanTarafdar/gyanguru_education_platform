const express = require('express');
const router = express.Router();
const multer = require('multer');
const mongoose = require('mongoose');
const File = require('../models/File');
const auth = require('../middleware/auth');
const FileManagementController = require('../controllers/fileManagementController');

// Create controller instance
const fileController = new FileManagementController();

// 📁 GyanGuru Advanced File Management Routes - Simplified for Testing
// Features: Upload, Download, Processing, Organization, Analytics, Bulk Operations

// Simple multer configuration for testing
const upload = multer({ dest: 'uploads/' });

// 📤 BASIC UPLOAD ROUTES

// Upload single PDF document
router.post('/upload/pdf', 
  auth, 
  upload.single('file'), 
  (req, res) => fileController.uploadFile(req, res)
);

// Upload single audio recording
router.post('/upload/audio', 
  auth, 
  upload.single('file'), 
  (req, res) => fileController.uploadFile(req, res)
);

// Upload single video tutorial
router.post('/upload/video', 
  auth, 
  upload.single('file'), 
  (req, res) => fileController.uploadFile(req, res)
);

// Upload general file
router.post('/upload/general', 
  auth, 
  upload.single('file'), 
  (req, res) => fileController.uploadFile(req, res)
);

// 📥 DOWNLOAD ROUTES

// Download single file
router.get('/download/:fileId', auth, (req, res) => fileController.downloadFile(req, res));

// 📁 FILE LISTING ROUTES

// Get user's files
router.get('/my-files', auth, (req, res) => fileController.getUserFiles(req, res));

// Get public files
router.get('/public', (req, res) => fileController.getPublicFiles(req, res));

// Search files
router.get('/search', auth, (req, res) => fileController.searchFiles(req, res));

// 📊 FILE DETAILS

// Get file details
router.get('/:fileId', auth, (req, res) => fileController.getFileDetails(req, res));

// Update file metadata
router.put('/:fileId', auth, (req, res) => fileController.updateFileMetadata(req, res));

// Delete file
router.delete('/:fileId', auth, (req, res) => fileController.deleteFile(req, res));

module.exports = router;
