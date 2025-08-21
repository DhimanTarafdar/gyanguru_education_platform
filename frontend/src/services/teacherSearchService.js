// Teacher Search Frontend Service
// উন্নত শিক্ষক অনুসন্ধান ফ্রন্টএন্ড সার্ভিস

import api from './api';

// ============================================
// 🔍 TEACHER SEARCH SERVICE CLASS
// ============================================

export class TeacherSearchService {
  // ============================================
  // 🔍 ADVANCED TEACHER SEARCH
  // ============================================
  
  static async searchTeachers(searchParams = {}) {
    try {
      console.log('🔍 Searching teachers...', searchParams);
      
      const params = new URLSearchParams();
      
      // Add all search parameters
      Object.keys(searchParams).forEach(key => {
        if (searchParams[key] !== undefined && searchParams[key] !== '') {
          params.append(key, searchParams[key]);
        }
      });
      
      const queryString = params.toString();
      const url = `/search/teachers${queryString ? `?${queryString}` : ''}`;
      
      const response = await api.get(url);
      
      if (response.data.success) {
        console.log('✅ Teacher search completed successfully');
        return {
          success: true,
          teachers: response.data.data.teachers,
          analytics: response.data.data.analytics,
          suggestions: response.data.data.suggestions || []
        };
      }
      
      throw new Error(response.data.message || 'Search failed');
      
    } catch (error) {
      console.error('💥 Teacher search error:', error);
      
      return {
        success: false,
        message: error.response?.data?.message || 'Error searching teachers',
        teachers: [],
        analytics: null,
        suggestions: []
      };
    }
  }
  
  // ============================================
  // ⚡ SEARCH SUGGESTIONS (AUTOCOMPLETE)
  // ============================================
  
  static async getSearchSuggestions(query = '', limit = 10) {
    try {
      console.log('⚡ Getting search suggestions...');
      
      if (!query || query.length < 2) {
        return { success: true, suggestions: [], popularTerms: [] };
      }
      
      const response = await api.get(`/search/suggestions?query=${encodeURIComponent(query)}&limit=${limit}`);
      
      if (response.data.success) {
        console.log('✅ Search suggestions retrieved');
        return {
          success: true,
          suggestions: response.data.data.suggestions,
          popularTerms: response.data.data.popularTerms || []
        };
      }
      
      throw new Error(response.data.message || 'Failed to get suggestions');
      
    } catch (error) {
      console.error('💥 Search suggestions error:', error);
      
      return {
        success: false,
        message: error.response?.data?.message || 'Error getting suggestions',
        suggestions: [],
        popularTerms: []
      };
    }
  }
  
  // ============================================
  // 🎯 QUICK FILTER SEARCH
  // ============================================
  
  static async quickFilterSearch(filterType, filterValue, options = {}) {
    try {
      console.log(`🎯 Quick filter search: ${filterType} = ${filterValue}`);
      
      const { page = 1, limit = 20 } = options;
      
      const params = new URLSearchParams({
        type: filterType,
        value: filterValue,
        page,
        limit
      });
      
      const response = await api.get(`/search/quick-filter?${params.toString()}`);
      
      if (response.data.success) {
        console.log('✅ Quick filter search completed');
        return {
          success: true,
          teachers: response.data.data.teachers,
          filter: response.data.data.filter,
          pagination: response.data.data.pagination
        };
      }
      
      throw new Error(response.data.message || 'Quick filter failed');
      
    } catch (error) {
      console.error('💥 Quick filter error:', error);
      
      return {
        success: false,
        message: error.response?.data?.message || 'Error in quick filter',
        teachers: [],
        filter: null,
        pagination: null
      };
    }
  }
  
  // ============================================
  // 📊 POPULAR SEARCH DATA
  // ============================================
  
  static async getPopularSearchData() {
    try {
      console.log('📊 Getting popular search data...');
      
      const response = await api.get('/search/popular');
      
      if (response.data.success) {
        console.log('✅ Popular search data retrieved');
        return {
          success: true,
          popularSubjects: response.data.data.popularSubjects,
          classDistribution: response.data.data.classDistribution,
          experienceDistribution: response.data.data.experienceDistribution,
          topRatedTeachers: response.data.data.topRatedTeachers,
          quickFilters: response.data.data.quickFilters
        };
      }
      
      throw new Error(response.data.message || 'Failed to get popular data');
      
    } catch (error) {
      console.error('💥 Popular search data error:', error);
      
      return {
        success: false,
        message: error.response?.data?.message || 'Error getting popular data',
        popularSubjects: [],
        classDistribution: [],
        experienceDistribution: [],
        topRatedTeachers: [],
        quickFilters: []
      };
    }
  }
  
