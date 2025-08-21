const {
  Achievement,
  UserAchievement,
  ProgressTracking,
  StudyGoal,
  Leaderboard,
  Celebration,
  GamificationProfile
} = require('../models/Gamification');
const User = require('../models/User');

// 🏆 GyanGuru Gamification Service
// Features: Achievement System, Progress Tracking, Goals, Leaderboards, Celebrations

class GamificationService {
  constructor() {
    this.pointsCalculator = {
      'lesson_completed': 10,
      'quiz_taken': 15,
      'assignment_submitted': 20,
      'video_watched': 5,
      'book_read': 25,
      'practice_session': 8,
      'help_given': 30,
      'question_answered': 12,
      'resource_shared': 18
    };
    
    this.experienceCalculator = {
      'lesson_completed': 50,
      'quiz_taken': 75,
      'assignment_submitted': 100,
      'achievement_earned': 200,
      'goal_completed': 300,
      'streak_milestone': 150
    };
  }

  // 🎯 Achievement System

  /**
   * Initialize default achievements
   */
  async initializeDefaultAchievements() {
    try {
      const defaultAchievements = [
        // Learning Achievements
        {
          id: 'first_lesson',
          name: 'First Steps',
          description: 'Complete your first lesson',
          icon: '🎯',
          category: 'learning',
          type: 'milestone',
          tier: 'bronze',
          criteria: { action: 'lesson_completed', threshold: 1 },
          rewards: { points: 50, badge: true, title: 'Beginner' }
        },
        {
          id: 'lesson_master_10',
          name: 'Quick Learner',
          description: 'Complete 10 lessons',
          icon: '📚',
          category: 'learning',
          type: 'progress',
          tier: 'silver',
          criteria: { action: 'lesson_completed', threshold: 10 },
          rewards: { points: 200, badge: true }
        },
        {
          id: 'lesson_master_50',
          name: 'Knowledge Seeker',
          description: 'Complete 50 lessons',
          icon: '🎓',
          category: 'learning',
          type: 'progress',
          tier: 'gold',
          criteria: { action: 'lesson_completed', threshold: 50 },
          rewards: { points: 500, badge: true, title: 'Scholar' }
        },
        
        // Streak Achievements
        {
          id: 'streak_7',
          name: 'Week Warrior',
          description: 'Study for 7 days in a row',
          icon: '🔥',
          category: 'consistency',
          type: 'streak',
          tier: 'silver',
          criteria: { action: 'study_streak', threshold: 7 },
          rewards: { points: 300, badge: true }
        },
        {
          id: 'streak_30',
          name: 'Month Master',
          description: 'Study for 30 days in a row',
          icon: '⚡',
          category: 'consistency',
          type: 'streak',
          tier: 'gold',
          criteria: { action: 'study_streak', threshold: 30 },
          rewards: { points: 1000, badge: true, title: 'Dedicated' }
        },
        
        // Quiz Achievements
        {
          id: 'quiz_ace',
          name: 'Quiz Ace',
          description: 'Score 100% on a quiz',
          icon: '💯',
          category: 'mastery',
          type: 'milestone',
          tier: 'gold',
          criteria: { action: 'quiz_perfect', threshold: 1 },
          rewards: { points: 150, badge: true }
        },
        
        // Social Achievements
        {
          id: 'helper_5',
          name: 'Helpful Friend',
          description: 'Help 5 fellow students',
          icon: '🤝',
          category: 'social',
          type: 'progress',
          tier: 'silver',
          criteria: { action: 'help_given', threshold: 5 },
          rewards: { points: 250, badge: true, title: 'Helper' }
        },
        
        // Special Achievements
        {
          id: 'early_bird',
          name: 'Early Bird',
          description: 'Study before 8 AM',
          icon: '🌅',
          category: 'special',
          type: 'milestone',
          tier: 'bronze',
          criteria: { action: 'early_study', threshold: 1 },
          rewards: { points: 100, badge: true }
        },
        {
          id: 'night_owl',
          name: 'Night Owl',
          description: 'Study after 10 PM',
          icon: '🦉',
          category: 'special',
          type: 'milestone',
          tier: 'bronze',
          criteria: { action: 'late_study', threshold: 1 },
          rewards: { points: 100, badge: true }
        }
      ];

      for (const achievementData of defaultAchievements) {
        await Achievement.findOneAndUpdate(
          { id: achievementData.id },
          {
            ...achievementData,
            metadata: {
              createdBy: null, // System achievement
              totalEarned: 0
            }
          },
          { upsert: true, new: true }
        );
      }

      return { success: true, message: 'Default achievements initialized' };
    } catch (error) {
      throw new Error(`Failed to initialize achievements: ${error.message}`);
    }
  }

