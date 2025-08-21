const StudentPerformance = require('../models/StudentPerformance');
const Assessment = require('../models/Assessment');
const StudentResponse = require('../models/StudentResponse');

// 📊 GyanGuru Dashboard Analytics Service
// Features: Performance calculations, Trend analysis, Predictions

class DashboardAnalyticsService {
  
  // ==========================================
  // 📈 PERFORMANCE CALCULATION METHODS
  // ==========================================

  /**
   * Calculate improvement time based on current performance
   * @param {Object} topic - Topic performance data
   * @returns {String} Estimated improvement time
   */
  static calculateImprovementTime(topic) {
    const successRate = topic.successRate || 0;
    const attempts = topic.attemptsCount || 1;
    
    if (successRate < 30) {
      return '3-4 weeks'; // Critical areas need more time
    } else if (successRate < 50) {
      return '2-3 weeks'; // High priority areas
    } else if (successRate < 70) {
      return '1-2 weeks'; // Medium priority areas
    } else {
      return '1 week'; // Minor improvements needed
    }
  }

  /**
   * Calculate improvement potential based on weak areas
   * @param {Array} weakAreas - Array of weak areas
   * @param {Object} performance - Student performance data
   * @returns {Object} Improvement potential analysis
   */
  static calculateImprovementPotential(weakAreas, performance) {
    const totalWeakAreas = weakAreas.length;
    const criticalAreas = weakAreas.filter(area => area.priority === 'critical').length;
    const highPriorityAreas = weakAreas.filter(area => area.priority === 'high').length;

    // Calculate potential score improvement
    const averageWeakScore = weakAreas.reduce((sum, area) => sum + area.successRate, 0) / totalWeakAreas;
    const currentOverallScore = performance.overallMetrics.overallPercentage;
    
    // Estimate potential improvement (assuming 50% improvement in weak areas)
    const potentialImprovement = (100 - averageWeakScore) * 0.3; // 30% of the gap
    const projectedScore = Math.min(100, currentOverallScore + potentialImprovement);

    return {
      currentScore: Math.round(currentOverallScore),
      projectedScore: Math.round(projectedScore),
      potentialGain: Math.round(potentialImprovement),
      improvementPercentage: Math.round((potentialImprovement / currentOverallScore) * 100),
      
      timeToAchieve: this.calculateTimeToAchieve(potentialImprovement),
      confidenceLevel: this.calculateConfidenceLevel(weakAreas, performance),
      
      breakdown: {
        criticalImpact: Math.round(criticalAreas * 3), // Critical areas have 3x impact
        highPriorityImpact: Math.round(highPriorityAreas * 2), // High priority areas have 2x impact
        mediumPriorityImpact: Math.round((totalWeakAreas - criticalAreas - highPriorityAreas) * 1)
      }
    };
  }

  /**
   * Calculate time to achieve improvement goals
   * @param {Number} improvementNeeded - Points of improvement needed
   * @returns {String} Estimated time
   */
  static calculateTimeToAchieve(improvementNeeded) {
    if (improvementNeeded <= 5) return '2-3 weeks';
    if (improvementNeeded <= 10) return '1-2 months';
    if (improvementNeeded <= 20) return '2-3 months';
    return '3-6 months';
  }

  /**
   * Calculate confidence level for improvement predictions
   * @param {Array} weakAreas - Weak areas data
   * @param {Object} performance - Performance data
   * @returns {String} Confidence level
   */
  static calculateConfidenceLevel(weakAreas, performance) {
    const studyRegularity = performance.overallMetrics.studyRegularity || 50;
    const recentImprovement = performance.overallMetrics.monthlyImprovement || 0;
    const weakAreaSeverity = weakAreas.reduce((sum, area) => sum + (100 - area.successRate), 0) / weakAreas.length;

    const confidenceScore = (studyRegularity * 0.4) + (Math.max(0, recentImprovement) * 10 * 0.3) + ((100 - weakAreaSeverity) * 0.3);

    if (confidenceScore >= 80) return 'high';
    if (confidenceScore >= 60) return 'medium';
    return 'low';
  }

  // ==========================================
  // 📊 CONSISTENCY CALCULATIONS
  // ==========================================

