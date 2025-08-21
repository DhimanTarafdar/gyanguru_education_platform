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
router.post('/', 
  auth, 
  FolderController.createFolder
);

// Get user's folders (with optional parent filter)
router.get('/', 
  auth, 
  FolderController.getUserFolders
);

// Get folder tree structure
router.get('/tree', 
  auth, 
  FolderController.getFolderTree
);

// Get specific folder details
router.get('/:folderId', 
  auth, 
  FolderController.getFolderDetails
);

// Update folder
router.put('/:folderId', 
  auth, 
  FolderController.updateFolder
);

// Delete folder
router.delete('/:folderId', 
  auth, 
  FolderController.deleteFolder
);

// 📁 FOLDER ORGANIZATION ROUTES

// Move folder to different location
router.put('/:folderId/move', 
  auth, 
  FolderController.moveFolder
);

// Get folder breadcrumb path
router.get('/:folderId/breadcrumb', 
  auth, 
  FolderController.getFolderBreadcrumb
);

// 🎯 FOLDER PERMISSION ROUTES

// Grant permission to user
router.post('/:folderId/permissions', 
  auth, 
  FolderController.grantFolderPermission
);

// Revoke permission from user
router.delete('/:folderId/permissions', 
  auth, 
  FolderController.revokeFolderPermission
);

// 📊 FOLDER ANALYTICS ROUTES

// Get folder statistics
router.get('/:folderId/statistics', 
  auth, 
  FolderController.getFolderStatistics
);

// 📋 SPECIALIZED FOLDER ROUTES

// Get root folders (folders without parent)
router.get('/root/all', auth, async (req, res) => {
  try {
    const rootFolders = await Folder.getRootFolders(req.user.id);
    
    res.json({
      success: true,
      message: 'Root folders retrieved successfully',
      data: { folders: rootFolders }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve root folders'
    });
  }
});

// Get folders by subject
router.get('/subject/:subject', auth, async (req, res) => {
  try {
    const { subject } = req.params;
    
    const folders = await Folder.find({
      subject: { $regex: subject, $options: 'i' },
      $or: [
        { createdBy: req.user.id },
        { visibility: 'public' },
        { 'permissions.userId': req.user.id }
      ],
      isArchived: false
    }).populate('createdBy', 'username fullName');
    
    res.json({
      success: true,
      message: `Folders for subject "${subject}" retrieved successfully`,
      data: { folders }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve folders by subject'
    });
  }
});

// Get folders by grade level
router.get('/grade/:gradeLevel', auth, async (req, res) => {
  try {
    const { gradeLevel } = req.params;
    
    const folders = await Folder.find({
      gradeLevel,
      $or: [
        { createdBy: req.user.id },
        { visibility: 'public' },
        { 'permissions.userId': req.user.id }
      ],
      isArchived: false
    }).populate('createdBy', 'username fullName');
    
    res.json({
      success: true,
      message: `Folders for grade "${gradeLevel}" retrieved successfully`,
      data: { folders }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve folders by grade level'
    });
  }
});

// Search folders
router.get('/search/:searchTerm', auth, async (req, res) => {
  try {
    const { searchTerm } = req.params;
    
    const folders = await Folder.find({
      $and: [
        {
          $or: [
            { name: { $regex: searchTerm, $options: 'i' } },
            { description: { $regex: searchTerm, $options: 'i' } },
            { tags: { $regex: searchTerm, $options: 'i' } }
          ]
        },
        {
          $or: [
            { createdBy: req.user.id },
            { visibility: 'public' },
            { 'permissions.userId': req.user.id }
          ]
        },
        { isArchived: false }
      ]
    }).populate('createdBy', 'username fullName');
    
    res.json({
      success: true,
      message: `Folders matching "${searchTerm}" retrieved successfully`,
      data: { 
        folders,
        searchTerm,
        resultCount: folders.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to search folders'
    });
  }
});

// Get public folders
router.get('/public/all', auth, async (req, res) => {
  try {
    const publicFolders = await Folder.find({
      visibility: 'public',
      isArchived: false
    })
    .populate('createdBy', 'username fullName')
    .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      message: 'Public folders retrieved successfully',
      data: { folders: publicFolders }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve public folders'
    });
  }
});

// Get pinned folders
router.get('/pinned/all', auth, async (req, res) => {
  try {
    const pinnedFolders = await Folder.find({
      isPinned: true,
      $or: [
        { createdBy: req.user.id },
        { visibility: 'public' },
        { 'permissions.userId': req.user.id }
      ],
      isArchived: false
    })
    .populate('createdBy', 'username fullName')
    .sort({ updatedAt: -1 });
    
    res.json({
      success: true,
      message: 'Pinned folders retrieved successfully',
      data: { folders: pinnedFolders }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve pinned folders'
    });
  }
});

