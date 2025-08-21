// ==========================================
// 📊 GyanGuru Advanced Analytics Service
// ==========================================
// Extraordinary Phase 5: Frontend Analytics Integration
// Real-time analytics and insights for students & teachers
// Author: GitHub Copilot
// Date: August 21, 2025
// ==========================================

import api from './api';

// ==========================================
// 🎯 STUDENT ANALYTICS SERVICE
// ==========================================

export class StudentAnalyticsService {
  
  // Get comprehensive student dashboard
  static async getStudentDashboard(studentId, options = {}) {
    try {
      const { timeframe = '30d', subject = 'all' } = options;
      
      console.log(`📊 Getting student dashboard for: ${studentId}`);

      const response = await api.get(`/analytics/student/${studentId}/dashboard`, {
        params: { timeframe, subject }
      });

      const dashboard = {
        overview: response.data.data.overview,
        subjects: response.data.data.subjects,
        timeAnalytics: response.data.data.timeAnalytics,
        recommendations: response.data.data.recommendations,
        insights: response.data.data.insights,
        gradeDistribution: response.data.data.gradeDistribution
      };

      // Add calculated metrics
      dashboard.performanceLevel = this.calculatePerformanceLevel(dashboard.overview.averageScore);
      dashboard.improvementSuggestions = this.generateImprovementSuggestions(dashboard);
      dashboard.nextMilestones = this.calculateNextMilestones(dashboard.overview);

      return {
        success: true,
        data: dashboard,
        message: 'Student dashboard loaded successfully'
      };

    } catch (error) {
      console.error('❌ Failed to get student dashboard:', error);
      throw this.handleError(error);
    }
  }

  // Get performance comparison with peers
  static async getPerformanceComparison(studentId, options = {}) {
    try {
      const { classId, subject, timeframe = '30d' } = options;
      
      console.log(`📈 Getting performance comparison for: ${studentId}`);

      const response = await api.get(`/analytics/student/${studentId}/comparison`, {
        params: { classId, subject, timeframe }
      });

      const comparison = {
        student: response.data.data.student,
        class: response.data.data.class,
        ranking: response.data.data.ranking,
        insights: response.data.data.insights
      };

      // Add visualization data
      comparison.chartData = this.generateComparisonCharts(comparison);
      comparison.benchmarks = this.calculateBenchmarks(comparison);
      comparison.goals = this.suggestPerformanceGoals(comparison);

      return {
        success: true,
        data: comparison,
        message: 'Performance comparison generated successfully'
      };

    } catch (error) {
      console.error('❌ Failed to get performance comparison:', error);
      throw this.handleError(error);
    }
  }

  // Get detailed subject analytics
  static async getSubjectAnalytics(studentId, subject, options = {}) {
    try {
      const { timeframe = '90d', includeQuestionAnalysis = true } = options;
      
      console.log(`📚 Getting subject analytics for ${subject}: ${studentId}`);

      const response = await api.get(`/analytics/student/${studentId}/subject/${subject}`, {
        params: { timeframe, includeQuestionAnalysis }
      });

      const analytics = response.data.data;

      // Enhance with additional insights
      analytics.learningPath = this.generateLearningPath(analytics);
      analytics.strengths = this.identifyStrengths(analytics);
      analytics.weaknesses = this.identifyWeaknesses(analytics);
      analytics.recommendations = this.generateSubjectRecommendations(analytics);

      return {
        success: true,
        data: analytics,
        message: `${subject} analytics generated successfully`
      };

    } catch (error) {
      console.error(`❌ Failed to get ${subject} analytics:`, error);
      throw this.handleError(error);
    }
  }

  // Get real-time progress tracking
  static async getProgressTracking(studentId, assessmentId) {
    try {
      console.log(`⏱️ Getting real-time progress for assessment: ${assessmentId}`);

      const response = await api.get(`/analytics/student/${studentId}/progress/${assessmentId}`);

      const progress = {
        current: response.data.data.current,
        predictions: response.data.data.predictions,
        timeManagement: response.data.data.timeManagement,
        alerts: response.data.data.alerts
      };

      // Add real-time calculations
      progress.efficiency = this.calculateRealTimeEfficiency(progress.current);
      progress.recommendations = this.generateRealTimeRecommendations(progress);
      progress.riskAssessment = this.assessPerformanceRisk(progress);

      return {
        success: true,
        data: progress,
        message: 'Progress tracking updated successfully'
      };

    } catch (error) {
      console.error('❌ Failed to get progress tracking:', error);
      throw this.handleError(error);
    }
  }

