const express = require('express');
const router = express.Router();
const {
  createQuestion,
  getQuestions,
  getQuestionById,
  updateQuestion,
  deleteQuestion,
  getRandomQuestions,
  getQuestionStats,
  getSubjectsAndChapters,
  generateQuestionsWithAI,
  getAIProviderStatus
} = require('../controllers/questionController');

const { authenticateUser, teacherOnly } = require('../middleware/auth');

// Public routes (for students to access public questions)
router.get('/public', authenticateUser, getQuestions);
router.get('/random', authenticateUser, getRandomQuestions);
router.get('/subjects-chapters', authenticateUser, getSubjectsAndChapters);

// Teacher-only routes
router.post('/', authenticateUser, teacherOnly, createQuestion);
router.put('/:id', authenticateUser, teacherOnly, updateQuestion);
router.delete('/:id', authenticateUser, teacherOnly, deleteQuestion);
router.get('/stats/teacher', authenticateUser, teacherOnly, getQuestionStats);

// General routes (with role-based filtering inside controller)
router.get('/', authenticateUser, getQuestions);
router.get('/:id', authenticateUser, getQuestionById);

// AI generation routes
router.post('/ai-generate', authenticateUser, teacherOnly, generateQuestionsWithAI);
router.get('/ai-status', authenticateUser, teacherOnly, getAIProviderStatus);

module.exports = router;
