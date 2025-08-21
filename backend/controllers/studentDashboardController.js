const StudentPerformance = require('../models/StudentPerformance');
const Assessment = require('../models/Assessment');
const StudentResponse = require('../models/StudentResponse');
const User = require('../models/User');
const DashboardAnalyticsService = require('../services/DashboardAnalyticsService');

// 📊 GyanGuru Student Performance Dashboard Controller
// Features: Analytics, Progress tracking, Improvement suggestions, Class comparisons

// ==========================================
// 📈 DASHBOARD OVERVIEW
// ==========================================

// Get student dashboard overview
const getDashboardOverview = async (req, res) => {
  try {
    const studentId = req.user._id;
    
    console.log(`📊 Getting dashboard overview for student: ${studentId}`);

    // Get or create student performance record
    let performance = await StudentPerformance.findOne({ studentId });
    
    if (!performance) {
      // Create initial performance record
      performance = await createInitialPerformanceRecord(studentId);
    } else {
      // Update performance if data is stale (older than 1 hour)
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      if (performance.lastUpdated < oneHourAgo) {
        performance = await updatePerformanceData(studentId);
      }
    }

    // Calculate additional insights
    const insights = await calculateDashboardInsights(performance);
    
    // Get recent achievements
    const recentAchievements = performance.achievements
      .sort((a, b) => b.earnedDate - a.earnedDate)
      .slice(0, 5);

    // Get active goals
    const activeGoals = performance.academicGoals
      .filter(goal => goal.status === 'in_progress')
      .sort((a, b) => a.deadline - b.deadline);

    // Get improvement suggestions
    const suggestions = performance.getImprovementSuggestions();

    const dashboardData = {
      // Basic Info
      student: {
        name: req.user.name,
        avatar: req.user.avatar,
        grade: req.user.academicInfo?.class,
        school: req.user.academicInfo?.institution
      },

      // Overall Performance
      overview: {
        overallGrade: performance.currentGradeLevel,
        overallPercentage: performance.overallMetrics.overallPercentage,
        overallGPA: performance.overallMetrics.overallGPA,
        monthlyImprovement: performance.overallMetrics.monthlyImprovement,
        performanceStatus: performance.performanceStatus,
        studyEfficiency: performance.studyEfficiency
      },

      // Study Analytics
      studyAnalytics: {
        totalStudyTime: performance.overallMetrics.totalStudyTime,
        averageSessionTime: performance.overallMetrics.averageSessionTime,
        studyRegularity: performance.overallMetrics.studyRegularity,
        focusScore: performance.overallMetrics.focusScore,
        procrastinationIndex: performance.overallMetrics.procrastinationIndex
      },

      // Subject Performance Summary (top 6 subjects)
      topSubjects: performance.subjectPerformance
        .sort((a, b) => b.averageScore - a.averageScore)
        .slice(0, 6)
        .map(subject => ({
          subject: subject.subject,
          score: Math.round(subject.averageScore),
          trend: subject.improvementRate,
          color: getSubjectColor(subject.subject),
          status: getPerformanceStatus(subject.averageScore)
        })),

      // Progress Trends
      progressTrends: insights.progressTrends,

      // Weak & Strong Areas
      weakAreas: insights.weakAreas.slice(0, 5),
      strongAreas: insights.strongAreas.slice(0, 5),

      // Recent Data
      recentAchievements,
      activeGoals: activeGoals.slice(0, 3),
      suggestions: suggestions.slice(0, 4),

      // Quick Stats
      quickStats: {
        assessmentsCompleted: performance.overallMetrics.totalAssessmentsCompleted,
        currentStreak: insights.currentStreak,
        rank: performance.peerComparison.classPosition,
        totalStudents: insights.totalClassmates
      },

      // Last Updated
      lastUpdated: performance.lastUpdated,
      dataFreshness: insights.dataFreshness
    };

    console.log(`✅ Dashboard overview generated successfully`);

    res.status(200).json({
      success: true,
      message: 'Dashboard overview retrieved successfully',
      data: dashboardData
    });

  } catch (error) {
    console.error('❌ Dashboard overview error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while loading dashboard',
      error: error.message
    });
  }
};

// ==========================================
// 📚 SUBJECT-WISE ANALYSIS
// ==========================================