  /**
   * Calculate consistency score from performance data
   * @param {Array} scores - Array of performance scores
   * @returns {Number} Consistency score (0-100)
   */
  static calculateConsistency(scores) {
    if (scores.length < 2) return 100;

    const mean = scores.reduce((sum, score) => sum + score, 0) / scores.length;
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
    const standardDeviation = Math.sqrt(variance);

    // Convert standard deviation to consistency score (lower std dev = higher consistency)
    const maxStdDev = 30; // Assume max reasonable std dev is 30 points
    const consistencyScore = Math.max(0, 100 - (standardDeviation / maxStdDev) * 100);

    return Math.round(consistencyScore);
  }

  // ==========================================
  // 🎯 PREDICTION METHODS
  // ==========================================

  /**
   * Generate progress predictions for next month
   * @param {Array} monthlyDetails - Historical monthly data
   * @param {Object} performance - Current performance data
   * @returns {Object} Predictions for next month
   */
  static generateProgressPredictions(monthlyDetails, performance) {
    if (monthlyDetails.length < 2) {
      return {
        predictedScore: performance.overallMetrics.overallPercentage,
        confidence: 'low',
        trend: 'stable',
        factors: ['Insufficient historical data for prediction']
      };
    }

    // Calculate trend from last 3 months
    const lastThreeMonths = monthlyDetails.slice(-3);
    const scores = lastThreeMonths.map(m => m.overall.averageScore).filter(s => s > 0);
    
    if (scores.length < 2) {
      return {
        predictedScore: performance.overallMetrics.overallPercentage,
        confidence: 'low',
        trend: 'stable',
        factors: ['Limited recent performance data']
      };
    }

    // Linear trend calculation
    const trend = this.calculateLinearTrend(scores);
    const lastScore = scores[scores.length - 1];
    const predictedScore = Math.max(0, Math.min(100, lastScore + trend));

    // Determine confidence based on consistency and trend strength
    const consistency = this.calculateConsistency(scores);
    const trendStrength = Math.abs(trend);
    
    let confidence = 'medium';
    if (consistency > 80 && trendStrength < 5) confidence = 'high';
    if (consistency < 50 || trendStrength > 15) confidence = 'low';

    // Identify key factors affecting prediction
    const factors = this.identifyPredictionFactors(performance, trend, consistency);

    return {
      predictedScore: Math.round(predictedScore),
      confidence,
      trend: trend > 2 ? 'improving' : trend < -2 ? 'declining' : 'stable',
      trendValue: Math.round(trend * 10) / 10,
      factors,
      recommendations: this.generatePredictionRecommendations(trend, confidence, performance)
    };
  }

  /**
   * Calculate linear trend from data points
   * @param {Array} scores - Array of scores
   * @returns {Number} Trend value
   */
  static calculateLinearTrend(scores) {
    const n = scores.length;
    const sumX = (n * (n + 1)) / 2; // Sum of 1, 2, 3, ..., n
    const sumY = scores.reduce((sum, score) => sum + score, 0);
    const sumXY = scores.reduce((sum, score, index) => sum + score * (index + 1), 0);
    const sumX2 = (n * (n + 1) * (2 * n + 1)) / 6; // Sum of 1², 2², 3², ..., n²

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    return slope || 0;
  }

  /**
   * Identify factors affecting prediction accuracy
   * @param {Object} performance - Performance data
   * @param {Number} trend - Calculated trend
   * @param {Number} consistency - Consistency score
   * @returns {Array} Array of factors
   */
  static identifyPredictionFactors(performance, trend, consistency) {
    const factors = [];

    // Study regularity factor
    const studyRegularity = performance.overallMetrics.studyRegularity || 50;
    if (studyRegularity > 80) {
      factors.push('High study regularity supports prediction accuracy');
    } else if (studyRegularity < 40) {
      factors.push('Irregular study pattern affects prediction reliability');
    }

    // Performance consistency factor
    if (consistency > 80) {
      factors.push('Consistent performance makes predictions more reliable');
    } else if (consistency < 50) {
      factors.push('Variable performance creates prediction uncertainty');
    }

    // Recent improvement factor
    const recentImprovement = performance.overallMetrics.monthlyImprovement || 0;
    if (recentImprovement > 5) {
      factors.push('Recent improvement trend supports continued growth');
    } else if (recentImprovement < -5) {
      factors.push('Recent decline may affect future performance');
    }

    // Assessment activity factor
    const assessmentCount = performance.overallMetrics.totalAssessmentsCompleted || 0;
    if (assessmentCount > 50) {
      factors.push('High assessment activity provides better prediction basis');
    } else if (assessmentCount < 10) {
      factors.push('Limited assessment data reduces prediction accuracy');
    }

    return factors.length > 0 ? factors : ['Standard prediction based on available data'];
  }

