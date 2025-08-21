// Teacher Review Frontend Service
// শিক্ষক রেটিং এবং রিভিউ ফ্রন্টএন্ড সার্ভিস

import api from './api';

// ============================================
// 📊 TEACHER REVIEW SERVICE CLASS
// ============================================

export class TeacherReviewService {
  // ============================================
  // 📝 CREATE TEACHER REVIEW
  // ============================================
  
  static async createReview(teacherId, reviewData) {
    try {
      console.log('📝 Creating teacher review...');
      
      const response = await api.post(`/reviews/teacher/${teacherId}`, reviewData);
      
      if (response.data.success) {
        console.log('✅ Review created successfully');
        return {
          success: true,
          review: response.data.data.review,
          message: response.data.message
        };
      }
      
      throw new Error(response.data.message || 'Failed to create review');
      
    } catch (error) {
      console.error('💥 Create review error:', error);
      
      return {
        success: false,
        message: error.response?.data?.message || 'Error creating review',
        errors: error.response?.data?.errors || []
      };
    }
  }
  
  // ============================================
  // 📊 GET TEACHER REVIEWS
  // ============================================
  
  static async getTeacherReviews(teacherId, filters = {}) {
    try {
      console.log('📊 Getting teacher reviews...');
      
      const params = new URLSearchParams();
      
      // Add filters to params
      if (filters.page) params.append('page', filters.page);
      if (filters.limit) params.append('limit', filters.limit);
      if (filters.sortBy) params.append('sortBy', filters.sortBy);
      if (filters.rating && filters.rating !== 'all') params.append('rating', filters.rating);
      if (filters.verified && filters.verified !== 'all') params.append('verified', filters.verified);
      
      const queryString = params.toString();
      const url = `/reviews/teacher/${teacherId}${queryString ? `?${queryString}` : ''}`;
      
      const response = await api.get(url);
      
      if (response.data.success) {
        console.log('✅ Reviews retrieved successfully');
        return {
          success: true,
          reviews: response.data.data.reviews,
          ratingSummary: response.data.data.ratingSummary,
          pagination: response.data.data.pagination
        };
      }
      
      throw new Error(response.data.message || 'Failed to get reviews');
      
    } catch (error) {
      console.error('💥 Get reviews error:', error);
      
      return {
        success: false,
        message: error.response?.data?.message || 'Error getting reviews',
        reviews: [],
        ratingSummary: null,
        pagination: null
      };
    }
  }
  
  // ============================================
  // 🏆 GET TOP RATED TEACHERS
  // ============================================
  
  static async getTopRatedTeachers(filters = {}) {
    try {
      console.log('🏆 Getting top rated teachers...');
      
      const params = new URLSearchParams();
      
      if (filters.limit) params.append('limit', filters.limit);
      if (filters.subject) params.append('subject', filters.subject);
      if (filters.class) params.append('class', filters.class);
      if (filters.minReviews) params.append('minReviews', filters.minReviews);
      
      const queryString = params.toString();
      const url = `/reviews/teachers/top-rated${queryString ? `?${queryString}` : ''}`;
      
      const response = await api.get(url);
      
      if (response.data.success) {
        console.log('✅ Top rated teachers retrieved successfully');
        return {
          success: true,
          teachers: response.data.data.teachers,
          count: response.data.data.count
        };
      }
      
      throw new Error(response.data.message || 'Failed to get top rated teachers');
      
    } catch (error) {
      console.error('💥 Get top rated teachers error:', error);
      
      return {
        success: false,
        message: error.response?.data?.message || 'Error getting top rated teachers',
        teachers: [],
        count: 0
      };
    }
  }
  
  // ============================================
  // 📊 GET TEACHER RATING SUMMARY
  // ============================================
  