// Get detailed subject-wise performance
const getSubjectAnalysis = async (req, res) => {
  try {
    const studentId = req.user._id;
    const { subject, timeframe = 'month' } = req.query;

    console.log(`📚 Getting subject analysis for: ${subject || 'all subjects'}`);

    const performance = await StudentPerformance.findOne({ studentId });
    if (!performance) {
      return res.status(404).json({
        success: false,
        message: 'Performance data not found'
      });
    }

    let analysisData;

    if (subject) {
      // Single subject analysis
      const subjectData = performance.getSubjectAnalysis(subject);
      if (!subjectData) {
        return res.status(404).json({
          success: false,
          message: `No data found for subject: ${subject}`
        });
      }

      // Get class average for comparison
      const classAverage = await StudentPerformance.getClassAverages(
        req.user.academicInfo?.class, 
        subject
      );

      // Get monthly progress for subject
      const subjectPerf = performance.subjectPerformance.find(s => s.subject === subject);
      const monthlyProgress = subjectPerf.monthlyScores
        .sort((a, b) => new Date(a.year, a.month) - new Date(b.year, b.month))
        .slice(-6); // Last 6 months

      analysisData = {
        subject: subject,
        performance: {
          currentScore: subjectData.performance,
          trend: subjectData.trend,
          bestScore: subjectPerf.bestScore,
          worstScore: subjectPerf.worstScore,
          consistency: subjectPerf.consistencyScore
        },
        
        classComparison: {
          yourScore: subjectData.performance,
          classAverage: classAverage[0]?.averageScore || 0,
          yourRank: subjectData.ranking.position,
          totalStudents: subjectData.ranking.totalStudents,
          percentile: subjectData.ranking.percentile,
          status: subjectData.performance > (classAverage[0]?.averageScore || 0) ? 'above' : 'below'
        },

        progressChart: {
          labels: monthlyProgress.map(m => `${getMonthName(m.month)} ${m.year}`),
          scores: monthlyProgress.map(m => m.averageScore),
          timeSpent: monthlyProgress.map(m => m.timeSpent),
          assessments: monthlyProgress.map(m => m.assessmentCount)
        },

        strengthsAndWeaknesses: {
          strongTopics: subjectData.strongAreas.map(topic => ({
            topic: topic.topic,
            masteryLevel: topic.masteryLevel,
            successRate: topic.successRate
          })),
          weakTopics: subjectData.weakAreas.map(topic => ({
            topic: topic.topic,
            successRate: topic.successRate,
            attempts: topic.attemptsCount,
            priority: topic.successRate < 40 ? 'high' : topic.successRate < 60 ? 'medium' : 'low'
          }))
        },

        timeAnalysis: {
          totalTime: subjectPerf.totalTimeSpent,
          averagePerAssessment: subjectPerf.averageTimePerAssessment,
          efficiency: subjectData.timeEfficiency,
          optimalTime: calculateOptimalStudyTime(subjectPerf)
        },

        difficultyProgression: subjectPerf.difficultyProgression,

        recommendations: generateSubjectRecommendations(subjectPerf, classAverage[0])
      };

    } else {
      // All subjects analysis
      const subjectComparisons = performance.subjectPerformance.map(subject => ({
        subject: subject.subject,
        score: subject.averageScore,
        trend: subject.improvementRate,
        timeSpent: subject.totalTimeSpent,
        rank: subject.classRanking.position,
        assessments: subject.completedAssessments,
        status: getPerformanceStatus(subject.averageScore)
      }));

      analysisData = {
        overview: {
          totalSubjects: performance.subjectPerformance.length,
          averageScore: performance.overallMetrics.overallPercentage,
          bestSubject: subjectComparisons.reduce((best, current) => 
            current.score > best.score ? current : best
          ),
          improvingSubjects: subjectComparisons.filter(s => s.trend > 0).length,
          needsAttention: subjectComparisons.filter(s => s.score < 60).length
        },

        subjectComparison: subjectComparisons.sort((a, b) => b.score - a.score),

        performanceDistribution: {
          excellent: subjectComparisons.filter(s => s.score >= 90).length,
          good: subjectComparisons.filter(s => s.score >= 70 && s.score < 90).length,
          average: subjectComparisons.filter(s => s.score >= 50 && s.score < 70).length,
          needsWork: subjectComparisons.filter(s => s.score < 50).length
        },

        timeDistribution: subjectComparisons.map(s => ({
          subject: s.subject,
          timeSpent: s.timeSpent,
          percentage: (s.timeSpent / subjectComparisons.reduce((total, sub) => total + sub.timeSpent, 0)) * 100
        }))
      };
    }

    console.log(`✅ Subject analysis completed`);

    res.status(200).json({
      success: true,
      message: 'Subject analysis retrieved successfully',
      data: analysisData
    });

  } catch (error) {
    console.error('❌ Subject analysis error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while getting subject analysis',
      error: error.message
    });
  }
};

// ==========================================
// 📈 PROGRESS TRACKING
// ==========================================