  /**
   * Track user activity and check for achievements
   */
  async trackActivity(userId, activityType, activityData = {}) {
    try {
      // Record progress tracking
      const progressEntry = await this.recordProgress(userId, activityType, activityData);
      
      // Check and award achievements
      const achievements = await this.checkAchievements(userId, activityType, activityData);
      
      // Update gamification profile
      await this.updateGamificationProfile(userId, activityType, activityData);
      
      // Check study goals
      await this.updateStudyGoals(userId, activityType, activityData);
      
      return {
        progress: progressEntry,
        achievements: achievements,
        points: this.calculatePoints(activityType, activityData)
      };
    } catch (error) {
      throw new Error(`Failed to track activity: ${error.message}`);
    }
  }

  /**
   * Record progress tracking entry
   */
  async recordProgress(userId, activityType, activityData) {
    try {
      const points = this.calculatePoints(activityType, activityData);
      
      const progressEntry = new ProgressTracking({
        user: userId,
        subject: activityData.subject || 'General',
        grade: activityData.grade || 'Unknown',
        topic: activityData.topic,
        activity: {
          type: activityType,
          details: activityData
        },
        performance: {
          score: activityData.score,
          accuracy: activityData.accuracy,
          timeSpent: activityData.timeSpent || 0,
          attempts: activityData.attempts || 1
        },
        points: {
          earned: points.base,
          bonus: points.bonus,
          total: points.total
        }
      });

      // Update streaks
      await this.updateStreaks(userId, progressEntry);
      
      return await progressEntry.save();
    } catch (error) {
      throw new Error(`Failed to record progress: ${error.message}`);
    }
  }

  /**
   * Calculate points for an activity
   */
  calculatePoints(activityType, activityData) {
    const basePoints = this.pointsCalculator[activityType] || 0;
    let bonus = 0;
    
    // Performance bonus
    if (activityData.score >= 90) bonus += basePoints * 0.5;
    else if (activityData.score >= 80) bonus += basePoints * 0.3;
    else if (activityData.score >= 70) bonus += basePoints * 0.1;
    
    // Speed bonus
    if (activityData.timeSpent && activityData.expectedTime) {
      if (activityData.timeSpent <= activityData.expectedTime * 0.8) {
        bonus += basePoints * 0.2;
      }
    }
    
    // First attempt bonus
    if (activityData.attempts === 1) {
      bonus += basePoints * 0.1;
    }
    
    return {
      base: basePoints,
      bonus: Math.round(bonus),
      total: basePoints + Math.round(bonus)
    };
  }

  /**
   * Update user streaks
   */
  async updateStreaks(userId, progressEntry) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      // Check if user studied yesterday
      const yesterdayActivity = await ProgressTracking.findOne({
        user: userId,
        date: {
          $gte: yesterday,
          $lt: today
        }
      });
      
      const profile = await GamificationProfile.findOne({ user: userId });
      if (!profile) return;
      
      if (yesterdayActivity || profile.streaks.lastActivity?.toDateString() === yesterday.toDateString()) {
        // Continue streak
        profile.streaks.current += 1;
        if (profile.streaks.current > profile.streaks.longest) {
          profile.streaks.longest = profile.streaks.current;
        }
      } else {
        // Reset streak
        profile.streaks.current = 1;
      }
      
      profile.streaks.lastActivity = new Date();
      await profile.save();
      
