const express = require('express');
const router = express.Router();

// 📁 GyanGuru Folder Management Routes - Basic Test Version

// Test route
router.get('/test', (req, res) => {
  res.json({ message: 'Folder management routes working!' });
});

module.exports = router;