// Get monthly progress data
const getMonthlyProgress = async (req, res) => {
  try {
    const studentId = req.user._id;
    const { months = 6, subject = null } = req.query;

    console.log(`📈 Getting ${months}-month progress for student: ${studentId}`);

    const performance = await StudentPerformance.findOne({ studentId });
    if (!performance) {
      return res.status(404).json({
        success: false,
        message: 'Performance data not found'
      });
    }

    const progressData = performance.calculateProgressTrend(parseInt(months));
    
    // Get detailed monthly data
    const currentDate = new Date();
    const monthlyDetails = [];

    for (let i = months - 1; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const month = date.getMonth() + 1;
      const year = date.getFullYear();

      let monthData = {
        month: getMonthName(month),
        year: year,
        monthNumber: month,
        overall: {
          averageScore: 0,
          assessments: 0,
          timeSpent: 0,
          improvement: 0
        },
        subjects: {}
      };

      if (subject) {
        // Single subject progress
        const subjectPerf = performance.subjectPerformance.find(s => s.subject === subject);
        if (subjectPerf) {
          const monthlyScore = subjectPerf.monthlyScores.find(m => m.month === month && m.year === year);
          if (monthlyScore) {
            monthData.overall = {
              averageScore: monthlyScore.averageScore,
              assessments: monthlyScore.assessmentCount,
              timeSpent: monthlyScore.timeSpent,
              improvement: 0 // Calculate based on previous month
            };
          }
        }
      } else {
        // All subjects progress
        let totalScore = 0;
        let totalAssessments = 0;
        let totalTime = 0;
        let subjectCount = 0;

        performance.subjectPerformance.forEach(subject => {
          const monthlyScore = subject.monthlyScores.find(m => m.month === month && m.year === year);
          if (monthlyScore) {
            totalScore += monthlyScore.averageScore;
            totalAssessments += monthlyScore.assessmentCount;
            totalTime += monthlyScore.timeSpent;
            subjectCount++;

            monthData.subjects[subject.subject] = {
              score: monthlyScore.averageScore,
              assessments: monthlyScore.assessmentCount,
              timeSpent: monthlyScore.timeSpent
            };
          }
        });

        if (subjectCount > 0) {
          monthData.overall = {
            averageScore: totalScore / subjectCount,
            assessments: totalAssessments,
            timeSpent: totalTime,
            improvement: 0 // Calculate later
          };
        }
      }

      monthlyDetails.push(monthData);
    }

    // Calculate month-to-month improvements
    for (let i = 1; i < monthlyDetails.length; i++) {
      const current = monthlyDetails[i].overall.averageScore;
      const previous = monthlyDetails[i - 1].overall.averageScore;
      if (previous > 0) {
        monthlyDetails[i].overall.improvement = ((current - previous) / previous) * 100;
      }
    }

    // Generate insights
    const insights = {
      overallTrend: progressData.direction,
      trendValue: progressData.trend,
      bestMonth: monthlyDetails.reduce((best, current) => 
        current.overall.averageScore > best.overall.averageScore ? current : best
      ),
      mostImprovement: monthlyDetails.reduce((best, current) => 
        current.overall.improvement > best.overall.improvement ? current : best
      ),
      consistencyScore: calculateConsistency(monthlyDetails.map(m => m.overall.averageScore)),
      averageGrowth: monthlyDetails.reduce((sum, m) => sum + m.overall.improvement, 0) / months
    };

    // Predictions for next month
    const predictions = generateProgressPredictions(monthlyDetails, performance);

    const responseData = {
      period: `${months} months`,
      subject: subject || 'all',
      trend: progressData,
      monthlyDetails,
      insights,
      predictions,
      chartData: {
        labels: monthlyDetails.map(m => `${m.month} ${m.year}`),
        scores: monthlyDetails.map(m => m.overall.averageScore),
        improvements: monthlyDetails.map(m => m.overall.improvement),
        timeSpent: monthlyDetails.map(m => m.overall.timeSpent),
        assessments: monthlyDetails.map(m => m.overall.assessments)
      }
    };

    console.log(`✅ Monthly progress data generated`);

    res.status(200).json({
      success: true,
      message: 'Monthly progress retrieved successfully',
      data: responseData
    });

  } catch (error) {
    console.error('❌ Monthly progress error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while getting progress data',
      error: error.message
    });
  }
};

// ==========================================
// 🎯 WEAK AREAS & IMPROVEMENT
// ==========================================

