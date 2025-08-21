const Recommendation = require('../models/Recommendation');
const SmartRecommendationService = require('../services/SmartRecommendationService');
const StudentPerformance = require('../models/StudentPerformance');
const User = require('../models/User');

// 🧠 GyanGuru Smart Recommendation Controller
// Features: AI-powered personalized recommendations, Learning path optimization, Adaptive suggestions

class SmartRecommendationController {

  // ==========================================
  // 🎯 MAIN RECOMMENDATION ENDPOINTS
  // ==========================================

  /**
   * Generate new personalized recommendations for user
   * @route POST /api/recommendations/generate
   */
  static async generateRecommendations(req, res) {
    try {
      const userId = req.user._id;
      const { 
        limit = 5, 
        type = null, 
        subject = null, 
        priority = null,
        forceRegenerate = false 
      } = req.body;

      console.log(`🧠 Generating recommendations for user: ${userId}`);

      // Check if user already has recent recommendations (unless force regenerate)
      if (!forceRegenerate) {
        const existingRecommendations = await Recommendation.find({
          userId,
          isActive: true,
          createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
        });

        if (existingRecommendations.length >= 3) {
          return res.status(200).json({
            success: true,
            message: 'Recent recommendations already exist',
            data: {
              recommendations: existingRecommendations.map(r => r.getSummary()),
              generated: false,
              reason: 'Recent recommendations found'
            }
          });
        }
      }

      // Generate new recommendations
      const recommendations = await SmartRecommendationService.generateRecommendations(userId, {
        limit,
        type,
        subject,
        priority
      });

      console.log(`✅ Generated ${recommendations.length} recommendations`);

      res.status(201).json({
        success: true,
        message: 'Smart recommendations generated successfully',
        data: {
          recommendations: recommendations.map(r => r.getSummary()),
          generated: true,
          count: recommendations.length,
          generatedAt: new Date()
        }
      });

    } catch (error) {
      console.error('❌ Generate recommendations error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate recommendations',
        error: error.message
      });
    }
  }

  /**
   * Get user's active recommendations
   * @route GET /api/recommendations
   */
  static async getUserRecommendations(req, res) {
    try {
      const userId = req.user._id;
      const { 
        page = 1, 
        limit = 10, 
        type = null, 
        subject = null, 
        status = null,
        priority = null 
      } = req.query;

      console.log(`📋 Getting recommendations for user: ${userId}`);

      // Build query
      let query = { userId, isActive: true, isVisible: true };
      
      if (type) query.recommendationType = type;
      if (subject) query.targetSubject = subject;
      if (priority) query.priority = priority;
      if (status) query['userResponse.status'] = status;

      // Get recommendations with pagination
      const recommendations = await Recommendation.find(query)
        .sort({ 
          priority: 1, 
          'reasoningData.aiAnalysis.confidenceScore': -1, 
          createdAt: -1 
        })
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

      const totalRecommendations = await Recommendation.countDocuments(query);

      // Get summary statistics
      const stats = await this.getRecommendationStats(userId);

      res.status(200).json({
        success: true,
        message: 'User recommendations retrieved successfully',
        data: {
          recommendations: recommendations.map(r => r.getSummary()),
          pagination: {
            currentPage: parseInt(page),
            totalPages: Math.ceil(totalRecommendations / limit),
            totalRecommendations,
            hasNextPage: page * limit < totalRecommendations
          },
          statistics: stats,
          filters: { type, subject, status, priority }
        }
      });

    } catch (error) {
      console.error('❌ Get recommendations error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve recommendations',
        error: error.message
      });
    }
  }

  /**
   * Get detailed recommendation by ID
   * @route GET /api/recommendations/:id
   */
  static async getRecommendationDetails(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user._id;

      console.log(`🔍 Getting recommendation details: ${id}`);

      const recommendation = await Recommendation.findOne({
        _id: id,
        userId,
        isActive: true
      });

      if (!recommendation) {
        return res.status(404).json({
          success: false,
          message: 'Recommendation not found or access denied'
        });
      }

      // Get related recommendations
      const relatedRecommendations = await Recommendation.find({
        userId,
        targetSubject: recommendation.targetSubject,
        _id: { $ne: recommendation._id },
        isActive: true
      }).limit(3).select('title recommendationType priority createdAt');

      res.status(200).json({
        success: true,
        message: 'Recommendation details retrieved successfully',
        data: {
          recommendation: recommendation.toObject(),
          relatedRecommendations,
          effectivenessScore: recommendation.calculateEffectiveness()
        }
      });

    } catch (error) {
      console.error('❌ Get recommendation details error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve recommendation details',
        error: error.message
      });
    }
  }

  // ==========================================
  // 🎯 RECOMMENDATION INTERACTION ENDPOINTS
  // ==========================================

  /**
   * Accept a recommendation
   * @route POST /api/recommendations/:id/accept
   */
  static async acceptRecommendation(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user._id;

      console.log(`✅ Accepting recommendation: ${id}`);

      const recommendation = await Recommendation.findOne({
        _id: id,
        userId,
        isActive: true
      });

      if (!recommendation) {
        return res.status(404).json({
          success: false,
          message: 'Recommendation not found'
        });
      }

      await recommendation.accept();

      res.status(200).json({
        success: true,
        message: 'Recommendation accepted successfully',
        data: {
          recommendationId: id,
          status: 'accepted',
          acceptedAt: recommendation.userResponse.acceptedAt
        }
      });

    } catch (error) {
      console.error('❌ Accept recommendation error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to accept recommendation',
        error: error.message
      });
    }
  }

  /**
   * Start following a recommendation
   * @route POST /api/recommendations/:id/start
   */
  static async startRecommendation(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user._id;

      console.log(`🚀 Starting recommendation: ${id}`);

      const recommendation = await Recommendation.findOne({
        _id: id,
        userId,
        isActive: true
      });

      if (!recommendation) {
        return res.status(404).json({
          success: false,
          message: 'Recommendation not found'
        });
      }

      await recommendation.start();

      res.status(200).json({
        success: true,
        message: 'Recommendation started successfully',
        data: {
          recommendationId: id,
          status: 'partially_followed',
          startedAt: recommendation.userResponse.startedAt
        }
      });

    } catch (error) {
      console.error('❌ Start recommendation error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to start recommendation',
        error: error.message
      });
    }
  }

  /**
   * Update recommendation progress
   * @route PUT /api/recommendations/:id/progress
   */
  static async updateProgress(req, res) {
    try {
      const { id } = req.params;
      const { progress, notes = '', milestones = [] } = req.body;
      const userId = req.user._id;

      if (progress < 0 || progress > 100) {
        return res.status(400).json({
          success: false,
          message: 'Progress must be between 0 and 100'
        });
      }

      console.log(`📈 Updating progress for recommendation: ${id} - ${progress}%`);

      const recommendation = await Recommendation.findOne({
        _id: id,
        userId,
        isActive: true
      });

      if (!recommendation) {
        return res.status(404).json({
          success: false,
          message: 'Recommendation not found'
        });
      }

      await recommendation.updateProgress(progress, notes);

      // Update milestones if provided
      if (milestones.length > 0) {
        recommendation.progress.milestonesCompleted = milestones;
        await recommendation.save();
      }

      res.status(200).json({
        success: true,
        message: 'Progress updated successfully',
        data: {
          recommendationId: id,
          progress: recommendation.progress.completionPercentage,
          milestonesCompleted: recommendation.progress.milestonesCompleted,
          lastUpdated: new Date()
        }
      });

    } catch (error) {
      console.error('❌ Update progress error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update progress',
        error: error.message
      });
    }
  }

  /**
   * Complete a recommendation with feedback
   * @route POST /api/recommendations/:id/complete
   */
  static async completeRecommendation(req, res) {
    try {
      const { id } = req.params;
      const { 
        rating, 
        feedback = '', 
        helpfulnessScore, 
        achievedOutcomes = [],
        performanceImprovement = null
      } = req.body;
      const userId = req.user._id;

      console.log(`🎉 Completing recommendation: ${id}`);

      const recommendation = await Recommendation.findOne({
        _id: id,
        userId,
        isActive: true
      });

      if (!recommendation) {
        return res.status(404).json({
          success: false,
          message: 'Recommendation not found'
        });
      }

      // Complete recommendation with feedback
      await recommendation.complete({
        rating,
        feedback,
        helpfulnessScore
      });

      // Update achieved outcomes
      if (achievedOutcomes.length > 0) {
        recommendation.userResponse.achievedOutcomes = achievedOutcomes;
      }

      // Update performance improvement if provided
      if (performanceImprovement) {
        recommendation.progress.performanceImprovement = {
          before: performanceImprovement.before,
          after: performanceImprovement.after,
          improvement: performanceImprovement.after - performanceImprovement.before,
          measuredAt: new Date()
        };
      }

      await recommendation.save();

      // Calculate effectiveness score
      const effectivenessScore = recommendation.calculateEffectiveness();

      res.status(200).json({
        success: true,
        message: 'Recommendation completed successfully',
        data: {
          recommendationId: id,
          status: 'completed',
          completedAt: recommendation.userResponse.completedAt,
          effectivenessScore,
          feedback: {
            rating: recommendation.userResponse.rating,
            helpfulnessScore: recommendation.userResponse.helpfulnessScore
          }
        }
      });

    } catch (error) {
      console.error('❌ Complete recommendation error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to complete recommendation',
        error: error.message
      });
    }
  }

  /**
   * Decline a recommendation
   * @route POST /api/recommendations/:id/decline
   */
  static async declineRecommendation(req, res) {
    try {
      const { id } = req.params;
      const { reason = '' } = req.body;
      const userId = req.user._id;

      console.log(`❌ Declining recommendation: ${id}`);

      const recommendation = await Recommendation.findOne({
        _id: id,
        userId,
        isActive: true
      });

      if (!recommendation) {
        return res.status(404).json({
          success: false,
          message: 'Recommendation not found'
        });
      }

      recommendation.userResponse.status = 'declined';
      recommendation.userResponse.feedback = reason;
      recommendation.isVisible = false;

      await recommendation.save();

      res.status(200).json({
        success: true,
        message: 'Recommendation declined successfully',
        data: {
          recommendationId: id,
          status: 'declined',
          reason
        }
      });

    } catch (error) {
      console.error('❌ Decline recommendation error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to decline recommendation',
        error: error.message
      });
    }
  }

  // ==========================================
  // 📊 ANALYTICS AND INSIGHTS ENDPOINTS
  // ==========================================

  /**
   * Get recommendation analytics for user
   * @route GET /api/recommendations/analytics
   */
  static async getRecommendationAnalytics(req, res) {
    try {
      const userId = req.user._id;
      const { timeframe = 30 } = req.query; // days

      console.log(`📊 Getting recommendation analytics for user: ${userId}`);

      // Get recommendation statistics
      const stats = await Recommendation.getStatistics(userId, timeframe);
      const learningPatterns = await Recommendation.getUserLearningPatterns(userId);
      const effectiveness = await Recommendation.getByEffectiveness(userId, 70);

      // Calculate additional metrics
      const totalRecommendations = await Recommendation.countDocuments({ userId });
      const activeRecommendations = await Recommendation.countDocuments({
        userId,
        isActive: true,
        'userResponse.status': { $in: ['pending', 'accepted', 'partially_followed'] }
      });

      // Get recent performance improvements
      const performanceImprovements = await Recommendation.find({
        userId,
        'progress.performanceImprovement.improvement': { $exists: true, $gt: 0 }
      }).select('progress.performanceImprovement targetSubject').limit(10);

      const analytics = {
        summary: {
          totalRecommendations,
          activeRecommendations,
          completedRecommendations: stats[0]?.effectiveness[0]?.totalCompleted || 0,
          averageRating: Math.round((stats[0]?.effectiveness[0]?.averageRating || 0) * 10) / 10,
          averageCompletion: Math.round((stats[0]?.effectiveness[0]?.averageCompletion || 0) * 10) / 10
        },
        
        distribution: {
          byType: stats[0]?.byType || [],
          byStatus: stats[0]?.byStatus || [],
          byPriority: stats[0]?.byPriority || []
        },

        learningPatterns: learningPatterns[0] || {},
        
        effectiveness: {
          highPerformingRecommendations: effectiveness.length,
          averageEffectiveness: effectiveness.length > 0 ? 
            effectiveness.reduce((sum, r) => sum + r.effectivenessScore, 0) / effectiveness.length : 0,
          topRecommendations: effectiveness.slice(0, 5)
        },

        performanceImprovements: performanceImprovements.map(r => ({
          subject: r.targetSubject,
          improvement: r.progress.performanceImprovement.improvement,
          measuredAt: r.progress.performanceImprovement.measuredAt
        })),

        insights: this.generateInsights(stats[0], learningPatterns[0])
      };

      res.status(200).json({
        success: true,
        message: 'Recommendation analytics retrieved successfully',
        data: analytics
      });

    } catch (error) {
      console.error('❌ Recommendation analytics error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve recommendation analytics',
        error: error.message
      });
    }
  }

  /**
   * Get personalized learning insights
   * @route GET /api/recommendations/insights
   */
  static async getLearningInsights(req, res) {
    try {
      const userId = req.user._id;

      console.log(`💡 Generating learning insights for user: ${userId}`);

      // Get user performance data
      const performance = await StudentPerformance.findOne({ studentId: userId });
      const completedRecommendations = await Recommendation.find({
        userId,
        'userResponse.status': 'completed'
      }).limit(20);

      // Generate insights
      const insights = {
        learningStyle: this.determineLearningStyle(completedRecommendations),
        strongAreas: this.identifyStrongAreas(performance),
        improvementAreas: this.identifyImprovementAreas(performance),
        learningVelocity: this.calculateLearningVelocity(completedRecommendations),
        recommendations: {
          studySchedule: this.suggestStudySchedule(completedRecommendations),
          nextFocus: this.suggestNextFocus(performance),
          learningApproach: this.suggestLearningApproach(completedRecommendations)
        }
      };

      res.status(200).json({
        success: true,
        message: 'Learning insights generated successfully',
        data: insights
      });

    } catch (error) {
      console.error('❌ Learning insights error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate learning insights',
        error: error.message
      });
    }
  }

  // ==========================================
  // 🔧 HELPER METHODS
  // ==========================================

  static async getRecommendationStats(userId) {
    try {
      const stats = await Recommendation.aggregate([
        { $match: { userId: new require('mongoose').Types.ObjectId(userId) } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            pending: { $sum: { $cond: [{ $eq: ['$userResponse.status', 'pending'] }, 1, 0] } },
            accepted: { $sum: { $cond: [{ $eq: ['$userResponse.status', 'accepted'] }, 1, 0] } },
            inProgress: { $sum: { $cond: [{ $eq: ['$userResponse.status', 'partially_followed'] }, 1, 0] } },
            completed: { $sum: { $cond: [{ $eq: ['$userResponse.status', 'completed'] }, 1, 0] } },
            declined: { $sum: { $cond: [{ $eq: ['$userResponse.status', 'declined'] }, 1, 0] } },
            averageRating: { $avg: '$userResponse.rating' }
          }
        }
      ]);

      return stats[0] || {
        total: 0,
        pending: 0,
        accepted: 0,
        inProgress: 0,
        completed: 0,
        declined: 0,
        averageRating: 0
      };

    } catch (error) {
      console.error('❌ Get recommendation stats error:', error);
      return {};
    }
  }

  static generateInsights(stats, patterns) {
    const insights = [];

    if (stats) {
      if (stats.completed > 0 && stats.averageRating > 4) {
        insights.push({
          type: 'positive',
          message: 'You consistently rate recommendations highly! Your engagement is excellent.',
          action: 'Keep following recommendations for continued improvement.'
        });
      }

      if (stats.pending > stats.completed) {
        insights.push({
          type: 'suggestion',
          message: 'You have more pending recommendations than completed ones.',
          action: 'Try to start with one recommendation and focus on completing it.'
        });
      }

      if (stats.declined > stats.completed) {
        insights.push({
          type: 'concern',
          message: 'You decline more recommendations than you complete.',
          action: 'Consider adjusting your preferences for better-suited recommendations.'
        });
      }
    }

    if (patterns) {
      if (patterns.averageCompletion > 80) {
        insights.push({
          type: 'positive',
          message: 'Excellent completion rate! You follow through on recommendations well.',
          action: 'Continue this great habit for maximum learning benefit.'
        });
      }

      if (patterns.averageTimeToComplete) {
        const avgDays = patterns.averageTimeToComplete / (1000 * 60 * 60 * 24);
        if (avgDays < 7) {
          insights.push({
            type: 'positive',
            message: 'You complete recommendations quickly!',
            action: 'Consider taking on more challenging recommendations.'
          });
        }
      }
    }

    return insights;
  }

  static determineLearningStyle(completedRecommendations) {
    const typeRatings = {};

    completedRecommendations.forEach(rec => {
      const type = rec.recommendationType;
      if (rec.userResponse.rating) {
        if (!typeRatings[type]) typeRatings[type] = [];
        typeRatings[type].push(rec.userResponse.rating);
      }
    });

    let bestType = 'mixed';
    let bestAverage = 0;

    Object.entries(typeRatings).forEach(([type, ratings]) => {
      const average = ratings.reduce((a, b) => a + b, 0) / ratings.length;
      if (average > bestAverage) {
        bestAverage = average;
        bestType = type;
      }
    });

    const styleMap = {
      'practice_questions': 'Kinesthetic - You learn best by doing and practicing',
      'study_materials': 'Visual/Reading - You prefer studying materials and reading',
      'learning_path': 'Sequential - You like structured, step-by-step learning',
      'difficulty_adjustment': 'Adaptive - You respond well to personalized difficulty'
    };

    return {
      primary: bestType,
      description: styleMap[bestType] || 'Balanced learner with mixed preferences',
      confidence: Math.round(bestAverage * 20) // Convert 1-5 rating to percentage
    };
  }

  static identifyStrongAreas(performance) {
    if (!performance) return [];

    return performance.subjectWisePerformance
      .filter(subject => subject.averageScore > 75)
      .sort((a, b) => b.averageScore - a.averageScore)
      .slice(0, 3)
      .map(subject => ({
        subject: subject.subject,
        score: Math.round(subject.averageScore),
        trend: subject.trend || 'stable'
      }));
  }

  static identifyImprovementAreas(performance) {
    if (!performance) return [];

    return performance.subjectWisePerformance
      .filter(subject => subject.averageScore < 65)
      .sort((a, b) => a.averageScore - b.averageScore)
      .slice(0, 3)
      .map(subject => ({
        subject: subject.subject,
        score: Math.round(subject.averageScore),
        improvement: Math.round(75 - subject.averageScore) // Gap to target 75%
      }));
  }

  static calculateLearningVelocity(completedRecommendations) {
    if (completedRecommendations.length < 2) return { velocity: 'unknown', trend: 'stable' };

    const completionTimes = completedRecommendations
      .filter(rec => rec.userResponse.startedAt && rec.userResponse.completedAt)
      .map(rec => {
        const startTime = new Date(rec.userResponse.startedAt);
        const endTime = new Date(rec.userResponse.completedAt);
        return (endTime - startTime) / (1000 * 60 * 60 * 24); // days
      });

    if (completionTimes.length === 0) return { velocity: 'unknown', trend: 'stable' };

    const averageTime = completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length;
    
    let velocity = 'moderate';
    if (averageTime < 3) velocity = 'fast';
    else if (averageTime > 10) velocity = 'slow';

    // Calculate trend (comparing first half to second half)
    const midPoint = Math.floor(completionTimes.length / 2);
    const firstHalf = completionTimes.slice(0, midPoint);
    const secondHalf = completionTimes.slice(midPoint);

    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;

    let trend = 'stable';
    if (secondAvg < firstAvg * 0.8) trend = 'accelerating';
    else if (secondAvg > firstAvg * 1.2) trend = 'slowing';

    return {
      velocity,
      trend,
      averageDays: Math.round(averageTime * 10) / 10
    };
  }

  static suggestStudySchedule(completedRecommendations) {
    // Analyze when user is most successful with recommendations
    const timeAnalysis = {};
    
    completedRecommendations.forEach(rec => {
      if (rec.userResponse.rating >= 4) {
        const schedule = rec.schedule;
        if (schedule && schedule.timeOfDay) {
          schedule.timeOfDay.forEach(time => {
            timeAnalysis[time] = (timeAnalysis[time] || 0) + 1;
          });
        }
      }
    });

    const bestTime = Object.entries(timeAnalysis)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'evening';

    return {
      preferredTime: bestTime,
      suggestedDuration: '30-45 minutes',
      frequency: 'daily',
      restDays: ['sunday']
    };
  }

  static suggestNextFocus(performance) {
    if (!performance) return 'Continue with current learning goals';

    const weakestSubject = performance.subjectWisePerformance
      .sort((a, b) => a.averageScore - b.averageScore)[0];

    if (weakestSubject && weakestSubject.averageScore < 60) {
      return `Focus on ${weakestSubject.subject} - significant improvement needed`;
    }

    const decliningSubjects = performance.subjectWisePerformance
      .filter(s => s.trend === 'declining');

    if (decliningSubjects.length > 0) {
      return `Address declining performance in ${decliningSubjects[0].subject}`;
    }

    return 'Maintain current performance and explore advanced topics';
  }

  static suggestLearningApproach(completedRecommendations) {
    const highRatedTypes = completedRecommendations
      .filter(rec => rec.userResponse.rating >= 4)
      .map(rec => rec.recommendationType);

    const typeCount = {};
    highRatedTypes.forEach(type => {
      typeCount[type] = (typeCount[type] || 0) + 1;
    });

    const topType = Object.entries(typeCount)
      .sort(([,a], [,b]) => b - a)[0]?.[0];

    const approaches = {
      'practice_questions': 'Focus on hands-on practice and problem-solving',
      'study_materials': 'Emphasize reading and conceptual understanding',
      'learning_path': 'Follow structured, sequential learning plans',
      'difficulty_adjustment': 'Adapt difficulty based on performance'
    };

    return approaches[topType] || 'Balanced approach combining multiple learning methods';
  }
}

module.exports = SmartRecommendationController;
