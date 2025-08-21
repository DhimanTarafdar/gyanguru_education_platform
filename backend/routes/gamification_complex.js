const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const gamificationController = require('../controllers/gamificationController');

// 🏆 GyanGuru Progress Tracking & Gamification Routes
// Features: Achievement Badges, Progress Streaks, Leaderboards, Study Goals, Milestone Celebrations

// 🎯 ACHIEVEMENT ROUTES

// Get all available achievements
router.get('/achievements', 
  auth, 
  gamificationController.getAllAchievements
);

// Get user's achievements (completed and in progress)
router.get('/achievements/my', 
  auth, 
  gamificationController.getUserAchievements
);

// Initialize default achievements (Admin only)
router.post('/achievements/initialize', 
  auth, 
  gamificationController.initializeDefaultAchievements
);

// 📊 PROGRESS TRACKING ROUTES

// Track user activity and update progress
router.post('/track-activity', 
  auth, 
  gamificationController.trackActivity
);

// Get user's progress history
router.get('/progress/history', 
  auth, 
  gamificationController.getProgressHistory
);

// Get progress analytics and trends
router.get('/progress/analytics', 
  auth, 
  gamificationController.getProgressAnalytics
);

// 🎯 STUDY GOALS ROUTES

// Create new study goal
router.post('/goals', 
  auth, 
  (req, res) => gamificationController.createStudyGoal(req, res)
);

// Get user's study goals
router.get('/goals', 
  auth, 
  (req, res) => gamificationController.getStudyGoals(req, res)
);

// Update study goal
router.put('/goals/:goalId', 
  auth, 
  (req, res) => gamificationController.updateStudyGoal(req, res)
);

// Delete study goal
router.delete('/goals/:goalId', 
  auth, 
  (req, res) => gamificationController.deleteStudyGoal(req, res)
);

// 🏆 LEADERBOARD ROUTES

// Get all leaderboards
router.get('/leaderboards', 
  (req, res) => gamificationController.getLeaderboards(req, res)
);

// Get specific leaderboard
router.get('/leaderboards/:leaderboardId', 
  (req, res) => gamificationController.getLeaderboard(req, res)
);

// Get user's position in specific leaderboard
router.get('/leaderboards/:leaderboardId/my-position', 
  auth, 
  (req, res) => gamificationController.getUserLeaderboardPosition(req, res)
);

// Force update leaderboards (Admin only)
router.post('/leaderboards/update', 
  auth, 
  (req, res) => gamificationController.updateLeaderboards(req, res)
);

// 🎊 CELEBRATION ROUTES

// Get pending celebrations for user
router.get('/celebrations/pending', 
  auth, 
  (req, res) => gamificationController.getPendingCelebrations(req, res)
);

// Mark celebration as shown
router.patch('/celebrations/:celebrationId/shown', 
  auth, 
  (req, res) => gamificationController.markCelebrationShown(req, res)
);

// Get celebration history
router.get('/celebrations/history', 
  auth, 
  (req, res) => gamificationController.getCelebrationHistory(req, res)
);

// 🌟 GAMIFICATION PROFILE ROUTES

// Get user's complete gamification profile
router.get('/profile', 
  auth, 
  (req, res) => gamificationController.getGamificationProfile(req, res)
);

// Update gamification preferences
router.put('/profile/preferences', 
  auth, 
  (req, res) => gamificationController.updateGamificationPreferences(req, res)
);

// Get gamification dashboard summary
router.get('/dashboard', 
  auth, 
  (req, res) => gamificationController.getGamificationDashboard(req, res)
);

// 📈 STREAK TRACKING ROUTES