  // Get learning analytics and insights
  static async getLearningAnalytics(studentId, options = {}) {
    try {
      const { timeframe = '60d', includeHeatmap = true } = options;
      
      console.log(`🧠 Getting learning analytics for: ${studentId}`);

      const response = await api.get(`/analytics/student/${studentId}/learning`, {
        params: { timeframe, includeHeatmap }
      });

      const learning = response.data.data;

      // Enhance with AI insights
      learning.learningStyle = this.identifyLearningStyle(learning);
      learning.optimizeSchedule = this.optimizeStudySchedule(learning);
      learning.skillGaps = this.identifySkillGaps(learning);
      learning.masteryLevel = this.calculateMasteryLevels(learning);

      return {
        success: true,
        data: learning,
        message: 'Learning analytics generated successfully'
      };

    } catch (error) {
      console.error('❌ Failed to get learning analytics:', error);
      throw this.handleError(error);
    }
  }

  // ==========================================
  // 🔧 STUDENT ANALYTICS HELPER METHODS
  // ==========================================

  static calculatePerformanceLevel(averageScore) {
    if (averageScore >= 90) return { level: 'exceptional', color: '#10B981', icon: '🏆' };
    if (averageScore >= 80) return { level: 'excellent', color: '#3B82F6', icon: '⭐' };
    if (averageScore >= 70) return { level: 'good', color: '#F59E0B', icon: '👍' };
    if (averageScore >= 60) return { level: 'average', color: '#EF4444', icon: '📈' };
    return { level: 'needs_improvement', color: '#DC2626', icon: '🎯' };
  }

  static generateImprovementSuggestions(dashboard) {
    const suggestions = [];
    
    // Analyze weak subjects
    const weakSubjects = dashboard.subjects
      .filter(subject => subject.averageScore < 70)
      .sort((a, b) => a.averageScore - b.averageScore);

    weakSubjects.forEach(subject => {
      suggestions.push({
        type: 'subject_improvement',
        priority: subject.averageScore < 50 ? 'high' : 'medium',
        title: `Improve ${subject.name} Performance`,
        description: `Focus on ${subject.name} - current average: ${subject.averageScore}%`,
        actionItems: [
          `Review basic concepts in ${subject.name}`,
          'Practice more questions daily',
          'Seek help from teachers'
        ],
        estimatedImpact: 'high',
        timeframe: '2-4 weeks'
      });
    });

    // Time management suggestions
    if (dashboard.timeAnalytics.timeEfficiency < 75) {
      suggestions.push({
        type: 'time_management',
        priority: 'medium',
        title: 'Improve Time Management',
        description: 'Work on managing your time more effectively',
        actionItems: [
          'Practice timed assessments',
          'Learn quick solving techniques',
          'Prioritize questions by difficulty'
        ],
        estimatedImpact: 'medium',
        timeframe: '1-2 weeks'
      });
    }

    return suggestions;
  }

  static calculateNextMilestones(overview) {
    const milestones = [];
    
    // Score-based milestones
    if (overview.averageScore < 80) {
      milestones.push({
        type: 'score',
        target: 80,
        current: overview.averageScore,
        description: 'Achieve 80% average score',
        progress: (overview.averageScore / 80) * 100,
        estimatedTime: '4-6 weeks'
      });
    }

    // Consistency milestones
    milestones.push({
      type: 'consistency',
      target: 90,
      current: overview.consistencyScore || 70,
      description: 'Maintain consistent performance',
      progress: ((overview.consistencyScore || 70) / 90) * 100,
      estimatedTime: '2-3 weeks'
    });

    return milestones;
  }

  static generateComparisonCharts(comparison) {
    return {
      scoreComparison: {
        student: comparison.student.averageScore,
        classAverage: comparison.class.averageScore,
        difference: comparison.student.averageScore - comparison.class.averageScore
      },
      
      rankingVisualization: {
        position: comparison.ranking.position,
        outOf: comparison.ranking.outOf,
        percentile: comparison.ranking.percentile
      },
      
      performanceDistribution: {
        excellent: Math.round(comparison.ranking.outOf * 0.1),
        good: Math.round(comparison.ranking.outOf * 0.3),
        average: Math.round(comparison.ranking.outOf * 0.4),
        belowAverage: Math.round(comparison.ranking.outOf * 0.2)
      }
    };
  }

  static calculateBenchmarks(comparison) {
    const studentScore = comparison.student.averageScore;
    
    return {
      topQuartile: studentScore >= (comparison.class.averageScore + 15),
      aboveAverage: studentScore > comparison.class.averageScore,
      meetingExpectations: studentScore >= 70,
      needsImprovement: studentScore < 60
    };
  }