// Get weak areas analysis
const getWeakAreasAnalysis = async (req, res) => {
  try {
    const studentId = req.user._id;

    console.log(`🎯 Analyzing weak areas for student: ${studentId}`);

    const performance = await StudentPerformance.findOne({ studentId });
    if (!performance) {
      return res.status(404).json({
        success: false,
        message: 'Performance data not found'
      });
    }

    // Collect all weak topics across subjects
    const allWeakAreas = [];
    
    performance.subjectPerformance.forEach(subject => {
      subject.weakTopics.forEach(topic => {
        allWeakAreas.push({
          subject: subject.subject,
          topic: topic.topic,
          successRate: topic.successRate,
          attempts: topic.attemptsCount,
          needsImprovement: topic.needsImprovement,
          priority: topic.successRate < 30 ? 'critical' : 
                   topic.successRate < 50 ? 'high' : 'medium',
          estimatedImprovementTime: calculateImprovementTime(topic)
        });
      });
    });

    // Sort by priority and success rate
    const prioritizedWeakAreas = allWeakAreas
      .sort((a, b) => a.successRate - b.successRate)
      .slice(0, 15); // Top 15 weak areas

    // Group by subject
    const weakAreasBySubject = {};
    prioritizedWeakAreas.forEach(area => {
      if (!weakAreasBySubject[area.subject]) {
        weakAreasBySubject[area.subject] = [];
      }
      weakAreasBySubject[area.subject].push(area);
    });

    // Generate improvement plan
    const improvementPlan = generateImprovementPlan(prioritizedWeakAreas, performance);

    // Get recommended resources
    const recommendedResources = await getRecommendedResources(prioritizedWeakAreas);

    // Calculate improvement potential
    const improvementPotential = calculateImprovementPotential(prioritizedWeakAreas, performance);

    const analysisData = {
      summary: {
        totalWeakAreas: allWeakAreas.length,
        criticalAreas: allWeakAreas.filter(a => a.priority === 'critical').length,
        highPriorityAreas: allWeakAreas.filter(a => a.priority === 'high').length,
        averageSuccessRate: allWeakAreas.reduce((sum, a) => sum + a.successRate, 0) / allWeakAreas.length
      },

      prioritizedWeakAreas,
      weakAreasBySubject,
      improvementPlan,
      recommendedResources,
      improvementPotential,

      actionItems: improvementPlan.actionItems.slice(0, 5),
      
      progressTracking: {
        targetImprovement: 20, // 20% improvement in weak areas
        timeframe: '1 month',
        milestones: improvementPlan.milestones
      }
    };

    console.log(`✅ Weak areas analysis completed`);

    res.status(200).json({
      success: true,
      message: 'Weak areas analysis retrieved successfully',
      data: analysisData
    });

  } catch (error) {
    console.error('❌ Weak areas analysis error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while analyzing weak areas',
      error: error.message
    });
  }
};

// ==========================================
// 📊 CLASS COMPARISON
// ==========================================

