# 🗄️ GyanGuru Database Architecture & Design Principles

## 📊 **Technology Stack**
- **Database:** MongoDB Atlas (Cloud-hosted, auto-scaling)
- **ODM:** Mongoose (Schema validation, middleware, relationships)
- **Image Storage:** Cloudinary (CDN, automatic optimization)
- **Video Storage:** AWS S3 / Google Cloud Storage
- **Caching:** Redis (Session management, API caching)

---

## 🎯 **Database Design Principles**

### 1. **Schema Design Philosophy**
```javascript
// ✅ Hybrid approach - Reference + Embedded
// ✅ Denormalization where necessary for performance
// ✅ Flexible schema for future requirements
// ✅ Strong validation rules
```

### 2. **Scalability Considerations**
- **Horizontal Scaling:** Sharding-ready schema design
- **Index Strategy:** Compound indexes for complex queries
- **Data Archiving:** Old data migration strategy
- **Connection Pooling:** Optimized connection management

### 3. **Performance Optimization**
- **Query Optimization:** Efficient aggregation pipelines
- **Data Locality:** Related data stored together
- **Minimal Lookups:** Reduce database round trips
- **Pagination:** Cursor-based pagination for large datasets

---

## 🔗 **Relationship Mapping & Cardinality**

### **User Relationships**
```
User (Teacher) ----< Questions (1:N)
               ----< Assessments (1:N)
               ----< ConnectedStudents (1:N)

User (Student) ----< Submissions (1:N)
               ----< ConnectedTeachers (M:N)
               ----< AssignedAssessments (M:N)
```

### **Question Relationships**
```
Question ----< AssessmentQuestions (M:N)
         ----< SubmissionAnswers (1:N)
         ----< UsageStats (1:1 embedded)
         ----< AIMetadata (1:1 embedded)
```

### **Assessment Relationships**
```
Assessment ----< Questions (M:N through reference)
           ----< Submissions (1:N)
           ----< StudentAssignments (1:N embedded)
           ----< Analytics (1:1 embedded)
```

---

## 💾 **Collection Structure**

### **Users Collection**
```javascript
{
  _id: ObjectId,
  // Basic Info (Always present)
  name: String,
  email: String (unique, indexed),
  role: String (indexed),
  
  // Profile Data (Embedded for performance)
  profile: {
    avatar: CloudinaryURL,
    phone: String,
    bio: String,
    address: Object
  },
  
  // Role-specific Data (Conditional embedding)
  teacherInfo: { ... },  // Only for teachers
  studentInfo: { ... },  // Only for students
  
  // Relationships (References)
  connections: [ObjectId], // Connected users
  
  // Metadata
  createdAt: Date,
  updatedAt: Date,
  lastLogin: Date (indexed)
}
```

### **Questions Collection**
```javascript
{
  _id: ObjectId,
  
  // Question Content (Embedded)
  content: {
    title: String,
    text: String,
    images: [CloudinaryURL],
    latex: String
  },
  
  // Academic Context (Indexed)
  academic: {
    subject: String (indexed),
    chapter: String,
    class: Number (indexed),
    difficulty: String (indexed)
  },
  
  // Question Type Data
  type: String (indexed),
  options: [Object],      // For MCQ
  correctAnswer: Object,  // Embedded
  
  // Metadata
  createdBy: ObjectId (indexed),
  source: String,         // manual/ai_generated
  
  // Performance Tracking (Embedded)
  stats: {
    totalAttempts: Number,
    correctAttempts: Number,
    averageTime: Number
  },
  
  // Search & Discovery
  tags: [String] (indexed),
  isActive: Boolean (indexed),
  
  timestamps: true
}
```

### **Assessments Collection**
```javascript
{
  _id: ObjectId,
  
  // Assessment Info
  title: String,
  description: String,
  
  // Academic Context (Indexed)
  subject: String (indexed),
  class: Number (indexed),
  
  // Timing (Indexed for queries)
  startTime: Date (indexed),
  endTime: Date (indexed),
  duration: Number,
  
  // Questions (Reference array)
  questions: [{
    questionId: ObjectId,
    marks: Number,
    order: Number
  }],
  
  // Creator & Assignments
  createdBy: ObjectId (indexed),
  assignedTo: [{
    studentId: ObjectId,
    assignedAt: Date,
    status: String
  }],
  
  // Configuration (Embedded)
  settings: Object,
  
  // Analytics (Embedded, updated atomically)
  analytics: {
    totalAttempts: Number,
    averageScore: Number,
    completionRate: Number
  },
  
  status: String (indexed),
  timestamps: true
}
```