  static suggestPerformanceGoals(comparison) {
    const goals = [];
    const studentScore = comparison.student.averageScore;
    const classAverage = comparison.class.averageScore;
    
    if (studentScore < classAverage) {
      goals.push({
        type: 'catch_up',
        target: Math.ceil(classAverage),
        description: 'Reach class average performance',
        priority: 'high'
      });
    }
    
    if (comparison.ranking.percentile < 75) {
      goals.push({
        type: 'ranking',
        target: 75,
        description: 'Reach top 25% of class',
        priority: 'medium'
      });
    }
    
    return goals;
  }

  static generateLearningPath(analytics) {
    return {
      currentLevel: analytics.masteryLevel || 'intermediate',
      nextMilestones: [
        'Master fundamental concepts',
        'Practice advanced problems',
        'Apply knowledge creatively'
      ],
      recommendedResources: [
        'Interactive video lessons',
        'Practice question banks',
        'Concept explanation guides'
      ],
      estimatedCompletion: '6-8 weeks'
    };
  }

  static identifyStrengths(analytics) {
    return analytics.topicPerformance
      ?.filter(topic => topic.score >= 80)
      .map(topic => ({
        topic: topic.name,
        score: topic.score,
        confidence: 'high'
      })) || [];
  }

  static identifyWeaknesses(analytics) {
    return analytics.topicPerformance
      ?.filter(topic => topic.score < 60)
      .map(topic => ({
        topic: topic.name,
        score: topic.score,
        priority: topic.score < 40 ? 'high' : 'medium',
        recommendedActions: [
          `Review ${topic.name} fundamentals`,
          'Practice specific exercises',
          'Seek additional help'
        ]
      })) || [];
  }

  static generateSubjectRecommendations(analytics) {
    const recommendations = [];
    
    // Based on performance patterns
    if (analytics.trendDirection === 'declining') {
      recommendations.push({
        type: 'urgent',
        title: 'Address Performance Decline',
        description: 'Recent performance shows declining trend',
        actions: ['Review recent topics', 'Identify knowledge gaps', 'Get immediate help']
      });
    }
    
    // Based on time patterns
    if (analytics.averageTimeSpent > analytics.recommendedTime * 1.5) {
      recommendations.push({
        type: 'efficiency',
        title: 'Improve Problem-Solving Speed',
        description: 'You\'re taking longer than recommended for this subject',
        actions: ['Practice timed exercises', 'Learn shortcuts', 'Focus on core concepts']
      });
    }
    
    return recommendations;
  }

  static calculateRealTimeEfficiency(current) {
    const timePerQuestion = current.timeSpent / current.questionsAnswered;
    const expectedTime = current.averageTimeExpected || 120; // 2 minutes default
    
    return {
      timeEfficiency: Math.min(100, (expectedTime / timePerQuestion) * 100),
      paceStatus: timePerQuestion > expectedTime * 1.5 ? 'slow' : 
                 timePerQuestion < expectedTime * 0.7 ? 'fast' : 'optimal',
      timeRemaining: current.totalTimeLimit - current.timeSpent,
      questionsRemaining: current.totalQuestions - current.questionsAnswered
    };
  }

  static generateRealTimeRecommendations(progress) {
    const recommendations = [];
    const { efficiency, timeRemaining, questionsRemaining } = progress;
    
    if (efficiency.paceStatus === 'slow' && questionsRemaining > 0) {
      recommendations.push({
        type: 'pace',
        urgency: 'high',
        message: 'Speed up! You need to increase your pace.',
        action: 'Skip difficult questions and return later'
      });
    }
    
    if (timeRemaining < (questionsRemaining * 60)) { // Less than 1 min per question
      recommendations.push({
        type: 'time_critical',
        urgency: 'critical',
        message: 'Time is running out!',
        action: 'Focus on easier questions first'
      });
    }
    
    return recommendations;
  }

  static assessPerformanceRisk(progress) {
    const { current, predictions } = progress;
    let riskLevel = 'low';
    const riskFactors = [];
    
    if (current.accuracy < 60) {
      riskLevel = 'high';
      riskFactors.push('Low accuracy rate');
    }
    
    if (predictions.estimatedScore < 50) {
      riskLevel = 'critical';
      riskFactors.push('Predicted failure');
    }
    
    if (progress.efficiency.paceStatus === 'slow') {
      riskLevel = riskLevel === 'low' ? 'medium' : 'high';
      riskFactors.push('Slow completion pace');
    }
    
    return {
      level: riskLevel,
      factors: riskFactors,
      recommendations: this.getRiskMitigationActions(riskLevel, riskFactors)
    };
  }