  /**
   * Generate recommendations based on predictions
   * @param {Number} trend - Performance trend
   * @param {String} confidence - Prediction confidence
   * @param {Object} performance - Performance data
   * @returns {Array} Array of recommendations
   */
  static generatePredictionRecommendations(trend, confidence, performance) {
    const recommendations = [];

    if (trend > 0) {
      recommendations.push({
        type: 'maintain',
        title: 'Continue Current Strategy',
        description: 'Your current approach is working well. Maintain consistency.',
        priority: 'medium'
      });
    } else if (trend < 0) {
      recommendations.push({
        type: 'improve',
        title: 'Address Declining Trend',
        description: 'Review study methods and identify areas needing attention.',
        priority: 'high'
      });
    }

    if (confidence === 'low') {
      recommendations.push({
        type: 'stabilize',
        title: 'Improve Consistency',
        description: 'Focus on regular study habits to make performance more predictable.',
        priority: 'high'
      });
    }

    // Study time recommendations
    const studyTime = performance.overallMetrics.totalStudyTime || 0;
    const hoursPerWeek = studyTime / (4 * 60); // Convert minutes to hours per week (assuming 4 weeks)
    
    if (hoursPerWeek < 10) {
      recommendations.push({
        type: 'increase',
        title: 'Increase Study Time',
        description: 'Consider increasing weekly study time for better results.',
        priority: 'medium'
      });
    }

    return recommendations;
  }

  // ==========================================
  // 🎯 IMPROVEMENT PLAN GENERATION
  // ==========================================

