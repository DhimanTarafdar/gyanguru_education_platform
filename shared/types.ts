// Shared types and interfaces for both frontend and backend

// User related types
export interface User {
  _id: string;
  name: string;
  email: string;
  phone: string;
  role: 'student' | 'teacher' | 'admin';
  isActive: boolean;
  avatar?: string;
  bio?: string;
  dateOfBirth?: Date;
  gender?: 'male' | 'female' | 'other';
  academicInfo?: AcademicInfo;
  teacherInfo?: TeacherInfo;
  createdAt: Date;
  updatedAt: Date;
}

export interface AcademicInfo {
  class: number;
  group?: 'science' | 'commerce' | 'arts';
  institution?: string;
  subjects: string[];
}

export interface TeacherInfo {
  qualification?: string;
  experience?: number;
  specialization: string[];
  rating: number;
  totalStudents: number;
  isVerified: boolean;
}

// Question related types
export interface Question {
  _id: string;
  title: string;
  type: 'mcq' | 'cq' | 'true_false' | 'fill_blank';
  subject: string;
  chapter: string;
  topic?: string;
  class: number;
  difficulty: 'easy' | 'medium' | 'hard';
  marks: number;
  timeLimit: number;
  question: QuestionContent;
  options?: QuestionOption[];
  correctAnswer: CorrectAnswer;
  createdBy: string | User;
  source: 'manual' | 'ai_generated' | 'imported';
  usageStats: UsageStats;
  tags: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface QuestionContent {
  text: string;
  image?: string;
  latex?: string;
}

export interface QuestionOption {
  text: string;
  image?: string;
  isCorrect: boolean;
}

export interface CorrectAnswer {
  text?: string;
  explanation?: string;
  image?: string;
  keyPoints?: string[];
}

export interface UsageStats {
  totalAttempts: number;
  correctAttempts: number;
  averageTime: number;
}

// Assessment related types
export interface Assessment {
  _id: string;
  title: string;
  description?: string;
  subject: string;
  chapter: string;
  class: number;
  type: 'practice' | 'test' | 'exam' | 'assignment';
  totalMarks: number;
  totalQuestions: number;
  duration: number;
  startTime: Date;
  endTime: Date;
  questions: AssessmentQuestion[];
  createdBy: string | User;
  assignedTo: StudentAssignment[];
  settings: AssessmentSettings;
  status: 'draft' | 'published' | 'active' | 'completed' | 'archived';
  analytics: AssessmentAnalytics;
  createdAt: Date;
  updatedAt: Date;
}

export interface AssessmentQuestion {
  question: string | Question;
  marks: number;
  order: number;
}

export interface StudentAssignment {
  student: string | User;
  assignedAt: Date;
  status: 'assigned' | 'started' | 'completed' | 'submitted';
}

export interface AssessmentSettings {
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  showResults: boolean;
  showCorrectAnswers: boolean;
  allowReview: boolean;
  allowRetake: boolean;
  maxAttempts: number;
  passingScore?: number;
}

export interface AssessmentAnalytics {
  totalAttempts: number;
  averageScore: number;
  highestScore: number;
  lowestScore: number;
  completionRate: number;
}

// Submission related types
export interface Submission {
  _id: string;
  assessment: string | Assessment;
  student: string | User;
  answers: SubmissionAnswer[];
  startTime: Date;
  endTime?: Date;
  score?: number;
  percentage?: number;
  status: 'in_progress' | 'submitted' | 'graded';
  timeSpent: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface SubmissionAnswer {
  question: string | Question;
  answer: string | string[]; // Single answer or multiple for MCQ
  isCorrect?: boolean;
  marks?: number;
  timeSpent: number;
  image?: string; // For CQ image uploads
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Authentication types
export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  phone: string;
  role: 'student' | 'teacher';
  academicInfo?: Partial<AcademicInfo>;
  teacherInfo?: Partial<TeacherInfo>;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

// Notification types
export interface Notification {
  _id: string;
  recipient: string | User;
  sender?: string | User;
  type: 'assignment' | 'result' | 'reminder' | 'connection' | 'system';
  title: string;
  message: string;
  data?: any;
  isRead: boolean;
  createdAt: Date;
}

// Filter and search types
export interface QuestionFilters {
  subject?: string;
  chapter?: string;
  class?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  type?: 'mcq' | 'cq' | 'true_false' | 'fill_blank';
  tags?: string[];
  search?: string;
}

export interface AssessmentFilters {
  subject?: string;
  class?: number;
  type?: 'practice' | 'test' | 'exam' | 'assignment';
  status?: 'draft' | 'published' | 'active' | 'completed' | 'archived';
  dateRange?: {
    start: Date;
    end: Date;
  };
}

// Form validation types
export interface ValidationError {
  field: string;
  message: string;
}

export interface FormErrors {
  [key: string]: string;
}

// UI State types
export interface LoadingState {
  [key: string]: boolean;
}

export interface UIState {
  sidebarOpen: boolean;
  theme: 'light' | 'dark';
  loading: LoadingState;
}

// Constants
export const USER_ROLES = {
  STUDENT: 'student',
  TEACHER: 'teacher',
  ADMIN: 'admin'
} as const;

export const QUESTION_TYPES = {
  MCQ: 'mcq',
  CQ: 'cq',
  TRUE_FALSE: 'true_false',
  FILL_BLANK: 'fill_blank'
} as const;

export const DIFFICULTY_LEVELS = {
  EASY: 'easy',
  MEDIUM: 'medium',
  HARD: 'hard'
} as const;

export const ASSESSMENT_STATUS = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  ACTIVE: 'active',
  COMPLETED: 'completed',
  ARCHIVED: 'archived'
} as const;