  static getRiskMitigationActions(riskLevel, factors) {
    const actions = [];
    
    if (factors.includes('Low accuracy rate')) {
      actions.push('Take more time to read questions carefully');
      actions.push('Review your answers before moving on');
    }
    
    if (factors.includes('Slow completion pace')) {
      actions.push('Skip difficult questions initially');
      actions.push('Use elimination method for MCQs');
    }
    
    if (factors.includes('Predicted failure')) {
      actions.push('Focus on questions you\'re confident about');
      actions.push('Don\'t leave questions unanswered');
    }
    
    return actions;
  }

  static identifyLearningStyle(learning) {
    // Analyze patterns to identify learning style
    const patterns = learning.studyPatterns || {};
    
    if (patterns.visualContent > patterns.textContent) {
      return 'visual';
    } else if (patterns.practiceTime > patterns.theoryTime) {
      return 'kinesthetic';
    } else if (patterns.groupStudy > patterns.soloStudy) {
      return 'social';
    }
    
    return 'reading_writing';
  }

  static optimizeStudySchedule(learning) {
    const bestTimes = learning.performanceByTime || {};
    const peakHours = Object.entries(bestTimes)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([hour]) => hour);
    
    return {
      peakHours,
      recommendedSessionLength: learning.averageSessionLength || 45,
      breakFrequency: 'Every 25 minutes (Pomodoro technique)',
      weeklyHours: learning.optimalWeeklyHours || 10
    };
  }

  static identifySkillGaps(learning) {
    return learning.skillAssessment?.gaps || [
      { skill: 'Problem solving', level: 'intermediate', gap: 'Advanced techniques' },
      { skill: 'Time management', level: 'beginner', gap: 'Strategic planning' }
    ];
  }

  static calculateMasteryLevels(learning) {
    return learning.topics?.map(topic => ({
      topic: topic.name,
      currentLevel: topic.masteryLevel || 0,
      targetLevel: 100,
      progress: topic.masteryLevel || 0,
      estimatedTime: this.estimateTimeToMastery(topic.masteryLevel || 0)
    })) || [];
  }

  static estimateTimeToMastery(currentLevel) {
    const remaining = 100 - currentLevel;
    const weeksNeeded = Math.ceil(remaining / 10); // 10% per week assumption
    return `${weeksNeeded} weeks`;
  }

  // Error handling
  static handleError(error) {
    if (error.response) {
      return {
        success: false,
        message: error.response.data.message || 'Analytics service error',
        statusCode: error.response.status
      };
    }
    
    return {
      success: false,
      message: 'Network error occurred',
      statusCode: 500
    };
  }
}

// ==========================================
// 👨‍🏫 TEACHER ANALYTICS SERVICE
// ==========================================

export class TeacherAnalyticsService {
  
  // Get comprehensive teacher dashboard
  static async getTeacherDashboard(teacherId, options = {}) {
    try {
      const { timeframe = '30d' } = options;
      
      console.log(`👨‍🏫 Getting teacher dashboard for: ${teacherId}`);

      const response = await api.get(`/analytics/teacher/${teacherId}/dashboard`, {
        params: { timeframe }
      });

      const dashboard = response.data.data;

      // Enhance with additional insights
      dashboard.performanceInsights = this.generatePerformanceInsights(dashboard);
      dashboard.teachingEffectiveness = this.calculateTeachingEffectiveness(dashboard);
      dashboard.studentEngagement = this.analyzeStudentEngagement(dashboard);
      dashboard.improvementAreas = this.identifyImprovementAreas(dashboard);

      return {
        success: true,
        data: dashboard,
        message: 'Teacher dashboard loaded successfully'
      };

    } catch (error) {
      console.error('❌ Failed to get teacher dashboard:', error);
      throw this.handleError(error);
    }
  }

  // Get class analytics with detailed insights
  static async getClassAnalytics(teacherId, classId, options = {}) {
    try {
      const { subject, assessmentId } = options;
      
      console.log(`📚 Getting class analytics for: ${classId}`);

      const response = await api.get(`/analytics/teacher/${teacherId}/class/${classId}`, {
        params: { subject, assessmentId }
      });

      const analytics = response.data.data;

      // Enhance with class-specific insights
      analytics.classHealth = this.assessClassHealth(analytics);
      analytics.studentProgress = this.analyzeStudentProgress(analytics);
      analytics.engagementMetrics = this.calculateEngagementMetrics(analytics);
      analytics.interventionSuggestions = this.suggestInterventions(analytics);

      return {
        success: true,
        data: analytics,
        message: 'Class analytics generated successfully'
      };

    } catch (error) {
      console.error('❌ Failed to get class analytics:', error);
      throw this.handleError(error);
    }
  }