      // Check for streak achievements
      await this.checkStreakAchievements(userId, profile.streaks.current);
      
    } catch (error) {
      console.error('Failed to update streaks:', error);
    }
  }

  /**
   * Check and award achievements
   */
  async checkAchievements(userId, activityType, activityData) {
    try {
      const achievements = await Achievement.find({ isActive: true });
      const awardedAchievements = [];
      
      for (const achievement of achievements) {
        if (await this.checkAchievementCriteria(userId, achievement, activityType, activityData)) {
          const awarded = await this.awardAchievement(userId, achievement.id);
          if (awarded) {
            awardedAchievements.push(awarded);
          }
        }
      }
      
      return awardedAchievements;
    } catch (error) {
      throw new Error(`Failed to check achievements: ${error.message}`);
    }
  }

  /**
   * Check if achievement criteria is met
   */
  async checkAchievementCriteria(userId, achievement, activityType, activityData) {
    try {
      const { criteria } = achievement;
      
      // Check if this activity type matches achievement criteria
      if (criteria.action !== activityType && criteria.action !== 'any') {
        return false;
      }
      
      // Check subject filter
      if (criteria.subject && criteria.subject !== activityData.subject) {
        return false;
      }
      
      // Check grade filter
      if (criteria.grade && criteria.grade !== activityData.grade) {
        return false;
      }
      
      // Get user's progress for this achievement
      let userAchievement = await UserAchievement.findOne({
        user: userId,
        achievement: achievement.id
      });
      
      if (!userAchievement) {
        userAchievement = new UserAchievement({
          user: userId,
          achievement: achievement.id,
          progress: {
            current: 0,
            target: criteria.threshold,
            percentage: 0
          }
        });
      }
      
      if (userAchievement.isCompleted) {
        return false; // Already completed
      }
      
      // Update progress
      userAchievement.progress.current += 1;
      userAchievement.progress.percentage = 
        (userAchievement.progress.current / userAchievement.progress.target) * 100;
      
      // Check if completed
      if (userAchievement.progress.current >= criteria.threshold) {
        userAchievement.isCompleted = true;
        userAchievement.completedAt = new Date();
        await userAchievement.save();
        return true;
      }
      
      await userAchievement.save();
      return false;
    } catch (error) {
      console.error('Error checking achievement criteria:', error);
      return false;
    }
  }

  /**
   * Award achievement to user
   */
  async awardAchievement(userId, achievementId) {
    try {
      const achievement = await Achievement.findOne({ id: achievementId });
      if (!achievement) return null;
      
      // Check if already awarded
      const existing = await UserAchievement.findOne({
        user: userId,
        achievement: achievementId,
        isCompleted: true
      });
      
      if (existing) return null;
      
      // Award the achievement
      const userAchievement = await UserAchievement.findOneAndUpdate(
        { user: userId, achievement: achievementId },
        {
          isCompleted: true,
          completedAt: new Date(),
          progress: {
            current: achievement.criteria.threshold,
            target: achievement.criteria.threshold,
            percentage: 100
          }
        },
        { upsert: true, new: true }
      );
      
      // Update achievement metadata
      achievement.metadata.totalEarned += 1;
      if (!achievement.metadata.firstEarnedDate) {
        achievement.metadata.firstEarnedDate = new Date();
      }
      achievement.metadata.lastEarnedDate = new Date();
      await achievement.save();
      
      // Update user's gamification profile
      await this.updateProfileForAchievement(userId, achievement);
      
      // Create celebration
      await this.createCelebration(userId, 'achievement_earned', {
        title: `Achievement Unlocked: ${achievement.name}!`,
        message: achievement.description,
        achievement: achievementId,
        points: achievement.rewards.points
      });
      
      return {
        achievement: achievement,
        userAchievement: userAchievement
      };
    } catch (error) {
      throw new Error(`Failed to award achievement: ${error.message}`);
    }
  }

  /**
   * Update gamification profile
   */
  async updateGamificationProfile(userId, activityType, activityData) {
    try {
      let profile = await GamificationProfile.findOne({ user: userId });
      
      if (!profile) {
        profile = new GamificationProfile({ user: userId });
      }
      
      // Calculate points and experience
      const points = this.calculatePoints(activityType, activityData);
      const experience = this.experienceCalculator[activityType] || 20;
      
      // Update points
      profile.points.total += points.total;
      profile.points.available += points.total;
      profile.points.lifetime += points.total;
      
      // Update experience and level
      profile.level.experience.current += experience;
      profile.level.experience.total += experience;
      
      // Check for level up
      while (profile.level.experience.current >= profile.level.experience.required) {
        profile.level.experience.current -= profile.level.experience.required;
        profile.level.current += 1;
        profile.level.experience.required = Math.floor(profile.level.experience.required * 1.2);
        
        // Create level up celebration
        await this.createCelebration(userId, 'level_up', {
          title: `Level Up!`,
          message: `Congratulations! You've reached level ${profile.level.current}!`,
          level: profile.level.current,
          points: 100
        });
      }
      
      // Update statistics
      if (activityType === 'lesson_completed') {
        profile.statistics.lessonsCompleted += 1;
      } else if (activityType === 'quiz_taken') {
        profile.statistics.quizzesCompleted += 1;
        // Update average score
        const totalQuizzes = profile.statistics.quizzesCompleted;
        const currentAvg = profile.statistics.averageScore;
        profile.statistics.averageScore = 
          ((currentAvg * (totalQuizzes - 1)) + (activityData.score || 0)) / totalQuizzes;
      } else if (activityType === 'help_given') {
        profile.statistics.helpGiven += 1;
      }
      
      // Update study time
      if (activityData.timeSpent) {
        profile.statistics.studyTime.total += activityData.timeSpent;
        profile.statistics.studyTime.daily += activityData.timeSpent;
      }
      
      return await profile.save();
    } catch (error) {
      throw new Error(`Failed to update gamification profile: ${error.message}`);
    }
  }

  /**
   * Create study goal
   */
  async createStudyGoal(userId, goalData) {
    try {
      const goal = new StudyGoal({
        user: userId,
        ...goalData,
        timeframe: {
          start: new Date(goalData.timeframe.start),
          end: new Date(goalData.timeframe.end),
          duration: Math.ceil(
            (new Date(goalData.timeframe.end) - new Date(goalData.timeframe.start)) / 
            (1000 * 60 * 60 * 24)
          )
        }
      });
      
      return await goal.save();
    } catch (error) {
      throw new Error(`Failed to create study goal: ${error.message}`);
    }
  }

  /**
   * Update study goals progress
   */
  async updateStudyGoals(userId, activityType, activityData) {
    try {
      const activeGoals = await StudyGoal.find({
        user: userId,
        status: 'active',
        'timeframe.start': { $lte: new Date() },
        'timeframe.end': { $gte: new Date() }
      });
      
      for (const goal of activeGoals) {
        let shouldUpdate = false;
        let incrementValue = 0;
        
        // Check if activity contributes to this goal
        switch (goal.category) {
          case 'study_time':
            if (activityData.timeSpent) {
              incrementValue = activityData.timeSpent;
              shouldUpdate = true;
            }
            break;
          case 'lessons_completed':
            if (activityType === 'lesson_completed') {
              incrementValue = 1;
              shouldUpdate = true;
            }
            break;
          case 'quiz_score':
            if (activityType === 'quiz_taken' && activityData.score) {
              // For quiz score goals, we track the average
              const newAverage = ((goal.current.value * goal.current.attempts) + activityData.score) / 
                                (goal.current.attempts + 1);
              goal.current.value = newAverage;
              goal.current.attempts = (goal.current.attempts || 0) + 1;
              shouldUpdate = true;
            }
            break;
          case 'streak_maintenance':
            // Updated separately in updateStreaks
            break;
        }
        
        if (shouldUpdate && incrementValue > 0) {
          goal.current.value += incrementValue;
        }
        
        if (shouldUpdate) {
          // Update percentage
          goal.current.percentage = Math.min(
            (goal.current.value / goal.target.value) * 100, 
            100
          );
          
          // Check milestones
          for (const milestone of goal.milestones) {
            if (!milestone.achieved && goal.current.percentage >= milestone.percentage) {
              milestone.achieved = true;
              milestone.achievedAt = new Date();
              
              // Award milestone rewards
              if (milestone.reward.points) {
                await this.awardPoints(userId, milestone.reward.points);
              }
              
              // Create celebration
              await this.createCelebration(userId, 'goal_completed', {
                title: `Milestone Reached!`,
                message: `You've completed ${milestone.percentage}% of your goal: ${goal.title}`,
                goal: goal._id,
                points: milestone.reward.points || 0
              });
            }
          }
          
          // Check if goal is completed
          if (goal.current.percentage >= 100 && goal.status === 'active') {
            goal.status = 'completed';
            goal.completedAt = new Date();
            
            // Award completion rewards
            if (goal.rewards.points) {
              await this.awardPoints(userId, goal.rewards.points);
            }
            
            // Create celebration
            await this.createCelebration(userId, 'goal_completed', {
              title: `Goal Completed!`,
              message: `Congratulations! You've completed your goal: ${goal.title}`,
              goal: goal._id,
              points: goal.rewards.points || 0
            });
          }
          
          await goal.save();
        }
      }
    } catch (error) {
      console.error('Failed to update study goals:', error);
    }
  }

  /**
   * Create celebration
   */
  async createCelebration(userId, type, data) {
    try {
      const celebration = new Celebration({
        user: userId,
        type: type,
        title: data.title,
        message: data.message,
        data: data,
        animation: this.getAnimationForType(type),
        sound: this.getSoundForType(type),
        priority: this.getPriorityForType(type)
      });
      
      return await celebration.save();
    } catch (error) {
      console.error('Failed to create celebration:', error);
    }
  }

  /**
   * Update leaderboards
   */
  async updateLeaderboards() {
    try {
      const leaderboards = await Leaderboard.find({ 
        'settings.isActive': true,
        'settings.autoUpdate': true 
      });
      
      for (const leaderboard of leaderboards) {
        await this.calculateLeaderboardRankings(leaderboard);
      }
    } catch (error) {
      console.error('Failed to update leaderboards:', error);
    }
  }

  /**
   * Calculate leaderboard rankings
   */
  async calculateLeaderboardRankings(leaderboard) {
    try {
      const { metric, timeframe, filters } = leaderboard;
      let query = {};
      let timeQuery = {};
      
      // Build time query
      const now = new Date();
      switch (timeframe) {
        case 'daily':
          const startOfDay = new Date(now);
          startOfDay.setHours(0, 0, 0, 0);
          timeQuery = { createdAt: { $gte: startOfDay } };
          break;
        case 'weekly':
          const startOfWeek = new Date(now);
          startOfWeek.setDate(now.getDate() - now.getDay());
          startOfWeek.setHours(0, 0, 0, 0);
          timeQuery = { createdAt: { $gte: startOfWeek } };
          break;
        case 'monthly':
          const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
          timeQuery = { createdAt: { $gte: startOfMonth } };
          break;
      }
      
      // Build aggregation pipeline based on metric
      let pipeline = [];
      
      switch (metric) {
        case 'total_points':
          pipeline = [
            { $match: timeQuery },
            {
              $group: {
                _id: '$user',
                score: { $sum: '$points.total' }
              }
            }
          ];
          break;
        case 'study_time':
          pipeline = [
            { $match: timeQuery },
            {
              $group: {
                _id: '$user',
                score: { $sum: '$performance.timeSpent' }
              }
            }
          ];
          break;
        case 'lessons_completed':
          pipeline = [
            { 
              $match: { 
                ...timeQuery,
                'activity.type': 'lesson_completed'
              }
            },
            {
              $group: {
                _id: '$user',
                score: { $sum: 1 }
              }
            }
          ];
          break;
      }
      
      // Execute aggregation
      const results = await ProgressTracking.aggregate(pipeline);
      
      // Sort and rank
      results.sort((a, b) => b.score - a.score);
      
      // Update leaderboard participants
      leaderboard.participants = results.slice(0, leaderboard.settings.maxParticipants)
        .map((result, index) => ({
          user: result._id,
          rank: index + 1,
          score: result.score,
          trend: 'same' // Will be calculated based on previous rankings
        }));
      
      leaderboard.lastUpdated = new Date();
      await leaderboard.save();
      
    } catch (error) {
      console.error('Failed to calculate leaderboard rankings:', error);
    }
  }

  // Helper methods
  getAnimationForType(type) {
    const animations = {
      'achievement_earned': 'confetti',
      'goal_completed': 'fireworks',
      'level_up': 'stars',
      'streak_milestone': 'balloons',
      'leaderboard_position': 'trophy'
    };
    return animations[type] || 'confetti';
  }

  getSoundForType(type) {
    const sounds = {
      'achievement_earned': 'cheer',
      'goal_completed': 'fanfare',
      'level_up': 'applause',
      'streak_milestone': 'ding',
      'leaderboard_position': 'bell'
    };
    return sounds[type] || 'cheer';
  }

  getPriorityForType(type) {
    const priorities = {
      'achievement_earned': 'medium',
      'goal_completed': 'high',
      'level_up': 'epic',
      'streak_milestone': 'medium',
      'leaderboard_position': 'high'
    };
    return priorities[type] || 'medium';
  }

  /**
   * Award points to user
   */
  async awardPoints(userId, points) {
    try {
      const profile = await GamificationProfile.findOne({ user: userId });
      if (profile) {
        profile.points.total += points;
        profile.points.available += points;
        profile.points.lifetime += points;
        await profile.save();
      }
    } catch (error) {
      console.error('Failed to award points:', error);
    }
  }

  /**
   * Get user's gamification summary
   */
  async getUserGamificationSummary(userId) {
    try {
      const profile = await GamificationProfile.findOne({ user: userId });
      const achievements = await UserAchievement.find({ 
        user: userId, 
        isCompleted: true 
      }).populate('achievement');
      const activeGoals = await StudyGoal.find({ 
        user: userId, 
        status: 'active' 
      });
      const celebrations = await Celebration.find({ 
        user: userId, 
        isShown: false,
        expiresAt: { $gt: new Date() }
      }).sort({ createdAt: -1 });
      
      return {
        profile,
        achievements: achievements.length,
        activeGoals: activeGoals.length,
        pendingCelebrations: celebrations.length,
        recentCelebrations: celebrations.slice(0, 5)
      };
    } catch (error) {
      throw new Error(`Failed to get gamification summary: ${error.message}`);
    }
  }
}

module.exports = new GamificationService();
