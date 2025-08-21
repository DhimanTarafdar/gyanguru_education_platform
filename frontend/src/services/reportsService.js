// ==========================================
// 📊 GyanGuru Reports Service
// ==========================================
// Extraordinary Phase 5: Frontend Reports Integration
// Comprehensive reporting system for students & teachers
// Author: GitHub Copilot
// Date: August 21, 2025
// ==========================================

import api from './api';

// ==========================================
// 📋 STUDENT REPORTS SERVICE
// ==========================================

export class StudentReportsService {
  
  // Generate comprehensive progress report
  static async generateProgressReport(studentId, options = {}) {
    try {
      const {
        timeframe = '90d',
        format = 'json',
        includeDetails = true,
        subjects = 'all'
      } = options;
      
      console.log(`📊 Generating progress report for student: ${studentId}`);

      const response = await api.get(`/reports/student/${studentId}/progress`, {
        params: { timeframe, format, includeDetails, subjects },
        responseType: format === 'json' ? 'json' : 'blob'
      });

      if (format === 'json') {
        const report = response.data.data;
        
        // Enhance with additional calculations
        report.insights = this.generateProgressInsights(report.analytics);
        report.visualizations = this.generateProgressVisualizations(report.analytics);
        report.actionPlan = this.generateActionPlan(report.analytics);

        return {
          success: true,
          data: report,
          message: 'Progress report generated successfully'
        };
      } else {
        // Handle file download
        const fileName = `Progress_Report_${Date.now()}.${format}`;
        this.downloadFile(response.data, fileName, format);
        
        return {
          success: true,
          message: `${format.toUpperCase()} report downloaded successfully`,
          fileName
        };
      }

    } catch (error) {
      console.error('❌ Failed to generate progress report:', error);
      throw this.handleError(error);
    }
  }

  // Generate detailed insights report
  static async generateInsightsReport(studentId, options = {}) {
    try {
      const {
        timeframe = '180d',
        format = 'json',
        includeRecommendations = true,
        includeLearningPath = true,
        compareWithPeers = false
      } = options;
      
      console.log(`🎓 Generating insights report for student: ${studentId}`);

      const response = await api.get(`/reports/student/${studentId}/insights`, {
        params: { 
          timeframe, 
          format, 
          includeRecommendations, 
          includeLearningPath, 
          compareWithPeers 
        },
        responseType: format === 'json' ? 'json' : 'blob'
      });

      if (format === 'json') {
        const report = response.data.data;
        
        // Enhance with AI-powered insights
        report.aiInsights = this.generateAIInsights(report.insights);
        report.learningRecommendations = this.generateLearningRecommendations(report);
        report.skillDevelopment = this.generateSkillDevelopmentPlan(report);

        return {
          success: true,
          data: report,
          message: 'Insights report generated successfully'
        };
      } else {
        const fileName = `Insights_Report_${Date.now()}.${format}`;
        this.downloadFile(response.data, fileName, format);
        
        return {
          success: true,
          message: `${format.toUpperCase()} insights report downloaded successfully`,
          fileName
        };
      }

    } catch (error) {
      console.error('❌ Failed to generate insights report:', error);
      throw this.handleError(error);
    }
  }

  // Generate subject-wise performance report
  static async generateSubjectReport(studentId, subject, options = {}) {
    try {
      const {
        timeframe = '120d',
        format = 'json',
        includeQuestionAnalysis = true
      } = options;
      
      console.log(`📚 Generating ${subject} report for student: ${studentId}`);

      const response = await api.get(`/reports/student/${studentId}/subject/${subject}`, {
        params: { timeframe, format, includeQuestionAnalysis },
        responseType: format === 'json' ? 'json' : 'blob'
      });

      if (format === 'json') {
        const report = response.data.data;
        
        // Enhance with subject-specific insights
        report.conceptAnalysis = this.analyzeConceptMastery(report);
        report.difficultyProgression = this.analyzeDifficultyProgression(report);
        report.topicRecommendations = this.generateTopicRecommendations(report);

        return {
          success: true,
          data: report,
          message: `${subject} report generated successfully`
        };
      } else {
        const fileName = `${subject}_Report_${Date.now()}.${format}`;
        this.downloadFile(response.data, fileName, format);
        
        return {
          success: true,
          message: `${subject} ${format.toUpperCase()} report downloaded successfully`,
          fileName
        };
      }

    } catch (error) {
      console.error(`❌ Failed to generate ${subject} report:`, error);
      throw this.handleError(error);
    }
  }