  // Get assessment analytics with detailed breakdown
  static async getAssessmentAnalytics(assessmentId) {
    try {
      console.log(`📝 Getting assessment analytics for: ${assessmentId}`);

      const response = await api.get(`/analytics/assessment/${assessmentId}/detailed`);

      const analytics = response.data.data;

      // Enhance with question-level insights
      analytics.questionInsights = this.analyzeQuestionPerformance(analytics);
      analytics.difficultyAnalysis = this.analyzeDifficulty(analytics);
      analytics.timingAnalysis = this.analyzeTimingPatterns(analytics);
      analytics.improvementSuggestions = this.suggestAssessmentImprovements(analytics);

      return {
        success: true,
        data: analytics,
        message: 'Assessment analytics generated successfully'
      };

    } catch (error) {
      console.error('❌ Failed to get assessment analytics:', error);
      throw this.handleError(error);
    }
  }

  // Get grading analytics and insights
  static async getGradingAnalytics(assessmentId) {
    try {
      console.log(`✏️ Getting grading analytics for: ${assessmentId}`);

      const response = await api.get(`/analytics/assessment/${assessmentId}/grading`);

      const analytics = response.data.data;

      // Enhance with grading insights
      analytics.gradingEfficiency = this.calculateGradingEfficiency(analytics);
      analytics.consistencyAnalysis = this.analyzeGradingConsistency(analytics);
      analytics.feedbackQuality = this.assessFeedbackQuality(analytics);
      analytics.optimizationSuggestions = this.suggestGradingOptimizations(analytics);

      return {
        success: true,
        data: analytics,
        message: 'Grading analytics generated successfully'
      };

    } catch (error) {
      console.error('❌ Failed to get grading analytics:', error);
      throw this.handleError(error);
    }
  }

  // ==========================================
  // 🔧 TEACHER ANALYTICS HELPER METHODS
  // ==========================================

  static generatePerformanceInsights(dashboard) {
    const insights = [];
    
    // Overall performance analysis
    if (dashboard.overview.averageClassScore > 80) {
      insights.push({
        type: 'positive',
        title: 'Excellent Class Performance',
        description: 'Your students are performing above average',
        impact: 'high'
      });
    }
    
    // Engagement analysis
    if (dashboard.overview.assessmentCompletionRate < 70) {
      insights.push({
        type: 'concern',
        title: 'Low Completion Rate',
        description: 'Students are not completing assessments consistently',
        impact: 'medium',
        suggestions: ['Send reminders', 'Reduce assessment length', 'Improve instructions']
      });
    }
    
    return insights;
  }

  static calculateTeachingEffectiveness(dashboard) {
    const effectiveness = {
      studentImprovement: 0,
      engagementRate: 0,
      contentClarity: 0,
      overallScore: 0
    };
    
    // Calculate based on student progress
    effectiveness.studentImprovement = dashboard.engagement?.progressTrend || 75;
    effectiveness.engagementRate = dashboard.overview.assessmentCompletionRate || 70;
    effectiveness.contentClarity = dashboard.overview.averageClassScore || 75;
    
    effectiveness.overallScore = Math.round(
      (effectiveness.studentImprovement + effectiveness.engagementRate + effectiveness.contentClarity) / 3
    );
    
    return effectiveness;
  }

  static analyzeStudentEngagement(dashboard) {
    return {
      participationRate: dashboard.overview.assessmentCompletionRate || 0,
      averageTimeSpent: dashboard.engagement?.averageTimeSpent || 0,
      questionInteraction: dashboard.engagement?.questionInteraction || 0,
      helpSeekingBehavior: dashboard.engagement?.helpRequests || 0,
      
      trends: {
        increasing: dashboard.engagement?.trendDirection === 'increasing',
        stable: dashboard.engagement?.trendDirection === 'stable',
        decreasing: dashboard.engagement?.trendDirection === 'decreasing'
      }
    };
  }

  static identifyImprovementAreas(dashboard) {
    const areas = [];
    
    // Based on subject performance
    dashboard.subjects?.forEach(subject => {
      if (subject.averageScore < 70) {
        areas.push({
          area: `${subject.name} Teaching Methods`,
          priority: subject.averageScore < 50 ? 'high' : 'medium',
          currentScore: subject.averageScore,
          targetScore: 75,
          suggestions: [
            'Review teaching materials',
            'Add more practice questions',
            'Provide additional examples'
          ]
        });
      }
    });
    
    // Based on engagement metrics
    if (dashboard.overview.assessmentCompletionRate < 80) {
      areas.push({
        area: 'Student Engagement',
        priority: 'high',
        suggestions: [
          'Make assessments more interactive',
          'Provide clearer instructions',
          'Add gamification elements'
        ]
      });
    }
    
    return areas;
  }

