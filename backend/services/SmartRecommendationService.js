const Recommendation = require('../models/Recommendation');
const StudentPerformance = require('../models/StudentPerformance');
const Assessment = require('../models/Assessment');
const StudentResponse = require('../models/StudentResponse');
const User = require('../models/User');

// 🧠 GyanGuru Smart Recommendation Engine Service
// Features: AI-powered personalized learning recommendations, Adaptive suggestions, Learning path optimization

class SmartRecommendationService {

  // ==========================================
  // 🎯 MAIN RECOMMENDATION GENERATION
  // ==========================================

  /**
   * Generate personalized recommendations for a user
   * @param {String} userId - User ID
   * @param {Object} options - Generation options
   * @returns {Array} Array of recommendations
   */
  static async generateRecommendations(userId, options = {}) {
    try {
      console.log(`🧠 Generating smart recommendations for user: ${userId}`);

      // Get user data
      const user = await User.findById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      // Get comprehensive user performance data
      const performanceData = await this.getUserPerformanceData(userId);
      const learningPatterns = await this.analyzeLearningPatterns(userId);
      const currentRecommendations = await Recommendation.find({
        userId,
        isActive: true,
        'userResponse.status': { $in: ['pending', 'accepted', 'partially_followed'] }
      });

      // Avoid over-recommending
      if (currentRecommendations.length >= 10) {
        console.log(`⚠️ User already has ${currentRecommendations.length} active recommendations`);
        return [];
      }

      const recommendations = [];

      // 1. Analyze weak areas and suggest practice questions
      const weakAreaRecommendations = await this.generateWeakAreaRecommendations(
        userId, performanceData, learningPatterns
      );
      recommendations.push(...weakAreaRecommendations);

      // 2. Suggest study materials based on learning style
      const studyMaterialRecommendations = await this.generateStudyMaterialRecommendations(
        userId, performanceData, learningPatterns
      );
      recommendations.push(...studyMaterialRecommendations);

      // 3. Adaptive difficulty suggestions
      const difficultyRecommendations = await this.generateDifficultyAdjustmentRecommendations(
        userId, performanceData, learningPatterns
      );
      recommendations.push(...difficultyRecommendations);

      // 4. Learning path optimization
      const learningPathRecommendations = await this.generateLearningPathRecommendations(
        userId, performanceData, learningPatterns
      );
      recommendations.push(...learningPathRecommendations);

      // 5. Exam preparation recommendations
      const examPrepRecommendations = await this.generateExamPrepRecommendations(
        userId, performanceData, learningPatterns
      );
      recommendations.push(...examPrepRecommendations);

      // Sort by priority and confidence
      const sortedRecommendations = this.prioritizeRecommendations(recommendations);

      // Limit to top recommendations
      const finalRecommendations = sortedRecommendations.slice(0, options.limit || 5);

      // Save recommendations to database
      const savedRecommendations = [];
      for (const rec of finalRecommendations) {
        const savedRec = await new Recommendation(rec).save();
        savedRecommendations.push(savedRec);
      }

      console.log(`✅ Generated ${savedRecommendations.length} smart recommendations`);
      return savedRecommendations;

    } catch (error) {
      console.error('❌ Recommendation generation error:', error);
      throw error;
    }
  }

  // ==========================================
  // 📊 PERFORMANCE DATA ANALYSIS
  // ==========================================