  // Generate comparative performance report
  static async generateComparativeReport(studentId, options = {}) {
    try {
      const {
        timeframe = '90d',
        compareWith = 'class', // class, grade, school
        subject = 'all',
        format = 'json'
      } = options;
      
      console.log(`📈 Generating comparative report for student: ${studentId}`);

      const response = await api.get(`/reports/student/${studentId}/comparative`, {
        params: { timeframe, compareWith, subject, format },
        responseType: format === 'json' ? 'json' : 'blob'
      });

      if (format === 'json') {
        const report = response.data.data;
        
        // Enhance with competitive analysis
        report.benchmarkAnalysis = this.generateBenchmarkAnalysis(report);
        report.strengthsWeaknesses = this.analyzeCompetitivePosition(report);
        report.improvementPotential = this.calculateImprovementPotential(report);

        return {
          success: true,
          data: report,
          message: 'Comparative report generated successfully'
        };
      } else {
        const fileName = `Comparative_Report_${Date.now()}.${format}`;
        this.downloadFile(response.data, fileName, format);
        
        return {
          success: true,
          message: `Comparative ${format.toUpperCase()} report downloaded successfully`,
          fileName
        };
      }

    } catch (error) {
      console.error('❌ Failed to generate comparative report:', error);
      throw this.handleError(error);
    }
  }

  // ==========================================
  // 🔧 STUDENT REPORTS HELPER METHODS
  // ==========================================

  static generateProgressInsights(analytics) {
    const insights = {
      performanceLevel: this.determinePerformanceLevel(analytics.overview.averageScore),
      trendAnalysis: this.analyzeTrend(analytics.overview.improvementTrend),
      consistencyScore: this.calculateOverallConsistency(analytics.subjects),
      timeManagement: this.analyzeTimeManagement(analytics.overview.totalTimeSpent),
      
      keyObservations: []
    };

    // Generate key observations
    if (analytics.overview.improvementTrend === 'improving') {
      insights.keyObservations.push({
        type: 'positive',
        message: 'Showing consistent improvement over time',
        confidence: 'high'
      });
    }

    if (analytics.strengths.length > analytics.areasForImprovement.length) {
      insights.keyObservations.push({
        type: 'positive',
        message: 'Strong performance in multiple subjects',
        confidence: 'high'
      });
    }

    return insights;
  }

  static generateProgressVisualizations(analytics) {
    return {
      timelineChart: {
        type: 'line',
        data: analytics.timelineData.map(item => ({
          x: item.date,
          y: item.score,
          label: item.subject
        })),
        title: 'Performance Timeline',
        xAxis: 'Date',
        yAxis: 'Score (%)'
      },

      subjectComparison: {
        type: 'bar',
        data: Object.entries(analytics.subjects).map(([subject, data]) => ({
          x: subject,
          y: data.averageScore,
          color: this.getSubjectColor(subject)
        })),
        title: 'Subject-wise Performance',
        xAxis: 'Subjects',
        yAxis: 'Average Score (%)'
      },

      performanceDistribution: {
        type: 'pie',
        data: [
          { label: 'Excellent (80%+)', value: this.countScoresInRange(analytics, 80, 100) },
          { label: 'Good (60-79%)', value: this.countScoresInRange(analytics, 60, 79) },
          { label: 'Average (40-59%)', value: this.countScoresInRange(analytics, 40, 59) },
          { label: 'Poor (<40%)', value: this.countScoresInRange(analytics, 0, 39) }
        ],
        title: 'Score Distribution'
      }
    };
  }

  static generateActionPlan(analytics) {
    const actionPlan = {
      shortTerm: [], // Next 2 weeks
      mediumTerm: [], // Next 1-2 months
      longTerm: [], // Next 3-6 months
      
      priorities: [],
      resources: [],
      milestones: []
    };

    // Short-term actions
    analytics.areasForImprovement.forEach(area => {
      if (area.priority === 'high') {
        actionPlan.shortTerm.push({
          subject: area.subject,
          action: `Focus on improving ${area.subject} fundamentals`,
          target: 'Increase score by 10%',
          timeframe: '2 weeks'
        });
      }
    });

    // Medium-term actions
    actionPlan.mediumTerm.push({
      action: 'Establish consistent study routine',
      target: 'Study 2 hours daily',
      timeframe: '1 month'
    });

    // Long-term actions
    actionPlan.longTerm.push({
      action: 'Achieve overall 80%+ average',
      target: '80% across all subjects',
      timeframe: '6 months'
    });

    return actionPlan;
  }