// Get class comparison data
const getClassComparison = async (req, res) => {
  try {
    const studentId = req.user._id;
    const studentGrade = req.user.academicInfo?.class;

    console.log(`📊 Getting class comparison for grade: ${studentGrade}`);

    const performance = await StudentPerformance.findOne({ studentId });
    if (!performance) {
      return res.status(404).json({
        success: false,
        message: 'Performance data not found'
      });
    }

    // Get class averages
    const classAverages = await StudentPerformance.getClassAverages(studentGrade);
    
    // Get top performers
    const topPerformers = await StudentPerformance.getTopPerformers(null, 10);
    
    // Get subject-wise class comparison
    const subjectComparisons = await Promise.all(
      performance.subjectPerformance.map(async (subject) => {
        const subjectClassAvg = await StudentPerformance.getClassAverages(studentGrade, subject.subject);
        const subjectTopPerformers = await StudentPerformance.getTopPerformers(subject.subject, 5);
        
        return {
          subject: subject.subject,
          yourScore: subject.averageScore,
          classAverage: subjectClassAvg[0]?.averageScore || 0,
          yourRank: subject.classRanking.position,
          totalStudents: subject.classRanking.totalStudents,
          percentile: subject.classRanking.percentile,
          topScore: subjectTopPerformers[0]?.score || 0,
          difference: subject.averageScore - (subjectClassAvg[0]?.averageScore || 0),
          status: subject.averageScore > (subjectClassAvg[0]?.averageScore || 0) ? 'above' : 'below'
        };
      })
    );

    // Your position analysis
    const yourPosition = {
      overall: {
        rank: performance.peerComparison.classPosition,
        totalStudents: topPerformers.length > 0 ? Math.max(...topPerformers.map(p => performance.peerComparison.classPosition)) : 0,
        percentile: ((topPerformers.length - performance.peerComparison.classPosition + 1) / topPerformers.length) * 100,
        score: performance.overallMetrics.overallPercentage
      },
      
      subjects: subjectComparisons.map(s => ({
        subject: s.subject,
        rank: s.yourRank,
        percentile: s.percentile
      }))
    };

    // Performance distribution
    const allStudents = await StudentPerformance.find({})
      .select('overallMetrics.overallPercentage')
      .lean();
      
    const performanceDistribution = {
      excellent: allStudents.filter(s => s.overallMetrics.overallPercentage >= 90).length,
      good: allStudents.filter(s => s.overallMetrics.overallPercentage >= 70 && s.overallMetrics.overallPercentage < 90).length,
      average: allStudents.filter(s => s.overallMetrics.overallPercentage >= 50 && s.overallMetrics.overallPercentage < 70).length,
      needsWork: allStudents.filter(s => s.overallMetrics.overallPercentage < 50).length
    };

    // Improvement opportunities
    const improvementOpportunities = subjectComparisons
      .filter(s => s.status === 'below')
      .sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference))
      .slice(0, 3)
      .map(s => ({
        subject: s.subject,
        gap: Math.abs(s.difference),
        potential: `+${Math.round(Math.abs(s.difference))} points to reach class average`,
        priority: Math.abs(s.difference) > 15 ? 'high' : 'medium'
      }));

    const comparisonData = {
      classInfo: {
        grade: studentGrade,
        totalStudents: classAverages[0]?.studentCount || 0,
        classAverage: classAverages[0]?.averagePercentage || 0
      },

      yourPosition,
      subjectComparisons,
      topPerformers: topPerformers.slice(0, 5),
      performanceDistribution,
      improvementOpportunities,

      insights: {
        subjectsAboveAverage: subjectComparisons.filter(s => s.status === 'above').length,
        subjectsBelowAverage: subjectComparisons.filter(s => s.status === 'below').length,
        biggestStrength: subjectComparisons.reduce((best, current) => 
          current.difference > best.difference ? current : best
        ),
        biggestOpportunity: subjectComparisons.reduce((worst, current) => 
          current.difference < worst.difference ? current : worst
        )
      },

      motivationalMessage: generateMotivationalMessage(yourPosition, subjectComparisons)
    };

    console.log(`✅ Class comparison data generated`);

    res.status(200).json({
      success: true,
      message: 'Class comparison retrieved successfully',
      data: comparisonData
    });

  } catch (error) {
    console.error('❌ Class comparison error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while getting class comparison',
      error: error.message
    });
  }
};

// ==========================================
// 🎯 IMPROVEMENT SUGGESTIONS
// ==========================================

// Get personalized improvement suggestions
const getImprovementSuggestions = async (req, res) => {
  try {
    const studentId = req.user._id;

    console.log(`🎯 Generating improvement suggestions for student: ${studentId}`);

    const performance = await StudentPerformance.findOne({ studentId });
    if (!performance) {
      return res.status(404).json({
        success: false,
        message: 'Performance data not found'
      });
    }

    // Get AI-powered suggestions
    const suggestions = performance.getImprovementSuggestions();
    
    // Add more detailed analysis
    const detailedSuggestions = await generateDetailedSuggestions(performance, req.user);
    
    // Prioritize suggestions
    const prioritizedSuggestions = [...suggestions, ...detailedSuggestions]
      .sort((a, b) => getPriorityWeight(a.priority) - getPriorityWeight(b.priority))
      .slice(0, 10);

    // Generate study plan
    const studyPlan = generatePersonalizedStudyPlan(performance, prioritizedSuggestions);

    // Get resource recommendations
    const resourceRecommendations = await getResourceRecommendations(prioritizedSuggestions);

    const suggestionData = {
      summary: {
        totalSuggestions: prioritizedSuggestions.length,
        highPriority: prioritizedSuggestions.filter(s => s.priority === 'high').length,
        mediumPriority: prioritizedSuggestions.filter(s => s.priority === 'medium').length,
        estimatedImpact: calculateEstimatedImpact(prioritizedSuggestions)
      },

      suggestions: prioritizedSuggestions,
      studyPlan,
      resourceRecommendations,

      quickWins: prioritizedSuggestions
        .filter(s => s.estimatedImpact > 15 && s.difficulty === 'easy')
        .slice(0, 3),

      longTermGoals: prioritizedSuggestions
        .filter(s => s.type === 'long_term_goal')
        .slice(0, 3),

      habitRecommendations: generateHabitRecommendations(performance),
      
      progressTracking: {
        checkpoints: generateProgressCheckpoints(prioritizedSuggestions),
        metrics: getTrackingMetrics(prioritizedSuggestions)
      }
    };

    console.log(`✅ Improvement suggestions generated`);

    res.status(200).json({
      success: true,
      message: 'Improvement suggestions retrieved successfully',
      data: suggestionData
    });

  } catch (error) {
    console.error('❌ Improvement suggestions error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while generating suggestions',
      error: error.message
    });
  }
};

