const express = require('express');
const router = express.Router();

// 📁 GyanGuru File Management Routes - Basic Test Version

// Test route
router.get('/test', (req, res) => {
  res.json({ message: 'File management routes working!' });
});

module.exports = router;
