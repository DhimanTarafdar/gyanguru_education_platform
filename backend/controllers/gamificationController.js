const GamificationService = require('../services/GamificationService');
const {
  Achievement,
  UserAchievement,
  ProgressTracking,
  StudyGoal,
  Leaderboard,
  Celebration,
  GamificationProfile
} = require('../models/Gamification');

// 🏆 GyanGuru Gamification Controller
// Features: Achievement System, Progress Tracking, Goals, Leaderboards, Celebrations

class GamificationController {

  // 🎯 Achievement Endpoints

  /**
   * Get all available achievements
   */
  async getAllAchievements(req, res) {
    try {
      const { category, type, tier } = req.query;
      let query = { isActive: true };
      
      if (category) query.category = category;
      if (type) query.type = type;
      if (tier) query.tier = tier;
      
      const achievements = await Achievement.find(query)
        .sort({ 'metadata.totalEarned': -1, tier: 1 });
      
      res.json({
        success: true,
        data: achievements,
        total: achievements.length
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch achievements',
        error: error.message
      });
    }
  }

  /**
   * Get user's achievements
   */
  async getUserAchievements(req, res) {
    try {
      const userId = req.user.id;
      const { status = 'all' } = req.query;
      
      let query = { user: userId };
      if (status === 'completed') query.isCompleted = true;
      if (status === 'in_progress') query.isCompleted = false;
      
      const userAchievements = await UserAchievement.find(query)
        .sort({ completedAt: -1, 'progress.percentage': -1 });
      
      // Get achievement details
      const achievementIds = userAchievements.map(ua => ua.achievement);
      const achievements = await Achievement.find({ 
        id: { $in: achievementIds },
        isActive: true 
      });
      
      const enrichedAchievements = userAchievements.map(ua => {
        const achievement = achievements.find(a => a.id === ua.achievement);
        return {
          ...ua.toObject(),
          achievementDetails: achievement
        };
      });
      
      res.json({
        success: true,
        data: enrichedAchievements,
        total: enrichedAchievements.length,
        completed: userAchievements.filter(ua => ua.isCompleted).length,
        inProgress: userAchievements.filter(ua => !ua.isCompleted).length
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch user achievements',
        error: error.message
      });
    }
  }

  /**
   * Track activity and update progress
   */
  async trackActivity(req, res) {
    try {
      const userId = req.user.id;
      const { activityType, activityData } = req.body;
      
      if (!activityType) {
        return res.status(400).json({
          success: false,
          message: 'Activity type is required'
        });
      }
      
      const result = await GamificationService.trackActivity(userId, activityType, activityData);
      
      res.json({
        success: true,
        message: 'Activity tracked successfully',
        data: result
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to track activity',
        error: error.message
      });
    }
  }

  // 📊 Progress Tracking Endpoints