// ==========================================
// 🔄 PERFORMANCE DATA UPDATE
// ==========================================

// Update student performance data
const updatePerformanceData = async (studentId) => {
  try {
    console.log(`🔄 Updating performance data for student: ${studentId}`);

    // Get recent assessment data
    const recentResponses = await StudentResponse.find({
      studentId,
      createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Last 30 days
    }).populate('assessmentId');

    // Get existing performance record or create new
    let performance = await StudentPerformance.findOne({ studentId });
    if (!performance) {
      performance = new StudentPerformance({ 
        studentId,
        academicYear: new Date().getFullYear().toString(),
        academicMonth: new Date().getMonth() + 1
      });
    }

    // Update subject-wise performance
    const subjectData = {};
    
    recentResponses.forEach(response => {
      const subject = response.assessmentId.subject || 'General';
      if (!subjectData[subject]) {
        subjectData[subject] = {
          totalAssessments: 0,
          totalScore: 0,
          totalTime: 0,
          scores: []
        };
      }
      
      subjectData[subject].totalAssessments++;
      subjectData[subject].totalScore += response.scoring.percentage;
      subjectData[subject].totalTime += response.analytics?.totalTimeSpent || 0;
      subjectData[subject].scores.push(response.scoring.percentage);
    });

    // Update performance metrics
    Object.keys(subjectData).forEach(subject => {
      const data = subjectData[subject];
      let subjectPerf = performance.subjectPerformance.find(s => s.subject === subject);
      
      if (!subjectPerf) {
        subjectPerf = {
          subject,
          totalAssessments: 0,
          completedAssessments: 0,
          averageScore: 0,
          bestScore: 0,
          worstScore: 100,
          totalTimeSpent: 0,
          averageTimePerAssessment: 0,
          improvementRate: 0,
          consistencyScore: 0,
          weakTopics: [],
          strongTopics: [],
          monthlyScores: [],
          classRanking: { position: 0, totalStudents: 0, percentile: 0 },
          classAverage: 0,
          performanceVsClass: 'average'
        };
        performance.subjectPerformance.push(subjectPerf);
      }
      
      // Update metrics
      subjectPerf.totalAssessments = data.totalAssessments;
      subjectPerf.completedAssessments = data.totalAssessments;
      subjectPerf.averageScore = data.totalScore / data.totalAssessments;
      subjectPerf.bestScore = Math.max(...data.scores);
      subjectPerf.worstScore = Math.min(...data.scores);
      subjectPerf.totalTimeSpent = data.totalTime;
      subjectPerf.averageTimePerAssessment = data.totalTime / data.totalAssessments;
      
      // Calculate consistency
      const avg = subjectPerf.averageScore;
      const variance = data.scores.reduce((sum, score) => sum + Math.pow(score - avg, 2), 0) / data.scores.length;
      subjectPerf.consistencyScore = Math.max(0, 100 - Math.sqrt(variance));
    });

    // Update overall metrics
    const allScores = Object.values(subjectData).flatMap(d => d.scores);
    if (allScores.length > 0) {
      performance.overallMetrics.overallPercentage = allScores.reduce((a, b) => a + b, 0) / allScores.length;
      performance.overallMetrics.overallGPA = (performance.overallMetrics.overallPercentage / 100) * 5;
      performance.overallMetrics.totalAssessmentsCompleted = allScores.length;
      performance.overallMetrics.totalStudyTime = Object.values(subjectData).reduce((sum, d) => sum + d.totalTime, 0);
    }

    performance.lastUpdated = new Date();
    await performance.save();

    console.log(`✅ Performance data updated successfully`);
    return performance;

  } catch (error) {
    console.error('❌ Performance update error:', error);
    throw error;
  }
};

// ==========================================
// 🛠️ UTILITY FUNCTIONS
// ==========================================

const createInitialPerformanceRecord = async (studentId) => {
  const performance = new StudentPerformance({
    studentId,
    academicYear: new Date().getFullYear().toString(),
    academicMonth: new Date().getMonth() + 1,
    subjectPerformance: [],
    overallMetrics: {
      overallGPA: 0,
      overallPercentage: 0,
      totalAssessmentsCompleted: 0,
      totalStudyTime: 0,
      monthlyImprovement: 0
    }
  });
  
  await performance.save();
  return performance;
};