  /**
   * Get comprehensive user performance data
   */
  static async getUserPerformanceData(userId) {
    try {
      // Get student performance record
      const performance = await StudentPerformance.findOne({ studentId: userId })
        .populate('studentId', 'name email gradeLevel');

      if (!performance) {
        // Create basic performance data if none exists
        return {
          overallScore: 50,
          subjectPerformance: [],
          weakAreas: [],
          strongAreas: [],
          recentTrends: 'stable',
          assessmentHistory: []
        };
      }

      // Get recent assessment responses
      const recentResponses = await StudentResponse.find({ studentId: userId })
        .populate('assessmentId', 'subject topic difficulty')
        .sort({ submittedAt: -1 })
        .limit(20);

      // Analyze weak and strong areas
      const subjectScores = {};
      const topicScores = {};

      recentResponses.forEach(response => {
        const subject = response.assessmentId.subject;
        const topic = response.assessmentId.topic;
        const score = response.finalScore;

        if (!subjectScores[subject]) subjectScores[subject] = [];
        if (!topicScores[topic]) topicScores[topic] = [];

        subjectScores[subject].push(score);
        topicScores[topic].push(score);
      });

      // Calculate averages and identify weak/strong areas
      const weakAreas = [];
      const strongAreas = [];

      Object.entries(topicScores).forEach(([topic, scores]) => {
        const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
        if (avgScore < 60) {
          weakAreas.push({ topic, avgScore, attempts: scores.length });
        } else if (avgScore > 80) {
          strongAreas.push({ topic, avgScore, attempts: scores.length });
        }
      });

      return {
        overallScore: performance.analytics.overallPerformance.averageScore,
        subjectPerformance: performance.subjectWisePerformance,
        weakAreas: weakAreas.sort((a, b) => a.avgScore - b.avgScore),
        strongAreas: strongAreas.sort((a, b) => b.avgScore - a.avgScore),
        recentTrends: this.calculateTrend(recentResponses),
        assessmentHistory: recentResponses,
        learningGoals: performance.learningGoals || [],
        preferences: performance.preferences || {}
      };

    } catch (error) {
      console.error('❌ Performance data analysis error:', error);
      return null;
    }
  }