  static async getTeacherRatingSummary(teacherId) {
    try {
      console.log('📊 Getting teacher rating summary...');
      
      const response = await api.get(`/reviews/teacher/${teacherId}/summary`);
      
      if (response.data.success) {
        console.log('✅ Teacher rating summary retrieved successfully');
        return {
          success: true,
          teacher: response.data.data.teacher,
          ratingSummary: response.data.data.ratingSummary,
          recentReviews: response.data.data.recentReviews
        };
      }
      
      throw new Error(response.data.message || 'Failed to get teacher rating summary');
      
    } catch (error) {
      console.error('💥 Get teacher rating summary error:', error);
      
      return {
        success: false,
        message: error.response?.data?.message || 'Error getting teacher rating summary',
        teacher: null,
        ratingSummary: null,
        recentReviews: []
      };
    }
  }
  
  // ============================================
  // 👍 REACT TO REVIEW (LIKE/DISLIKE)
  // ============================================
  
  static async reactToReview(reviewId, reaction) {
    try {
      console.log(`👍 ${reaction}ing review...`);
      
      const response = await api.post(`/reviews/${reviewId}/react`, { reaction });
      
      if (response.data.success) {
        console.log(`✅ Review ${reaction}d successfully`);
        return {
          success: true,
          likeCount: response.data.data.likeCount,
          dislikeCount: response.data.data.dislikeCount,
          userReaction: response.data.data.userReaction,
          message: response.data.message
        };
      }
      
      throw new Error(response.data.message || `Failed to ${reaction} review`);
      
    } catch (error) {
      console.error(`💥 ${reaction} review error:`, error);
      
      return {
        success: false,
        message: error.response?.data?.message || `Error ${reaction}ing review`
      };
    }
  }
  
  // ============================================
  // ✏️ UPDATE REVIEW
  // ============================================
  
  static async updateReview(reviewId, updateData) {
    try {
      console.log('✏️ Updating review...');
      
      const response = await api.put(`/reviews/${reviewId}`, updateData);
      
      if (response.data.success) {
        console.log('✅ Review updated successfully');
        return {
          success: true,
          review: response.data.data.review,
          message: response.data.message
        };
      }
      
      throw new Error(response.data.message || 'Failed to update review');
      
    } catch (error) {
      console.error('💥 Update review error:', error);
      
      return {
        success: false,
        message: error.response?.data?.message || 'Error updating review',
        errors: error.response?.data?.errors || []
      };
    }
  }
  
  // ============================================
  // 🗑️ DELETE REVIEW
  // ============================================
  
  static async deleteReview(reviewId) {
    try {
      console.log('🗑️ Deleting review...');
      
      const response = await api.delete(`/reviews/${reviewId}`);
      
      if (response.data.success) {
        console.log('✅ Review deleted successfully');
        return {
          success: true,
          message: response.data.message
        };
      }
      
      throw new Error(response.data.message || 'Failed to delete review');
      
    } catch (error) {
      console.error('💥 Delete review error:', error);
      
      return {
        success: false,
        message: error.response?.data?.message || 'Error deleting review'
      };
    }
  }
  
  // ============================================
  // 🔍 HELPER METHODS
  // ============================================
  
  // Format rating for display
  static formatRating(rating) {
    if (!rating || rating === 0) return 'No rating';
    return `${rating.toFixed(1)} ⭐`;
  }
  
  // Get rating color based on value
  static getRatingColor(rating) {
    if (rating >= 4.5) return '#22c55e'; // Green
    if (rating >= 4.0) return '#84cc16'; // Lime
    if (rating >= 3.5) return '#eab308'; // Yellow
    if (rating >= 3.0) return '#f97316'; // Orange
    return '#ef4444'; // Red
  }
  
  // Format review date
  static formatReviewDate(date) {
    const reviewDate = new Date(date);
    const now = new Date();
    const diffTime = Math.abs(now - reviewDate);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
    if (diffDays < 365) return `${Math.ceil(diffDays / 30)} months ago`;
    return `${Math.ceil(diffDays / 365)} years ago`;
  }
  