  // ============================================
  // 🎯 SPECIALIZED SEARCH METHODS
  // ============================================
  
  // Search by class
  static async searchByClass(classNumber, options = {}) {
    return this.quickFilterSearch('class', classNumber, options);
  }
  
  // Search by subject
  static async searchBySubject(subject, options = {}) {
    return this.quickFilterSearch('subject', subject, options);
  }
  
  // Search best teachers
  static async searchBestTeachers(options = {}) {
    return this.quickFilterSearch('rating', '4', options);
  }
  
  // Search verified teachers
  static async searchVerifiedTeachers(options = {}) {
    return this.quickFilterSearch('verified', 'true', options);
  }
  
  // Search available teachers
  static async searchAvailableTeachers(options = {}) {
    return this.quickFilterSearch('available', 'true', options);
  }
  
  // Search experienced teachers
  static async searchExperiencedTeachers(options = {}) {
    return this.quickFilterSearch('experience', '5', options);
  }
  
  // ============================================
  // 🔧 HELPER METHODS
  // ============================================
  
  // Build search URL with parameters
  static buildSearchUrl(baseUrl, params) {
    const searchParams = new URLSearchParams();
    
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== '') {
        searchParams.append(key, params[key]);
      }
    });
    
    const queryString = searchParams.toString();
    return `${baseUrl}${queryString ? `?${queryString}` : ''}`;
  }
  
  // Format search results for display
  static formatSearchResults(teachers) {
    return teachers.map(teacher => ({
      id: teacher._id,
      name: teacher.name,
      avatar: teacher.avatar,
      bio: teacher.bio,
      subjects: teacher.teacherInfo?.subjects || [],
      classes: teacher.teacherInfo?.classes || [],
      experience: teacher.teacherInfo?.experience || 0,
      rating: teacher.averageRating || 0,
      reviewCount: teacher.totalReviews || 0,
      verified: teacher.teacherInfo?.isVerified || false,
      available: teacher.teacherInfo?.acceptingStudents || false,
      location: teacher.address?.district || '',
      searchScore: teacher.searchScore || 0
    }));
  }
  
  // Get search filter options
  static getFilterOptions() {
    return {
      sortBy: [
        { value: 'relevance', label: 'সবচেয়ে প্রাসঙ্গিক' },
        { value: 'rating', label: 'সর্বোচ্চ রেটিং' },
        { value: 'experience', label: 'অভিজ্ঞতা' },
        { value: 'reviews', label: 'সবচেয়ে রিভিউ' },
        { value: 'name', label: 'নাম অনুসারে' }
      ],
      experience: [
        { value: '0-5', label: '০-৫ বছর' },
        { value: '5-10', label: '৫-১০ বছর' },
        { value: '10+', label: '১০+ বছর' }
      ],
      rating: [
        { value: '4', label: '৪+ রেটিং' },
        { value: '3.5', label: '৩.৫+ রেটিং' },
        { value: '3', label: '৩+ রেটিং' }
      ],
      classes: Array.from({ length: 12 }, (_, i) => ({
        value: (i + 1).toString(),
        label: `ক্লাস ${i + 1}`
      }))
    };
  }
  
  // Validate search parameters
  static validateSearchParams(params) {
    const errors = [];
    
    if (params.query && params.query.length > 100) {
      errors.push('Search query too long');
    }
    
    if (params.class && (params.class < 1 || params.class > 12)) {
      errors.push('Invalid class number');
    }
    
    if (params.rating && (params.rating < 1 || params.rating > 5)) {
      errors.push('Invalid rating value');
    }
    
    if (params.page && params.page < 1) {
      errors.push('Invalid page number');
    }
    
    if (params.limit && (params.limit < 1 || params.limit > 50)) {
      errors.push('Invalid limit value');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
  
  // Generate search analytics
  static generateSearchAnalytics(searchParams, results) {
    return {
      searchQuery: searchParams.query || '',
      totalResults: results.length,
      appliedFilters: Object.keys(searchParams).filter(
        key => searchParams[key] && key !== 'query' && key !== 'page' && key !== 'limit'
      ),
      averageRating: results.length > 0 ? 
        results.reduce((sum, t) => sum + (t.rating || 0), 0) / results.length : 0,
      subjectDistribution: this.getSubjectDistribution(results),
      experienceDistribution: this.getExperienceDistribution(results)
    };
  }
  
  // Get subject distribution from results
  static getSubjectDistribution(teachers) {
    const distribution = {};
    teachers.forEach(teacher => {
      teacher.subjects?.forEach(subject => {
        distribution[subject] = (distribution[subject] || 0) + 1;
      });
    });
    return distribution;
  }
  
  // Get experience distribution from results
  static getExperienceDistribution(teachers) {
    const distribution = { '0-2': 0, '2-5': 0, '5-10': 0, '10+': 0 };
    teachers.forEach(teacher => {
      const exp = teacher.experience || 0;
      if (exp < 2) distribution['0-2']++;
      else if (exp < 5) distribution['2-5']++;
      else if (exp < 10) distribution['5-10']++;
      else distribution['10+']++;
    });
    return distribution;
  }
  
  // Debounced search function for real-time search
  static debouncedSearch = this.debounce(this.searchTeachers.bind(this), 300);
  
  // Debounce utility
  static debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
}

// ============================================
// 🎨 SEARCH UI HELPER SERVICE
// ============================================

export class SearchUIService {
  // Generate quick filter buttons
  static generateQuickFilters() {
    return [
      {
        id: 'best-teachers',
        label: '🏆 সেরা শিক্ষক',
        type: 'rating',
        value: '4',
        color: '#10b981',
        icon: '⭐'
      },
      {
        id: 'physics-teachers',
        label: '⚗️ পদার্থবিদ্যা',
        type: 'subject',
        value: 'Physics',
        color: '#3b82f6',
        icon: '🔬'
      },
      {
        id: 'math-teachers',
        label: '📐 গণিত',
        type: 'subject',
        value: 'Mathematics',
        color: '#8b5cf6',
        icon: '🧮'
      },
      {
        id: 'english-teachers',
        label: '📝 ইংরেজি',
        type: 'subject',
        value: 'English',
        color: '#06b6d4',
        icon: '📚'
      },
      {
        id: 'class-10',
        label: '🎓 ক্লাস ১০',
        type: 'class',
        value: '10',
        color: '#f59e0b',
        icon: '📖'
      },
      {
        id: 'class-9',
        label: '📖 ক্লাস ৯',
        type: 'class',
        value: '9',
        color: '#ef4444',
        icon: '📝'
      },
      {
        id: 'experienced',
        label: '👨‍🏫 অভিজ্ঞ',
        type: 'experience',
        value: '5',
        color: '#84cc16',
        icon: '🎯'
      },
      {
        id: 'verified',
        label: '✅ যাচাইকৃত',
        type: 'verified',
        value: 'true',
        color: '#22c55e',
        icon: '🛡️'
      }
    ];
  }
  
  // Generate search suggestions UI
  static formatSuggestions(suggestions, popularTerms) {
    return {
      teachers: suggestions.filter(s => s.type === 'teacher'),
      subjects: suggestions.filter(s => s.type === 'subject'),
      popular: popularTerms.map(term => ({
        text: term,
        type: 'popular',
        icon: '🔥'
      }))
    };
  }
  
  // Generate search result cards
  static generateTeacherCards(teachers) {
    return teachers.map(teacher => ({
      ...teacher,
      displayRating: teacher.rating > 0 ? `${teacher.rating.toFixed(1)} ⭐` : 'নতুন',
      displayExperience: teacher.experience > 0 ? 
        `${teacher.experience} বছর অভিজ্ঞতা` : 'নতুন শিক্ষক',
      displaySubjects: teacher.subjects.slice(0, 3).join(', ') + 
        (teacher.subjects.length > 3 ? '...' : ''),
      badges: this.generateTeacherBadges(teacher)
    }));
  }
  
  // Generate teacher badges
  static generateTeacherBadges(teacher) {
    const badges = [];
    
    if (teacher.verified) {
      badges.push({ text: 'যাচাইকৃত', color: '#22c55e', icon: '✅' });
    }
    
    if (teacher.rating >= 4.5) {
      badges.push({ text: 'টপ রেটেড', color: '#fbbf24', icon: '🏆' });
    }
    
    if (teacher.experience >= 10) {
      badges.push({ text: 'অভিজ্ঞ', color: '#8b5cf6', icon: '👨‍🏫' });
    }
    
    if (teacher.reviewCount >= 50) {
      badges.push({ text: 'জনপ্রিয়', color: '#06b6d4', icon: '🌟' });
    }
    
    return badges;
  }
}

// ============================================
// 📤 EXPORT SERVICES
// ============================================

export default TeacherSearchService;