// Toggle folder pin status
router.put('/:folderId/pin', auth, async (req, res) => {
  try {
    const { folderId } = req.params;
    
    const folder = await Folder.findById(folderId);
    
    if (!folder) {
      return res.status(404).json({
        success: false,
        message: 'Folder not found'
      });
    }

    // Check permissions
    if (folder.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    folder.isPinned = !folder.isPinned;
    await folder.save();

    res.json({
      success: true,
      message: `Folder ${folder.isPinned ? 'pinned' : 'unpinned'} successfully`,
      data: { 
        folder,
        isPinned: folder.isPinned
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to toggle folder pin status'
    });
  }
});

// Archive folder
router.put('/:folderId/archive', auth, async (req, res) => {
  try {
    const { folderId } = req.params;
    
    const folder = await Folder.findById(folderId);
    
    if (!folder) {
      return res.status(404).json({
        success: false,
        message: 'Folder not found'
      });
    }

    // Check permissions
    if (folder.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    folder.isArchived = true;
    folder.archivedAt = new Date();
    await folder.save();

    res.json({
      success: true,
      message: 'Folder archived successfully',
      data: { folder }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to archive folder'
    });
  }
});

// Restore folder from archive
router.put('/:folderId/restore', auth, async (req, res) => {
  try {
    const { folderId } = req.params;
    
    const folder = await Folder.findById(folderId);
    
    if (!folder) {
      return res.status(404).json({
        success: false,
        message: 'Folder not found'
      });
    }

    // Check permissions
    if (folder.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied'
      });
    }

    folder.isArchived = false;
    folder.archivedAt = null;
    await folder.save();

    res.json({
      success: true,
      message: 'Folder restored successfully',
      data: { folder }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to restore folder'
    });
  }
});

// Get archived folders
router.get('/archived/all', auth, async (req, res) => {
  try {
    const archivedFolders = await Folder.find({
      createdBy: req.user.id,
      isArchived: true
    })
    .populate('createdBy', 'username fullName')
    .sort({ archivedAt: -1 });
    
    res.json({
      success: true,
      message: 'Archived folders retrieved successfully',
      data: { folders: archivedFolders }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve archived folders'
    });
  }
});

// Get folder path suggestions for autocomplete
router.get('/suggestions/paths', auth, async (req, res) => {
  try {
    const { query = '' } = req.query;
    
    const folders = await Folder.find({
      path: { $regex: query, $options: 'i' },
      $or: [
        { createdBy: req.user.id },
        { visibility: 'public' },
        { 'permissions.userId': req.user.id }
      ],
      isArchived: false
    })
    .select('name path')
    .limit(10)
    .sort({ path: 1 });
    
    const suggestions = folders.map(folder => ({
      id: folder._id,
      name: folder.name,
      path: folder.path,
      fullPath: folder.path
    }));
    
    res.json({
      success: true,
      message: 'Folder path suggestions retrieved successfully',
      data: { suggestions }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve folder suggestions'
    });
  }
});

// Bulk operations on folders
router.post('/bulk/delete', auth, async (req, res) => {
  try {
    const { folderIds, moveContents = true } = req.body;
    
    if (!folderIds || !Array.isArray(folderIds) || folderIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Folder IDs are required'
      });
    }

    const deletedFolders = [];
    const errors = [];

    for (const folderId of folderIds) {
      try {
        const folder = await Folder.findById(folderId);
        
        if (!folder) {
          errors.push({
            folderId,
            error: 'Folder not found'
          });
          continue;
        }

        // Check permissions
        if (folder.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
          errors.push({
            folderId,
            error: 'Access denied'
          });
          continue;
        }

        if (moveContents) {
          // Move contents to parent folder
          await File.updateMany(
            { parentFolder: folderId },
            { parentFolder: folder.parentFolder }
          );
          
          await Folder.updateMany(
            { parentFolder: folderId },
            { parentFolder: folder.parentFolder }
          );
        } else {
          // Delete all contents recursively
          const subfolders = await folder.getAllSubfolders();
          const allFolderIds = [folderId, ...subfolders.map(sf => sf._id)];
          
          // Delete all files in these folders
          await File.deleteMany({ parentFolder: { $in: allFolderIds } });
          
          // Delete all subfolders
          await Folder.deleteMany({ _id: { $in: subfolders.map(sf => sf._id) } });
        }

        // Delete the folder
        await Folder.findByIdAndDelete(folderId);
        deletedFolders.push(folderId);

      } catch (error) {
        errors.push({
          folderId,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      message: `${deletedFolders.length} folders deleted successfully`,
      data: {
        deletedFolders,
        errors,
        summary: {
          totalRequested: folderIds.length,
          successfulDeletes: deletedFolders.length,
          failedDeletes: errors.length
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Bulk delete operation failed'
    });
  }
});

// Create folder path (creates all intermediate folders if they don't exist)
router.post('/create-path', auth, async (req, res) => {
  try {
    const { path: folderPath } = req.body;
    
    if (!folderPath) {
      return res.status(400).json({
        success: false,
        message: 'Folder path is required'
      });
    }

    const folder = await Folder.createPath(folderPath, req.user.id, req.user.role);
    
    res.status(201).json({
      success: true,
      message: 'Folder path created successfully',
      data: { folder }
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      message: error.message || 'Failed to create folder path'
    });
  }
});

// Get folder usage statistics for user
router.get('/statistics/usage', auth, async (req, res) => {
  try {
    const totalFolders = await Folder.countDocuments({
      createdBy: req.user.id,
      isArchived: false
    });

    const archivedFolders = await Folder.countDocuments({
      createdBy: req.user.id,
      isArchived: true
    });

    const pinnedFolders = await Folder.countDocuments({
      createdBy: req.user.id,
      isPinned: true,
      isArchived: false
    });

    const publicFolders = await Folder.countDocuments({
      createdBy: req.user.id,
      visibility: 'public',
      isArchived: false
    });

    const sharedFolders = await Folder.countDocuments({
      createdBy: req.user.id,
      'permissions.0': { $exists: true },
      isArchived: false
    });

    const foldersBySubject = await Folder.aggregate([
      {
        $match: {
          createdBy: mongoose.Types.ObjectId(req.user.id),
          isArchived: false,
          subject: { $exists: true, $ne: null }
        }
      },
      {
        $group: {
          _id: '$subject',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    res.json({
      success: true,
      message: 'Folder usage statistics retrieved successfully',
      data: {
        summary: {
          totalFolders,
          archivedFolders,
          pinnedFolders,
          publicFolders,
          sharedFolders
        },
        breakdown: {
          bySubject: foldersBySubject
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve folder usage statistics'
    });
  }
});

module.exports = router;