  /**
   * Generate comprehensive improvement plan
   * @param {Array} weakAreas - Student's weak areas
   * @param {Object} performance - Performance data
   * @returns {Object} Detailed improvement plan
   */
  static generateImprovementPlan(weakAreas, performance) {
    // Sort weak areas by priority
    const sortedWeakAreas = weakAreas.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, medium: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });

    // Create action items for top weak areas
    const actionItems = sortedWeakAreas.slice(0, 5).map((area, index) => ({
      id: `action_${index + 1}`,
      title: `Improve ${area.topic} in ${area.subject}`,
      description: `Focus on mastering ${area.topic} concepts through targeted practice`,
      priority: area.priority,
      estimatedTime: area.estimatedImprovementTime,
      targetScore: Math.min(100, area.successRate + 30), // Target 30% improvement
      currentScore: area.successRate,
      steps: this.generateActionSteps(area),
      resources: this.getTopicResources(area),
      deadline: this.calculateActionDeadline(area.priority)
    }));

    // Create milestones
    const milestones = this.generateMilestones(sortedWeakAreas);

    // Create timeline
    const timeline = this.createImprovementTimeline(actionItems);

    // Calculate overall plan metrics
    const planMetrics = this.calculatePlanMetrics(actionItems, performance);

    return {
      overview: {
        totalActions: actionItems.length,
        estimatedDuration: this.calculatePlanDuration(actionItems),
        expectedImprovement: planMetrics.expectedImprovement,
        successProbability: planMetrics.successProbability
      },
      
      actionItems,
      milestones,
      timeline,
      
      weeklySchedule: this.generateWeeklySchedule(actionItems),
      progressTracking: this.generateProgressTracking(actionItems),
      
      motivation: {
        currentGaps: weakAreas.length,
        targetsSet: actionItems.length,
        motivationalQuote: this.getMotivationalQuote(),
        rewards: this.suggestRewards(actionItems)
      }
    };
  }

  /**
   * Generate specific action steps for a weak area
   * @param {Object} area - Weak area data
   * @returns {Array} Array of action steps
   */
  static generateActionSteps(area) {
    const steps = [
      `Review fundamental concepts of ${area.topic}`,
      `Practice basic exercises and examples`,
      `Take targeted quizzes on ${area.topic}`,
      `Seek help from teacher or peers if needed`,
      `Complete advanced practice questions`,
      `Take a comprehensive test to measure improvement`
    ];

    // Customize steps based on success rate
    if (area.successRate < 30) {
      steps.unshift('Start with basic concept revision');
    } else if (area.successRate > 60) {
      steps.push('Focus on advanced applications');
    }

    return steps.map((step, index) => ({
      stepNumber: index + 1,
      description: step,
      estimatedTime: '30-45 minutes',
      completed: false
    }));
  }

  /**
   * Get suggested resources for a topic
   * @param {Object} area - Weak area data
   * @returns {Array} Array of resources
   */
  static getTopicResources(area) {
    return [
      {
        type: 'video',
        title: `${area.topic} Video Tutorial`,
        description: 'Comprehensive video explanation',
        provider: 'GyanGuru Learning',
        duration: '15-20 minutes'
      },
      {
        type: 'practice',
        title: `${area.topic} Practice Set`,
        description: 'Targeted practice questions',
        provider: 'GyanGuru Assessments',
        questions: '20-25 questions'
      },
      {
        type: 'notes',
        title: `${area.topic} Study Notes`,
        description: 'Concise concept summary',
        provider: 'GyanGuru Notes',
        pages: '3-5 pages'
      }
    ];
  }

  /**
   * Calculate action deadline based on priority
   * @param {String} priority - Priority level
   * @returns {Date} Deadline date
   */
  static calculateActionDeadline(priority) {
    const today = new Date();
    const days = priority === 'critical' ? 14 : priority === 'high' ? 21 : 28;
    const deadline = new Date(today.getTime() + days * 24 * 60 * 60 * 1000);
    return deadline;
  }

  /**
   * Generate improvement milestones
   * @param {Array} weakAreas - Sorted weak areas
   * @returns {Array} Array of milestones
   */
  static generateMilestones(weakAreas) {
    const milestones = [];
    
    // Week 1 milestone
    milestones.push({
      week: 1,
      title: 'Foundation Building',
      description: 'Complete basic concept review for critical areas',
      targets: [`Review ${weakAreas.slice(0, 2).map(a => a.topic).join(' and ')}`],
      successCriteria: 'Complete all review materials and basic exercises'
    });

    // Week 2 milestone
    milestones.push({
      week: 2,
      title: 'Practice Intensification',
      description: 'Active practice on identified weak areas',
      targets: ['Complete practice sets', 'Take first assessment'],
      successCriteria: 'Score at least 60% on practice assessments'
    });

    // Week 3 milestone
    milestones.push({
      week: 3,
      title: 'Progress Evaluation',
      description: 'Assess improvement and adjust strategy',
      targets: ['Retake assessments', 'Measure improvement'],
      successCriteria: 'Show 15% improvement in weak areas'
    });

    // Week 4 milestone
    milestones.push({
      week: 4,
      title: 'Consolidation',
      description: 'Consolidate learning and prepare for next phase',
      targets: ['Final practice tests', 'Plan next improvements'],
      successCriteria: 'Achieve target scores in improved areas'
    });

    return milestones;
  }

  /**
   * Create improvement timeline
   * @param {Array} actionItems - Action items
   * @returns {Object} Timeline structure
   */
  static createImprovementTimeline(actionItems) {
    const weeks = {
      week1: [],
      week2: [],
      week3: [],
      week4: []
    };

    actionItems.forEach((item, index) => {
      const weekKey = `week${(index % 4) + 1}`;
      weeks[weekKey].push({
        action: item.title,
        priority: item.priority,
        estimatedTime: item.estimatedTime
      });
    });

    return weeks;
  }

  /**
   * Calculate plan metrics
   * @param {Array} actionItems - Action items
   * @param {Object} performance - Performance data
   * @returns {Object} Plan metrics
   */
  static calculatePlanMetrics(actionItems, performance) {
    const currentScore = performance.overallMetrics.overallPercentage;
    const expectedImprovement = actionItems.reduce((sum, item) => {
      const gain = item.targetScore - item.currentScore;
      return sum + (gain * 0.1); // 10% weight per action item
    }, 0);

    const successProbability = this.calculateSuccessProbability(actionItems, performance);

    return {
      expectedImprovement: Math.round(expectedImprovement),
      successProbability: Math.round(successProbability)
    };
  }

  /**
   * Calculate success probability for improvement plan
   * @param {Array} actionItems - Action items
   * @param {Object} performance - Performance data
   * @returns {Number} Success probability percentage
   */
  static calculateSuccessProbability(actionItems, performance) {
    const studyRegularity = performance.overallMetrics.studyRegularity || 50;
    const recentImprovement = Math.max(0, performance.overallMetrics.monthlyImprovement || 0);
    const planComplexity = actionItems.length * 10; // Higher complexity reduces probability
    
    const baseProbability = 70; // Base 70% success rate
    const regularityBonus = (studyRegularity - 50) * 0.5; // Up to ±25% based on regularity
    const improvementBonus = Math.min(20, recentImprovement * 2); // Up to 20% bonus for recent improvement
    const complexityPenalty = Math.min(30, planComplexity); // Up to 30% penalty for complexity

    const probability = baseProbability + regularityBonus + improvementBonus - complexityPenalty;
    return Math.max(30, Math.min(95, probability)); // Keep between 30-95%
  }

  /**
   * Generate weekly schedule for improvement plan
   * @param {Array} actionItems - Action items
   * @returns {Object} Weekly schedule
   */
  static generateWeeklySchedule(actionItems) {
    const schedule = {
      monday: { focus: 'Review', actions: [] },
      tuesday: { focus: 'Practice', actions: [] },
      wednesday: { focus: 'Assessment', actions: [] },
      thursday: { focus: 'Review', actions: [] },
      friday: { focus: 'Practice', actions: [] },
      saturday: { focus: 'Comprehensive', actions: [] },
      sunday: { focus: 'Rest/Light Review', actions: [] }
    };

    // Distribute actions across the week
    actionItems.forEach((item, index) => {
      const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const dayKey = days[index % days.length];
      schedule[dayKey].actions.push({
        title: item.title,
        time: '30-45 minutes',
        priority: item.priority
      });
    });

    return schedule;
  }

  /**
   * Generate progress tracking structure
   * @param {Array} actionItems - Action items
   * @returns {Object} Progress tracking system
   */
  static generateProgressTracking(actionItems) {
    return {
      metrics: [
        'Weekly assessment scores',
        'Practice completion rate',
        'Time spent on weak areas',
        'Improvement in target topics'
      ],
      checkpoints: [
        { day: 7, type: 'weekly_review', description: 'Review week\'s progress' },
        { day: 14, type: 'mid_assessment', description: 'Mid-plan assessment' },
        { day: 21, type: 'adjustment', description: 'Adjust plan if needed' },
        { day: 28, type: 'final_evaluation', description: 'Final progress evaluation' }
      ],
      rewards: [
        { milestone: '1 week completion', reward: 'Small treat or activity' },
        { milestone: '50% improvement in any topic', reward: 'Favorite meal or outing' },
        { milestone: 'Complete plan', reward: 'Special recognition or gift' }
      ]
    };
  }

  /**
   * Calculate plan duration
   * @param {Array} actionItems - Action items
   * @returns {String} Duration estimate
   */
  static calculatePlanDuration(actionItems) {
    const totalActions = actionItems.length;
    const criticalActions = actionItems.filter(a => a.priority === 'critical').length;
    
    if (totalActions <= 3 && criticalActions === 0) return '2-3 weeks';
    if (totalActions <= 5 && criticalActions <= 1) return '3-4 weeks';
    if (totalActions <= 7) return '4-6 weeks';
    return '6-8 weeks';
  }

  /**
   * Get motivational quote
   * @returns {String} Motivational quote
   */
  static getMotivationalQuote() {
    const quotes = [
      "শিক্ষাই জাতির মেরুদণ্ড - Education is the backbone of a nation",
      "প্রতিদিনের ছোট উন্নতিই বড় সাফল্যের চাবিকাঠি - Small daily improvements lead to great success",
      "অধ্যবসায়ের মাধ্যমেই সফলতা আসে - Success comes through perseverance",
      "জ্ঞানার্জনে কোনো বয়স নেই - There's no age limit for learning"
    ];
    return quotes[Math.floor(Math.random() * quotes.length)];
  }

  /**
   * Suggest rewards for completed actions
   * @param {Array} actionItems - Action items
   * @returns {Array} Suggested rewards
   */
  static suggestRewards(actionItems) {
    return [
      { trigger: '1 action completed', reward: '15 minutes break time' },
      { trigger: '3 actions completed', reward: 'Watch favorite video' },
      { trigger: '5 actions completed', reward: 'Special snack or treat' },
      { trigger: 'All actions completed', reward: 'Day off from extra study' }
    ];
  }

  // ==========================================
  // 🎯 RESOURCE RECOMMENDATION METHODS
  // ==========================================

  /**
   * Get recommended resources for weak areas
   * @param {Array} weakAreas - Weak areas data
   * @returns {Object} Recommended resources
   */
  static async getRecommendedResources(weakAreas) {
    const resources = {
      videos: [],
      books: [],
      online: [],
      practice: []
    };

    // Group weak areas by subject
    const subjectGroups = {};
    weakAreas.forEach(area => {
      if (!subjectGroups[area.subject]) {
        subjectGroups[area.subject] = [];
      }
      subjectGroups[area.subject].push(area);
    });

    // Generate resources for each subject
    Object.keys(subjectGroups).forEach(subject => {
      const topics = subjectGroups[subject];
      
      // Video resources
      resources.videos.push({
        title: `${subject} Comprehensive Video Series`,
        topics: topics.map(t => t.topic),
        duration: '2-3 hours total',
        provider: 'GyanGuru Video Library',
        rating: 4.5,
        level: 'Beginner to Intermediate'
      });

      // Practice resources
      resources.practice.push({
        title: `${subject} Targeted Practice Set`,
        topics: topics.map(t => t.topic),
        questions: topics.length * 15,
        difficulty: 'Mixed',
        provider: 'GyanGuru Assessment Bank',
        timeRequired: `${topics.length * 30} minutes`
      });

      // Online resources
      resources.online.push({
        title: `${subject} Interactive Learning Module`,
        description: `Interactive lessons covering ${topics.map(t => t.topic).join(', ')}`,
        provider: 'GyanGuru Interactive',
        features: ['Step-by-step solutions', 'Progress tracking', 'Instant feedback'],
        accessLevel: 'Premium'
      });
    });

    // Add general study resources
    resources.books = [
      {
        title: 'Effective Study Techniques',
        description: 'Research-based study methods for better retention',
        author: 'Education Experts',
        chapters: ['Memory techniques', 'Time management', 'Test strategies'],
        available: 'GyanGuru Library'
      },
      {
        title: 'Overcoming Academic Challenges',
        description: 'Strategies for dealing with difficult subjects',
        author: 'Academic Success Team',
        chapters: ['Identifying weak areas', 'Targeted improvement', 'Confidence building'],
        available: 'Digital Library'
      }
    ];

    return resources;
  }

  // ==========================================
  // 📊 UTILITY METHODS
  // ==========================================

  /**
   * Get priority weight for sorting
   * @param {String} priority - Priority level
   * @returns {Number} Weight value
   */
  static getPriorityWeight(priority) {
    const weights = { critical: 1, high: 2, medium: 3, low: 4 };
    return weights[priority] || 5;
  }

  /**
   * Calculate estimated impact of suggestions
   * @param {Array} suggestions - Array of suggestions
   * @returns {Number} Estimated impact percentage
   */
  static calculateEstimatedImpact(suggestions) {
    const totalImpact = suggestions.reduce((sum, suggestion) => {
      const impact = suggestion.estimatedImpact || 10;
      const weight = this.getPriorityWeight(suggestion.priority);
      return sum + (impact / weight);
    }, 0);

    return Math.round(totalImpact);
  }

  /**
   * Calculate optimal study time for a subject
   * @param {Object} subjectPerf - Subject performance data
   * @returns {String} Optimal study time recommendation
   */
  static calculateOptimalStudyTime(subjectPerf) {
    const currentScore = subjectPerf.averageScore;
    const timeSpent = subjectPerf.totalTimeSpent || 0;
    const assessments = subjectPerf.completedAssessments || 1;
    
    const avgTimePerAssessment = timeSpent / assessments;
    
    if (currentScore > 80) {
      return `${Math.round(avgTimePerAssessment * 0.8)} minutes per session (maintenance)`;
    } else if (currentScore > 60) {
      return `${Math.round(avgTimePerAssessment * 1.2)} minutes per session (improvement)`;
    } else {
      return `${Math.round(avgTimePerAssessment * 1.5)} minutes per session (intensive)`;
    }
  }
}

module.exports = DashboardAnalyticsService;