### **Submissions Collection**
```javascript
{
  _id: ObjectId,
  
  // References
  assessmentId: ObjectId (indexed),
  studentId: ObjectId (indexed),
  
  // Submission Data
  answers: [{
    questionId: ObjectId,
    answer: Mixed,        // String/Array/Object
    timeSpent: Number,
    isCorrect: Boolean,
    marks: Number,
    image: CloudinaryURL  // For written answers
  }],
  
  // Timing & Scoring
  startTime: Date,
  endTime: Date,
  totalTime: Number,
  score: Number,
  percentage: Number,
  
  // Status
  status: String (indexed),
  submittedAt: Date (indexed),
  
  timestamps: true
}
```

---

## 🚀 **Index Strategy**

### **Performance Indexes**
```javascript
// Users
{ email: 1 }                          // Login queries
{ role: 1, isActive: 1 }             // User filtering
{ "teacherInfo.specialization": 1 }   // Teacher search
{ lastLogin: -1 }                     // Activity tracking

// Questions  
{ subject: 1, chapter: 1, class: 1 }  // Academic filtering
{ createdBy: 1, isActive: 1 }         // Teacher's questions
{ type: 1, difficulty: 1 }            // Question filtering
{ tags: 1 }                           // Tag-based search

// Assessments
{ createdBy: 1, status: 1 }           // Teacher's assessments
{ "assignedTo.studentId": 1 }         // Student's assignments
{ startTime: 1, endTime: 1 }          // Time-based queries

// Submissions
{ assessmentId: 1, studentId: 1 }     // Unique submissions
{ studentId: 1, submittedAt: -1 }     // Student history
{ assessmentId: 1, score: -1 }        // Leaderboard
```

### **Text Search Indexes**
```javascript
// Questions - Full text search
{
  "content.title": "text",
  "content.text": "text", 
  "tags": "text",
  "academic.subject": "text"
}
```

---

## 🛡️ **Data Consistency & Integrity**

### **Transaction Support**
```javascript
// Critical operations use transactions
- User registration + profile creation
- Assessment creation + question assignment  
- Submission + score calculation
- Payment processing (future)
```

### **Referential Integrity**
```javascript
// Mongoose middleware for cascade operations
- Delete user → Archive their questions
- Delete assessment → Archive submissions
- Update question → Update assessment stats
```

### **Data Validation**
```javascript
// Strong schema validation
- Email format validation
- Phone number patterns
- Academic info constraints
- File size limits
- Role-based field requirements
```

---

## 📈 **Scalability Features**

### **Horizontal Scaling Ready**
```javascript
// Sharding strategy
- Shard key: userId for user-related collections
- Shard key: createdAt for time-series data
- Geographic distribution support
```

### **Data Archiving Strategy**
```javascript
// Cold storage for old data
- Submissions older than 2 years
- Inactive user data
- Old question versions
- Historical analytics
```

### **Caching Strategy**
```javascript
// Redis caching layers
- User sessions (30 min TTL)
- Popular questions (1 hour TTL) 
- Assessment results (24 hour TTL)
- Teacher profiles (6 hour TTL)
```

---

## 🔍 **Query Optimization Patterns**

### **Aggregation Pipelines**
```javascript
// Complex analytics queries
- Student performance reports
- Question difficulty analysis  
- Teacher effectiveness metrics
- Subject-wise statistics
```

### **Efficient Lookups**
```javascript
// Minimize database round trips
- Populate only required fields
- Use projection to limit data
- Batch operations where possible
- Virtual fields for computed data
```

---

## 🚨 **Error Handling & Recovery**

### **Database Connection**
```javascript
// Robust connection handling
- Connection pooling
- Automatic reconnection
- Circuit breaker pattern
- Health check endpoints
```

### **Data Backup Strategy**
```javascript
// Multi-layer backup
- MongoDB Atlas automated backups
- Daily incremental backups
- Weekly full backups
- Disaster recovery procedures
```

---

## 🎯 **Future-Proofing**

### **Schema Evolution**
```javascript
// Version-aware schemas
- Migration scripts
- Backward compatibility
- Feature flags for new fields
- A/B testing support
```

### **Performance Monitoring**
```javascript
// Database performance tracking
- Query performance metrics
- Index usage statistics
- Connection pool monitoring
- Slow query alerts
```

---

**এই architecture ensure করবে যে আপনার GyanGuru platform millions of users handle করতে পারবে without performance issues! 🚀**
