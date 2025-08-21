const mongoose = require('mongoose');

// 📁 GyanGuru Folder Management System
// Features: Hierarchical folder structure, Permissions, Organization

const folderSchema = new mongoose.Schema({
  // Basic folder information
  name: {
    type: String,
    required: true,
    trim: true
  },
  
  path: {
    type: String,
    required: true,
    unique: true
  },
  
  description: {
    type: String,
    trim: true
  },
  
  // Folder hierarchy
  parentFolder: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Folder',
    default: null
  },
  
  level: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Ownership and access
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  createdByRole: {
    type: String,
    enum: ['student', 'teacher', 'admin'],
    required: true
  },
  
  // Access control
  visibility: {
    type: String,
    enum: ['private', 'public', 'shared', 'restricted'],
    default: 'private'
  },
  
  permissions: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    role: {
      type: String,
      enum: ['viewer', 'editor', 'admin']
    },
    grantedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    grantedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Academic context
  subject: {
    type: String,
    trim: true
  },
  
  gradeLevel: {
    type: String,
    enum: ['6th', '7th', '8th', '9th', '10th', '11th', '12th', 'undergraduate', 'graduate'],
    trim: true
  },
  
  // Folder properties
  color: {
    type: String,
    default: '#3498db'
  },
  
  icon: {
    type: String,
    default: 'folder'
  },
  
  tags: [{
    type: String,
    trim: true
  }],
  
  // Folder statistics
  fileCount: {
    type: Number,
    default: 0
  },
  
  subFolderCount: {
    type: Number,
    default: 0
  },
  
  totalSize: {
    type: Number,
    default: 0
  },
  
  // Folder status
  isArchived: {
    type: Boolean,
    default: false
  },
  
  archivedAt: {
    type: Date
  },
  
  isPinned: {
    type: Boolean,
    default: false
  },
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
folderSchema.index({ createdBy: 1, createdAt: -1 });
folderSchema.index({ parentFolder: 1 });
folderSchema.index({ path: 1 });
folderSchema.index({ visibility: 1 });
folderSchema.index({ subject: 1, gradeLevel: 1 });

// Virtual fields
folderSchema.virtual('totalSizeFormatted').get(function() {
  const bytes = this.totalSize;
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
});

folderSchema.virtual('fullPath').get(function() {
  return this.path;
});

// Instance methods
folderSchema.methods.updateStatistics = async function() {
  const File = mongoose.model('File');
  const Folder = mongoose.model('Folder');
  
  // Count files in this folder
  const fileStats = await File.aggregate([
    { $match: { parentFolder: this._id, isArchived: false } },
    { $group: { _id: null, count: { $sum: 1 }, totalSize: { $sum: '$fileSize' } } }
  ]);
  
  this.fileCount = fileStats.length > 0 ? fileStats[0].count : 0;
  this.totalSize = fileStats.length > 0 ? fileStats[0].totalSize : 0;
  
  // Count subfolders
  this.subFolderCount = await Folder.countDocuments({ 
    parentFolder: this._id, 
    isArchived: false 
  });
  
  return this.save();
};

folderSchema.methods.grantPermission = function(userId, role, grantedBy) {
  // Remove existing permission
  this.permissions = this.permissions.filter(p => 
    p.userId.toString() !== userId.toString()
  );
  
  // Add new permission
  this.permissions.push({
    userId,
    role,
    grantedBy,
    grantedAt: new Date()
  });
  
  return this.save();
};

folderSchema.methods.revokePermission = function(userId) {
  this.permissions = this.permissions.filter(p => 
    p.userId.toString() !== userId.toString()
  );
  return this.save();
};

folderSchema.methods.canAccess = function(userId, userRole) {
  // Folder owner can always access
  if (this.createdBy.toString() === userId.toString()) {
    return true;
  }
  
  // Public folders can be accessed by all
  if (this.visibility === 'public') {
    return true;
  }
  
  // Check permissions
  const permission = this.permissions.find(p => 
    p.userId.toString() === userId.toString()
  );
  if (permission) {
    return true;
  }
  
  // Admin can access all folders
  if (userRole === 'admin') {
    return true;
  }
  
  return false;
};

folderSchema.methods.getFullPath = async function() {
  if (!this.parentFolder) {
    return this.name;
  }
  
  const parent = await this.constructor.findById(this.parentFolder);
  if (parent) {
    const parentPath = await parent.getFullPath();
    return `${parentPath}/${this.name}`;
  }
  
  return this.name;
};

folderSchema.methods.getAllSubfolders = async function() {
  const subfolders = await this.constructor.find({ 
    parentFolder: this._id,
    isArchived: false
  });
  
  let allSubfolders = [...subfolders];
  
  for (const subfolder of subfolders) {
    const nestedSubfolders = await subfolder.getAllSubfolders();
    allSubfolders = allSubfolders.concat(nestedSubfolders);
  }
  
  return allSubfolders;
};

// Static methods
folderSchema.statics.createPath = async function(pathString, createdBy, createdByRole) {
  const pathParts = pathString.split('/').filter(part => part.trim());
  let currentPath = '';
  let parentFolder = null;
  let level = 0;
  
  for (const part of pathParts) {
    currentPath = currentPath ? `${currentPath}/${part}` : part;
    
    let folder = await this.findOne({ path: currentPath });
    
    if (!folder) {
      folder = new this({
        name: part,
        path: currentPath,
        parentFolder,
        level,
        createdBy,
        createdByRole
      });
      
      await folder.save();
    }
    
    parentFolder = folder._id;
    level++;
  }
  
  return this.findOne({ path: currentPath });
};

folderSchema.statics.getRootFolders = function(userId) {
  return this.find({
    $or: [
      { createdBy: userId },
      { visibility: 'public' },
      { 'permissions.userId': userId }
    ],
    parentFolder: null,
    isArchived: false
  }).populate('createdBy', 'username fullName');
};

folderSchema.statics.getFolderTree = async function(userId, parentId = null) {
  const folders = await this.find({
    $or: [
      { createdBy: userId },
      { visibility: 'public' },
      { 'permissions.userId': userId }
    ],
    parentFolder: parentId,
    isArchived: false
  }).populate('createdBy', 'username fullName');
  
  const tree = [];
  
  for (const folder of folders) {
    const folderData = folder.toObject();
    folderData.children = await this.getFolderTree(userId, folder._id);
    tree.push(folderData);
  }
  
  return tree;
};

// Pre-save middleware
folderSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Pre-remove middleware
folderSchema.pre('remove', async function(next) {
  const File = mongoose.model('File');
  
  // Move files to parent folder or root
  await File.updateMany(
    { parentFolder: this._id },
    { parentFolder: this.parentFolder }
  );
  
  // Move subfolders to parent folder or root
  await this.constructor.updateMany(
    { parentFolder: this._id },
    { parentFolder: this.parentFolder }
  );
  
  next();
});

module.exports = mongoose.model('Folder', folderSchema);