  static generateAIInsights(insights) {
    return {
      learningPatterns: {
        preferredStudyTime: insights.analytics?.studyPatterns?.peakHours || ['6:00 PM', '8:00 PM'],
        learningStyle: insights.analytics?.learningStyle || 'visual',
        strengthAreas: insights.analytics?.cognitiveStrengths || ['logical reasoning', 'pattern recognition'],
        challengeAreas: insights.analytics?.cognitiveWeaknesses || ['working memory', 'attention span']
      },

      predictiveAnalysis: {
        expectedGrowth: '+15% in next 3 months',
        riskFactors: insights.analytics?.riskFactors || ['time management', 'concept clarity'],
        successProbability: insights.analytics?.successProbability || 78
      },

      personalizedTips: [
        'Break study sessions into 25-minute focused blocks',
        'Use visual aids and diagrams for better understanding',
        'Practice recall techniques to improve retention',
        'Seek clarification immediately when concepts are unclear'
      ]
    };
  }

  static generateLearningRecommendations(report) {
    const recommendations = {
      immediate: [],
      progressive: [],
      advanced: []
    };

    // Based on performance data
    if (report.analytics?.overview?.averageScore < 70) {
      recommendations.immediate.push({
        type: 'foundation',
        title: 'Strengthen Basic Concepts',
        description: 'Focus on fundamental concepts before moving to advanced topics',
        resources: ['Interactive tutorials', 'Practice worksheets', 'Video explanations']
      });
    }

    // Based on learning patterns
    recommendations.progressive.push({
      type: 'methodology',
      title: 'Develop Problem-Solving Strategies',
      description: 'Learn systematic approaches to different question types',
      resources: ['Strategy guides', 'Worked examples', 'Practice tests']
    });

    return recommendations;
  }

  static generateSkillDevelopmentPlan(report) {
    return {
      currentSkills: {
        cognitive: report.insights?.skillAssessment?.cognitive || 75,
        analytical: report.insights?.skillAssessment?.analytical || 70,
        creative: report.insights?.skillAssessment?.creative || 65,
        collaborative: report.insights?.skillAssessment?.collaborative || 80
      },

      targetSkills: {
        cognitive: 85,
        analytical: 85,
        creative: 80,
        collaborative: 85
      },

      developmentPath: [
        {
          skill: 'Analytical Thinking',
          currentLevel: 70,
          targetLevel: 85,
          activities: ['Logic puzzles', 'Data analysis exercises', 'Case studies'],
          timeline: '3 months'
        },
        {
          skill: 'Creative Problem Solving',
          currentLevel: 65,
          targetLevel: 80,
          activities: ['Brainstorming sessions', 'Alternative solution methods', 'Project work'],
          timeline: '4 months'
        }
      ]
    };
  }

  static analyzeConceptMastery(report) {
    return {
      masteryLevels: {
        mastered: report.topics?.filter(t => t.score >= 80).length || 0,
        developing: report.topics?.filter(t => t.score >= 60 && t.score < 80).length || 0,
        needsWork: report.topics?.filter(t => t.score < 60).length || 0
      },

      conceptGaps: report.topics?.filter(t => t.score < 60).map(topic => ({
        concept: topic.name,
        currentLevel: topic.score,
        targetLevel: 80,
        prerequisites: topic.prerequisites || [],
        recommendedActions: [
          'Review fundamental concepts',
          'Practice specific exercises',
          'Seek additional help'
        ]
      })) || []
    };
  }

  static analyzeDifficultyProgression(report) {
    return {
      easyQuestions: {
        accuracy: report.difficultyAnalysis?.easy?.accuracy || 85,
        timeEfficiency: report.difficultyAnalysis?.easy?.efficiency || 90,
        recommendation: 'Maintain consistency'
      },

      mediumQuestions: {
        accuracy: report.difficultyAnalysis?.medium?.accuracy || 70,
        timeEfficiency: report.difficultyAnalysis?.medium?.efficiency || 75,
        recommendation: 'Focus on strategy development'
      },

      hardQuestions: {
        accuracy: report.difficultyAnalysis?.hard?.accuracy || 50,
        timeEfficiency: report.difficultyAnalysis?.hard?.efficiency || 60,
        recommendation: 'Build advanced problem-solving skills'
      }
    };
  }

