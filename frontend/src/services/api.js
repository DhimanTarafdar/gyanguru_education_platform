import axios from 'axios';

// API Base Configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const SOCKET_URL = process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000';

// Create axios instance with default configuration
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds
  withCredentials: true, // Send cookies with requests
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  }
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    // Get token from localStorage
    const token = localStorage.getItem('authToken');
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Log requests in development
    if (process.env.REACT_APP_ENABLE_CONSOLE_LOGS === 'true') {
      console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`, {
        data: config.data,
        params: config.params
      });
    }

    return config;
  },
  (error) => {
    console.error('🚨 Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    // Log successful responses in development
    if (process.env.REACT_APP_ENABLE_CONSOLE_LOGS === 'true') {
      console.log(`✅ API Response: ${response.config.method?.toUpperCase()} ${response.config.url}`, {
        status: response.status,
        data: response.data
      });
    }

    return response;
  },
  (error) => {
    const { response, request, message } = error;

    // Log errors
    console.error('🚨 API Error:', {
      status: response?.status,
      message: response?.data?.message || message,
      url: request?.responseURL
    });

    // Handle specific error cases
    if (response?.status === 401) {
      // Unauthorized - redirect to login
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      window.location.href = '/login';
    } else if (response?.status === 403) {
      // Forbidden - show access denied message
      console.error('Access denied: Insufficient permissions');
    } else if (response?.status >= 500) {
      // Server error - show generic error message
      console.error('Server error: Please try again later');
    }

    return Promise.reject(error);
  }
);

// API endpoint configurations
export const endpoints = {
  // Authentication
  auth: {
    login: '/auth/login',
    register: '/auth/register',
    logout: '/auth/logout',
    refresh: '/auth/refresh',
    forgotPassword: '/auth/forgot-password',
    resetPassword: '/auth/reset-password',
    verifyEmail: '/auth/verify-email'
  },

  // Users
  users: {
    profile: '/users/profile',
    updateProfile: '/users/profile',
    uploadAvatar: '/users/avatar',
    getTeachers: '/users/teachers',
    getStudents: '/users/students',
    connectRequest: '/users/connect'
  },

  // Questions
  questions: {
    create: '/questions',
    getAll: '/questions',
    getById: (id) => `/questions/${id}`,
    update: (id) => `/questions/${id}`,
    delete: (id) => `/questions/${id}`,
    generate: '/questions/ai-generate',
    search: '/questions/search',
    bulk: '/questions/bulk'
  },

  // Assessments - EXTRAORDINARY Phase 4 Features
  assessments: {
    // Basic CRUD
    create: '/assessments',
    getAll: '/assessments',
    getById: (id) => `/assessments/${id}`,
    update: (id) => `/assessments/${id}`,
    delete: (id) => `/assessments/${id}`,
    
    // Student Assessment Journey - Phase 4 Core Features
    start: (id) => `/assessments/${id}/start`,                    // Start assessment attempt
    getCurrentAttempt: (id) => `/assessments/${id}/attempt`,       // Get current attempt with progress
    saveAnswer: (id) => `/assessments/${id}/answer`,               // Save individual answers
    submitAssessment: (id) => `/assessments/${id}/submit`,         // Final submission
    getResults: (id) => `/assessments/${id}/results`,              // View detailed results
    
    // Progress Tracking - EXTRAORDINARY Features
    pauseAssessment: (id) => `/assessments/${id}/pause`,           // Pause assessment
    resumeAssessment: (id) => `/assessments/${id}/resume`,         // Resume paused assessment
    getProgress: (id) => `/assessments/${id}/progress`,            // Real-time progress tracking
    trackActivity: (id) => `/assessments/${id}/activity`,          // Track student activities
    
    // Security & Monitoring - ADVANCED Features
    reportSecurityEvent: (id) => `/assessments/${id}/security-event`, // Report violations
    verifyIntegrity: (id) => `/assessments/${id}/verify`,          // Verify submission integrity
    
    // Teacher Features
    assign: (id) => `/assessments/${id}/assign`,
    getAnalytics: (id) => `/assessments/${id}/analytics`,
    getSubmissions: (id) => `/assessments/${id}/submissions`,
    
    // AI-Powered Features
    generateQuestions: (id) => `/assessments/${id}/generate-questions`,
    autoGrade: (id) => `/assessments/${id}/auto-grade`,
    
    // Live Features - EXTRAORDINARY Real-time
    liveMonitoring: (id) => `/assessments/${id}/live`,             // Live teacher monitoring
    liveLeaderboard: (id) => `/assessments/${id}/leaderboard`,     // Real-time rankings
    liveChat: (id) => `/assessments/${id}/chat`                    // Live communication
  },

  // Image Upload for Written Answers - Phase 4 CORE Feature
  imageUpload: {
    uploadAnswerImages: (assessmentId, questionId) => 
      `/image-upload/${assessmentId}/upload/${questionId}`,        // Upload handwritten answers
    getAnswerImages: (assessmentId, questionId) => 
      `/image-upload/${assessmentId}/images/${questionId}`,        // View uploaded images
    gradeImageAnswer: (assessmentId, questionId) => 
      `/image-upload/${assessmentId}/grade/${questionId}`,         // Teacher grading interface
    getSubmissionsForGrading: (assessmentId) => 
      `/image-upload/submissions/${assessmentId}`,                 // Get all submissions
    serveImage: (filename) => `/image-upload/serve/${filename}`     // Serve images securely
  },

  // Real-time Progress Tracking - EXTRAORDINARY Features
  progress: {
    trackAnswerTime: (assessmentId) => `/progress/${assessmentId}/answer-time`,
    getQuestionProgress: (assessmentId) => `/progress/${assessmentId}/questions`,
    getTimeAnalytics: (assessmentId) => `/progress/${assessmentId}/time-analytics`,
    getLiveUpdates: (assessmentId) => `/progress/${assessmentId}/live-updates`,
    getParticipationRate: (assessmentId) => `/progress/${assessmentId}/participation`
  },

  // Advanced Result Generation - COMPREHENSIVE Features
  results: {
    getDetailedResults: (assessmentId) => `/results/${assessmentId}/detailed`,
    getComparativeAnalysis: (assessmentId) => `/results/${assessmentId}/comparative`,
    getPerformanceTrends: (assessmentId) => `/results/${assessmentId}/trends`,
    getQuestionWiseAnalysis: (assessmentId) => `/results/${assessmentId}/question-wise`,
    generateReport: (assessmentId) => `/results/${assessmentId}/report`,
    exportResults: (assessmentId, format) => `/results/${assessmentId}/export/${format}`,
    getPlagiarismReport: (assessmentId) => `/results/${assessmentId}/plagiarism`,
    getGradingInsights: (assessmentId) => `/results/${assessmentId}/grading-insights`
  },

  // Uploads
  uploads: {
    image: '/uploads/image',
    document: '/uploads/document',
    avatar: '/uploads/avatar'
  },

  // Analytics
  analytics: {
    dashboard: '/analytics/dashboard',
    performance: '/analytics/performance',
    usage: '/analytics/usage'
  }
};

// Environment-specific configurations
export const config = {
  apiUrl: API_BASE_URL,
  socketUrl: SOCKET_URL,
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV === 'development',
  enableLogs: process.env.REACT_APP_ENABLE_CONSOLE_LOGS === 'true',
  maxFileSize: parseInt(process.env.REACT_APP_MAX_FILE_SIZE || '10485760'),
  allowedImageTypes: process.env.REACT_APP_ALLOWED_IMAGE_TYPES?.split(',') || [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp'
  ]
};

// Utility functions for API calls - EXTRAORDINARY Phase 4 Features
export const apiUtils = {
  // Generic GET request
  get: async (endpoint, params = {}) => {
    const response = await api.get(endpoint, { params });
    return response.data;
  },

  // Generic POST request
  post: async (endpoint, data = {}) => {
    const response = await api.post(endpoint, data);
    return response.data;
  },

  // Generic PUT request
  put: async (endpoint, data = {}) => {
    const response = await api.put(endpoint, data);
    return response.data;
  },

  // Generic DELETE request
  delete: async (endpoint) => {
    const response = await api.delete(endpoint);
    return response.data;
  },

  // File upload request with advanced progress tracking
  upload: async (endpoint, file, onProgress = null) => {
    const formData = new FormData();
    formData.append('file', file);

    const config = {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    };

    if (onProgress) {
      config.onUploadProgress = (progressEvent) => {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        onProgress(percentCompleted);
      };
    }

    const response = await api.post(endpoint, formData, config);
    return response.data;
  },

  // EXTRAORDINARY Phase 4 Features - Image Upload for Written Answers
  uploadAnswerImages: async (assessmentId, questionId, images, onProgress = null) => {
    const formData = new FormData();
    
    // Support multiple image upload
    images.forEach((image, index) => {
      formData.append('answerImages', image);
    });
    
    formData.append('assessmentId', assessmentId);
    formData.append('questionId', questionId);

    const config = {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      timeout: 60000, // 60 seconds for image upload
    };

    if (onProgress) {
      config.onUploadProgress = (progressEvent) => {
        const percentCompleted = Math.round(
          (progressEvent.loaded * 100) / progressEvent.total
        );
        onProgress(percentCompleted);
      };
    }

    const endpoint = endpoints.imageUpload.uploadAnswerImages(assessmentId, questionId);
    const response = await api.post(endpoint, formData, config);
    return response.data;
  },

  // Assessment Journey - COMPREHENSIVE Student Experience
  assessment: {
    // Start assessment with advanced configuration
    start: async (assessmentId) => {
      const response = await api.post(endpoints.assessments.start(assessmentId));
      return response.data;
    },

    // Get current attempt with real-time progress
    getCurrentAttempt: async (assessmentId) => {
      const response = await api.get(endpoints.assessments.getCurrentAttempt(assessmentId));
      return response.data;
    },

    // Save answer with time tracking and analytics
    saveAnswer: async (assessmentId, answerData) => {
      const enrichedData = {
        ...answerData,
        timestamp: new Date().toISOString(),
        clientTime: Date.now()
      };
      
      const response = await api.post(
        endpoints.assessments.saveAnswer(assessmentId), 
        enrichedData
      );
      return response.data;
    },

    // Submit assessment with integrity verification
    submit: async (assessmentId, submissionData = {}) => {
      const finalData = {
        ...submissionData,
        submissionTimestamp: new Date().toISOString(),
        browserInfo: {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          language: navigator.language,
          cookieEnabled: navigator.cookieEnabled
        }
      };

      const response = await api.post(
        endpoints.assessments.submitAssessment(assessmentId), 
        finalData
      );
      return response.data;
    },

    // Pause assessment with state preservation
    pause: async (assessmentId) => {
      const response = await api.post(endpoints.assessments.pauseAssessment(assessmentId));
      return response.data;
    },

    // Resume assessment with state restoration
    resume: async (assessmentId) => {
      const response = await api.post(endpoints.assessments.resumeAssessment(assessmentId));
      return response.data;
    },

    // Report security events
    reportSecurityEvent: async (assessmentId, eventData) => {
      const response = await api.post(
        endpoints.assessments.reportSecurityEvent(assessmentId), 
        {
          ...eventData,
          timestamp: new Date().toISOString(),
          userAgent: navigator.userAgent
        }
      );
      return response.data;
    }
  },

  // Advanced Progress Tracking
  progress: {
    // Real-time progress updates
    getProgress: async (assessmentId) => {
      const response = await api.get(endpoints.progress.getQuestionProgress(assessmentId));
      return response.data;
    },

    // Time analytics for performance insights
    getTimeAnalytics: async (assessmentId) => {
      const response = await api.get(endpoints.progress.getTimeAnalytics(assessmentId));
      return response.data;
    },

    // Live participation monitoring
    getParticipationRate: async (assessmentId) => {
      const response = await api.get(endpoints.progress.getParticipationRate(assessmentId));
      return response.data;
    }
  },

  // Comprehensive Result Generation
  results: {
    // Get detailed results with analytics
    getDetailedResults: async (assessmentId) => {
      const response = await api.get(endpoints.results.getDetailedResults(assessmentId));
      return response.data;
    },

    // Comparative performance analysis
    getComparativeAnalysis: async (assessmentId) => {
      const response = await api.get(endpoints.results.getComparativeAnalysis(assessmentId));
      return response.data;
    },

    // Performance trends over time
    getPerformanceTrends: async (assessmentId) => {
      const response = await api.get(endpoints.results.getPerformanceTrends(assessmentId));
      return response.data;
    },

    // Question-wise analysis
    getQuestionWiseAnalysis: async (assessmentId) => {
      const response = await api.get(endpoints.results.getQuestionWiseAnalysis(assessmentId));
      return response.data;
    },

    // Generate comprehensive report
    generateReport: async (assessmentId, format = 'pdf') => {
      const response = await api.get(
        endpoints.results.generateReport(assessmentId), 
        { params: { format } }
      );
      return response.data;
    },

    // Export results in various formats
    exportResults: async (assessmentId, format = 'excel') => {
      const response = await api.get(
        endpoints.results.exportResults(assessmentId, format),
        { responseType: 'blob' }
      );
      return response.data;
    }
  },

  // ==========================================
  // 📊 PHASE 5: ANALYTICS & REPORTS - EXTRAORDINARY FEATURES
  // ==========================================

  // Advanced Analytics APIs
  analytics: {
    // Student Analytics
    getStudentDashboard: async (studentId, options = {}) => {
      const response = await api.get(`/analytics/student/${studentId}/dashboard`, { params: options });
      return response.data;
    },

    getStudentComparison: async (studentId, options = {}) => {
      const response = await api.get(`/analytics/student/${studentId}/comparison`, { params: options });
      return response.data;
    },

    getStudentSubjectAnalytics: async (studentId, subject, options = {}) => {
      const response = await api.get(`/analytics/student/${studentId}/subject/${subject}`, { params: options });
      return response.data;
    },

    getStudentProgressTracking: async (studentId, assessmentId) => {
      const response = await api.get(`/analytics/student/${studentId}/progress/${assessmentId}`);
      return response.data;
    },

    getStudentLearningAnalytics: async (studentId, options = {}) => {
      const response = await api.get(`/analytics/student/${studentId}/learning`, { params: options });
      return response.data;
    },

    // Teacher Analytics
    getTeacherDashboard: async (teacherId, options = {}) => {
      const response = await api.get(`/analytics/teacher/${teacherId}/dashboard`, { params: options });
      return response.data;
    },

    getClassAnalytics: async (teacherId, classId, options = {}) => {
      const response = await api.get(`/analytics/teacher/${teacherId}/class/${classId}`, { params: options });
      return response.data;
    },

    getAssessmentAnalytics: async (assessmentId) => {
      const response = await api.get(`/analytics/assessment/${assessmentId}/detailed`);
      return response.data;
    },

    getGradingAnalytics: async (assessmentId) => {
      const response = await api.get(`/analytics/assessment/${assessmentId}/grading`);
      return response.data;
    },

    // System Analytics
    getSystemOverview: async (options = {}) => {
      const response = await api.get('/analytics/system/overview', { params: options });
      return response.data;
    }
  },

  // Advanced Reports APIs
  reports: {
    // Student Reports
    generateStudentProgressReport: async (studentId, options = {}) => {
      const response = await api.get(`/reports/student/${studentId}/progress`, { 
        params: options,
        responseType: options.format === 'json' ? 'json' : 'blob'
      });
      return response.data;
    },

    generateStudentInsightsReport: async (studentId, options = {}) => {
      const response = await api.get(`/reports/student/${studentId}/insights`, { 
        params: options,
        responseType: options.format === 'json' ? 'json' : 'blob'
      });
      return response.data;
    },

    generateStudentSubjectReport: async (studentId, subject, options = {}) => {
      const response = await api.get(`/reports/student/${studentId}/subject/${subject}`, { 
        params: options,
        responseType: options.format === 'json' ? 'json' : 'blob'
      });
      return response.data;
    },

    generateStudentComparativeReport: async (studentId, options = {}) => {
      const response = await api.get(`/reports/student/${studentId}/comparative`, { 
        params: options,
        responseType: options.format === 'json' ? 'json' : 'blob'
      });
      return response.data;
    },

    // Teacher Reports
    generateTeacherDashboardReport: async (teacherId, options = {}) => {
      const response = await api.get(`/reports/teacher/${teacherId}/dashboard`, { 
        params: options,
        responseType: options.format === 'json' ? 'json' : 'blob'
      });
      return response.data;
    },

    generateClassProgressReport: async (teacherId, classId, options = {}) => {
      const response = await api.get(`/reports/teacher/${teacherId}/class/${classId}/progress`, { 
        params: options,
        responseType: options.format === 'json' ? 'json' : 'blob'
      });
      return response.data;
    },

    generatePerformanceAnalyticsReport: async (options = {}) => {
      const response = await api.get('/reports/analytics/performance', { 
        params: options,
        responseType: options.format === 'json' ? 'json' : 'blob'
      });
      return response.data;
    }
  },

  // Real-time Analytics WebSocket (placeholder for future implementation)
  realtime: {
    connectAnalytics: (studentId, assessmentId) => {
      console.log(`🔗 Connecting to real-time analytics for student: ${studentId}, assessment: ${assessmentId}`);
      // WebSocket implementation would go here
      return {
        onProgressUpdate: (callback) => console.log('Progress update listener registered'),
        onPerformanceAlert: (callback) => console.log('Performance alert listener registered'),
        disconnect: () => console.log('Real-time analytics disconnected')
      };
    }
  },

  // Image grading for teachers
  grading: {
    // View student images for grading
    getAnswerImages: async (assessmentId, questionId, studentId = null) => {
      const params = studentId ? { studentId } : {};
      const response = await api.get(
        endpoints.imageUpload.getAnswerImages(assessmentId, questionId),
        { params }
      );
      return response.data;
    },

    // Grade image-based answers
    gradeImageAnswer: async (assessmentId, questionId, gradingData) => {
      const response = await api.post(
        endpoints.imageUpload.gradeImageAnswer(assessmentId, questionId),
        {
          ...gradingData,
          gradedAt: new Date().toISOString()
        }
      );
      return response.data;
    },

    // Get all submissions for grading
    getSubmissionsForGrading: async (assessmentId, filters = {}) => {
      const response = await api.get(
        endpoints.imageUpload.getSubmissionsForGrading(assessmentId),
        { params: filters }
      );
      return response.data;
    }
  }
};

// Export configured axios instance
export default api;

// Health check function
export const healthCheck = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL.replace('/api', '')}/health`);
    return response.data;
  } catch (error) {
    console.error('Health check failed:', error);
    throw error;
  }
};