  // Calculate review sentiment
  static getReviewSentiment(review) {
    const { likeCount, dislikeCount } = review.reactions;
    const total = likeCount + dislikeCount;
    
    if (total === 0) return 'neutral';
    
    const likeRatio = likeCount / total;
    
    if (likeRatio >= 0.8) return 'positive';
    if (likeRatio >= 0.6) return 'mostly-positive';
    if (likeRatio >= 0.4) return 'neutral';
    if (likeRatio >= 0.2) return 'mostly-negative';
    return 'negative';
  }
  
  // Get review stats for teacher
  static getReviewStats(ratingSummary) {
    if (!ratingSummary) {
      return {
        averageRating: 0,
        totalReviews: 0,
        distribution: {},
        verificationRate: 0
      };
    }
    
    const { overall, ratingDistribution } = ratingSummary;
    
    return {
      averageRating: overall.averageRating || 0,
      totalReviews: overall.totalReviews || 0,
      distribution: ratingDistribution || {},
      verificationRate: overall.totalReviews > 0 ? 
        (overall.verifiedReviews / overall.totalReviews * 100) : 0
    };
  }
  
  // Validate review data before submission
  static validateReviewData(reviewData) {
    const errors = [];
    
    // Check required fields
    if (!reviewData.rating?.overall) {
      errors.push('Overall rating is required');
    } else if (reviewData.rating.overall < 1 || reviewData.rating.overall > 5) {
      errors.push('Overall rating must be between 1 and 5');
    }
    
    if (!reviewData.review?.title?.trim()) {
      errors.push('Review title is required');
    } else if (reviewData.review.title.length < 5 || reviewData.review.title.length > 100) {
      errors.push('Review title must be between 5-100 characters');
    }
    
    if (!reviewData.review?.content?.trim()) {
      errors.push('Review content is required');
    } else if (reviewData.review.content.length < 20 || reviewData.review.content.length > 1000) {
      errors.push('Review content must be between 20-1000 characters');
    }
    
    if (!reviewData.studyDuration) {
      errors.push('Study duration is required');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
  
  // Generate review preview for sharing
  static generateReviewPreview(review) {
    const { rating, review: reviewContent, reactions } = review;
    
    return {
      title: reviewContent.title,
      rating: rating.overall,
      excerpt: reviewContent.content.substring(0, 150) + 
        (reviewContent.content.length > 150 ? '...' : ''),
      likes: reactions.likeCount,
      dislikes: reactions.dislikeCount,
      verified: review.verification.isVerified
    };
  }
}

// ============================================
// 📊 TEACHER SEARCH & FILTER SERVICE
// ============================================

export class TeacherSearchService {
  // Search teachers with ratings
  static async searchTeachersWithRatings(searchParams) {
    try {
      const {
        query = '',
        subject,
        class: classFilter,
        minRating = 0,
        sortBy = 'rating',
        page = 1,
        limit = 20
      } = searchParams;
      
      // This would integrate with your main teacher search
      // For now, we'll use the top-rated endpoint with filters
      const result = await TeacherReviewService.getTopRatedTeachers({
        subject,
        class: classFilter,
        limit,
        minReviews: 1
      });
      
      if (result.success) {
        // Filter by search query if provided
        let teachers = result.teachers;
        
        if (query) {
          teachers = teachers.filter(teacher => 
            teacher.teacher.name.toLowerCase().includes(query.toLowerCase())
          );
        }
        
        // Filter by minimum rating
        if (minRating > 0) {
          teachers = teachers.filter(teacher => 
            teacher.overall.averageRating >= minRating
          );
        }
        
        return {
          success: true,
          teachers,
          count: teachers.length
        };
      }
      
      return result;
      
    } catch (error) {
      console.error('💥 Search teachers with ratings error:', error);
      return {
        success: false,
        message: 'Error searching teachers',
        teachers: [],
        count: 0
      };
    }
  }
}

// ============================================
// 📤 EXPORT SERVICES
// ============================================

export default TeacherReviewService;