  static assessClassHealth(analytics) {
    const health = {
      academicPerformance: analytics.overview?.averageScore || 0,
      participationRate: analytics.overview?.participationRate || 0,
      progressTrend: analytics.trends?.direction || 'stable',
      riskStudents: analytics.students?.filter(s => s.averageScore < 50).length || 0
    };
    
    health.overallHealth = Math.round(
      (health.academicPerformance + health.participationRate) / 2
    );
    
    health.status = health.overallHealth > 80 ? 'excellent' :
                   health.overallHealth > 60 ? 'good' : 'needs_attention';
    
    return health;
  }

  static analyzeStudentProgress(analytics) {
    const students = analytics.students || [];
    
    return {
      improving: students.filter(s => s.trend === 'improving').length,
      stable: students.filter(s => s.trend === 'stable').length,
      declining: students.filter(s => s.trend === 'declining').length,
      
      topPerformers: students
        .sort((a, b) => b.averageScore - a.averageScore)
        .slice(0, 5),
        
      strugglingStudents: students
        .filter(s => s.averageScore < 60)
        .sort((a, b) => a.averageScore - b.averageScore),
        
      interventionRequired: students.filter(s => 
        s.averageScore < 50 || s.trend === 'declining'
      )
    };
  }

  static calculateEngagementMetrics(analytics) {
    return {
      averageTimeSpent: analytics.overview?.averageTimeSpent || 0,
      questionInteraction: analytics.engagement?.interactionRate || 0,
      helpRequests: analytics.engagement?.helpRequests || 0,
      discussionParticipation: analytics.engagement?.discussionRate || 0,
      
      engagementScore: Math.round(
        ((analytics.overview?.participationRate || 0) + 
         (analytics.engagement?.interactionRate || 0) + 
         (analytics.engagement?.discussionRate || 0)) / 3
      )
    };
  }

  static suggestInterventions(analytics) {
    const interventions = [];
    
    // For low-performing students
    const strugglingStudents = analytics.students?.filter(s => s.averageScore < 60) || [];
    if (strugglingStudents.length > 0) {
      interventions.push({
        type: 'academic_support',
        priority: 'high',
        title: 'Support Struggling Students',
        description: `${strugglingStudents.length} students need additional support`,
        actions: [
          'Schedule one-on-one sessions',
          'Provide additional practice materials',
          'Create peer study groups'
        ],
        studentsAffected: strugglingStudents.length
      });
    }
    
    // For low engagement
    if ((analytics.engagement?.participationRate || 0) < 70) {
      interventions.push({
        type: 'engagement',
        priority: 'medium',
        title: 'Improve Class Engagement',
        description: 'Low participation rates detected',
        actions: [
          'Add interactive elements to lessons',
          'Use gamification techniques',
          'Create collaborative activities'
        ]
      });
    }
    
    return interventions;
  }

  static analyzeQuestionPerformance(analytics) {
    const questions = analytics.questions || [];
    
    return {
      mostDifficult: questions
        .sort((a, b) => a.correctPercentage - b.correctPercentage)
        .slice(0, 3),
        
      easiest: questions
        .sort((a, b) => b.correctPercentage - a.correctPercentage)
        .slice(0, 3),
        
      timeConsuming: questions
        .sort((a, b) => b.averageTime - a.averageTime)
        .slice(0, 3),
        
      needsReview: questions.filter(q => 
        q.correctPercentage < 50 || q.averageTime > q.expectedTime * 2
      )
    };
  }

  static analyzeDifficulty(analytics) {
    const questions = analytics.questions || [];
    
    const difficultyLevels = {
      easy: questions.filter(q => q.difficulty === 'easy'),
      medium: questions.filter(q => q.difficulty === 'medium'),
      hard: questions.filter(q => q.difficulty === 'hard')
    };
    
    return {
      distribution: {
        easy: difficultyLevels.easy.length,
        medium: difficultyLevels.medium.length,
        hard: difficultyLevels.hard.length
      },
      
      performanceByDifficulty: {
        easy: this.calculateAveragePerformance(difficultyLevels.easy),
        medium: this.calculateAveragePerformance(difficultyLevels.medium),
        hard: this.calculateAveragePerformance(difficultyLevels.hard)
      },
      
      recommendations: this.getDifficultyRecommendations(difficultyLevels)
    };
  }

  static calculateAveragePerformance(questions) {
    if (questions.length === 0) return 0;
    
    const totalCorrect = questions.reduce((sum, q) => sum + (q.correctPercentage || 0), 0);
    return Math.round(totalCorrect / questions.length);
  }

