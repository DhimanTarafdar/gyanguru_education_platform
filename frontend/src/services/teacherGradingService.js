// 👨‍🏫 GyanGuru Teacher Grading Service
// Extraordinary features for grading image-based answers and managing assessments

import api, { endpoints, apiUtils } from './api';

export class TeacherGradingService {
  
  // ==========================================
  // 📸 IMAGE GRADING - CORE Features
  // ==========================================
  
  static async getSubmissionsForGrading(assessmentId, filters = {}) {
    try {
      console.log(`📋 Getting submissions for grading: ${assessmentId}`);

      const {
        status = 'submitted',
        questionType = 'all',
        page = 1,
        limit = 20,
        sortBy = 'submittedAt',
        sortOrder = 'desc'
      } = filters;

      const queryParams = {
        status,
        questionType,
        page,
        limit,
        sortBy,
        sortOrder
      };

      const response = await apiUtils.grading.getSubmissionsForGrading(assessmentId, queryParams);

      return {
        success: true,
        data: {
          submissions: response.data.submissions,
          statistics: response.data.statistics,
          pagination: response.data.pagination,
          filters: {
            applied: queryParams,
            available: {
              statuses: ['submitted', 'auto_submitted', 'graded'],
              questionTypes: ['MCQ', 'Short Answer', 'Long Answer', 'Essay'],
              sortOptions: ['submittedAt', 'studentName', 'percentage']
            }
          }
        },
        message: 'Submissions retrieved successfully'
      };
    } catch (error) {
      console.error('❌ Failed to get submissions:', error);
      throw this.handleError(error);
    }
  }

  static async getStudentAnswerImages(assessmentId, questionId, studentId) {
    try {
      console.log(`📸 Getting images for student: ${studentId}, question: ${questionId}`);

      const response = await apiUtils.grading.getAnswerImages(assessmentId, questionId, studentId);

      const enrichedData = {
        ...response.data,
        viewingMetadata: {
          retrievedAt: new Date().toISOString(),
          viewerId: 'teacher', // This would come from auth context
          sessionId: this.generateSessionId()
        },
        gradingTools: {
          zoomEnabled: true,
          annotationSupported: true,
          comparisonMode: true,
          aiAssistance: true
        }
      };

      return {
        success: true,
        data: enrichedData,
        message: 'Student images retrieved successfully',
        features: {
          highResolution: true,
          secureViewing: true,
          gradingTools: true
        }
      };
    } catch (error) {
      console.error('❌ Failed to get student images:', error);
      throw this.handleError(error);
    }
  }

  static async gradeImageAnswer(assessmentId, questionId, gradingData) {
    try {
      console.log(`✅ Grading image answer for question: ${questionId}`);

      const {
        studentId,
        marksAwarded,
        feedback,
        rubricScores = [],
        gradingCriteria = {},
        teacherComments = ''
      } = gradingData;

      // Validate grading data
      const validation = this.validateGradingData(gradingData);
      if (!validation.valid) {
        throw new Error(validation.message);
      }

      const enrichedGradingData = {
        studentId,
        marksAwarded: parseFloat(marksAwarded),
        feedback: feedback || '',
        rubricScores,
        gradingCriteria,
        teacherComments,
        gradingMetadata: {
          gradedAt: new Date().toISOString(),
          gradingSessionId: this.generateSessionId(),
          gradingDuration: gradingData.gradingDuration || 0,
          confidenceLevel: this.calculateConfidenceLevel(gradingData),
          gradingMethod: 'manual_with_assistance'
        }
      };

      const response = await apiUtils.grading.gradeImageAnswer(
        assessmentId, 
        questionId, 
        enrichedGradingData
      );

      return {
        success: true,
        data: response.data,
        message: 'Answer graded successfully',
        features: {
          rubricBased: rubricScores.length > 0,
          detailedFeedback: feedback.length > 0,
          qualityAssured: true
        }
      };
    } catch (error) {
      console.error('❌ Failed to grade image answer:', error);
      throw this.handleError(error);
    }
  }

  // ==========================================
  // 🤖 AI-ASSISTED GRADING
  // ==========================================
  