const calculateDashboardInsights = async (performance) => {
  // Calculate various insights
  const progressTrends = performance.calculateProgressTrend(3);
  
  const weakAreas = [];
  const strongAreas = [];
  
  performance.subjectPerformance.forEach(subject => {
    subject.weakTopics.forEach(topic => {
      weakAreas.push({
        subject: subject.subject,
        topic: topic.topic,
        successRate: topic.successRate,
        priority: topic.successRate < 40 ? 'high' : 'medium'
      });
    });
    
    subject.strongTopics.forEach(topic => {
      strongAreas.push({
        subject: subject.subject,
        topic: topic.topic,
        masteryLevel: topic.masteryLevel,
        successRate: topic.successRate
      });
    });
  });
  
  return {
    progressTrends,
    weakAreas: weakAreas.sort((a, b) => a.successRate - b.successRate),
    strongAreas: strongAreas.sort((a, b) => b.successRate - a.successRate),
    currentStreak: calculateCurrentStreak(performance),
    totalClassmates: 50, // Mock data - calculate from actual class data
    dataFreshness: getDataFreshness(performance.lastUpdated)
  };
};

const getSubjectColor = (subject) => {
  const colors = {
    'Mathematics': '#FF6B6B',
    'Physics': '#4ECDC4',
    'Chemistry': '#45B7D1',
    'Biology': '#96CEB4',
    'English': '#FFEAA7',
    'Bangla': '#DDA0DD',
    'ICT': '#74B9FF'
  };
  return colors[subject] || '#95A5A6';
};

const getPerformanceStatus = (score) => {
  if (score >= 90) return 'excellent';
  if (score >= 75) return 'good';
  if (score >= 60) return 'average';
  if (score >= 40) return 'below_average';
  return 'poor';
};

const getMonthName = (month) => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return months[month - 1];
};

const calculateCurrentStreak = (performance) => {
  // Calculate current study streak
  return Math.floor(Math.random() * 15) + 1; // Mock implementation
};

const getDataFreshness = (lastUpdated) => {
  const hours = (Date.now() - lastUpdated) / (1000 * 60 * 60);
  if (hours < 1) return 'very_fresh';
  if (hours < 6) return 'fresh';
  if (hours < 24) return 'moderate';
  return 'stale';
};

const generateMotivationalMessage = (position, subjects) => {
  const aboveAverage = subjects.filter(s => s.status === 'above').length;
  const total = subjects.length;
  
  if (aboveAverage / total > 0.8) {
    return "আপনি দুর্দান্ত করছেন! আপনার বেশিরভাগ বিষয়ে ক্লাসের গড়ের চেয়ে ভালো ফলাফল।";
  } else if (aboveAverage / total > 0.5) {
    return "ভালো অগ্রগতি! আরো কিছু বিষয়ে মনোযোগ দিলে আরো এগিয়ে যেতে পারবেন।";
  } else {
    return "চিন্তা নেই! সঠিক পরিকল্পনা ও অনুশীলনের মাধ্যমে আপনি অবশ্যই উন্নতি করতে পারবেন।";
  }
};

// Additional utility functions would be implemented here...

// Use analytics service functions
const calculateImprovementTime = (topic) => {
  return DashboardAnalyticsService.calculateImprovementTime(topic);
};

const calculateImprovementPotential = (weakAreas, performance) => {
  return DashboardAnalyticsService.calculateImprovementPotential(weakAreas, performance);
};

const generateImprovementPlan = (weakAreas, performance) => {
  return DashboardAnalyticsService.generateImprovementPlan(weakAreas, performance);
};

const getRecommendedResources = async (weakAreas) => {
  return await DashboardAnalyticsService.getRecommendedResources(weakAreas);
};

const calculateConsistency = (scores) => {
  return DashboardAnalyticsService.calculateConsistency(scores);
};

const generateProgressPredictions = (monthlyDetails, performance) => {
  return DashboardAnalyticsService.generateProgressPredictions(monthlyDetails, performance);
};

const calculateOptimalStudyTime = (subjectPerf) => {
  return DashboardAnalyticsService.calculateOptimalStudyTime(subjectPerf);
};

