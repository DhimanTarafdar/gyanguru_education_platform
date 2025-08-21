const Folder = require('../models/Folder');
const File = require('../models/File');

// 📁 GyanGuru Folder Management Controller
// Features: Create, Read, Update, Delete, Organization, Permissions

class FolderController {

  // 📁 Create folder
  async createFolder(req, res) {
    try {
      const { name, description, parentFolderId, subject, gradeLevel, visibility = 'private', color, icon } = req.body;
      
      if (!name) {
        return res.status(400).json({
          success: false,
          message: 'Folder name is required'
        });
      }

      // Generate folder path
      let path = name;
      let level = 0;
      
      if (parentFolderId) {
        const parentFolder = await Folder.findById(parentFolderId);
        if (!parentFolder) {
          return res.status(404).json({
            success: false,
            message: 'Parent folder not found'
          });
        }
        
        // Check if user can create in parent folder
        if (!parentFolder.canAccess(req.user.id, req.user.role)) {
          return res.status(403).json({
            success: false,
            message: 'Access denied to parent folder'
          });
        }
        
        path = `${parentFolder.path}/${name}`;
        level = parentFolder.level + 1;
      }

      // Check if folder with same path already exists
      const existingFolder = await Folder.findOne({ path });
      if (existingFolder) {
        return res.status(400).json({
          success: false,
          message: 'Folder with this name already exists in the location'
        });
      }

      const folder = new Folder({
        name,
        path,
        description,
        parentFolder: parentFolderId || null,
        level,
        createdBy: req.user.id,
        createdByRole: req.user.role,
        subject,
        gradeLevel,
        visibility,
        color: color || '#3498db',
        icon: icon || 'folder'
      });

      await folder.save();

      // Update parent folder statistics
      if (parentFolderId) {
        const parentFolder = await Folder.findById(parentFolderId);
        if (parentFolder) {
          await parentFolder.updateStatistics();
        }
      }

      await folder.populate('createdBy', 'username fullName');

      res.status(201).json({
        success: true,
        message: 'Folder created successfully',
        data: { folder }
      });
    } catch (error) {
      console.error('Create folder error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to create folder'
      });
    }
  }

  // 📋 Get user folders
  async getUserFolders(req, res) {
    try {
      const { parentId, includeFiles = false } = req.query;
      
      const query = {
        $or: [
          { createdBy: req.user.id },
          { visibility: 'public' },
          { 'permissions.userId': req.user.id }
        ],
        parentFolder: parentId === 'null' || !parentId ? null : parentId,
        isArchived: false
      };

      const folders = await Folder.find(query)
        .populate('createdBy', 'username fullName')
        .sort({ isPinned: -1, name: 1 });

      let files = [];
      if (includeFiles === 'true') {
        const fileQuery = {
          $or: [
            { uploadedBy: req.user.id },
            { visibility: 'public' },
            { 'sharedWith.userId': req.user.id }
          ],
          parentFolder: parentId === 'null' || !parentId ? null : parentId,
          isArchived: false
        };

        files = await File.find(fileQuery)
          .populate('uploadedBy', 'username fullName')
          .sort({ uploadedAt: -1 });
      }

      res.json({
        success: true,
        message: 'Folders retrieved successfully',
        data: {
          folders,
          files,
          parentId: parentId === 'null' ? null : parentId
        }
      });
    } catch (error) {
      console.error('Get user folders error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve folders'
      });
    }
  }

  // 🌳 Get folder tree
  async getFolderTree(req, res) {
    try {
      const tree = await Folder.getFolderTree(req.user.id);

      res.json({
        success: true,
        message: 'Folder tree retrieved successfully',
        data: { tree }
      });
    } catch (error) {
      console.error('Get folder tree error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve folder tree'
      });
    }
  }

  // 📄 Get folder details
  async getFolderDetails(req, res) {
    try {
      const { folderId } = req.params;
      
      const folder = await Folder.findById(folderId)
        .populate('createdBy', 'username fullName role')
        .populate('parentFolder', 'name path')
        .populate('permissions.userId', 'username fullName')
        .populate('permissions.grantedBy', 'username fullName');

      if (!folder) {
        return res.status(404).json({
          success: false,
          message: 'Folder not found'
        });
      }

      // Check access permissions
      if (!folder.canAccess(req.user.id, req.user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      // Get folder contents
      const subfolders = await Folder.find({
        parentFolder: folderId,
        isArchived: false
      }).populate('createdBy', 'username fullName');

      const files = await File.find({
        parentFolder: folderId,
        isArchived: false
      }).populate('uploadedBy', 'username fullName');

      // Get folder path
      const fullPath = await folder.getFullPath();

      res.json({
        success: true,
        message: 'Folder details retrieved successfully',
        data: {
          folder,
          subfolders,
          files,
          fullPath,
          canEdit: folder.createdBy._id.toString() === req.user.id || req.user.role === 'admin',
          canDelete: folder.createdBy._id.toString() === req.user.id || req.user.role === 'admin'
        }
      });
    } catch (error) {
      console.error('Get folder details error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve folder details'
      });
    }
  }

  // ✏️ Update folder
  async updateFolder(req, res) {
    try {
      const { folderId } = req.params;
      const updates = req.body;
      
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

      // Update allowed fields
      const allowedUpdates = [
        'name', 'description', 'subject', 'gradeLevel', 
        'visibility', 'color', 'icon', 'isPinned'
      ];
      
      const oldPath = folder.path;
      let pathChanged = false;

      allowedUpdates.forEach(field => {
        if (updates[field] !== undefined) {
          folder[field] = updates[field];
          if (field === 'name') {
            pathChanged = true;
          }
        }
      });

      // Update path if name changed
      if (pathChanged && folder.name !== oldPath.split('/').pop()) {
        const pathParts = oldPath.split('/');
        pathParts[pathParts.length - 1] = folder.name;
        const newPath = pathParts.join('/');
        
        // Check if new path already exists
        const existingFolder = await Folder.findOne({ path: newPath, _id: { $ne: folderId } });
        if (existingFolder) {
          return res.status(400).json({
            success: false,
            message: 'Folder with this name already exists in the location'
          });
        }
        
        folder.path = newPath;
        
        // Update paths of all subfolders
        const subfolders = await folder.getAllSubfolders();
        for (const subfolder of subfolders) {
          const relativePath = subfolder.path.substring(oldPath.length);
          subfolder.path = newPath + relativePath;
          await subfolder.save();
        }
      }

      await folder.save();

      res.json({
        success: true,
        message: 'Folder updated successfully',
        data: { folder }
      });
    } catch (error) {
      console.error('Update folder error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to update folder'
      });
    }
  }

  // 🗑️ Delete folder
  async deleteFolder(req, res) {
    try {
      const { folderId } = req.params;
      const { moveContents = true } = req.query;
      
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

      if (moveContents === 'true') {
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

      // Update parent folder statistics
      if (folder.parentFolder) {
        const parentFolder = await Folder.findById(folder.parentFolder);
        if (parentFolder) {
          await parentFolder.updateStatistics();
        }
      }

      res.json({
        success: true,
        message: 'Folder deleted successfully',
        data: { 
          deletedFolderId: folderId,
          contentsHandling: moveContents === 'true' ? 'moved' : 'deleted'
        }
      });
    } catch (error) {
      console.error('Delete folder error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to delete folder'
      });
    }
  }

  // 📁 Move folder
  async moveFolder(req, res) {
    try {
      const { folderId } = req.params;
      const { targetFolderId } = req.body;
      
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

      // Validate target folder
      if (targetFolderId) {
        const targetFolder = await Folder.findById(targetFolderId);
        if (!targetFolder || !targetFolder.canAccess(req.user.id, req.user.role)) {
          return res.status(404).json({
            success: false,
            message: 'Target folder not found or access denied'
          });
        }

        // Check for circular reference
        if (targetFolderId === folderId) {
          return res.status(400).json({
            success: false,
            message: 'Cannot move folder into itself'
          });
        }

        // Check if target is a descendant of the folder being moved
        const targetPath = targetFolder.path;
        if (targetPath.startsWith(folder.path + '/')) {
          return res.status(400).json({
            success: false,
            message: 'Cannot move folder into its descendant'
          });
        }
      }

      // Update folder path and level
      const oldPath = folder.path;
      const newParentPath = targetFolderId ? 
        (await Folder.findById(targetFolderId)).path : '';
      const newPath = newParentPath ? `${newParentPath}/${folder.name}` : folder.name;
      const newLevel = targetFolderId ? 
        (await Folder.findById(targetFolderId)).level + 1 : 0;

      // Check if new path already exists
      const existingFolder = await Folder.findOne({ 
        path: newPath, 
        _id: { $ne: folderId } 
      });
      if (existingFolder) {
        return res.status(400).json({
          success: false,
          message: 'Folder with this name already exists in the target location'
        });
      }

      folder.parentFolder = targetFolderId || null;
      folder.path = newPath;
      folder.level = newLevel;
      
      await folder.save();

      // Update paths of all subfolders
      const subfolders = await folder.getAllSubfolders();
      for (const subfolder of subfolders) {
        const relativePath = subfolder.path.substring(oldPath.length);
        subfolder.path = newPath + relativePath;
        subfolder.level = newLevel + relativePath.split('/').length - 1;
        await subfolder.save();
      }

      // Update statistics for old and new parent folders
      const folderIds = [folder.parentFolder, targetFolderId].filter(Boolean);
      for (const fId of folderIds) {
        const f = await Folder.findById(fId);
        if (f) await f.updateStatistics();
      }

      res.json({
        success: true,
        message: 'Folder moved successfully',
        data: { 
          folder,
          oldPath,
          newPath
        }
      });
    } catch (error) {
      console.error('Move folder error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to move folder'
      });
    }
  }

  // 🎯 Grant folder permission
  async grantFolderPermission(req, res) {
    try {
      const { folderId } = req.params;
      const { userId, role = 'viewer' } = req.body;
      
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

      await folder.grantPermission(userId, role, req.user.id);

      res.json({
        success: true,
        message: 'Folder permission granted successfully',
        data: {
          folderId,
          grantedTo: userId,
          role
        }
      });
    } catch (error) {
      console.error('Grant folder permission error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to grant folder permission'
      });
    }
  }

  // 🚫 Revoke folder permission
  async revokeFolderPermission(req, res) {
    try {
      const { folderId } = req.params;
      const { userId } = req.body;
      
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

      await folder.revokePermission(userId);

      res.json({
        success: true,
        message: 'Folder permission revoked successfully',
        data: {
          folderId,
          revokedFrom: userId
        }
      });
    } catch (error) {
      console.error('Revoke folder permission error:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Failed to revoke folder permission'
      });
    }
  }

  // 📊 Get folder statistics
  async getFolderStatistics(req, res) {
    try {
      const { folderId } = req.params;
      
      const folder = await Folder.findById(folderId);
      
      if (!folder) {
        return res.status(404).json({
          success: false,
          message: 'Folder not found'
        });
      }

      // Check access permissions
      if (!folder.canAccess(req.user.id, req.user.role)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      await folder.updateStatistics();

      // Get detailed statistics
      const subfolders = await Folder.find({ parentFolder: folderId });
      const files = await File.find({ parentFolder: folderId });
      
      const fileTypeStats = await File.aggregate([
        { $match: { parentFolder: mongoose.Types.ObjectId(folderId) } },
        { $group: { _id: '$fileType', count: { $sum: 1 }, totalSize: { $sum: '$fileSize' } } }
      ]);

      res.json({
        success: true,
        message: 'Folder statistics retrieved successfully',
        data: {
          folder,
          statistics: {
            totalSubfolders: subfolders.length,
            totalFiles: files.length,
            totalSize: folder.totalSize,
            fileTypeBreakdown: fileTypeStats
          }
        }
      });
    } catch (error) {
      console.error('Get folder statistics error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve folder statistics'
      });
    }
  }

  // 📋 Get breadcrumb path
  async getFolderBreadcrumb(req, res) {
    try {
      const { folderId } = req.params;
      
      if (!folderId || folderId === 'null') {
        return res.json({
          success: true,
          message: 'Root folder breadcrumb',
          data: {
            breadcrumb: [{ id: null, name: 'Root', path: '' }]
          }
        });
      }

      const folder = await Folder.findById(folderId);
      
      if (!folder) {
        return res.status(404).json({
          success: false,
          message: 'Folder not found'
        });
      }

      // Build breadcrumb path
      const breadcrumb = [{ id: null, name: 'Root', path: '' }];
      const pathParts = folder.path.split('/');
      let currentPath = '';
      
      for (let i = 0; i < pathParts.length; i++) {
        currentPath = currentPath ? `${currentPath}/${pathParts[i]}` : pathParts[i];
        const pathFolder = await Folder.findOne({ path: currentPath });
        
        if (pathFolder) {
          breadcrumb.push({
            id: pathFolder._id,
            name: pathFolder.name,
            path: pathFolder.path
          });
        }
      }

      res.json({
        success: true,
        message: 'Folder breadcrumb retrieved successfully',
        data: { breadcrumb }
      });
    } catch (error) {
      console.error('Get folder breadcrumb error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve folder breadcrumb'
      });
    }
  }
}

module.exports = FolderController;