  static generateTopicRecommendations(report) {
    const topics = report.topicPerformance || [];
    
    return {
      priorityTopics: topics
        .filter(topic => topic.score < 60)
        .sort((a, b) => a.score - b.score)
        .slice(0, 3)
        .map(topic => ({
          name: topic.name,
          currentScore: topic.score,
          targetScore: 75,
          studyPlan: this.generateTopicStudyPlan(topic)
        })),

      strengthTopics: topics
        .filter(topic => topic.score >= 80)
        .map(topic => ({
          name: topic.name,
          score: topic.score,
          recommendation: 'Maintain proficiency and help others'
        }))
    };
  }

  static generateTopicStudyPlan(topic) {
    return {
      week1: `Review ${topic.name} fundamentals`,
      week2: `Practice basic ${topic.name} problems`,
      week3: `Solve intermediate ${topic.name} questions`,
      week4: `Test understanding with mixed problems`,
      resources: [
        'Textbook chapters',
        'Online tutorials',
        'Practice question sets'
      ]
    };
  }

  // Helper methods
  static determinePerformanceLevel(score) {
    if (score >= 90) return { level: 'exceptional', description: 'Outstanding performance' };
    if (score >= 80) return { level: 'excellent', description: 'Above average performance' };
    if (score >= 70) return { level: 'good', description: 'Satisfactory performance' };
    if (score >= 60) return { level: 'average', description: 'Meets basic requirements' };
    return { level: 'below_average', description: 'Needs significant improvement' };
  }

  static analyzeTrend(trend) {
    const trendMap = {
      'improving': { direction: 'upward', description: 'Performance is improving over time', confidence: 'high' },
      'declining': { direction: 'downward', description: 'Performance needs attention', confidence: 'high' },
      'stable': { direction: 'steady', description: 'Consistent performance level', confidence: 'medium' }
    };
    
    return trendMap[trend] || trendMap['stable'];
  }

  static calculateOverallConsistency(subjects) {
    const scores = Object.values(subjects).map(subject => subject.averageScore);
    if (scores.length === 0) return 0;
    
    const mean = scores.reduce((a, b) => a + b, 0) / scores.length;
    const variance = scores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / scores.length;
    const standardDeviation = Math.sqrt(variance);
    
    return Math.max(0, 100 - (standardDeviation * 2));
  }

  static analyzeTimeManagement(totalTime) {
    const averageTimePerAssessment = totalTime / 10; // Assuming 10 assessments average
    
    if (averageTimePerAssessment > 120) {
      return { efficiency: 'needs_improvement', recommendation: 'Work on time management strategies' };
    } else if (averageTimePerAssessment < 45) {
      return { efficiency: 'too_fast', recommendation: 'Take more time to review answers' };
    }
    
    return { efficiency: 'optimal', recommendation: 'Good time management' };
  }

  static getSubjectColor(subject) {
    const colors = {
      'Mathematics': '#3B82F6',
      'Science': '#10B981',
      'English': '#F59E0B',
      'History': '#EF4444',
      'Geography': '#8B5CF6'
    };
    
    return colors[subject] || '#6B7280';
  }

  static countScoresInRange(analytics, min, max) {
    let count = 0;
    Object.values(analytics.subjects).forEach(subject => {
      subject.scores.forEach(score => {
        if (score >= min && score <= max) count++;
      });
    });
    return count;
  }

  static generateBenchmarkAnalysis(report) {
    return {
      percentileRank: report.ranking?.percentile || 65,
      aboveAverage: report.student?.averageScore > report.benchmark?.averageScore,
      strengthsVsPeers: report.subjects?.filter(s => s.averageScore > s.peerAverage) || [],
      improvementAreas: report.subjects?.filter(s => s.averageScore < s.peerAverage) || []
    };
  }

  static analyzeCompetitivePosition(report) {
    return {
      overallPosition: report.ranking?.position || 'Unknown',
      topQuartile: (report.ranking?.percentile || 0) >= 75,
      competitiveStrengths: report.strengths?.map(s => s.subject) || [],
      competitiveWeaknesses: report.weaknesses?.map(w => w.subject) || []
    };
  }