  /**
   * Analyze user learning patterns
   */
  static async analyzeLearningPatterns(userId) {
    try {
      // Get recommendation history to understand patterns
      const pastRecommendations = await Recommendation.find({
        userId,
        'userResponse.status': { $in: ['completed', 'partially_followed'] }
      }).sort({ createdAt: -1 }).limit(50);

      // Get assessment timing patterns
      const responses = await StudentResponse.find({ studentId: userId })
        .sort({ submittedAt: -1 })
        .limit(100);

      // Analyze learning style preferences
      const typePreferences = {};
      const difficultyPreferences = {};
      const timePatterns = {};

      pastRecommendations.forEach(rec => {
        const type = rec.recommendationType;
        typePreferences[type] = (typePreferences[type] || 0) + 1;
        
        if (rec.userResponse.rating) {
          if (!difficultyPreferences[rec.content.difficultyAdjustment?.recommendedLevel]) {
            difficultyPreferences[rec.content.difficultyAdjustment?.recommendedLevel] = [];
          }
          difficultyPreferences[rec.content.difficultyAdjustment?.recommendedLevel].push(rec.userResponse.rating);
        }
      });

      // Analyze study time patterns
      responses.forEach(response => {
        const hour = new Date(response.submittedAt).getHours();
        let timeSlot;
        if (hour < 12) timeSlot = 'morning';
        else if (hour < 17) timeSlot = 'afternoon';
        else timeSlot = 'evening';

        timePatterns[timeSlot] = (timePatterns[timeSlot] || 0) + 1;
      });

      // Determine preferred learning style based on past behavior
      const preferredTypes = Object.entries(typePreferences)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3)
        .map(([type]) => type);

      const preferredTime = Object.entries(timePatterns)
        .sort(([,a], [,b]) => b - a)[0]?.[0] || 'evening';

      return {
        preferredRecommendationTypes: preferredTypes,
        preferredStudyTime: preferredTime,
        averageSessionLength: this.calculateAverageSessionLength(responses),
        learningStyle: this.determineLearningStyle(pastRecommendations),
        engagementLevel: this.calculateEngagementLevel(pastRecommendations),
        attentionSpan: this.estimateAttentionSpan(responses),
        difficultyPreference: this.calculateDifficultyPreference(difficultyPreferences)
      };

    } catch (error) {
      console.error('❌ Learning patterns analysis error:', error);
      return {};
    }
  }

  // ==========================================
  // 🎯 SPECIFIC RECOMMENDATION GENERATORS
  // ==========================================

  /**
   * Generate recommendations for weak areas
   */
  static async generateWeakAreaRecommendations(userId, performanceData, learningPatterns) {
    const recommendations = [];

    for (const weakArea of performanceData.weakAreas.slice(0, 3)) {
      // Find relevant practice questions
      const practiceQuestions = await Assessment.find({
        topic: { $regex: weakArea.topic, $options: 'i' },
        difficulty: this.selectOptimalDifficulty(weakArea.avgScore),
        isActive: true
      }).limit(5);

      if (practiceQuestions.length > 0) {
        const recommendation = {
          userId,
          userRole: 'student',
          targetSubject: practiceQuestions[0].subject,
          targetTopic: weakArea.topic,
          gradeLevel: performanceData.gradeLevel || '10th',
          recommendationType: 'practice_questions',
          title: `Strengthen Your Understanding: ${weakArea.topic}`,
          description: `Based on your recent performance (${Math.round(weakArea.avgScore)}%), here are targeted practice questions to help you improve in ${weakArea.topic}.`,
          
          content: {
            practiceQuestions: practiceQuestions.map(q => ({
              questionId: q._id,
              questionText: q.title,
              difficulty: q.difficulty,
              estimatedTime: this.estimateQuestionTime(q.difficulty),
              concepts: q.topics || [weakArea.topic],
              reason: `This question targets your weak area in ${weakArea.topic} where you scored ${Math.round(weakArea.avgScore)}%`
            })),
            genericContent: {
              actionItems: [
                `Solve ${practiceQuestions.length} practice questions on ${weakArea.topic}`,
                'Review concepts before attempting questions',
                'Take notes on mistakes and learn from them',
                'Practice regularly for 15-20 minutes daily'
              ],
              tips: [
                'Start with easier questions to build confidence',
                'Focus on understanding concepts, not just memorizing',
                'Track your improvement over time',
                'Ask for help when you get stuck'
              ],
              timeEstimate: `${practiceQuestions.length * 10} minutes`,
              expectedBenefits: [
                `Improve ${weakArea.topic} score by 15-20%`,
                'Build stronger conceptual foundation',
                'Increase confidence in this topic',
                'Better preparation for upcoming tests'
              ]
            }
          },

          reasoningData: {
            performanceAnalysis: {
              weakAreas: [weakArea.topic],
              strongAreas: performanceData.strongAreas.map(s => s.topic),
              averageScore: weakArea.avgScore,
              recentTrends: performanceData.recentTrends,
              specificGaps: [`Low performance in ${weakArea.topic}`]
            },
            learningPatterns: learningPatterns,
            aiAnalysis: {
              confidenceScore: 85,
              factors: [
                'Low performance in specific topic',
                'Available practice questions',
                'User learning patterns',
                'Difficulty progression'
              ],
              dataPoints: weakArea.attempts,
              modelVersion: '1.0',
              generatedAt: new Date()
            }
          },

          priority: weakArea.avgScore < 40 ? 'critical' : weakArea.avgScore < 60 ? 'high' : 'medium',
          urgency: 'this_week',
          expectedImpact: 'significant',
          effortLevel: 'moderate',
          estimatedDuration: { value: 1, unit: 'weeks' },
          schedule: {
            frequency: 'daily',
            sessionDuration: 20,
            timeOfDay: [learningPatterns.preferredStudyTime || 'evening'],
            daysOfWeek: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
          }
        };

        recommendations.push(recommendation);
      }
    }

    return recommendations;
  }

  /**
   * Generate study material recommendations
   */
  static async generateStudyMaterialRecommendations(userId, performanceData, learningPatterns) {
    const recommendations = [];

    // Focus on top 2 weak areas for study materials
    for (const weakArea of performanceData.weakAreas.slice(0, 2)) {
      const studyMaterials = this.getStudyMaterials(weakArea.topic, learningPatterns.learningStyle);

      const recommendation = {
        userId,
        userRole: 'student',
        targetSubject: this.getSubjectFromTopic(weakArea.topic),
        targetTopic: weakArea.topic,
        gradeLevel: performanceData.gradeLevel || '10th',
        recommendationType: 'study_materials',
        title: `Study Resources for ${weakArea.topic}`,
        description: `Curated study materials to help you master ${weakArea.topic}. These resources match your learning style and current level.`,

        content: {
          studyMaterials: studyMaterials,
          genericContent: {
            actionItems: [
              `Review ${studyMaterials.length} recommended study materials`,
              'Take notes while studying',
              'Create summary flashcards',
              'Test understanding with practice problems'
            ],
            resources: studyMaterials.map(m => m.title),
            tips: [
              'Study in short, focused sessions',
              'Use active learning techniques',
              'Connect new concepts to what you already know',
              'Regular revision is key to retention'
            ],
            timeEstimate: '2-3 hours total',
            expectedBenefits: [
              'Deeper understanding of concepts',
              'Better preparation for assessments',
              'Improved confidence in the topic',
              'Foundation for advanced topics'
            ]
          }
        },

        reasoningData: {
          performanceAnalysis: {
            weakAreas: [weakArea.topic],
            averageScore: weakArea.avgScore,
            recentTrends: performanceData.recentTrends
          },
          learningPatterns: learningPatterns,
          aiAnalysis: {
            confidenceScore: 78,
            factors: [
              'Learning style match',
              'Topic-specific materials',
              'User preferences',
              'Difficulty level appropriate'
            ],
            dataPoints: studyMaterials.length,
            modelVersion: '1.0'
          }
        },

        priority: 'medium',
        urgency: 'this_week',
        expectedImpact: 'moderate',
        effortLevel: 'light',
        estimatedDuration: { value: 3, unit: 'days' }
      };

      recommendations.push(recommendation);
    }

    return recommendations;
  }

  /**
   * Generate difficulty adjustment recommendations
   */
  static async generateDifficultyAdjustmentRecommendations(userId, performanceData, learningPatterns) {
    const recommendations = [];

    // Analyze if user needs difficulty adjustment
    const recentScores = performanceData.assessmentHistory.slice(0, 10).map(r => r.finalScore);
    const averageRecentScore = recentScores.reduce((a, b) => a + b, 0) / recentScores.length;

    let adjustmentNeeded = false;
    let newLevel = 'intermediate';
    let reason = '';

    if (averageRecentScore < 50) {
      adjustmentNeeded = true;
      newLevel = 'beginner';
      reason = 'Recent performance suggests starting with fundamental concepts';
    } else if (averageRecentScore > 85) {
      adjustmentNeeded = true;
      newLevel = 'advanced';
      reason = 'Strong performance indicates readiness for more challenging content';
    } else if (performanceData.recentTrends === 'declining') {
      adjustmentNeeded = true;
      newLevel = 'elementary';
      reason = 'Declining performance suggests need for concept reinforcement';
    }

    if (adjustmentNeeded) {
      const recommendation = {
        userId,
        userRole: 'student',
        targetSubject: 'General',
        targetTopic: 'Difficulty Optimization',
        gradeLevel: performanceData.gradeLevel || '10th',
        recommendationType: 'difficulty_adjustment',
        title: `Optimize Your Learning Difficulty Level`,
        description: `Based on your recent performance, we recommend adjusting to ${newLevel} level content for better learning outcomes.`,

        content: {
          difficultyAdjustment: {
            currentLevel: this.getCurrentDifficultyLevel(averageRecentScore),
            recommendedLevel: newLevel,
            adjustmentReason: reason,
            gradualSteps: this.getGradualSteps(newLevel),
            timeframe: '2 weeks'
          },
          genericContent: {
            actionItems: [
              `Transition to ${newLevel} level content`,
              'Focus on building strong foundations',
              'Practice consistently at the new level',
              'Monitor progress and adjust as needed'
            ],
            tips: [
              'Don\'t rush the transition',
              'Celebrate small victories',
              'Ask for help when needed',
              'Stay consistent with practice'
            ],
            timeEstimate: '2 weeks for full transition',
            expectedBenefits: [
              'Better learning outcomes',
              'Increased confidence',
              'Reduced frustration',
              'Stronger conceptual understanding'
            ]
          }
        },

        reasoningData: {
          performanceAnalysis: {
            averageScore: averageRecentScore,
            recentTrends: performanceData.recentTrends,
            specificGaps: ['Difficulty level mismatch']
          },
          aiAnalysis: {
            confidenceScore: 72,
            factors: ['Recent performance trend', 'Score consistency', 'Learning progression'],
            dataPoints: recentScores.length
          }
        },

        priority: 'high',
        urgency: 'this_week',
        expectedImpact: 'significant',
        effortLevel: 'moderate'
      };

      recommendations.push(recommendation);
    }

    return recommendations;
  }

  /**
   * Generate learning path recommendations
   */
  static async generateLearningPathRecommendations(userId, performanceData, learningPatterns) {
    const recommendations = [];

    // Create personalized learning path based on goals and weak areas
    if (performanceData.learningGoals.length > 0 || performanceData.weakAreas.length >= 3) {
      const primaryGoal = performanceData.learningGoals[0] || {
        subject: this.getPrimaryWeakSubject(performanceData.weakAreas),
        target: 'Improve overall performance'
      };

      const learningPath = this.createLearningPath(primaryGoal, performanceData, learningPatterns);

      const recommendation = {
        userId,
        userRole: 'student',
        targetSubject: primaryGoal.subject,
        targetTopic: 'Complete Learning Path',
        gradeLevel: performanceData.gradeLevel || '10th',
        recommendationType: 'learning_path',
        title: `Personalized Learning Journey: ${primaryGoal.subject}`,
        description: `A structured 4-week learning path designed specifically for your goals and current performance level.`,

        content: {
          learningPath: learningPath,
          genericContent: {
            actionItems: [
              'Follow the step-by-step learning path',
              'Complete each milestone before moving forward',
              'Track your progress regularly',
              'Adjust timeline based on your pace'
            ],
            tips: [
              'Consistency is more important than speed',
              'Review previous steps if you get stuck',
              'Celebrate milestone achievements',
              'Don\'t hesitate to repeat difficult concepts'
            ],
            timeEstimate: '4 weeks with daily practice',
            expectedBenefits: [
              'Systematic skill development',
              'Clear progress tracking',
              'Comprehensive understanding',
              'Achievement of learning goals'
            ]
          }
        },

        reasoningData: {
          performanceAnalysis: performanceData,
          learningPatterns: learningPatterns,
          aiAnalysis: {
            confidenceScore: 88,
            factors: [
              'Personalized path creation',
              'Goal alignment',
              'Performance-based progression',
              'Learning style consideration'
            ],
            dataPoints: performanceData.weakAreas.length + performanceData.learningGoals.length
          }
        },

        priority: 'high',
        urgency: 'this_month',
        expectedImpact: 'significant',
        effortLevel: 'intensive',
        estimatedDuration: { value: 4, unit: 'weeks' }
      };

      recommendations.push(recommendation);
    }

    return recommendations;
  }

  /**
   * Generate exam preparation recommendations
   */
  static async generateExamPrepRecommendations(userId, performanceData, learningPatterns) {
    const recommendations = [];

    // Check if there are upcoming assessments or if user needs exam prep
    const upcomingDeadlines = performanceData.learningGoals.filter(goal => 
      goal.deadline && new Date(goal.deadline) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    );

    if (upcomingDeadlines.length > 0 || performanceData.overallScore < 70) {
      const recommendation = {
        userId,
        userRole: 'student',
        targetSubject: 'General',
        targetTopic: 'Exam Preparation',
        gradeLevel: performanceData.gradeLevel || '10th',
        recommendationType: 'exam_preparation',
        title: `Strategic Exam Preparation Plan`,
        description: `A comprehensive preparation strategy focusing on your weak areas and time management for upcoming assessments.`,

        content: {
          genericContent: {
            actionItems: [
              'Create a study schedule covering all subjects',
              'Focus extra time on weak areas',
              'Practice with timed mock tests',
              'Review and revise systematically'
            ],
            resources: [
              'Previous year question papers',
              'Topic-wise practice sets',
              'Revision notes and summaries',
              'Time management techniques'
            ],
            tips: [
              'Start preparation early',
              'Balance study with adequate rest',
              'Practice under exam conditions',
              'Focus on understanding, not just memorizing'
            ],
            timeEstimate: '2-3 weeks of focused preparation',
            expectedBenefits: [
              'Better exam performance',
              'Reduced exam anxiety',
              'Improved time management',
              'Comprehensive topic coverage'
            ]
          }
        },

        priority: upcomingDeadlines.length > 0 ? 'critical' : 'high',
        urgency: 'immediate',
        expectedImpact: 'significant',
        effortLevel: 'intensive',
        estimatedDuration: { value: 3, unit: 'weeks' }
      };

      recommendations.push(recommendation);
    }

    return recommendations;
  }

  // ==========================================
  // 🔧 HELPER METHODS
  // ==========================================

  static calculateTrend(responses) {
    if (responses.length < 3) return 'stable';
    
    const recent = responses.slice(0, 5).map(r => r.finalScore);
    const older = responses.slice(5, 10).map(r => r.finalScore);
    
    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
    
    const diff = recentAvg - olderAvg;
    
    if (diff > 5) return 'improving';
    if (diff < -5) return 'declining';
    return 'stable';
  }

  static selectOptimalDifficulty(currentScore) {
    if (currentScore < 40) return 'easy';
    if (currentScore < 60) return 'medium';
    if (currentScore < 80) return 'medium';
    return 'hard';
  }

  static estimateQuestionTime(difficulty) {
    const timeMap = {
      'easy': 5,
      'medium': 10,
      'hard': 15,
      'expert': 20
    };
    return timeMap[difficulty] || 10;
  }

  static getStudyMaterials(topic, learningStyle) {
    // In a real implementation, this would query a database of study materials
    const materials = [
      {
        materialType: 'video',
        title: `${topic} - Concept Explanation`,
        description: `Comprehensive video tutorial covering ${topic} fundamentals`,
        url: `https://example.com/videos/${topic.replace(/\s+/g, '-').toLowerCase()}`,
        duration: 30,
        difficulty: 'beginner',
        relevanceScore: 95,
        reason: 'Visual explanation matches your learning style'
      },
      {
        materialType: 'article',
        title: `${topic} - Study Guide`,
        description: `Detailed study guide with examples and practice problems`,
        url: `https://example.com/guides/${topic.replace(/\s+/g, '-').toLowerCase()}`,
        duration: 45,
        difficulty: 'intermediate',
        relevanceScore: 88,
        reason: 'Comprehensive coverage of key concepts'
      },
      {
        materialType: 'interactive',
        title: `${topic} - Interactive Practice`,
        description: `Interactive exercises and simulations for hands-on learning`,
        url: `https://example.com/interactive/${topic.replace(/\s+/g, '-').toLowerCase()}`,
        duration: 25,
        difficulty: 'intermediate',
        relevanceScore: 92,
        reason: 'Interactive format enhances understanding'
      }
    ];

    // Filter based on learning style
    if (learningStyle === 'visual') {
      return materials.filter(m => ['video', 'interactive'].includes(m.materialType));
    }
    
    return materials;
  }

  static getCurrentDifficultyLevel(score) {
    if (score < 40) return 'beginner';
    if (score < 60) return 'elementary';
    if (score < 75) return 'intermediate';
    if (score < 90) return 'advanced';
    return 'expert';
  }

  static getGradualSteps(targetLevel) {
    const steps = {
      'beginner': [
        'Review fundamental concepts',
        'Practice basic problems',
        'Build confidence with easy exercises',
        'Gradually increase complexity'
      ],
      'elementary': [
        'Strengthen foundational knowledge',
        'Practice moderate difficulty problems',
        'Focus on concept application',
        'Build problem-solving skills'
      ],
      'intermediate': [
        'Apply concepts to real problems',
        'Practice mixed difficulty questions',
        'Develop analytical thinking',
        'Prepare for advanced topics'
      ],
      'advanced': [
        'Tackle complex problems',
        'Explore advanced applications',
        'Develop critical thinking',
        'Prepare for expert level'
      ]
    };
    return steps[targetLevel] || steps['intermediate'];
  }

  static createLearningPath(goal, performanceData, learningPatterns) {
    const steps = [];
    const weakAreas = performanceData.weakAreas.slice(0, 4);
    
    weakAreas.forEach((area, index) => {
      steps.push({
        stepNumber: index + 1,
        title: `Master ${area.topic}`,
        description: `Focus on improving understanding and performance in ${area.topic}`,
        concepts: [area.topic],
        estimatedDuration: 7, // days
        prerequisites: index > 0 ? [steps[index - 1].title] : [],
        resources: [
          `${area.topic} study materials`,
          `Practice questions for ${area.topic}`,
          `${area.topic} video tutorials`
        ],
        assessments: [`${area.topic} progress test`],
        milestones: [
          `Complete study materials review`,
          `Solve 10 practice questions`,
          `Achieve 75% in practice test`
        ]
      });
    });

    return {
      pathName: `${goal.subject} Mastery Path`,
      totalDuration: steps.length * 7,
      steps: steps,
      expectedOutcomes: [
        'Improve weak area performance by 20%',
        'Build strong conceptual foundation',
        'Develop problem-solving confidence',
        'Prepare for advanced topics'
      ],
      skillsToGain: [
        'Conceptual understanding',
        'Problem-solving techniques',
        'Application skills',
        'Analytical thinking'
      ]
    };
  }

  static prioritizeRecommendations(recommendations) {
    const priorityWeights = {
      'critical': 4,
      'high': 3,
      'medium': 2,
      'low': 1
    };

    return recommendations.sort((a, b) => {
      // First sort by priority
      const priorityDiff = priorityWeights[b.priority] - priorityWeights[a.priority];
      if (priorityDiff !== 0) return priorityDiff;

      // Then by confidence score
      const confidenceA = a.reasoningData?.aiAnalysis?.confidenceScore || 0;
      const confidenceB = b.reasoningData?.aiAnalysis?.confidenceScore || 0;
      return confidenceB - confidenceA;
    });
  }

  static calculateAverageSessionLength(responses) {
    if (responses.length < 2) return 30; // default 30 minutes
    
    const sessions = responses.map(r => r.timeSpent || 20);
    return sessions.reduce((a, b) => a + b, 0) / sessions.length;
  }

  static determineLearningStyle(pastRecommendations) {
    const typePreferences = {};
    pastRecommendations.forEach(rec => {
      const type = rec.recommendationType;
      if (rec.userResponse.rating && rec.userResponse.rating >= 4) {
        typePreferences[type] = (typePreferences[type] || 0) + 1;
      }
    });

    if (typePreferences['study_materials'] > typePreferences['practice_questions']) {
      return 'reading';
    }
    return 'kinesthetic';
  }

  static calculateEngagementLevel(pastRecommendations) {
    const completedCount = pastRecommendations.filter(r => 
      r.userResponse.status === 'completed'
    ).length;
    
    const totalCount = pastRecommendations.length;
    const completionRate = totalCount > 0 ? completedCount / totalCount : 0.5;
    
    if (completionRate > 0.8) return 'high';
    if (completionRate > 0.5) return 'medium';
    return 'low';
  }

  static estimateAttentionSpan(responses) {
    const avgTime = responses.reduce((sum, r) => sum + (r.timeSpent || 20), 0) / responses.length;
    return Math.min(60, Math.max(15, avgTime)); // between 15-60 minutes
  }

  static calculateDifficultyPreference(difficultyPreferences) {
    let bestDifficulty = 'intermediate';
    let bestRating = 0;

    Object.entries(difficultyPreferences).forEach(([difficulty, ratings]) => {
      const avgRating = ratings.reduce((a, b) => a + b, 0) / ratings.length;
      if (avgRating > bestRating) {
        bestRating = avgRating;
        bestDifficulty = difficulty;
      }
    });

    return bestDifficulty || 'intermediate';
  }

  static getSubjectFromTopic(topic) {
    // Simple mapping - in real implementation, this would be more sophisticated
    const topicToSubject = {
      'algebra': 'Mathematics',
      'geometry': 'Mathematics',
      'calculus': 'Mathematics',
      'physics': 'Physics',
      'chemistry': 'Chemistry',
      'biology': 'Biology',
      'english': 'English',
      'history': 'History'
    };

    const subject = Object.keys(topicToSubject).find(key => 
      topic.toLowerCase().includes(key)
    );

    return topicToSubject[subject] || 'General';
  }

  static getPrimaryWeakSubject(weakAreas) {
    if (weakAreas.length === 0) return 'General';
    return this.getSubjectFromTopic(weakAreas[0].topic);
  }
}

module.exports = SmartRecommendationService;
