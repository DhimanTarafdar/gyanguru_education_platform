const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const FolderController = require('../controllers/folderController');
const Folder = require('../models/Folder');
const File = require('../models/File');

// Create controller instance
const folderController = new FolderController();

// 📁 GyanGuru Folder Management Routes
// Features: Create, Read, Update, Delete, Organization, Permissions

// 📁 FOLDER CRUD ROUTES

// Create new folder
router.post('/', auth, (req, res) => folderController.createFolder(req, res));

// Get user folders with pagination and filtering
router.get('/', auth, (req, res) => folderController.getUserFolders(req, res));

// Get folder tree structure
router.get('/tree', auth, (req, res) => folderController.getFolderTree(req, res));

// Get folder details
router.get('/:folderId', auth, (req, res) => folderController.getFolderDetails(req, res));

// Update folder
router.put('/:folderId', auth, (req, res) => folderController.updateFolder(req, res));

// Delete folder
router.delete('/:folderId', auth, (req, res) => folderController.deleteFolder(req, res));

// 📂 FOLDER OPERATIONS

// Copy folder
router.post('/:folderId/copy', auth, (req, res) => folderController.copyFolder(req, res));

// Move folder
router.post('/:folderId/move', auth, (req, res) => folderController.moveFolder(req, res));

// Rename folder
router.patch('/:folderId/rename', auth, (req, res) => folderController.renameFolder(req, res));

// 📊 FOLDER ANALYTICS

// Get folder statistics
router.get('/:folderId/stats', auth, (req, res) => folderController.getFolderStats(req, res));

// Get folder contents
router.get('/:folderId/contents', auth, (req, res) => folderController.getFolderContents(req, res));

// Get folder size
router.get('/:folderId/size', auth, (req, res) => folderController.getFolderSize(req, res));

// 🔗 FOLDER SHARING

// Share folder
router.post('/:folderId/share', auth, (req, res) => folderController.shareFolder(req, res));

// Get shared folders
router.get('/shared/with-me', auth, (req, res) => folderController.getSharedFolders(req, res));

// Get folders shared by user
router.get('/shared/by-me', auth, (req, res) => folderController.getFoldersSharedByUser(req, res));

// Update sharing permissions
router.put('/:folderId/share/:shareId', auth, (req, res) => folderController.updateSharingPermissions(req, res));

// Remove sharing
router.delete('/:folderId/share/:shareId', auth, (req, res) => folderController.removeSharingPermissions(req, res));

// 🗄️ BULK FOLDER OPERATIONS

// Bulk delete folders
router.delete('/bulk/delete', auth, (req, res) => folderController.bulkDeleteFolders(req, res));

// Bulk move folders
router.post('/bulk/move', auth, (req, res) => folderController.bulkMoveFolders(req, res));

// Bulk copy folders
router.post('/bulk/copy', auth, (req, res) => folderController.bulkCopyFolders(req, res));

// 🏷️ FOLDER TAGGING

// Add tags to folder
router.post('/:folderId/tags', auth, (req, res) => folderController.addTags(req, res));

// Remove tags from folder
router.delete('/:folderId/tags', auth, (req, res) => folderController.removeTags(req, res));

// Get folders by tag
router.get('/tags/:tag', auth, (req, res) => folderController.getFoldersByTag(req, res));

// 🔍 FOLDER SEARCH AND FILTERING

// Search folders
router.get('/search', auth, (req, res) => folderController.searchFolders(req, res));

// Get recent folders
router.get('/recent', auth, (req, res) => folderController.getRecentFolders(req, res));

// Get popular folders
router.get('/popular', (req, res) => folderController.getPopularFolders(req, res));

// 🌟 FOLDER FAVORITES

// Add folder to favorites
router.post('/:folderId/favorite', auth, (req, res) => folderController.addToFavorites(req, res));

// Remove folder from favorites
router.delete('/:folderId/favorite', auth, (req, res) => folderController.removeFromFavorites(req, res));

// Get favorite folders
router.get('/favorites', auth, (req, res) => folderController.getFavoriteFolders(req, res));

// 🗂️ FOLDER ORGANIZATION

// Create folder structure
router.post('/structure', auth, (req, res) => folderController.createFolderStructure(req, res));

// Get folder breadcrumb
router.get('/:folderId/breadcrumb', auth, (req, res) => folderController.getFolderBreadcrumb(req, res));

// Get folder path
router.get('/:folderId/path', auth, (req, res) => folderController.getFolderPath(req, res));

// 🔒 FOLDER PERMISSIONS

// Update folder permissions
router.put('/:folderId/permissions', auth, (req, res) => folderController.updateFolderPermissions(req, res));

// Get folder permissions
router.get('/:folderId/permissions', auth, (req, res) => folderController.getFolderPermissions(req, res));

// Check folder access
router.get('/:folderId/access-check', auth, (req, res) => folderController.checkFolderAccess(req, res));

module.exports = router;