  static async getAIGradingSuggestion(assessmentId, questionId, studentId) {
    try {
      console.log(`🤖 Getting AI grading suggestion for question: ${questionId}`);

      // This would call an AI service to analyze the image and provide suggestions
      const response = await api.post(`/assessments/${assessmentId}/ai-grade-suggestion`, {
        questionId,
        studentId,
        analysisType: 'comprehensive'
      });

      return {
        success: true,
        data: {
          suggestedScore: response.data.suggestedScore,
          confidence: response.data.confidence,
          keyPoints: response.data.keyPoints,
          suggestions: response.data.suggestions,
          similarAnswers: response.data.similarAnswers,
          rubricAlignment: response.data.rubricAlignment
        },
        message: 'AI grading suggestion generated',
        disclaimer: 'AI suggestions are for assistance only. Final grading decision rests with the teacher.'
      };
    } catch (error) {
      console.error('❌ Failed to get AI suggestion:', error);
      // Return fallback for AI errors
      return {
        success: false,
        data: null,
        message: 'AI assistance temporarily unavailable'
      };
    }
  }

  static async batchGradeWithAI(assessmentId, questionId, gradingCriteria) {
    try {
      console.log(`🤖 Starting batch AI grading for question: ${questionId}`);

      const response = await api.post(`/assessments/${assessmentId}/batch-ai-grade`, {
        questionId,
        gradingCriteria,
        requireTeacherReview: true,
        confidenceThreshold: 0.8
      });

      return {
        success: true,
        data: {
          processedCount: response.data.processedCount,
          highConfidenceGrades: response.data.highConfidenceGrades,
          requiresReview: response.data.requiresReview,
          averageProcessingTime: response.data.averageProcessingTime
        },
        message: `Batch grading completed. ${response.data.highConfidenceGrades} auto-graded, ${response.data.requiresReview} require review.`
      };
    } catch (error) {
      console.error('❌ Failed to batch grade with AI:', error);
      throw this.handleError(error);
    }
  }

  // ==========================================
  // 📊 GRADING ANALYTICS & INSIGHTS
  // ==========================================
  