// Get current streak information
router.get('/streaks/current', auth, async (req, res) => {
  try {
    const { GamificationProfile } = require('../models/Gamification');
    const profile = await GamificationProfile.findOne({ user: req.user.id });
    
    res.json({
      success: true,
      data: {
        current: profile?.streaks.current || 0,
        longest: profile?.streaks.longest || 0,
        lastActivity: profile?.streaks.lastActivity
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch streak information',
      error: error.message
    });
  }
});

// Get streak leaderboard
router.get('/streaks/leaderboard', async (req, res) => {
  try {
    const { GamificationProfile } = require('../models/Gamification');
    const { limit = 50 } = req.query;
    
    const topStreaks = await GamificationProfile.find({})
      .populate('user', 'name email avatar')
      .sort({ 'streaks.current': -1 })
      .limit(parseInt(limit));
    
    res.json({
      success: true,
      data: topStreaks.map((profile, index) => ({
        rank: index + 1,
        user: profile.user,
        currentStreak: profile.streaks.current,
        longestStreak: profile.streaks.longest,
        lastActivity: profile.streaks.lastActivity
      }))
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch streak leaderboard',
      error: error.message
    });
  }
});

// 🏅 BADGE SHOWCASE ROUTES

// Get user's badge showcase
router.get('/badges/showcase', auth, async (req, res) => {
  try {
    const { UserAchievement, Achievement } = require('../models/Gamification');
    
    const userAchievements = await UserAchievement.find({
      user: req.user.id,
      isCompleted: true
    }).sort({ completedAt: -1 });
    
    const achievementIds = userAchievements.map(ua => ua.achievement);
    const achievements = await Achievement.find({
      id: { $in: achievementIds }
    });
    
    const badges = userAchievements.map(ua => {
      const achievement = achievements.find(a => a.id === ua.achievement);
      return {
        ...achievement.toObject(),
        earnedAt: ua.completedAt,
        rarity: achievement.rarity
      };
    }).sort((a, b) => {
      const rarityOrder = { 'common': 1, 'uncommon': 2, 'rare': 3, 'epic': 4, 'legendary': 5 };
      return rarityOrder[b.rarity] - rarityOrder[a.rarity];
    });
    
    res.json({
      success: true,
      data: badges,
      total: badges.length,
      byRarity: {
        common: badges.filter(b => b.rarity === 'common').length,
        uncommon: badges.filter(b => b.rarity === 'uncommon').length,
        rare: badges.filter(b => b.rarity === 'rare').length,
        epic: badges.filter(b => b.rarity === 'epic').length,
        legendary: badges.filter(b => b.rarity === 'legendary').length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch badge showcase',
      error: error.message
    });
  }
});

// 📊 POINTS & LEVEL ROUTES

// Get user's points breakdown
router.get('/points/breakdown', auth, async (req, res) => {
  try {
    const { ProgressTracking, GamificationProfile } = require('../models/Gamification');
    const { timeframe = '30d' } = req.query;
    
    // Calculate date range
    const now = new Date();
    let startDate;
    switch (timeframe) {
      case '7d':
        startDate = new Date(now.setDate(now.getDate() - 7));
        break;
      case '30d':
        startDate = new Date(now.setDate(now.getDate() - 30));
        break;
      case '90d':
        startDate = new Date(now.setDate(now.getDate() - 90));
        break;
      default:
        startDate = new Date(now.setDate(now.getDate() - 30));
    }
    
    // Get points breakdown by activity type
    const pointsBreakdown = await ProgressTracking.aggregate([
      {
        $match: {
          user: req.user.id,
          date: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$activity.type',
          totalPoints: { $sum: '$points.total' },
          count: { $sum: 1 },
          avgPoints: { $avg: '$points.total' }
        }
      },
      { $sort: { totalPoints: -1 } }
    ]);
    
    // Get user profile for total points
    const profile = await GamificationProfile.findOne({ user: req.user.id });
    
    res.json({
      success: true,
      data: {
        breakdown: pointsBreakdown,
        totalPoints: profile?.points.total || 0,
        availablePoints: profile?.points.available || 0,
        spentPoints: profile?.points.spent || 0,
        lifetimePoints: profile?.points.lifetime || 0,
        timeframe
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch points breakdown',
      error: error.message
    });
  }
});

// Get level progression information
router.get('/level/progression', auth, async (req, res) => {
  try {
    const { GamificationProfile } = require('../models/Gamification');
    const profile = await GamificationProfile.findOne({ user: req.user.id });
    
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Gamification profile not found'
      });
    }
    
    const nextLevelExperience = profile.level.experience.required;
    const currentExperience = profile.level.experience.current;
    const progressPercentage = (currentExperience / nextLevelExperience) * 100;
    
    res.json({
      success: true,
      data: {
        currentLevel: profile.level.current,
        currentExperience,
        experienceToNextLevel: nextLevelExperience - currentExperience,
        nextLevelExperience,
        progressPercentage: progressPercentage.toFixed(1),
        totalExperience: profile.level.experience.total
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch level progression',
      error: error.message
    });
  }
});

// 🎮 QUICK ACTIONS FOR COMMON ACTIVITIES

// Quick track: Lesson completed
router.post('/quick-track/lesson-completed', auth, async (req, res) => {
  try {
    const { subject, grade, topic, score, timeSpent } = req.body;
    const GamificationService = require('../services/GamificationService');
    
    const result = await GamificationService.trackActivity(req.user.id, 'lesson_completed', {
      subject,
      grade,
      topic,
      score,
      timeSpent
    });
    
    res.json({
      success: true,
      message: 'Lesson completion tracked successfully',
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to track lesson completion',
      error: error.message
    });
  }
});

// Quick track: Quiz taken
router.post('/quick-track/quiz-taken', auth, async (req, res) => {
  try {
    const { subject, grade, topic, score, accuracy, timeSpent, attempts } = req.body;
    const GamificationService = require('../services/GamificationService');
    
    const result = await GamificationService.trackActivity(req.user.id, 'quiz_taken', {
      subject,
      grade,
      topic,
      score,
      accuracy,
      timeSpent,
      attempts
    });
    
    res.json({
      success: true,
      message: 'Quiz completion tracked successfully',
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to track quiz completion',
      error: error.message
    });
  }
});

// Quick track: Help given
router.post('/quick-track/help-given', auth, async (req, res) => {
  try {
    const { helpType, subject, details } = req.body;
    const GamificationService = require('../services/GamificationService');
    
    const result = await GamificationService.trackActivity(req.user.id, 'help_given', {
      helpType,
      subject,
      details
    });
    
    res.json({
      success: true,
      message: 'Help given tracked successfully',
      data: result
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to track help given',
      error: error.message
    });
  }
});

// 📊 STATISTICS AND INSIGHTS

// Get comparative statistics
router.get('/stats/comparative', auth, async (req, res) => {
  try {
    const { GamificationProfile, ProgressTracking } = require('../models/Gamification');
    const { timeframe = '30d' } = req.query;
    
    // Get user's profile
    const userProfile = await GamificationProfile.findOne({ user: req.user.id });
    
    // Get average statistics for comparison
    const averageStats = await GamificationProfile.aggregate([
      {
        $group: {
          _id: null,
          avgLevel: { $avg: '$level.current' },
          avgPoints: { $avg: '$points.total' },
          avgStreak: { $avg: '$streaks.current' },
          avgStudyTime: { $avg: '$statistics.studyTime.total' },
          avgLessons: { $avg: '$statistics.lessonsCompleted' }
        }
      }
    ]);
    
    const avg = averageStats[0] || {};
    
    res.json({
      success: true,
      data: {
        user: {
          level: userProfile?.level.current || 1,
          points: userProfile?.points.total || 0,
          streak: userProfile?.streaks.current || 0,
          studyTime: userProfile?.statistics.studyTime.total || 0,
          lessons: userProfile?.statistics.lessonsCompleted || 0
        },
        average: {
          level: Math.round(avg.avgLevel || 1),
          points: Math.round(avg.avgPoints || 0),
          streak: Math.round(avg.avgStreak || 0),
          studyTime: Math.round(avg.avgStudyTime || 0),
          lessons: Math.round(avg.avgLessons || 0)
        },
        comparison: {
          levelDiff: (userProfile?.level.current || 1) - (avg.avgLevel || 1),
          pointsDiff: (userProfile?.points.total || 0) - (avg.avgPoints || 0),
          streakDiff: (userProfile?.streaks.current || 0) - (avg.avgStreak || 0),
          studyTimeDiff: (userProfile?.statistics.studyTime.total || 0) - (avg.avgStudyTime || 0),
          lessonsDiff: (userProfile?.statistics.lessonsCompleted || 0) - (avg.avgLessons || 0)
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch comparative statistics',
      error: error.message
    });
  }
});

// 🎯 GOAL SUGGESTIONS

// Get personalized goal suggestions
router.get('/goals/suggestions', auth, async (req, res) => {
  try {
    const { GamificationProfile, ProgressTracking } = require('../models/Gamification');
    
    // Get user's profile and recent activity
    const [profile, recentActivity] = await Promise.all([
      GamificationProfile.findOne({ user: req.user.id }),
      ProgressTracking.find({ user: req.user.id })
        .sort({ date: -1 })
        .limit(50)
    ]);
    
    const suggestions = [];
    
    // Analyze patterns and suggest goals
    if (profile) {
      // Study time goal
      const avgDailyStudyTime = profile.statistics.studyTime.total / 30; // rough estimate
      if (avgDailyStudyTime > 0) {
        suggestions.push({
          type: 'daily',
          category: 'study_time',
          title: 'Daily Study Time Goal',
          description: `Study for ${Math.round(avgDailyStudyTime * 1.2)} minutes daily`,
          target: { value: Math.round(avgDailyStudyTime * 1.2), unit: 'minutes' },
          difficulty: 'medium',
          estimatedPoints: 200
        });
      }
      
      // Streak goal
      if (profile.streaks.longest > 0) {
        suggestions.push({
          type: 'custom',
          category: 'streak_maintenance',
          title: 'Beat Your Best Streak',
          description: `Maintain a study streak longer than ${profile.streaks.longest} days`,
          target: { value: profile.streaks.longest + 5, unit: 'days' },
          difficulty: 'hard',
          estimatedPoints: 500
        });
      }
      
      // Subject mastery goal
      const subjectCounts = {};
      recentActivity.forEach(activity => {
        subjectCounts[activity.subject] = (subjectCounts[activity.subject] || 0) + 1;
      });
      
      const topSubject = Object.keys(subjectCounts).reduce((a, b) => 
        subjectCounts[a] > subjectCounts[b] ? a : b, Object.keys(subjectCounts)[0]
      );
      
      if (topSubject) {
        suggestions.push({
          type: 'weekly',
          category: 'lessons_completed',
          title: `Master ${topSubject}`,
          description: `Complete 10 lessons in ${topSubject} this week`,
          target: { value: 10, unit: 'lessons' },
          subject: topSubject,
          difficulty: 'medium',
          estimatedPoints: 300
        });
      }
    }
    
    res.json({
      success: true,
      data: suggestions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch goal suggestions',
      error: error.message
    });
  }
});

module.exports = router;
