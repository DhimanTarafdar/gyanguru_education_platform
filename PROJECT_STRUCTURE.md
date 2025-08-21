# GyanGuru Project Structure

```
GyanGuru/
├── 📁 backend/                          # Node.js + Express API Server
│   ├── 📁 controllers/                  # Route controllers (business logic)
│   │   ├── authController.js            # Authentication logic
│   │   ├── userController.js            # User management
│   │   ├── questionController.js        # Question CRUD operations
│   │   ├── assessmentController.js      # Assessment management
│   │   └── aiController.js              # AI question generation
│   │
│   ├── 📁 models/                       # MongoDB Mongoose models
│   │   ├── User.js ✅                   # User schema (Teacher/Student)
│   │   ├── Question.js ✅               # Question schema with AI support
│   │   ├── Assessment.js ✅             # Assessment/Quiz schema
│   │   ├── Submission.js                # Student submission schema
│   │   └── Notification.js              # Notification schema
│   │
│   ├── 📁 routes/                       # API route definitions
│   │   ├── auth.js                      # Authentication routes
│   │   ├── users.js                     # User management routes
│   │   ├── questions.js                 # Question CRUD routes
│   │   ├── assessments.js               # Assessment routes
│   │   └── uploads.js                   # File upload routes
│   │
│   ├── 📁 middleware/                   # Custom middleware
│   │   ├── auth.js                      # JWT authentication
│   │   ├── roleCheck.js                 # Role-based access control
│   │   ├── validation.js                # Input validation
│   │   ├── errorHandler.js              # Global error handling
│   │   ├── logger.js                    # Request logging
│   │   └── upload.js                    # File upload handling
│   │
│   ├── 📁 config/                       # Configuration files
│   │   ├── database.js ✅               # MongoDB connection
│   │   ├── jwt.js                       # JWT configuration
│   │   ├── upload.js                    # File upload config
│   │   └── ai.js                        # AI service configuration
│   │
│   ├── 📁 utils/                        # Utility functions
│   │   ├── aiService.js                 # AI question generation
│   │   ├── emailService.js              # Email notifications
│   │   ├── imageProcessor.js            # Image processing
│   │   ├── validators.js                # Custom validators
│   │   └── helpers.js                   # General helper functions
│   │
│   ├── 📁 uploads/                      # File upload directory
│   │   ├── 📁 images/                   # Question/answer images
│   │   ├── 📁 documents/                # PDF files
│   │   └── 📁 temp/                     # Temporary files
│   │
│   ├── package.json ✅                  # Backend dependencies
│   ├── server.js ✅                     # Main server file
│   ├── .env.example ✅                  # Environment variables template
│   └── .gitignore                       # Git ignore rules
│
├── 📁 frontend/                         # React.js Client Application
│   ├── 📁 public/                       # Static public files
│   │   ├── index.html                   # Main HTML template
│   │   ├── favicon.ico                  # App icon
│   │   └── manifest.json                # PWA manifest
│   │
│   ├── 📁 src/                          # React source code
│   │   ├── 📁 components/               # Reusable UI components
│   │   │   ├── 📁 common/               # Common components
│   │   │   │   ├── Header.jsx           # Navigation header
│   │   │   │   ├── Sidebar.jsx          # Navigation sidebar
│   │   │   │   ├── LoadingSpinner.jsx   # Loading component
│   │   │   │   └── Modal.jsx            # Modal component
│   │   │   │
│   │   │   ├── 📁 auth/                 # Authentication components
│   │   │   │   ├── LoginForm.jsx        # Login form
│   │   │   │   ├── RegisterForm.jsx     # Registration form
│   │   │   │   └── ProtectedRoute.jsx   # Route protection
│   │   │   │
│   │   │   ├── 📁 teacher/              # Teacher-specific components
│   │   │   │   ├── TeacherDashboard.jsx # Teacher dashboard
│   │   │   │   ├── QuestionBuilder.jsx  # Question creation form
│   │   │   │   ├── AssessmentCreator.jsx# Assessment creation
│   │   │   │   ├── StudentList.jsx      # Connected students
│   │   │   │   └── AIAssistant.jsx      # AI question generator
│   │   │   │
│   │   │   ├── 📁 student/              # Student-specific components
│   │   │   │   ├── StudentDashboard.jsx # Student dashboard
│   │   │   │   ├── TeacherSelection.jsx # Teacher browsing/selection
│   │   │   │   ├── QuizInterface.jsx    # MCQ quiz interface
│   │   │   │   ├── CQInterface.jsx      # CQ answer interface
│   │   │   │   ├── ResultView.jsx       # Quiz results display
│   │   │   │   └── ProgressChart.jsx    # Progress analytics
│   │   │   │
│   │   │   └── 📁 shared/               # Shared components
│   │   │       ├── QuestionCard.jsx     # Question display card
│   │   │       ├── Timer.jsx            # Countdown timer
│   │   │       ├── ImageUpload.jsx      # Image upload component
│   │   │       ├── NotificationList.jsx # Notifications
│   │   │       └── SearchBar.jsx        # Search functionality
│   │   │
│   │   ├── 📁 pages/                    # Page-level components
│   │   │   ├── HomePage.jsx             # Landing page
│   │   │   ├── LoginPage.jsx            # Login page
│   │   │   ├── RegisterPage.jsx         # Registration page
│   │   │   ├── DashboardPage.jsx        # Main dashboard
│   │   │   ├── ProfilePage.jsx          # User profile
│   │   │   ├── QuizPage.jsx             # Quiz taking page
│   │   │   ├── ResultsPage.jsx          # Results page
│   │   │   └── NotFoundPage.jsx         # 404 page
│   │   │
│   │   ├── 📁 hooks/                    # Custom React hooks
│   │   │   ├── useAuth.js               # Authentication hook
│   │   │   ├── useApi.js                # API calling hook
│   │   │   ├── useSocket.js             # Socket.io hook
│   │   │   ├── useTimer.js              # Timer functionality
│   │   │   ├── useLocalStorage.js       # Local storage hook
│   │   │   └── useNotifications.js      # Notifications hook
│   │   │
│   │   ├── 📁 context/                  # React Context providers
│   │   │   ├── AuthContext.js           # Authentication context
│   │   │   ├── UserContext.js           # User data context
│   │   │   ├── ThemeContext.js          # Theme management
│   │   │   └── SocketContext.js         # Real-time socket context
│   │   │
│   │   ├── 📁 services/                 # API service functions
│   │   │   ├── api.js                   # Axios configuration
│   │   │   ├── authService.js           # Authentication API
│   │   │   ├── userService.js           # User management API
│   │   │   ├── questionService.js       # Question CRUD API
│   │   │   ├── assessmentService.js     # Assessment API
│   │   │   └── uploadService.js         # File upload API
│   │   │
│   │   ├── 📁 utils/                    # Utility functions
│   │   │   ├── constants.js             # App constants
│   │   │   ├── helpers.js               # Helper functions
│   │   │   ├── validators.js            # Form validation
│   │   │   ├── formatters.js            # Data formatting
│   │   │   └── storage.js               # Local storage utils
│   │   │
│   │   ├── App.js                       # Main App component
│   │   ├── index.js                     # React DOM entry point
│   │   ├── App.css                      # Global styles
│   │   └── index.css                    # Base styles + Tailwind
│   │
│   ├── package.json ✅                  # Frontend dependencies
│   ├── tailwind.config.js               # Tailwind CSS config
│   ├── .env.example                     # Frontend environment variables
│   └── .gitignore                       # Git ignore rules
│
├── 📁 shared/                           # Shared code between frontend/backend
│   ├── types.ts ✅                      # TypeScript interfaces
│   ├── constants.js                     # Shared constants
│   ├── validators.js                    # Shared validation rules
│   └── utils.js                         # Shared utility functions
│
├── 📁 .github/                          # GitHub specific files
│   ├── copilot-instructions.md ✅       # Copilot development guide
│   └── workflows/                       # GitHub Actions (CI/CD)
│       ├── backend-test.yml             # Backend testing
│       ├── frontend-test.yml            # Frontend testing
│       └── deploy.yml                   # Deployment workflow
│
├── 📁 docs/                             # Project documentation
│   ├── api/                             # API documentation
│   ├── deployment/                      # Deployment guides
│   ├── development/                     # Development setup
│   └── user-manual/                     # User guides
│
├── README.md ✅                         # Project overview and setup
├── .gitignore                           # Git ignore rules
├── docker-compose.yml                   # Docker development setup
└── LICENSE                              # Project license
```