  static async getGradingAnalytics(assessmentId) {
    try {
      console.log(`📊 Getting grading analytics for assessment: ${assessmentId}`);

      const response = await api.get(`/assessments/${assessmentId}/grading-analytics`);

      const analytics = {
        overview: {
          totalSubmissions: response.data.totalSubmissions,
          gradedSubmissions: response.data.gradedSubmissions,
          pendingGrading: response.data.pendingGrading,
          averageGradingTime: response.data.averageGradingTime
        },
        
        distribution: {
          scoreDistribution: response.data.scoreDistribution,
          gradeDistribution: response.data.gradeDistribution,
          questionWiseAnalysis: response.data.questionWiseAnalysis
        },
        
        insights: {
          difficultQuestions: this.identifyDifficultQuestions(response.data),
          gradingConsistency: response.data.gradingConsistency,
          commonMistakes: response.data.commonMistakes,
          improvementAreas: this.suggestImprovementAreas(response.data)
        },
        
        efficiency: {
          gradingProgress: response.data.gradingProgress,
          timeEstimates: this.calculateTimeEstimates(response.data),
          recommendations: this.getEfficiencyRecommendations(response.data)
        }
      };

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

  static async getComparativeGrading(assessmentId, questionId) {
    try {
      console.log(`🔍 Getting comparative grading data for question: ${questionId}`);

      const response = await api.get(`/assessments/${assessmentId}/comparative-grading/${questionId}`);

      return {
        success: true,
        data: {
          sampleAnswers: response.data.sampleAnswers,
          gradingRubric: response.data.gradingRubric,
          scoreDistribution: response.data.scoreDistribution,
          exemplaryAnswers: response.data.exemplaryAnswers,
          commonErrors: response.data.commonErrors
        },
        message: 'Comparative grading data retrieved'
      };
    } catch (error) {
      console.error('❌ Failed to get comparative grading:', error);
      throw this.handleError(error);
    }
  }

  // ==========================================
  // 🎯 GRADING WORKFLOWS
  // ==========================================
  
  static async startGradingSession(assessmentId, options = {}) {
    try {
      console.log(`🎯 Starting grading session for assessment: ${assessmentId}`);

      const {
        gradingMode = 'sequential', // sequential, random, priority
        focusArea = 'all', // specific question types or topics
        batchSize = 10,
        aiAssistance = true
      } = options;

      const sessionData = {
        assessmentId,
        sessionId: this.generateSessionId(),
        startedAt: new Date().toISOString(),
        configuration: {
          gradingMode,
          focusArea,
          batchSize,
          aiAssistance
        }
      };

      // Save session to local storage for persistence
      this.saveGradingSession(sessionData);

      return {
        success: true,
        data: sessionData,
        message: 'Grading session started successfully'
      };
    } catch (error) {
      console.error('❌ Failed to start grading session:', error);
      throw this.handleError(error);
    }
  }

  static async getNextSubmissionToGrade(sessionId, preferences = {}) {
    try {
      const session = this.getGradingSession(sessionId);
      if (!session) {
        throw new Error('Grading session not found');
      }

      const {
        skipAlreadyGraded = true,
        prioritizeByDifficulty = false,
        randomOrder = false
      } = preferences;

      const response = await api.post(`/assessments/${session.assessmentId}/next-submission`, {
        sessionId,
        preferences: {
          skipAlreadyGraded,
          prioritizeByDifficulty,
          randomOrder
        }
      });

      return {
        success: true,
        data: response.data,
        message: 'Next submission retrieved'
      };
    } catch (error) {
      console.error('❌ Failed to get next submission:', error);
      throw this.handleError(error);
    }
  }

  // ==========================================
  // 🔧 UTILITY METHODS
  // ==========================================
  
  static validateGradingData(gradingData) {
    const { studentId, marksAwarded, maxMarks } = gradingData;

    if (!studentId) {
      return { valid: false, message: 'Student ID is required' };
    }

    if (marksAwarded === undefined || marksAwarded === null) {
      return { valid: false, message: 'Marks awarded is required' };
    }

    if (isNaN(marksAwarded) || marksAwarded < 0) {
      return { valid: false, message: 'Marks must be a positive number' };
    }

    if (maxMarks && marksAwarded > maxMarks) {
      return { valid: false, message: `Marks cannot exceed maximum marks (${maxMarks})` };
    }

    return { valid: true };
  }

  static calculateConfidenceLevel(gradingData) {
    let confidence = 0.5; // Base confidence

    // Increase confidence based on various factors
    if (gradingData.feedback && gradingData.feedback.length > 50) {
      confidence += 0.2;
    }

    if (gradingData.rubricScores && gradingData.rubricScores.length > 0) {
      confidence += 0.2;
    }

    if (gradingData.gradingDuration && gradingData.gradingDuration > 120) { // 2 minutes
      confidence += 0.1;
    }

    return Math.min(confidence, 1.0);
  }

  static generateSessionId() {
    return `grading_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  static saveGradingSession(sessionData) {
    localStorage.setItem(`grading_session_${sessionData.sessionId}`, JSON.stringify(sessionData));
  }

  static getGradingSession(sessionId) {
    const sessionData = localStorage.getItem(`grading_session_${sessionId}`);
    return sessionData ? JSON.parse(sessionData) : null;
  }

  static identifyDifficultQuestions(analyticsData) {
    return analyticsData.questionWiseAnalysis
      .filter(q => q.averageScore < 0.6) // Less than 60% average
      .map(q => ({
        questionId: q.questionId,
        averageScore: q.averageScore,
        difficulty: q.averageScore < 0.4 ? 'very_difficult' : 'difficult'
      }));
  }

  static suggestImprovementAreas(analyticsData) {
    const suggestions = [];

    if (analyticsData.gradingConsistency < 0.8) {
      suggestions.push({
        area: 'grading_consistency',
        message: 'Consider using more detailed rubrics for consistent grading',
        priority: 'high'
      });
    }

    return suggestions;
  }

  static calculateTimeEstimates(analyticsData) {
    const { pendingGrading, averageGradingTime } = analyticsData;
    
    return {
      estimatedCompletionTime: pendingGrading * averageGradingTime,
      recommendedSessionLength: Math.min(pendingGrading * averageGradingTime, 7200), // Max 2 hours
      suggestedBreaks: Math.floor(pendingGrading / 20) // Break every 20 submissions
    };
  }

  static getEfficiencyRecommendations(analyticsData) {
    const recommendations = [];

    if (analyticsData.averageGradingTime > 300) { // More than 5 minutes
      recommendations.push({
        type: 'speed_improvement',
        message: 'Consider using AI assistance to speed up grading',
        impact: 'high'
      });
    }

    return recommendations;
  }

  static handleError(error) {
    const errorMessage = error.response?.data?.message || error.message || 'Unknown error occurred';
    const errorCode = error.response?.status || 500;
    
    return {
      success: false,
      error: errorMessage,
      code: errorCode,
      timestamp: new Date().toISOString()
    };
  }
}

// Grading workflow helpers
export const GradingWorkflow = {
  // Efficient grading patterns
  SEQUENTIAL: 'sequential',
  RANDOM: 'random',
  PRIORITY: 'priority',
  AI_ASSISTED: 'ai_assisted',

  // Quality assurance levels
  QA_LEVELS: {
    BASIC: 'basic',
    STANDARD: 'standard', 
    COMPREHENSIVE: 'comprehensive'
  },

  // Grading modes for different scenarios
  MODES: {
    BULK_GRADING: 'bulk',
    DETAILED_REVIEW: 'detailed',
    SPOT_CHECK: 'spot_check',
    COMPARATIVE: 'comparative'
  }
};

export default TeacherGradingService;
