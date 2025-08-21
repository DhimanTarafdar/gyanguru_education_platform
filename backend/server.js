// GyanGuru Backend Server
// শিক্ষামূলক প্ল্যাটফর্মের জন্য Express.js সার্ভার

const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const colors = require('colors');
const path = require('path');

// Environment variables load
dotenv.config({ path: path.join(__dirname, '.env') });

// Import modules
const connectDB = require('./config/database');
const errorHandler = require('./middleware/errorHandler');
const logger = require('./middleware/logger');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const questionRoutes = require('./routes/questions');
const assessmentRoutes = require('./routes/assessments');
const analyticsRoutes = require('./routes/analytics');
const reportsRoutes = require('./routes/reports');
const teacherReviewRoutes = require('./routes/teacherReviews');
const teacherSearchRoutes = require('./routes/teacherSearch');
const notificationRoutes = require('./routes/notifications');
const studentDashboardRoutes = require('./routes/studentDashboard');
const communicationRoutes = require('./routes/communication');
const recommendationRoutes = require('./routes/recommendations');
const fileManagementRoutes = require('./routes/fileManagement');
const folderManagementRoutes = require('./routes/folderManagement');
const gamificationRoutes = require('./routes/gamification');
const securityRoutes = require('./routes/security');
// const imageUploadRoutes = require('./routes/imageUpload'); // Temporarily disabled

// Import services
const SocketService = require('./services/SocketService');
const SchedulerService = require('./services/SchedulerService');
const { EmailService } = require('./services/NotificationService');

// Connect to database
connectDB();

const app = express();
const server = http.createServer(app);

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW) * 60 * 1000 || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  message: 'অনেক বেশি request পাঠানো হয়েছে। কিছুক্ষণ পর আবার চেষ্টা করুন।',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// CORS configuration
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://gyanguru.netlify.app',
  'https://gyanguru-admin.netlify.app',
  'https://gyanguru.vercel.app',
];

if (process.env.CLIENT_URL) {
  const envUrls = process.env.CLIENT_URL.split(',');
  allowedOrigins.push(...envUrls);
}

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log(`CORS দ্বারা blocked: ${origin}`.red);
      callback(new Error('CORS policy দ্বারা অনুমোদিত নয়'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['X-Total-Count', 'X-Page', 'X-Per-Page']
};

app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Custom middleware
if (process.env.ENABLE_LOGGING === 'true') {
  app.use(logger);
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'GyanGuru API সফলভাবে চালু আছে',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    version: '1.0.0'
  });
});

// Health check endpoint for Railway
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'GyanGuru Backend is running smoothly! 🚀',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0'
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'Welcome to GyanGuru Backend API! 📚',
    version: '1.0.0',
    endpoints: [
      'GET /api/health - Health check',
      'POST /api/auth/register - User registration',
      'POST /api/auth/login - User login',
      'GET /api/users/profile - User profile',
      // Add more endpoints as needed
    ],
    documentation: 'Visit /api/health for system status'
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/assessments', assessmentRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/reviews', teacherReviewRoutes);
app.use('/api/search', teacherSearchRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/student-dashboard', studentDashboardRoutes);
app.use('/api/communication', communicationRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/files', fileManagementRoutes);
app.use('/api/folders', folderManagementRoutes);
app.use('/api/gamification', gamificationRoutes);
app.use('/api/security', securityRoutes);
// app.use('/api/image-upload', imageUploadRoutes); // Image upload routes ready but temporarily disabled

// Error handling
app.all('*', (req, res, next) => {
  const error = new Error(`রুট ${req.originalUrl} পাওয়া যায়নি`);
  error.statusCode = 404;
  next(error);
});

app.use(errorHandler);

// Unhandled rejections & exceptions
process.on('unhandledRejection', (err, promise) => {
  console.log(`Unhandled Rejection: ${err.message}`.red.bold);
  server.close(() => {
    process.exit(1);
  });
});

process.on('uncaughtException', (err) => {
  console.log(`Uncaught Exception: ${err.message}`.red.bold);
  console.log('Uncaught Exception এর কারণে server বন্ধ করা হচ্ছে');
  process.exit(1);
});

// Server startup
// Server configuration
const PORT = process.env.PORT || 5001;

// Initialize Socket.io
SocketService.initialize(server);

// Initialize email service
EmailService.initializeTransporter();

// Initialize scheduler service
SchedulerService.initialize();

server.listen(PORT, () => {
  console.log(
    `🚀 GyanGuru API Server ${process.env.NODE_ENV} mode এ port ${PORT} তে চালু হয়েছে`.yellow.bold
  );
  console.log(`📊 Health check: http://localhost:${PORT}/health`.cyan);
  console.log(`📚 API base URL: http://localhost:${PORT}/api`.cyan);
  console.log(`🔔 Real-time notifications: Socket.io initialized`.green);
  console.log(`⏰ Scheduler service: Active`.green);
  console.log(`📧 Email service: ${EmailService.emailTransporter ? 'Ready' : 'Not configured'}`.cyan);
  console.log(`🎓 শিক্ষামূলক প্ল্যাটফর্ম প্রস্তুত!`.green.bold);
});

module.exports = app;
