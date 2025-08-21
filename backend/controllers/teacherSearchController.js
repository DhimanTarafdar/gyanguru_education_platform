// Advanced Teacher Search Controller
// উন্নত শিক্ষক অনুসন্ধান এবং ফিল্টার সিস্টেম

const User = require('../models/User');
const { TeacherRatingSummary } = require('../models/TeacherReview');
const mongoose = require('mongoose');
const { validationResult } = require('express-validator');

// ============================================
// 🔍 ADVANCED TEACHER SEARCH
// ============================================

// @desc    Advanced teacher search with multiple filters
// @route   GET /api/search/teachers
// @access  Public
const searchTeachers = async (req, res) => {
  try {
    console.log('🔍 Advanced teacher search started...');

    const {
      query = '',           // Search query (name, subject, etc.)
      class: classFilter,   // Class filter (1-12)
      subject,              // Subject filter
      experience,           // Experience level (0-5, 5-10, 10+)
      rating,               // Minimum rating (1-5)
      location,             // Location/district
      verified,             // Verified teachers only
      availability,         // Available for new students
      sortBy = 'relevance', // relevance, rating, experience, name
      page = 1,
      limit = 20
    } = req.query;

    // ========== BUILD SEARCH PIPELINE ==========
    
    const pipeline = [];

    // Stage 1: Match basic teacher criteria
    const baseMatch = {
      role: 'teacher',
      isActive: true
    };

    // Class filter
    if (classFilter) {
      baseMatch['teacherInfo.classes'] = parseInt(classFilter);
    }

    // Subject filter
    if (subject) {
      baseMatch['teacherInfo.subjects'] = {
        $regex: new RegExp(subject, 'i')
      };
    }

    // Experience filter
    if (experience) {
      switch (experience) {
        case '0-5':
          baseMatch['teacherInfo.experience'] = { $gte: 0, $lte: 5 };
          break;
        case '5-10':
          baseMatch['teacherInfo.experience'] = { $gte: 5, $lte: 10 };
          break;
        case '10+':
          baseMatch['teacherInfo.experience'] = { $gte: 10 };
          break;
      }
    }

    // Location filter
    if (location) {
      baseMatch['address.district'] = {
        $regex: new RegExp(location, 'i')
      };
    }

    // Verified filter
    if (verified === 'true') {
      baseMatch['teacherInfo.isVerified'] = true;
    }

    // Availability filter
    if (availability === 'true') {
      baseMatch['teacherInfo.acceptingStudents'] = true;
    }

    pipeline.push({ $match: baseMatch });

    // Stage 2: Add rating information
    pipeline.push({
      $lookup: {
        from: 'teacherratingsummaries',
        localField: '_id',
        foreignField: 'teacherId',
        as: 'ratingSummary'
      }
    });

    // Stage 3: Add calculated fields for sorting
    pipeline.push({
      $addFields: {
        averageRating: {
          $ifNull: [
            { $arrayElemAt: ['$ratingSummary.overall.averageRating', 0] },
            0
          ]
        },
        totalReviews: {
          $ifNull: [
            { $arrayElemAt: ['$ratingSummary.overall.totalReviews', 0] },
            0
          ]
        },
        searchScore: {
          $sum: [
            // Name match score
            {
              $cond: [
                { $regexMatch: { input: '$name', regex: new RegExp(query, 'i') } },
                10, 0
              ]
            },
            // Subject expertise score
            {
              $cond: [
                { $in: [subject, '$teacherInfo.subjects'] },
                8, 0
              ]
            },
            // Bio/description match
            {
              $cond: [
                { $regexMatch: { input: '$bio', regex: new RegExp(query, 'i') } },
                5, 0
              ]
            },
            // Class match score
            {
              $cond: [
                { $in: [parseInt(classFilter || 0), '$teacherInfo.classes'] },
                6, 0
              ]
            }
          ]
        }
      }
    });

    // Stage 4: Apply rating filter
    if (rating) {
      pipeline.push({
        $match: {
          averageRating: { $gte: parseFloat(rating) }
        }
      });
    }

    // Stage 5: Apply text search if query provided
    if (query && query.trim()) {
      pipeline.push({
        $match: {
          $or: [
            { name: { $regex: new RegExp(query, 'i') } },
            { bio: { $regex: new RegExp(query, 'i') } },
            { 'teacherInfo.subjects': { $regex: new RegExp(query, 'i') } },
            { 'teacherInfo.specialization': { $regex: new RegExp(query, 'i') } },
            { 'address.district': { $regex: new RegExp(query, 'i') } }
          ]
        }
      });
    }

    // Stage 6: Sort results
    let sortStage = {};
    switch (sortBy) {
      case 'rating':
        sortStage = { averageRating: -1, totalReviews: -1 };
        break;
      case 'experience':
        sortStage = { 'teacherInfo.experience': -1, averageRating: -1 };
        break;
      case 'name':
        sortStage = { name: 1 };
        break;
      case 'reviews':
        sortStage = { totalReviews: -1, averageRating: -1 };
        break;
      default: // relevance
        sortStage = { searchScore: -1, averageRating: -1, totalReviews: -1 };
    }
    pipeline.push({ $sort: sortStage });

    // Stage 7: Project required fields
    pipeline.push({
      $project: {
        name: 1,
        email: 1,
        phone: 1,
        avatar: 1,
        bio: 1,
        teacherInfo: 1,
        address: 1,
        averageRating: 1,
        totalReviews: 1,
        searchScore: 1,
        'ratingSummary.overall': { $arrayElemAt: ['$ratingSummary.overall', 0] },
        'ratingSummary.detailed': { $arrayElemAt: ['$ratingSummary.detailed', 0] }
      }
    });

    // ========== EXECUTE SEARCH ==========
    
    // Get total count for pagination
    const countPipeline = [...pipeline];
    countPipeline.push({ $count: 'total' });
    const totalResult = await User.aggregate(countPipeline);
    const total = totalResult[0]?.total || 0;

    // Apply pagination
    pipeline.push({ $skip: (page - 1) * limit });
    pipeline.push({ $limit: parseInt(limit) });

    // Execute search
    const teachers = await User.aggregate(pipeline);

    // ========== SEARCH ANALYTICS ==========
    
    const analytics = {
      totalResults: total,
      currentPage: parseInt(page),
      totalPages: Math.ceil(total / limit),
      searchQuery: query,
      appliedFilters: {
        class: classFilter,
        subject,
        experience,
        rating,
        location,
        verified: verified === 'true',
        availability: availability === 'true'
      },
      sortBy,
      executionTime: Date.now()
    };

    console.log('✅ Teacher search completed successfully');

    res.status(200).json({
      success: true,
      message: 'Teacher search completed successfully',
      data: {
        teachers,
        analytics,
        suggestions: await generateSearchSuggestions(query, teachers)
      }
    });

  } catch (error) {
    console.error('💥 Teacher search error:', error);
    
    res.status(500).json({
      success: false,
      message: 'Server error during teacher search',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// ============================================
// ⚡ QUICK SEARCH SUGGESTIONS
// ============================================

// @desc    Get quick search suggestions
// @route   GET /api/search/suggestions
// @access  Public
const getSearchSuggestions = async (req, res) => {
  try {
    console.log('⚡ Getting search suggestions...');

    const { query = '', limit = 10 } = req.query;

    if (!query || query.length < 2) {
      return res.status(200).json({
        success: true,
        data: {
          suggestions: []
        }
      });
    }

    // Search in multiple fields
    const suggestions = await User.aggregate([
      {
        $match: {
          role: 'teacher',
          isActive: true,
          $or: [
            { name: { $regex: new RegExp(query, 'i') } },
            { 'teacherInfo.subjects': { $regex: new RegExp(query, 'i') } },
            { 'teacherInfo.specialization': { $regex: new RegExp(query, 'i') } }
          ]
        }
      },
      {
        $project: {
          name: 1,
          'teacherInfo.subjects': 1,
          avatar: 1,
          matchType: {
            $cond: [
              { $regexMatch: { input: '$name', regex: new RegExp(query, 'i') } },
              'teacher',
              'subject'
            ]
          }
        }
      },
      { $limit: parseInt(limit) }
    ]);

    // Format suggestions
    const formattedSuggestions = suggestions.map(teacher => ({
      id: teacher._id,
      text: teacher.name,
      type: teacher.matchType,
      subjects: teacher.teacherInfo?.subjects || [],
      avatar: teacher.avatar
    }));

    // Add popular search terms
    const popularTerms = await getPopularSearchTerms(query);
    
    console.log('✅ Search suggestions retrieved successfully');

    res.status(200).json({
      success: true,
      message: 'Search suggestions retrieved successfully',
      data: {
        suggestions: formattedSuggestions,
        popularTerms
      }
    });

  } catch (error) {
    console.error('💥 Search suggestions error:', error);
    
    res.status(500).json({
      success: false,
      message: 'Server error while getting suggestions',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// ============================================
// 🎯 QUICK FILTERS
// ============================================

// @desc    Get teachers by quick filters (class, subject, etc.)
// @route   GET /api/search/quick-filter
// @access  Public
const quickFilterTeachers = async (req, res) => {
  try {
    console.log('🎯 Quick filter search started...');

    const { 
      type,           // 'class', 'subject', 'rating', 'experience'
      value,          // filter value
      limit = 20,
      page = 1
    } = req.query;

    if (!type || !value) {
      return res.status(400).json({
        success: false,
        message: 'Filter type and value are required'
      });
    }

    // Build filter query
    let filterQuery = {
      role: 'teacher',
      isActive: true
    };

    switch (type) {
      case 'class':
        filterQuery['teacherInfo.classes'] = parseInt(value);
        break;
      case 'subject':
        filterQuery['teacherInfo.subjects'] = {
          $regex: new RegExp(value, 'i')
        };
        break;
      case 'experience':
        const expValue = parseInt(value);
        if (expValue >= 10) {
          filterQuery['teacherInfo.experience'] = { $gte: 10 };
        } else {
          filterQuery['teacherInfo.experience'] = { $gte: expValue, $lt: expValue + 5 };
        }
        break;
      case 'rating':
        // This will be handled in aggregation
        break;
      case 'verified':
        filterQuery['teacherInfo.isVerified'] = true;
        break;
      case 'available':
        filterQuery['teacherInfo.acceptingStudents'] = true;
        break;
      default:
        return res.status(400).json({
          success: false,
          message: 'Invalid filter type'
        });
    }

    // Execute search with rating lookup
    const pipeline = [
      { $match: filterQuery },
      {
        $lookup: {
          from: 'teacherratingsummaries',
          localField: '_id',
          foreignField: 'teacherId',
          as: 'ratingSummary'
        }
      },
      {
        $addFields: {
          averageRating: {
            $ifNull: [
              { $arrayElemAt: ['$ratingSummary.overall.averageRating', 0] },
              0
            ]
          },
          totalReviews: {
            $ifNull: [
              { $arrayElemAt: ['$ratingSummary.overall.totalReviews', 0] },
              0
            ]
          }
        }
      }
    ];

    // Apply rating filter if needed
    if (type === 'rating') {
      pipeline.push({
        $match: {
          averageRating: { $gte: parseFloat(value) }
        }
      });
    }

    // Sort by relevance and rating
    pipeline.push({
      $sort: {
        averageRating: -1,
        totalReviews: -1,
        'teacherInfo.experience': -1
      }
    });

    // Get total count
    const countPipeline = [...pipeline];
    countPipeline.push({ $count: 'total' });
    const totalResult = await User.aggregate(countPipeline);
    const total = totalResult[0]?.total || 0;

    // Apply pagination
    pipeline.push({ $skip: (page - 1) * limit });
    pipeline.push({ $limit: parseInt(limit) });

    // Project required fields
    pipeline.push({
      $project: {
        name: 1,
        avatar: 1,
        bio: 1,
        teacherInfo: 1,
        address: 1,
        averageRating: 1,
        totalReviews: 1,
        'ratingSummary.overall': { $arrayElemAt: ['$ratingSummary.overall', 0] }
      }
    });

    const teachers = await User.aggregate(pipeline);

    console.log('✅ Quick filter search completed successfully');

    res.status(200).json({
      success: true,
      message: 'Quick filter search completed successfully',
      data: {
        teachers,
        filter: { type, value },
        pagination: {
          current: parseInt(page),
          total: Math.ceil(total / limit),
          count: teachers.length,
          totalResults: total
        }
      }
    });

  } catch (error) {
    console.error('💥 Quick filter error:', error);
    
    res.status(500).json({
      success: false,
      message: 'Server error during quick filter',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// ============================================
// 📊 SEARCH ANALYTICS & POPULAR TERMS
// ============================================

// @desc    Get popular search terms and subjects
// @route   GET /api/search/popular
// @access  Public
const getPopularSearchData = async (req, res) => {
  try {
    console.log('📊 Getting popular search data...');

    // Get popular subjects
    const popularSubjects = await User.aggregate([
      { $match: { role: 'teacher', isActive: true } },
      { $unwind: '$teacherInfo.subjects' },
      {
        $group: {
          _id: '$teacherInfo.subjects',
          count: { $sum: 1 },
          avgRating: { $avg: '$teacherInfo.rating' }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 },
      {
        $project: {
          subject: '$_id',
          teacherCount: '$count',
          avgRating: { $round: ['$avgRating', 1] },
          _id: 0
        }
      }
    ]);

    // Get class distribution
    const classDistribution = await User.aggregate([
      { $match: { role: 'teacher', isActive: true } },
      { $unwind: '$teacherInfo.classes' },
      {
        $group: {
          _id: '$teacherInfo.classes',
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } },
      {
        $project: {
          class: '$_id',
          teacherCount: '$count',
          _id: 0
        }
      }
    ]);

    // Get experience distribution
    const experienceDistribution = await User.aggregate([
      { $match: { role: 'teacher', isActive: true } },
      {
        $group: {
          _id: {
            $switch: {
              branches: [
                { case: { $lt: ['$teacherInfo.experience', 2] }, then: '0-2 years' },
                { case: { $lt: ['$teacherInfo.experience', 5] }, then: '2-5 years' },
                { case: { $lt: ['$teacherInfo.experience', 10] }, then: '5-10 years' },
                { case: { $gte: ['$teacherInfo.experience', 10] }, then: '10+ years' }
              ],
              default: 'Not specified'
            }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);

    // Get top rated teachers
    const topRatedTeachers = await User.aggregate([
      { $match: { role: 'teacher', isActive: true } },
      {
        $lookup: {
          from: 'teacherratingsummaries',
          localField: '_id',
          foreignField: 'teacherId',
          as: 'ratingSummary'
        }
      },
      {
        $match: {
          'ratingSummary.overall.totalReviews': { $gte: 3 }
        }
      },
      {
        $sort: {
          'ratingSummary.overall.averageRating': -1,
          'ratingSummary.overall.totalReviews': -1
        }
      },
      { $limit: 5 },
      {
        $project: {
          name: 1,
          avatar: 1,
          'teacherInfo.subjects': 1,
          averageRating: { $arrayElemAt: ['$ratingSummary.overall.averageRating', 0] },
          totalReviews: { $arrayElemAt: ['$ratingSummary.overall.totalReviews', 0] }
        }
      }
    ]);

    console.log('✅ Popular search data retrieved successfully');

    res.status(200).json({
      success: true,
      message: 'Popular search data retrieved successfully',
      data: {
        popularSubjects,
        classDistribution,
        experienceDistribution,
        topRatedTeachers,
        quickFilters: [
          { label: 'Best Teachers', type: 'rating', value: '4' },
          { label: 'Physics Teachers', type: 'subject', value: 'Physics' },
          { label: 'Mathematics Teachers', type: 'subject', value: 'Mathematics' },
          { label: 'English Teachers', type: 'subject', value: 'English' },
          { label: 'Class 10 Teachers', type: 'class', value: '10' },
          { label: 'Class 9 Teachers', type: 'class', value: '9' },
          { label: 'Experienced Teachers', type: 'experience', value: '5' },
          { label: 'Verified Teachers', type: 'verified', value: 'true' }
        ]
      }
    });

  } catch (error) {
    console.error('💥 Get popular search data error:', error);
    
    res.status(500).json({
      success: false,
      message: 'Server error while getting popular search data',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
};

// ============================================
// 🔧 HELPER FUNCTIONS
// ============================================

// Generate search suggestions based on query and results
async function generateSearchSuggestions(query, results) {
  const suggestions = [];
  
  if (!query || !results.length) return suggestions;

  // Extract common subjects from results
  const subjects = new Set();
  results.forEach(teacher => {
    teacher.teacherInfo?.subjects?.forEach(subject => subjects.add(subject));
  });

  // Add subject suggestions
  Array.from(subjects).slice(0, 3).forEach(subject => {
    suggestions.push({
      text: `${subject} teachers`,
      type: 'subject',
      query: subject
    });
  });

  return suggestions;
}

// Get popular search terms (simplified - in production, use search analytics)
async function getPopularSearchTerms(query) {
  const terms = [
    'best teachers',
    'physics teacher',
    'mathematics teacher',
    'english teacher',
    'chemistry teacher',
    'biology teacher',
    'experienced teachers',
    'verified teachers'
  ];

  if (!query) return terms.slice(0, 5);

  // Filter terms based on query
  return terms.filter(term => 
    term.toLowerCase().includes(query.toLowerCase())
  ).slice(0, 3);
}

// ============================================
// 📤 EXPORT CONTROLLERS
// ============================================

module.exports = {
  searchTeachers,
  getSearchSuggestions,
  quickFilterTeachers,
  getPopularSearchData
};