  static getDifficultyRecommendations(difficultyLevels) {
    const recommendations = [];
    
    if (difficultyLevels.easy.length < 3) {
      recommendations.push('Add more easy questions to build confidence');
    }
    
    if (difficultyLevels.hard.length > difficultyLevels.easy.length) {
      recommendations.push('Balance difficulty levels for better learning progression');
    }
    
    return recommendations;
  }

  static analyzeTimingPatterns(analytics) {
    return {
      averageCompletionTime: analytics.timing?.averageCompletion || 0,
      fastestCompletion: analytics.timing?.fastest || 0,
      slowestCompletion: analytics.timing?.slowest || 0,
      timeDistribution: analytics.timing?.distribution || {},
      
      recommendations: this.getTimingRecommendations(analytics.timing || {})
    };
  }

  static getTimingRecommendations(timing) {
    const recommendations = [];
    
    if (timing.averageCompletion > timing.allocated * 0.9) {
      recommendations.push('Consider increasing time allocation');
    }
    
    if (timing.fastest < timing.allocated * 0.3) {
      recommendations.push('Some students may be rushing - review instructions');
    }
    
    return recommendations;
  }

  static suggestAssessmentImprovements(analytics) {
    const suggestions = [];
    
    // Based on performance patterns
    const lowPerformanceQuestions = analytics.questions?.filter(q => q.correctPercentage < 50) || [];
    if (lowPerformanceQuestions.length > 0) {
      suggestions.push({
        type: 'content',
        priority: 'high',
        title: 'Review Low-Performing Questions',
        description: `${lowPerformanceQuestions.length} questions have low success rates`,
        actions: [
          'Clarify question wording',
          'Review answer choices',
          'Add explanatory content'
        ]
      });
    }
    
    // Based on timing issues
    if (analytics.timing?.averageCompletion > analytics.timing?.allocated) {
      suggestions.push({
        type: 'timing',
        priority: 'medium',
        title: 'Adjust Time Allocation',
        description: 'Students need more time to complete the assessment',
        actions: [
          'Increase time limit',
          'Reduce number of questions',
          'Simplify complex questions'
        ]
      });
    }
    
    return suggestions;
  }

  static calculateGradingEfficiency(analytics) {
    return {
      averageGradingTime: analytics.grading?.averageTime || 0,
      totalTimeSpent: analytics.grading?.totalTime || 0,
      questionsPerHour: analytics.grading?.questionsPerHour || 0,
      
      efficiency: this.calculateEfficiencyScore(analytics.grading || {}),
      improvements: this.suggestGradingImprovements(analytics.grading || {})
    };
  }

  static calculateEfficiencyScore(grading) {
    const baselineTime = 5; // 5 minutes per submission baseline
    const actualTime = grading.averageTime || baselineTime;
    
    return Math.max(0, Math.min(100, (baselineTime / actualTime) * 100));
  }

  static suggestGradingImprovements(grading) {
    const improvements = [];
    
    if ((grading.averageTime || 0) > 10) {
      improvements.push('Use rubrics for faster evaluation');
      improvements.push('Create comment templates');
    }
    
    if ((grading.questionsPerHour || 0) < 6) {
      improvements.push('Focus on key learning objectives');
      improvements.push('Use AI-assisted grading for objective questions');
    }
    
    return improvements;
  }

  static analyzeGradingConsistency(analytics) {
    return {
      consistencyScore: analytics.consistency?.score || 75,
      variationLevel: analytics.consistency?.variation || 'medium',
      
      recommendations: this.getConsistencyRecommendations(analytics.consistency || {})
    };
  }

  static getConsistencyRecommendations(consistency) {
    const recommendations = [];
    
    if ((consistency.score || 75) < 80) {
      recommendations.push('Use detailed rubrics for consistent grading');
      recommendations.push('Review grading criteria regularly');
    }
    
    return recommendations;
  }

  static assessFeedbackQuality(analytics) {
    return {
      averageFeedbackLength: analytics.feedback?.averageLength || 0,
      feedbackRate: analytics.feedback?.rate || 0,
      qualityScore: analytics.feedback?.qualityScore || 75,
      
      suggestions: this.getFeedbackSuggestions(analytics.feedback || {})
    };
  }

  static getFeedbackSuggestions(feedback) {
    const suggestions = [];
    
    if ((feedback.rate || 0) < 70) {
      suggestions.push('Provide feedback for more submissions');
      suggestions.push('Use quick feedback templates');
    }
    
    if ((feedback.averageLength || 0) < 50) {
      suggestions.push('Provide more detailed feedback');
      suggestions.push('Include specific improvement suggestions');
    }
    
    return suggestions;
  }