const generateSubjectRecommendations = (subjectPerf, classAverage) => {
  const currentScore = subjectPerf.averageScore;
  const classAvg = classAverage?.averageScore || 0;
  const recommendations = [];

  if (currentScore < classAvg) {
    recommendations.push({
      type: 'catch_up',
      title: 'Bridge the gap with class average',
      description: `Focus on improving by ${Math.round(classAvg - currentScore)} points`,
      priority: 'high'
    });
  }

  if (subjectPerf.consistencyScore < 70) {
    recommendations.push({
      type: 'consistency',
      title: 'Improve consistency',
      description: 'Work on maintaining steady performance',
      priority: 'medium'
    });
  }

  const optimalTime = calculateOptimalStudyTime(subjectPerf);
  recommendations.push({
    type: 'study_time',
    title: 'Optimize study time',
    description: `Recommended: ${optimalTime}`,
    priority: 'low'
  });

  return recommendations;
};

const generateDetailedSuggestions = async (performance, user) => {
  const suggestions = [];
  
  // Study habit suggestions
  const studyRegularity = performance.overallMetrics.studyRegularity || 50;
  if (studyRegularity < 70) {
    suggestions.push({
      type: 'study_habit',
      title: 'Establish Regular Study Schedule',
      description: 'Create a consistent daily study routine to improve retention',
      priority: 'high',
      estimatedImpact: 25,
      difficulty: 'medium',
      timeframe: '2-3 weeks'
    });
  }

  // Time management suggestions
  const avgSessionTime = performance.overallMetrics.averageSessionTime || 0;
  if (avgSessionTime > 120) { // More than 2 hours
    suggestions.push({
      type: 'time_management',
      title: 'Break Study Sessions',
      description: 'Split long study sessions into shorter, focused blocks',
      priority: 'medium',
      estimatedImpact: 15,
      difficulty: 'easy',
      timeframe: '1 week'
    });
  }

  // Assessment frequency suggestions
  const assessmentRate = performance.overallMetrics.totalAssessmentsCompleted || 0;
  if (assessmentRate < 20) {
    suggestions.push({
      type: 'assessment',
      title: 'Increase Assessment Practice',
      description: 'Take more regular assessments to track progress',
      priority: 'medium',
      estimatedImpact: 20,
      difficulty: 'easy',
      timeframe: '2 weeks'
    });
  }

  return suggestions;
};

const getResourceRecommendations = async (suggestions) => {
  return await DashboardAnalyticsService.getRecommendedResources(
    suggestions.map(s => ({ topic: s.title, subject: 'General', successRate: 50 }))
  );
};

const generatePersonalizedStudyPlan = (performance, suggestions) => {
  const plan = {
    duration: '4 weeks',
    weeklyGoals: [],
    dailySchedule: {},
    resources: []
  };

  // Generate weekly goals based on suggestions
  const highPrioritySuggestions = suggestions.filter(s => s.priority === 'high');
  const mediumPrioritySuggestions = suggestions.filter(s => s.priority === 'medium');

  plan.weeklyGoals = [
    { week: 1, goal: 'Address critical weak areas', actions: highPrioritySuggestions.slice(0, 2) },
    { week: 2, goal: 'Establish study routine', actions: mediumPrioritySuggestions.slice(0, 2) },
    { week: 3, goal: 'Practice and assessment', actions: suggestions.filter(s => s.type === 'assessment') },
    { week: 4, goal: 'Review and consolidate', actions: [{ title: 'Comprehensive review' }] }
  ];

  return plan;
};

const getPriorityWeight = (priority) => {
  return DashboardAnalyticsService.getPriorityWeight(priority);
};

const calculateEstimatedImpact = (suggestions) => {
  return DashboardAnalyticsService.calculateEstimatedImpact(suggestions);
};

const generateHabitRecommendations = (performance) => {
  const habits = [];

  if (performance.overallMetrics.studyRegularity < 70) {
    habits.push({
      habit: 'Daily Study Time',
      description: 'Set aside the same time each day for studying',
      difficulty: 'medium',
      impact: 'high'
    });
  }

  if (performance.overallMetrics.focusScore < 60) {
    habits.push({
      habit: 'Minimize Distractions',
      description: 'Create a distraction-free study environment',
      difficulty: 'easy',
      impact: 'medium'
    });
  }

  return habits;
};

const generateProgressCheckpoints = (suggestions) => {
  return suggestions.map((suggestion, index) => ({
    checkpoint: index + 1,
    description: `Review progress on: ${suggestion.title}`,
    timeline: `Week ${Math.ceil((index + 1) / 2)}`,
    metrics: ['Completion status', 'Improvement measurement']
  }));
};

const getTrackingMetrics = (suggestions) => {
  return [
    'Weekly assessment scores',
    'Study time consistency',
    'Suggestion implementation rate',
    'Overall performance trend'
  ];
};

module.exports = {
  getDashboardOverview,
  getSubjectAnalysis,
  getMonthlyProgress,
  getWeakAreasAnalysis,
  getClassComparison,
  getImprovementSuggestions,
  updatePerformanceData
};
