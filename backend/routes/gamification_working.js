const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const gamificationController = require('../controllers/gamificationController');

// 🏆 GyanGuru Progress Tracking & Gamification Routes
// Features: Achievement Badges, Progress Streaks, Leaderboards, Study Goals, Milestone Celebrations

// 🧪 Test route
router.get('/test', (req, res) => {
  res.json({ 
    message: '🏆 Gamification System Fully Operational!',
    status: 'success',
    features: [
      '🏅 Achievement Badges - Complete challenges and unlock rewards',
      '🔥 Progress Streaks - Maintain daily study habits', 
      '🏆 Leaderboards - Compete with peers and track ranking',
      '🎯 Study Goals Tracking - Set and achieve learning milestones',
      '🎉 Milestone Celebrations - Get recognized for accomplishments'
    ],
    api_endpoints: {
      achievements: '/api/gamification/achievements',
      progress: '/api/gamification/progress',
      goals: '/api/gamification/goals', 
      leaderboards: '/api/gamification/leaderboards',
      profile: '/api/gamification/profile',
      dashboard: '/api/gamification/dashboard'
    },
    timestamp: new Date().toISOString()
  });
});

// 🎯 ACHIEVEMENT ROUTES

// Get all available achievements
router.get('/achievements', (req, res) => {
  gamificationController.getAllAchievements(req, res);
});

// Get user's achievements (completed and in progress)  
router.get('/achievements/my', auth, (req, res) => {
  gamificationController.getUserAchievements(req, res);
});

// Initialize default achievements (Admin only)
router.post('/achievements/initialize', auth, (req, res) => {
  gamificationController.initializeDefaultAchievements(req, res);
});

// 📊 PROGRESS TRACKING ROUTES

// Track user activity and update progress
router.post('/track-activity', auth, (req, res) => {
  gamificationController.trackActivity(req, res);
});

// Get user's progress history
router.get('/progress/history', auth, (req, res) => {
  gamificationController.getProgressHistory(req, res);
});

// Get progress analytics and trends
router.get('/progress/analytics', auth, (req, res) => {
  gamificationController.getProgressAnalytics(req, res);
});

// 🎯 STUDY GOALS ROUTES

// Create new study goal
router.post('/goals', auth, (req, res) => {
  gamificationController.createStudyGoal(req, res);
});

// Get user's study goals
router.get('/goals', auth, (req, res) => {
  gamificationController.getStudyGoals(req, res);
});

// Update study goal
router.put('/goals/:goalId', auth, (req, res) => {
  gamificationController.updateStudyGoal(req, res);
});

// Delete study goal
router.delete('/goals/:goalId', auth, (req, res) => {
  gamificationController.deleteStudyGoal(req, res);
});

// 🏆 LEADERBOARD ROUTES

// Get global leaderboards
router.get('/leaderboards', (req, res) => {
  gamificationController.getLeaderboards(req, res);
});

// Get specific leaderboard
router.get('/leaderboards/:type', (req, res) => {
  gamificationController.getLeaderboard(req, res);
});

// Get user's leaderboard position
router.get('/leaderboards/my-position', auth, (req, res) => {
  gamificationController.getUserLeaderboardPosition(req, res);
});

// 🎉 CELEBRATION ROUTES

// Get pending celebrations
router.get('/celebrations', auth, (req, res) => {
  gamificationController.getPendingCelebrations(req, res);
});

// Mark celebration as viewed
router.post('/celebrations/:celebrationId/viewed', auth, (req, res) => {
  gamificationController.markCelebrationShown(req, res);
});

// Get celebration history
router.get('/celebrations/history', auth, (req, res) => {
  gamificationController.getCelebrationHistory(req, res);
});

// 👤 PROFILE ROUTES

// Get gamification profile
router.get('/profile', auth, (req, res) => {
  gamificationController.getGamificationProfile(req, res);
});

// Update gamification preferences
router.put('/profile/preferences', auth, (req, res) => {
  gamificationController.updateGamificationPreferences(req, res);
});

// 📊 DASHBOARD ROUTES

// Get complete gamification dashboard
router.get('/dashboard', auth, (req, res) => {
  gamificationController.getGamificationDashboard(req, res);
});

// 🛠️ ADMIN ROUTES

// Update leaderboards (Admin only)
router.post('/admin/update-leaderboards', auth, (req, res) => {
  gamificationController.updateLeaderboards(req, res);
});

module.exports = router;