  /**
   * Get user's progress history
   */
  async getProgressHistory(req, res) {
    try {
      const userId = req.user.id;
      const { 
        timeframe = '30d', 
        subject, 
        activityType,
        page = 1, 
        limit = 50 
      } = req.query;
      
      let query = { user: userId };
      
      // Time filter
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
        case '1y':
          startDate = new Date(now.setFullYear(now.getFullYear() - 1));
          break;
        default:
          startDate = new Date(now.setDate(now.getDate() - 30));
      }
      query.date = { $gte: startDate };
      
      if (subject) query.subject = subject;
      if (activityType) query['activity.type'] = activityType;
      
      const skip = (page - 1) * limit;
      
      const [progress, total] = await Promise.all([
        ProgressTracking.find(query)
          .sort({ date: -1 })
          .skip(skip)
          .limit(parseInt(limit)),
        ProgressTracking.countDocuments(query)
      ]);
      
      // Calculate summary statistics
      const stats = await ProgressTracking.aggregate([
        { $match: query },
        {
          $group: {
            _id: null,
            totalPoints: { $sum: '$points.total' },
            totalTime: { $sum: '$performance.timeSpent' },
            avgScore: { $avg: '$performance.score' },
            totalActivities: { $sum: 1 }
          }
        }
      ]);
      
      res.json({
        success: true,
        data: progress,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        },
        summary: stats[0] || {
          totalPoints: 0,
          totalTime: 0,
          avgScore: 0,
          totalActivities: 0
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch progress history',
        error: error.message
      });
    }
  }

  /**
   * Get progress analytics
   */
  async getProgressAnalytics(req, res) {
    try {
      const userId = req.user.id;
      const { timeframe = '30d' } = req.query;
      
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
      
      // Daily activity trend
      const dailyTrend = await ProgressTracking.aggregate([
        {
          $match: {
            user: userId,
            date: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: {
              $dateToString: { format: "%Y-%m-%d", date: "$date" }
            },
            points: { $sum: '$points.total' },
            timeSpent: { $sum: '$performance.timeSpent' },
            activities: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ]);
      
      // Subject breakdown
      const subjectBreakdown = await ProgressTracking.aggregate([
        {
          $match: {
            user: userId,
            date: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: '$subject',
            points: { $sum: '$points.total' },
            timeSpent: { $sum: '$performance.timeSpent' },
            avgScore: { $avg: '$performance.score' },
            activities: { $sum: 1 }
          }
        },
        { $sort: { points: -1 } }
      ]);
      
      // Activity type breakdown
      const activityBreakdown = await ProgressTracking.aggregate([
        {
          $match: {
            user: userId,
            date: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: '$activity.type',
            count: { $sum: 1 },
            avgScore: { $avg: '$performance.score' },
            totalPoints: { $sum: '$points.total' }
          }
        },
        { $sort: { count: -1 } }
      ]);
      
      res.json({
        success: true,
        data: {
          dailyTrend,
          subjectBreakdown,
          activityBreakdown,
          timeframe
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch progress analytics',
        error: error.message
      });
    }
  }

  // 🎯 Study Goals Endpoints

  /**
   * Create study goal
   */
  async createStudyGoal(req, res) {
    try {
      const userId = req.user.id;
      const goalData = req.body;
      
      // Validate required fields
      const requiredFields = ['title', 'type', 'category', 'target', 'timeframe'];
      for (const field of requiredFields) {
        if (!goalData[field]) {
          return res.status(400).json({
            success: false,
            message: `${field} is required`
          });
        }
      }
      
      const goal = await GamificationService.createStudyGoal(userId, goalData);
      
      res.status(201).json({
        success: true,
        message: 'Study goal created successfully',
        data: goal
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to create study goal',
        error: error.message
      });
    }
  }

  /**
   * Get user's study goals
   */
  async getStudyGoals(req, res) {
    try {
      const userId = req.user.id;
      const { status, type, category } = req.query;
      
      let query = { user: userId };
      if (status) query.status = status;
      if (type) query.type = type;
      if (category) query.category = category;
      
      const goals = await StudyGoal.find(query)
        .sort({ createdAt: -1 });
      
      res.json({
        success: true,
        data: goals,
        total: goals.length,
        active: goals.filter(g => g.status === 'active').length,
        completed: goals.filter(g => g.status === 'completed').length
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch study goals',
        error: error.message
      });
    }
  }

  /**
   * Update study goal
   */
  async updateStudyGoal(req, res) {
    try {
      const userId = req.user.id;
      const { goalId } = req.params;
      const updates = req.body;
      
      const goal = await StudyGoal.findOneAndUpdate(
        { _id: goalId, user: userId },
        updates,
        { new: true }
      );
      
      if (!goal) {
        return res.status(404).json({
          success: false,
          message: 'Study goal not found'
        });
      }
      
      res.json({
        success: true,
        message: 'Study goal updated successfully',
        data: goal
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to update study goal',
        error: error.message
      });
    }
  }

  /**
   * Delete study goal
   */
  async deleteStudyGoal(req, res) {
    try {
      const userId = req.user.id;
      const { goalId } = req.params;
      
      const goal = await StudyGoal.findOneAndDelete({
        _id: goalId,
        user: userId
      });
      
      if (!goal) {
        return res.status(404).json({
          success: false,
          message: 'Study goal not found'
        });
      }
      
      res.json({
        success: true,
        message: 'Study goal deleted successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to delete study goal',
        error: error.message
      });
    }
  }

  // 🏆 Leaderboard Endpoints

  /**
   * Get leaderboards
   */
  async getLeaderboards(req, res) {
    try {
      const { type, metric, timeframe } = req.query;
      
      let query = { 'settings.isActive': true };
      if (type) query.type = type;
      if (metric) query.metric = metric;
      if (timeframe) query.timeframe = timeframe;
      
      const leaderboards = await Leaderboard.find(query)
        .populate('participants.user', 'name email avatar')
        .sort({ lastUpdated: -1 });
      
      res.json({
        success: true,
        data: leaderboards,
        total: leaderboards.length
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch leaderboards',
        error: error.message
      });
    }
  }

  /**
   * Get specific leaderboard
   */
  async getLeaderboard(req, res) {
    try {
      const { leaderboardId } = req.params;
      const { limit = 50 } = req.query;
      
      const leaderboard = await Leaderboard.findById(leaderboardId)
        .populate('participants.user', 'name email avatar');
      
      if (!leaderboard) {
        return res.status(404).json({
          success: false,
          message: 'Leaderboard not found'
        });
      }
      
      // Limit participants if specified
      if (limit && leaderboard.participants.length > limit) {
        leaderboard.participants = leaderboard.participants.slice(0, parseInt(limit));
      }
      
      res.json({
        success: true,
        data: leaderboard
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch leaderboard',
        error: error.message
      });
    }
  }

  /**
   * Get user's leaderboard position
   */
  async getUserLeaderboardPosition(req, res) {
    try {
      const userId = req.user.id;
      const { leaderboardId } = req.params;
      
      const leaderboard = await Leaderboard.findById(leaderboardId);
      
      if (!leaderboard) {
        return res.status(404).json({
          success: false,
          message: 'Leaderboard not found'
        });
      }
      
      const userPosition = leaderboard.participants.find(
        p => p.user.toString() === userId
      );
      
      res.json({
        success: true,
        data: {
          position: userPosition || null,
          totalParticipants: leaderboard.participants.length,
          leaderboardInfo: {
            name: leaderboard.name,
            metric: leaderboard.metric,
            timeframe: leaderboard.timeframe
          }
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch user leaderboard position',
        error: error.message
      });
    }
  }

  // 🎊 Celebration Endpoints

  /**
   * Get pending celebrations
   */
  async getPendingCelebrations(req, res) {
    try {
      const userId = req.user.id;
      
      const celebrations = await Celebration.find({
        user: userId,
        isShown: false,
        expiresAt: { $gt: new Date() }
      }).sort({ priority: -1, createdAt: -1 });
      
      res.json({
        success: true,
        data: celebrations,
        total: celebrations.length
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch pending celebrations',
        error: error.message
      });
    }
  }

  /**
   * Mark celebration as shown
   */
  async markCelebrationShown(req, res) {
    try {
      const userId = req.user.id;
      const { celebrationId } = req.params;
      
      const celebration = await Celebration.findOneAndUpdate(
        { _id: celebrationId, user: userId },
        { 
          isShown: true,
          shownAt: new Date()
        },
        { new: true }
      );
      
      if (!celebration) {
        return res.status(404).json({
          success: false,
          message: 'Celebration not found'
        });
      }
      
      res.json({
        success: true,
        message: 'Celebration marked as shown',
        data: celebration
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to mark celebration as shown',
        error: error.message
      });
    }
  }

  /**
   * Get celebration history
   */
  async getCelebrationHistory(req, res) {
    try {
      const userId = req.user.id;
      const { limit = 20, page = 1 } = req.query;
      
      const skip = (page - 1) * limit;
      
      const [celebrations, total] = await Promise.all([
        Celebration.find({ user: userId })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(parseInt(limit)),
        Celebration.countDocuments({ user: userId })
      ]);
      
      res.json({
        success: true,
        data: celebrations,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch celebration history',
        error: error.message
      });
    }
  }

  // 🌟 Gamification Profile Endpoints

  /**
   * Get user's gamification profile
   */
  async getGamificationProfile(req, res) {
    try {
      const userId = req.user.id;
      
      const summary = await GamificationService.getUserGamificationSummary(userId);
      
      res.json({
        success: true,
        data: summary
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch gamification profile',
        error: error.message
      });
    }
  }

  /**
   * Update gamification preferences
   */
  async updateGamificationPreferences(req, res) {
    try {
      const userId = req.user.id;
      const { preferences } = req.body;
      
      const profile = await GamificationProfile.findOneAndUpdate(
        { user: userId },
        { preferences },
        { new: true, upsert: true }
      );
      
      res.json({
        success: true,
        message: 'Preferences updated successfully',
        data: profile
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to update preferences',
        error: error.message
      });
    }
  }

  // 📊 Dashboard & Summary Endpoints

  /**
   * Get gamification dashboard
   */
  async getGamificationDashboard(req, res) {
    try {
      const userId = req.user.id;
      
      // Get user profile
      const profile = await GamificationProfile.findOne({ user: userId });
      
      // Get recent achievements
      const recentAchievements = await UserAchievement.find({
        user: userId,
        isCompleted: true
      })
      .sort({ completedAt: -1 })
      .limit(5)
      .populate('achievement');
      
      // Get active goals
      const activeGoals = await StudyGoal.find({
        user: userId,
        status: 'active'
      }).limit(5);
      
      // Get pending celebrations
      const pendingCelebrations = await Celebration.find({
        user: userId,
        isShown: false,
        expiresAt: { $gt: new Date() }
      }).limit(3);
      
      // Get user's rank in global leaderboard
      const globalLeaderboard = await Leaderboard.findOne({
        type: 'global',
        metric: 'total_points',
        timeframe: 'all_time'
      });
      
      let userRank = null;
      if (globalLeaderboard) {
        const userPosition = globalLeaderboard.participants.find(
          p => p.user.toString() === userId
        );
        userRank = userPosition ? userPosition.rank : null;
      }
      
      res.json({
        success: true,
        data: {
          profile,
          recentAchievements,
          activeGoals,
          pendingCelebrations,
          globalRank: userRank,
          stats: {
            totalAchievements: recentAchievements.length,
            activeGoalsCount: activeGoals.length,
            pendingCelebrationsCount: pendingCelebrations.length
          }
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to fetch gamification dashboard',
        error: error.message
      });
    }
  }

  // 🔧 Admin Endpoints

  /**
   * Initialize default achievements (Admin only)
   */
  async initializeDefaultAchievements(req, res) {
    try {
      // Check if user is admin (implement your admin check logic)
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Admin access required'
        });
      }
      
      const result = await GamificationService.initializeDefaultAchievements();
      
      res.json({
        success: true,
        message: 'Default achievements initialized successfully',
        data: result
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to initialize achievements',
        error: error.message
      });
    }
  }

  /**
   * Force update leaderboards (Admin only)
   */
  async updateLeaderboards(req, res) {
    try {
      // Check if user is admin
      if (req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Admin access required'
        });
      }
      
      await GamificationService.updateLeaderboards();
      
      res.json({
        success: true,
        message: 'Leaderboards updated successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to update leaderboards',
        error: error.message
      });
    }
  }
}

module.exports = new GamificationController();
