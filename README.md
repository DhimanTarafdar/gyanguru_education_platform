# GyanGuru - Teacher-Student Education Platform

A comprehensive MERN stack application for education management with AI-powered features.

## 🚀 Features

### For Teachers
- Role-based dashboard
- Subject and chapter-wise question creation
- AI-powered MCQ and CQ generation
- Student assignment management
- Answer evaluation and marking
- Real-time notifications

### For Students  
- Teacher selection and matching
- Timed MCQ assessments (30 minutes)
- Image upload for written answers
- Instant results and explanations
- Performance tracking
- Personal profile management

## 🛠️ Tech Stack

- **Frontend**: React.js, React Router, Axios
- **Backend**: Node.js, Express.js, JWT
- **Database**: MongoDB, Mongoose
- **AI Integration**: OpenAI/Gemini API
- **File Upload**: Multer, Cloud Storage
- **Real-time**: Socket.io

## 📁 Project Structure

```
GyanGuru/
├── backend/                 # Node.js API server
│   ├── controllers/         # Route controllers
│   ├── models/             # MongoDB models
│   ├── routes/             # API routes
│   ├── middleware/         # Custom middleware
│   ├── config/             # Configuration files
│   ├── utils/              # Utility functions
│   └── uploads/            # File uploads
├── frontend/               # React application
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── pages/          # Page components
│   │   ├── hooks/          # Custom hooks
│   │   ├── context/        # React context
│   │   ├── services/       # API services
│   │   └── utils/          # Utility functions
│   └── public/
└── shared/                 # Shared types/interfaces
```

## 🔧 Development Setup

### Prerequisites
- Node.js (v16+)
- MongoDB
- Git

### Installation
1. Clone the repository
2. Install backend dependencies: `cd backend && npm install`
3. Install frontend dependencies: `cd frontend && npm install`
4. Setup environment variables
5. Start development servers

## 📋 Development Roadmap

### Phase 1: Foundation
- [x] Project structure setup
- [ ] Backend API skeleton
- [ ] Database schema design
- [ ] Basic authentication

### Phase 2: Core Features
- [ ] User management (Teacher/Student)
- [ ] Dashboard components
- [ ] Question management system
- [ ] Assessment functionality

### Phase 3: Advanced Features
- [ ] AI question generation
- [ ] Image upload and processing
- [ ] Real-time notifications
- [ ] Performance analytics

### Phase 4: Polish & Deploy
- [ ] Testing and optimization
- [ ] UI/UX improvements
- [ ] Production deployment
- [ ] Documentation

## 🤝 Contributing

This project follows agile methodology with feature-by-feature development.

## 📄 License

MIT License

---

**GyanGuru** - Empowering Education Through Technology 🎓