  static suggestGradingOptimizations(analytics) {
    const optimizations = [];
    
    // Time-based optimizations
    if ((analytics.grading?.averageTime || 0) > 8) {
      optimizations.push({
        type: 'time_saving',
        title: 'Reduce Grading Time',
        suggestions: [
          'Use auto-grading for objective questions',
          'Create grading rubrics',
          'Set up comment banks'
        ]
      });
    }
    
    // Consistency optimizations
    if ((analytics.consistency?.score || 75) < 85) {
      optimizations.push({
        type: 'consistency',
        title: 'Improve Grading Consistency',
        suggestions: [
          'Use standardized rubrics',
          'Grade same question across all submissions',
          'Take breaks between grading sessions'
        ]
      });
    }
    
    return optimizations;
  }

  // Error handling
  static handleError(error) {
    if (error.response) {
      return {
        success: false,
        message: error.response.data.message || 'Teacher analytics service error',
        statusCode: error.response.status
      };
    }
    
    return {
      success: false,
      message: 'Network error occurred',
      statusCode: 500
    };
  }
}

// ==========================================
// 🌐 SYSTEM ANALYTICS SERVICE
// ==========================================

export class SystemAnalyticsService {
  
  // Get system overview analytics
  static async getSystemOverview(options = {}) {
    try {
      const { timeframe = '30d' } = options;
      
      console.log(`🌐 Getting system overview analytics`);

      const response = await api.get('/analytics/system/overview', {
        params: { timeframe }
      });

      const overview = response.data.data;

      // Enhance with additional insights
      overview.healthScore = this.calculateSystemHealth(overview);
      overview.trends = this.analyzeSystemTrends(overview);
      overview.alerts = this.generateSystemAlerts(overview);
      overview.recommendations = this.generateSystemRecommendations(overview);

      return {
        success: true,
        data: overview,
        message: 'System overview generated successfully'
      };

    } catch (error) {
      console.error('❌ Failed to get system overview:', error);
      throw this.handleError(error);
    }
  }

  static calculateSystemHealth(overview) {
    const metrics = {
      userGrowth: overview.users?.growthRate?.monthly || 0,
      engagement: overview.engagement?.dailyActiveUsers || 0,
      performance: overview.assessments?.averageScore || 0,
      stability: 95 // Assuming 95% uptime
    };
    
    const healthScore = Math.round(
      (metrics.userGrowth * 0.2 + 
       metrics.engagement * 0.3 + 
       metrics.performance * 0.3 + 
       metrics.stability * 0.2)
    );
    
    return {
      score: healthScore,
      status: healthScore > 80 ? 'excellent' : 
              healthScore > 60 ? 'good' : 'needs_attention',
      metrics
    };
  }

  static analyzeSystemTrends(overview) {
    return {
      userGrowth: overview.users?.growthTrend || 'stable',
      assessmentUsage: overview.assessments?.usageTrend || 'stable',
      performanceTrend: overview.submissions?.performanceTrend || 'stable',
      engagementTrend: overview.engagement?.trend || 'stable'
    };
  }

  static generateSystemAlerts(overview) {
    const alerts = [];
    
    if ((overview.users?.activeUsers || 0) < (overview.users?.totalUsers || 1) * 0.3) {
      alerts.push({
        type: 'engagement',
        severity: 'medium',
        title: 'Low User Engagement',
        description: 'Active user ratio is below 30%'
      });
    }
    
    if ((overview.assessments?.averageScore || 0) < 60) {
      alerts.push({
        type: 'performance',
        severity: 'high',
        title: 'Low System Performance',
        description: 'Overall assessment scores are concerning'
      });
    }
    
    return alerts;
  }

  static generateSystemRecommendations(overview) {
    const recommendations = [];
    
    // User engagement recommendations
    if ((overview.engagement?.retentionRate || 0) < 70) {
      recommendations.push({
        category: 'engagement',
        priority: 'high',
        title: 'Improve User Retention',
        actions: [
          'Implement user onboarding program',
          'Add gamification elements',
          'Improve user experience'
        ]
      });
    }
    
    // Performance recommendations
    if ((overview.assessments?.averageScore || 0) < 70) {
      recommendations.push({
        category: 'content',
        priority: 'medium',
        title: 'Enhance Content Quality',
        actions: [
          'Review assessment difficulty levels',
          'Improve question quality',
          'Provide better learning resources'
        ]
      });
    }
    
    return recommendations;
  }

  // Error handling
  static handleError(error) {
    if (error.response) {
      return {
        success: false,
        message: error.response.data.message || 'System analytics service error',
        statusCode: error.response.status
      };
    }
    
    return {
      success: false,
      message: 'Network error occurred',
      statusCode: 500
    };
  }
}

export default {
  StudentAnalyticsService,
  TeacherAnalyticsService,
  SystemAnalyticsService
};