  static calculateImprovementPotential(report) {
    const currentScore = report.student?.averageScore || 0;
    const maxPossibleImprovement = 100 - currentScore;
    const realisticImprovement = maxPossibleImprovement * 0.7; // 70% of maximum
    
    return {
      currentScore,
      potentialScore: currentScore + realisticImprovement,
      improvementMargin: realisticImprovement,
      timeToAchieve: '3-6 months with consistent effort'
    };
  }

  // File download utility
  static downloadFile(data, fileName, format) {
    const blob = new Blob([data], {
      type: format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  // Error handling
  static handleError(error) {
    if (error.response) {
      return {
        success: false,
        message: error.response.data.message || 'Reports service error',
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
// 👨‍🏫 TEACHER REPORTS SERVICE
// ==========================================

export class TeacherReportsService {
  
  // Generate comprehensive teacher dashboard report
  static async generateDashboardReport(teacherId, options = {}) {
    try {
      const {
        timeframe = '30d',
        format = 'json',
        includeClassBreakdown = true,
        includeStudentDetails = false
      } = options;
      
      console.log(`👨‍🏫 Generating dashboard report for teacher: ${teacherId}`);

      const response = await api.get(`/reports/teacher/${teacherId}/dashboard`, {
        params: { timeframe, format, includeClassBreakdown, includeStudentDetails },
        responseType: format === 'json' ? 'json' : 'blob'
      });

      if (format === 'json') {
        const report = response.data.data;
        
        // Enhance with teaching effectiveness insights
        report.teachingEffectiveness = this.analyzeTeachingEffectiveness(report.analytics);
        report.improvementSuggestions = this.generateTeachingImprovements(report.analytics);
        report.classroomInsights = this.generateClassroomInsights(report.analytics);

        return {
          success: true,
          data: report,
          message: 'Teacher dashboard report generated successfully'
        };
      } else {
        const fileName = `Teacher_Dashboard_Report_${Date.now()}.${format}`;
        this.downloadFile(response.data, fileName, format);
        
        return {
          success: true,
          message: `Dashboard ${format.toUpperCase()} report downloaded successfully`,
          fileName
        };
      }

    } catch (error) {
      console.error('❌ Failed to generate teacher dashboard report:', error);
      throw this.handleError(error);
    }
  }

  // Generate class progress report
  static async generateClassProgressReport(teacherId, classId, options = {}) {
    try {
      const {
        timeframe = '30d',
        format = 'json',
        subject = 'all',
        includeIndividual = false
      } = options;
      
      console.log(`📚 Generating class progress report for class: ${classId}`);

      const response = await api.get(`/reports/teacher/${teacherId}/class/${classId}/progress`, {
        params: { timeframe, format, subject, includeIndividual },
        responseType: format === 'json' ? 'json' : 'blob'
      });

      if (format === 'json') {
        const report = response.data.data;
        
        // Enhance with class-specific insights
        report.classHealthMetrics = this.analyzeClassHealth(report.analytics);
        report.interventionSuggestions = this.generateInterventionPlans(report.analytics);
        report.progressPredictions = this.predictClassProgress(report.analytics);

        return {
          success: true,
          data: report,
          message: 'Class progress report generated successfully'
        };
      } else {
        const fileName = `Class_Progress_Report_${Date.now()}.${format}`;
        this.downloadFile(response.data, fileName, format);
        
        return {
          success: true,
          message: `Class progress ${format.toUpperCase()} report downloaded successfully`,
          fileName
        };
      }

    } catch (error) {
      console.error('❌ Failed to generate class progress report:', error);
      throw this.handleError(error);
    }
  }

  // Generate performance analytics report
  static async generatePerformanceReport(options = {}) {
    try {
      const {
        scope = 'class',
        scopeId,
        timeframe = '90d',
        format = 'json',
        metrics = 'all'
      } = options;
      
      console.log(`📈 Generating performance analytics report - Scope: ${scope}`);

      const response = await api.get('/reports/analytics/performance', {
        params: { scope, scopeId, timeframe, format, metrics },
        responseType: format === 'json' ? 'json' : 'blob'
      });

      if (format === 'json') {
        const report = response.data.data;
        
        // Enhance with advanced analytics
        report.trendAnalysis = this.analyzePerfomanceTrends(report);
        report.benchmarkComparisons = this.generateBenchmarkComparisons(report);
        report.actionableInsights = this.generateActionableInsights(report);

        return {
          success: true,
          data: report,
          message: 'Performance analytics report generated successfully'
        };
      } else {
        const fileName = `Performance_Analytics_${Date.now()}.${format}`;
        this.downloadFile(response.data, fileName, format);
        
        return {
          success: true,
          message: `Performance analytics ${format.toUpperCase()} report downloaded successfully`,
          fileName
        };
      }

    } catch (error) {
      console.error('❌ Failed to generate performance analytics report:', error);
      throw this.handleError(error);
    }
  }

  // ==========================================
  // 🔧 TEACHER REPORTS HELPER METHODS
  // ==========================================

  static analyzeTeachingEffectiveness(analytics) {
    return {
      overallEffectiveness: this.calculateTeachingScore(analytics),
      studentEngagement: analytics.engagement?.participationRate || 75,
      contentDelivery: analytics.assessments?.averageScore || 70,
      feedbackQuality: analytics.grading?.feedbackQuality || 80,
      
      strengths: this.identifyTeachingStrengths(analytics),
      improvementAreas: this.identifyTeachingImprovements(analytics)
    };
  }

  static calculateTeachingScore(analytics) {
    const metrics = {
      studentPerformance: analytics.overview?.averageClassScore || 0,
      engagement: analytics.engagement?.participationRate || 0,
      improvement: analytics.trends?.improvementRate || 0,
      consistency: analytics.consistency?.score || 0
    };
    
    const weightedScore = (
      metrics.studentPerformance * 0.4 +
      metrics.engagement * 0.3 +
      metrics.improvement * 0.2 +
      metrics.consistency * 0.1
    );
    
    return Math.round(weightedScore);
  }

  static identifyTeachingStrengths(analytics) {
    const strengths = [];
    
    if ((analytics.overview?.averageClassScore || 0) > 80) {
      strengths.push({
        area: 'Student Achievement',
        score: analytics.overview.averageClassScore,
        description: 'Students consistently achieve high scores'
      });
    }
    
    if ((analytics.engagement?.participationRate || 0) > 85) {
      strengths.push({
        area: 'Student Engagement',
        score: analytics.engagement.participationRate,
        description: 'High levels of student participation'
      });
    }
    
    return strengths;
  }

  static identifyTeachingImprovements(analytics) {
    const improvements = [];
    
    if ((analytics.overview?.averageClassScore || 0) < 70) {
      improvements.push({
        area: 'Content Delivery',
        priority: 'high',
        suggestion: 'Review teaching methods for better concept clarity'
      });
    }
    
    if ((analytics.engagement?.participationRate || 0) < 70) {
      improvements.push({
        area: 'Student Engagement',
        priority: 'medium',
        suggestion: 'Implement more interactive teaching strategies'
      });
    }
    
    return improvements;
  }

  static generateTeachingImprovements(analytics) {
    return {
      immediate: [
        {
          action: 'Review low-performing assessment questions',
          timeline: '1 week',
          impact: 'medium'
        },
        {
          action: 'Provide additional feedback to struggling students',
          timeline: '2 weeks',
          impact: 'high'
        }
      ],
      
      progressive: [
        {
          action: 'Implement peer learning activities',
          timeline: '1 month',
          impact: 'high'
        },
        {
          action: 'Develop differentiated instruction materials',
          timeline: '2 months',
          impact: 'high'
        }
      ]
    };
  }

  static generateClassroomInsights(analytics) {
    return {
      classroomDynamics: {
        participationPattern: analytics.engagement?.pattern || 'mixed',
        learningPace: analytics.pacing?.overall || 'moderate',
        collaborationLevel: analytics.collaboration?.score || 75
      },
      
      studentNeeds: {
        additionalSupport: analytics.students?.filter(s => s.needsSupport) || [],
        advancedLearners: analytics.students?.filter(s => s.isAdvanced) || [],
        disengagedStudents: analytics.students?.filter(s => s.lowEngagement) || []
      },
      
      recommendations: [
        'Create mixed-ability groups for peer learning',
        'Implement formative assessment strategies',
        'Use technology to enhance engagement'
      ]
    };
  }

  static analyzeClassHealth(analytics) {
    const healthMetrics = {
      academicPerformance: analytics.overview?.averageScore || 0,
      engagement: analytics.engagement?.participationRate || 0,
      progress: analytics.trends?.improvementRate || 0,
      collaboration: analytics.social?.collaborationScore || 0
    };
    
    const overallHealth = Math.round(
      (healthMetrics.academicPerformance + 
       healthMetrics.engagement + 
       healthMetrics.progress + 
       healthMetrics.collaboration) / 4
    );
    
    return {
      overallHealth,
      status: overallHealth > 80 ? 'excellent' : 
              overallHealth > 60 ? 'good' : 'needs_attention',
      metrics: healthMetrics,
      riskFactors: this.identifyRiskFactors(healthMetrics)
    };
  }

  static identifyRiskFactors(metrics) {
    const risks = [];
    
    if (metrics.academicPerformance < 60) {
      risks.push({ factor: 'Low academic performance', severity: 'high' });
    }
    
    if (metrics.engagement < 70) {
      risks.push({ factor: 'Poor student engagement', severity: 'medium' });
    }
    
    return risks;
  }

  static generateInterventionPlans(analytics) {
    const plans = [];
    
    // For struggling students
    const strugglingStudents = analytics.students?.filter(s => s.averageScore < 60) || [];
    if (strugglingStudents.length > 0) {
      plans.push({
        type: 'academic_support',
        target: 'Struggling students',
        interventions: [
          'One-on-one tutoring sessions',
          'Simplified learning materials',
          'Additional practice opportunities'
        ],
        timeline: '4 weeks',
        successMetrics: ['10% score improvement', 'Increased participation']
      });
    }
    
    // For low engagement
    if ((analytics.engagement?.participationRate || 0) < 70) {
      plans.push({
        type: 'engagement_boost',
        target: 'Entire class',
        interventions: [
          'Gamification elements',
          'Interactive group activities',
          'Real-world problem solving'
        ],
        timeline: '2 weeks',
        successMetrics: ['80% participation rate', 'Positive feedback']
      });
    }
    
    return plans;
  }

  static predictClassProgress(analytics) {
    const currentTrend = analytics.trends?.direction || 'stable';
    const currentAverage = analytics.overview?.averageScore || 70;
    
    let prediction;
    
    switch (currentTrend) {
      case 'improving':
        prediction = {
          expectedGrowth: '+8-12%',
          confidence: 'high',
          timeline: '2 months'
        };
        break;
      case 'declining':
        prediction = {
          expectedGrowth: '-5-8%',
          confidence: 'medium',
          timeline: '1 month',
          urgentAction: true
        };
        break;
      default:
        prediction = {
          expectedGrowth: '+2-5%',
          confidence: 'medium',
          timeline: '3 months'
        };
    }
    
    return {
      currentState: { average: currentAverage, trend: currentTrend },
      prediction,
      factors: analytics.trends?.influencingFactors || []
    };
  }

  static analyzePerfomanceTrends(report) {
    return {
      overallTrend: report.trends?.direction || 'stable',
      subjectTrends: report.subjects?.map(s => ({
        subject: s.name,
        trend: s.trend,
        changeRate: s.changeRate || 0
      })) || [],
      seasonalPatterns: report.temporal?.patterns || [],
      cyclicalBehaviors: report.temporal?.cycles || []
    };
  }

  static generateBenchmarkComparisons(report) {
    return {
      schoolComparison: {
        aboveAverage: report.performance?.schoolRanking > 50,
        percentile: report.performance?.schoolRanking || 65
      },
      
      districtComparison: {
        aboveAverage: report.performance?.districtRanking > 50,
        percentile: report.performance?.districtRanking || 60
      },
      
      nationalComparison: {
        aboveAverage: report.performance?.nationalRanking > 50,
        percentile: report.performance?.nationalRanking || 55
      }
    };
  }

  static generateActionableInsights(report) {
    return {
      quickWins: [
        {
          action: 'Implement exit tickets for immediate feedback',
          effort: 'low',
          impact: 'medium',
          timeline: '1 week'
        },
        {
          action: 'Create study groups for peer learning',
          effort: 'medium',
          impact: 'high',
          timeline: '2 weeks'
        }
      ],
      
      strategicInitiatives: [
        {
          action: 'Develop comprehensive remediation program',
          effort: 'high',
          impact: 'high',
          timeline: '2 months'
        },
        {
          action: 'Implement data-driven instruction model',
          effort: 'high',
          impact: 'very_high',
          timeline: '3 months'
        }
      ]
    };
  }

  // File download utility (shared with StudentReportsService)
  static downloadFile(data, fileName, format) {
    const blob = new Blob([data], {
      type: format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });
    
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }

  // Error handling
  static handleError(error) {
    if (error.response) {
      return {
        success: false,
        message: error.response.data.message || 'Teacher reports service error',
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
  StudentReportsService,
  TeacherReportsService
};