## 🔥 Key Features Covered:

### ✅ **Already Implemented:**
1. **Professional Project Structure** - Scalable and maintainable
2. **Database Models** - User, Question, Assessment with full relationships
3. **Backend Foundation** - Express server with security middleware
4. **Package Configuration** - Both frontend and backend dependencies
5. **Shared Types** - TypeScript interfaces for type safety

### 🚧 **Ready for Next Phase:**
1. **Authentication System** - JWT-based login/register
2. **Role-based Dashboards** - Teacher vs Student interfaces
3. **Question Management** - CRUD operations with AI integration
4. **Assessment System** - Quiz creation and taking functionality
5. **File Upload** - Image upload for CQ answers
6. **Real-time Features** - Socket.io for notifications

### 🎯 **Database Design Highlights:**
- **User Model**: Complete teacher/student profiles with relationships
- **Question Model**: MCQ/CQ support with AI generation tracking
- **Assessment Model**: Full quiz system with analytics
- **Scalable Architecture**: Ready for millions of questions and users

### 🛡️ **Security Features:**
- JWT authentication with refresh tokens
- Rate limiting and CORS protection
- Input validation and sanitization
- Role-based access control
- File upload security

## 🚀 Next Steps:
আপনি এখন কোন feature দিয়ে শুরু করতে চান? আমি suggest করব:
1. **Authentication System** - Login/Register functionality
2. **Basic Dashboards** - Teacher and Student interfaces
3. **Question Management** - Manual question creation
4. **AI Integration** - Automated question generation

বলুন কোনটা দিয়ে এগোবো! 💪
