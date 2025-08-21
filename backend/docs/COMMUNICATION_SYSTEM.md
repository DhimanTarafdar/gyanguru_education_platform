# 💬 GyanGuru Communication System API Documentation

## 🚀 Complete Real-time Communication Platform

The GyanGuru Communication System provides comprehensive messaging, Q&A, announcements, and collaborative features for educational environments. Built with real-time capabilities using Socket.io and robust backend APIs.

---

## 📋 System Overview

### ✅ Features Implemented
- ✅ **Private Messaging**: Direct teacher-student communication
- ✅ **Group Discussions**: Multi-participant conversations
- ✅ **Academic Q&A**: Structured question-answer system
- ✅ **Announcements**: Broadcast system for important updates
- ✅ **File Sharing**: Document, image, audio, and video support
- ✅ **Real-time Messaging**: Live chat with typing indicators
- ✅ **Message Reactions**: Emoji reactions and engagement
- ✅ **Conversation Management**: Create, join, leave conversations
- ✅ **Search & Discovery**: Advanced search across all communications
- ✅ **Analytics & Statistics**: Communication insights and metrics
- ✅ **Online Presence**: Real-time user status tracking

### 🔧 Technical Stack
- **Backend**: Node.js/Express.js
- **Database**: MongoDB with Mongoose
- **Real-time**: Socket.io
- **File Upload**: Multer middleware
- **Authentication**: JWT with role-based access
- **File Storage**: Local file system (expandable to cloud)

---

## 🌐 API Base URL
```
http://localhost:5007/api/communication
```

---

## 🔐 Authentication
All endpoints require JWT authentication via `Authorization: Bearer <token>` header.

### Role-based Access:
- **Students**: Can ask questions, participate in discussions, receive announcements
- **Teachers**: Can answer questions, create announcements, moderate discussions
- **Admins**: Full access to all communication features

---

## 📡 API Endpoints

### 💬 Conversation Management

#### 1. Get User Conversations
```http
GET /conversations
```
**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20)
- `type` (string): Filter by conversation type

**Response:**
```json
{
  "success": true,
  "message": "User conversations retrieved successfully",
  "data": {
    "conversations": [
      {
        "_id": "conv_id",
        "title": "Math Study Group",
        "conversationType": "group_discussion",
        "participants": [...],
        "lastMessage": {...},
        "unreadCount": 3,
        "createdAt": "2024-01-15T10:00:00.000Z"
      }
    ],
    "pagination": {...}
  }
}
```

#### 2. Create New Conversation
```http
POST /conversations
```
**Request Body:**
```json
{
  "title": "Physics Doubt Session",
  "conversationType": "academic_session",
  "participants": ["user_id_1", "user_id_2"],
  "isPublic": false,
  "academicContext": {
    "subject": "Physics",
    "topic": "Quantum Mechanics",
    "gradeLevel": "12th"
  }
}
```

#### 3. Get Conversation Details
```http
GET /conversations/:conversationId
```

#### 4. Join Public Conversation
```http
POST /conversations/:conversationId/join
```

#### 5. Leave Conversation
```http
POST /conversations/:conversationId/leave
```

---

### 📨 Message Management

#### 1. Get Conversation Messages
```http
GET /conversations/:conversationId/messages
```
**Query Parameters:**
- `page` (number): Page number
- `limit` (number): Messages per page
- `before` (string): Get messages before this timestamp
- `search` (string): Search term for message content

#### 2. Send Message
```http
POST /conversations/:conversationId/messages
```
**Request Body (multipart/form-data):**
```json
{
  "content": "Hello, I have a question about calculus",
  "messageType": "text",
  "replyTo": "message_id", // Optional: for replies
  "attachments": [File objects] // Optional: up to 5 files
}
```

**Supported File Types:**
- Images: JPEG, PNG, GIF, WebP (max 50MB each)
- Documents: PDF, Word, Excel, PowerPoint, TXT, CSV
- Audio: MP3, WAV, OGG
- Video: MP4, WebM, OGG

#### 3. Mark Message as Read
```http
PUT /messages/:messageId/read
```

#### 4. Add/Remove Message Reaction
```http
POST /messages/:messageId/reaction
```
**Request Body:**
```json
{
  "reactionType": "like", // "like", "love", "helpful", "confused"
  "action": "add" // "add" or "remove"
}
```

---

### ❓ Academic Q&A System

#### 1. Ask Academic Question
```http
POST /questions
```
**Request Body (multipart/form-data):**
```json
{
  "questionText": "How do I solve quadratic equations?",
  "subject": "Mathematics",
  "category": "Algebra",
  "priority": "medium", // "low", "medium", "high", "urgent"
  "tags": ["quadratic", "algebra", "equation"],
  "attachments": [File objects] // Optional
}
```

#### 2. Answer Question (Teachers Only)
```http
POST /questions/:questionId/answer
```
**Request Body (multipart/form-data):**
```json
{
  "answerText": "To solve quadratic equations, you can use...",
  "explanation": "Detailed step-by-step solution",
  "attachments": [File objects] // Optional
}
```

#### 3. Get Academic Questions
```http
GET /questions
```
**Query Parameters:**
- `subject` (string): Filter by subject
- `category` (string): Filter by category  
- `status` (string): "pending", "answered", "resolved"
- `priority` (string): Filter by priority
- `page` (number): Page number
- `limit` (number): Items per page

#### 4. Get Question Answers
```http
GET /questions/:questionId/answers
```

#### 5. Rate Answer Helpfulness
```http
POST /answers/:answerId/rate
```
**Request Body:**
```json
{
  "rating": 5, // 1-5 scale
  "comment": "Very helpful explanation!" // Optional
}
```

---

### 📢 Announcement System

#### 1. Create Announcement (Teachers/Admins Only)
```http
POST /announcements
```
**Request Body (multipart/form-data):**
```json
{
  "title": "Important: Exam Schedule Update",
  "content": "The midterm exam has been rescheduled...",
  "priority": "high", // "low", "medium", "high", "urgent"
  "targetAudience": "all", // "all", "students", "teachers", or array of user IDs
  "category": "academic",
  "expiresAt": "2024-02-15T23:59:59.000Z", // Optional
  "attachments": [File objects] // Optional
}
```

#### 2. Get User Announcements
```http
GET /announcements
```
**Query Parameters:**
- `page` (number): Page number
- `limit` (number): Items per page
- `priority` (string): Filter by priority

---

### 🔍 Search & Discovery

#### 1. Search Communications
```http
GET /search
```
**Query Parameters:**
- `query` (string): Search term
- `type` (string): "all", "conversations", "messages", "questions"
- `subject` (string): Filter by subject

**Response:**
```json
{
  "success": true,
  "data": {
    "conversations": [...],
    "messages": [...],
    "questions": [...],
    "totalResults": 45
  }
}
```

#### 2. Get Public Conversations
```http
GET /public
```
**Query Parameters:**
- `subject` (string): Filter by subject
- `type` (string): Filter by conversation type

---

### 📊 Analytics & Statistics

#### 1. Get Communication Analytics
```http
GET /analytics
```
**Query Parameters:**
- `timeframe` (number): Days to analyze (default: 30)

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "totalConversations": 15,
      "activeConversations": 8,
      "totalMessages": 234,
      "messagesSent": 89,
      "messagesReceived": 145,
      "questionsAsked": 12,
      "questionsAnswered": 8
    },
    "conversationTypes": {
      "private_chat": 5,
      "group_discussion": 7,
      "academic_session": 3
    },
    "subjectActivity": [...],
    "recentActivity": [...],
    "engagement": {
      "averageMessagesPerDay": 8,
      "mostActiveSubject": "Mathematics",
      "responseRate": 75
    }
  }
}
```

---

### 📁 File Management

#### 1. Download File
```http
GET /files/:filename
```
**Security:** Only accessible to conversation participants

---

## 🔌 Real-time Socket.io Events

### Client → Server Events

#### Conversation Management
```javascript
// Join conversation for real-time updates
socket.emit('join_conversation', { conversationId: 'conv_id' });

// Leave conversation
socket.emit('leave_conversation', { conversationId: 'conv_id' });
```

#### Typing Indicators
```javascript
// Start typing
socket.emit('typing_start', { conversationId: 'conv_id' });

// Stop typing
socket.emit('typing_stop', { conversationId: 'conv_id' });
```

#### Message Delivery
```javascript
// Confirm message delivery
socket.emit('message_delivered', { 
  messageId: 'msg_id', 
  conversationId: 'conv_id' 
});
```

#### Presence Updates
```javascript
// Update presence in conversation
socket.emit('conversation_presence', { 
  conversationId: 'conv_id', 
  status: 'active' // 'active', 'away', 'busy'
});
```

### Server → Client Events

#### Real-time Messages
```javascript
// New message received
socket.on('new_message', (data) => {
  // data: { message, sender, conversationId, timestamp }
});

// Message updated (edited/deleted/reacted)
socket.on('message_updated', (data) => {
  // data: { messageId, updateType, updateData, conversationId, timestamp }
});

// Message read by someone
socket.on('message_read', (data) => {
  // data: { messageId, readBy, timestamp }
});
```

#### Conversation Updates
```javascript
// Conversation updated
socket.on('conversation_updated', (data) => {
  // data: { conversationId, updateType, updateData, timestamp }
});

// User joined conversation
socket.on('user_joined_conversation', (data) => {
  // data: { userId, userName, timestamp }
});

// User left conversation
socket.on('user_left_conversation', (data) => {
  // data: { userId, userName, timestamp }
});
```

#### Typing Indicators
```javascript
// Someone started typing
socket.on('user_typing', (data) => {
  // data: { userId, userName, conversationId, timestamp }
});

// Someone stopped typing
socket.on('user_stopped_typing', (data) => {
  // data: { userId, conversationId, timestamp }
});
```

#### Academic Q&A
```javascript
// New question posted
socket.on('new_question', (data) => {
  // data: { question, timestamp }
});

// New answer posted
socket.on('new_answer', (data) => {
  // data: { questionId, answer, timestamp }
});
```

#### Announcements
```javascript
// New announcement
socket.on('new_announcement', (data) => {
  // data: { announcement, timestamp }
});
```

#### Presence Updates
```javascript
// User presence updated
socket.on('participant_presence_updated', (data) => {
  // data: { userId, status, timestamp }
});

// User online/offline status
socket.on('user_presence_update', (data) => {
  // data: { userId, isOnline, timestamp }
});
```

---

## 📱 Frontend Integration Examples

### React.js Implementation

#### 1. Initialize Socket Connection
```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:5007', {
  auth: {
    token: localStorage.getItem('authToken')
  }
});

// Handle connection
socket.on('user_connected', (data) => {
  console.log('Connected to communication service:', data);
});
```

#### 2. Join Conversation
```javascript
const joinConversation = (conversationId) => {
  socket.emit('join_conversation', { conversationId });
  
  // Listen for new messages
  socket.on('new_message', (data) => {
    setMessages(prev => [...prev, data.message]);
  });
};
```

#### 3. Send Message with File
```javascript
const sendMessage = async (conversationId, messageData, files) => {
  const formData = new FormData();
  formData.append('content', messageData.content);
  formData.append('messageType', messageData.messageType || 'text');
  
  files.forEach(file => {
    formData.append('attachments', file);
  });

  try {
    const response = await fetch(`/api/communication/conversations/${conversationId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      body: formData
    });
    
    const result = await response.json();
    console.log('Message sent:', result);
  } catch (error) {
    console.error('Send message error:', error);
  }
};
```

#### 4. Handle Typing Indicators
```javascript
const handleTyping = (conversationId, isTyping) => {
  if (isTyping) {
    socket.emit('typing_start', { conversationId });
  } else {
    socket.emit('typing_stop', { conversationId });
  }
};

// Listen for others typing
socket.on('user_typing', (data) => {
  setTypingUsers(prev => [...prev, data.userId]);
});

socket.on('user_stopped_typing', (data) => {
  setTypingUsers(prev => prev.filter(id => id !== data.userId));
});
```

### Vue.js Implementation

#### 1. Communication Composable
```javascript
// composables/useCommunication.js
import { ref, onMounted, onUnmounted } from 'vue';
import io from 'socket.io-client';

export function useCommunication() {
  const socket = ref(null);
  const messages = ref([]);
  const onlineUsers = ref([]);

  const connect = (authToken) => {
    socket.value = io('http://localhost:5007', {
      auth: { token: authToken }
    });

    socket.value.on('new_message', (data) => {
      messages.value.push(data.message);
    });

    socket.value.on('user_presence_update', (data) => {
      if (data.isOnline) {
        onlineUsers.value.push(data.userId);
      } else {
        onlineUsers.value = onlineUsers.value.filter(id => id !== data.userId);
      }
    });
  };

  const disconnect = () => {
    if (socket.value) {
      socket.value.disconnect();
    }
  };

  onMounted(() => {
    const token = localStorage.getItem('authToken');
    if (token) connect(token);
  });

  onUnmounted(() => {
    disconnect();
  });

  return {
    socket,
    messages,
    onlineUsers,
    connect,
    disconnect
  };
}
```

---

## 🛡️ Security Features

### 1. Authentication & Authorization
- JWT token validation for all requests
- Role-based access control (RBAC)
- Conversation participant verification
- File access permissions

### 2. File Upload Security
- File type validation (whitelist approach)
- File size limits (50MB per file, max 5 files)
- Virus scanning (can be added)
- Secure file storage with access control

### 3. Data Validation
- Input sanitization and validation
- MongoDB injection prevention
- XSS protection
- Rate limiting on API endpoints

### 4. Real-time Security
- Socket.io authentication middleware
- Room-based access control
- Event validation and sanitization
- Connection rate limiting

---

## 📈 Performance Optimizations

### 1. Database Optimizations
- Indexed fields for fast queries
- Aggregation pipelines for analytics
- Pagination for large datasets
- Connection pooling

### 2. Real-time Optimizations
- Room-based event targeting
- Event debouncing for typing indicators
- Connection pooling and management
- Memory-efficient user tracking

### 3. File Handling
- Streaming file uploads
- Compressed file storage
- CDN integration ready
- Thumbnail generation (for images)

---

## 🔧 Configuration

### Environment Variables
```env
# Server Configuration
PORT=5007
NODE_ENV=development

# Database
MONGODB_URI=mongodb://localhost:27017/gyanguru

# JWT
JWT_SECRET=your_jwt_secret_here
JWT_EXPIRE=30d

# File Upload
MAX_FILE_SIZE=52428800  # 50MB in bytes
UPLOAD_DIR=./uploads/messages

# Email (Optional)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password

# Rate Limiting
RATE_LIMIT_WINDOW=15  # minutes
RATE_LIMIT_MAX=100    # requests per window
```

---

## 🚀 Deployment Considerations

### 1. Production Setup
- Use PM2 for process management
- Configure reverse proxy (Nginx)
- Enable SSL/TLS certificates
- Set up monitoring and logging

### 2. Scaling Options
- Horizontal scaling with load balancers
- Redis adapter for Socket.io clustering
- Database replication and sharding
- CDN for static file delivery

### 3. Monitoring
- Real-time performance metrics
- Error tracking and alerting
- User activity analytics
- Resource usage monitoring

---

## 🧪 Testing

### API Testing with Postman
```json
{
  "name": "GyanGuru Communication Tests",
  "requests": [
    {
      "name": "Create Conversation",
      "method": "POST",
      "url": "{{base_url}}/conversations",
      "headers": {
        "Authorization": "Bearer {{auth_token}}",
        "Content-Type": "application/json"
      },
      "body": {
        "title": "Test Conversation",
        "conversationType": "private_chat",
        "participants": ["user_id_1"]
      }
    }
  ]
}
```

### Socket.io Testing
```javascript
// Test client for Socket.io events
const testClient = io('http://localhost:5007', {
  auth: { token: 'your_test_token' }
});

testClient.on('connect', () => {
  console.log('Test client connected');
  
  // Test joining conversation
  testClient.emit('join_conversation', { conversationId: 'test_conv_id' });
  
  // Test sending message
  testClient.emit('typing_start', { conversationId: 'test_conv_id' });
});
```

---

## 📚 Additional Resources

### Database Schema
- [Message Model](./models/Message.js) - Comprehensive message schema
- [Conversation Model](./models/Conversation.js) - Conversation management schema

### API Controllers
- [Communication Controller](./controllers/communicationController.js) - All API logic
- [Socket Service](./services/SocketService.js) - Real-time event handling

### Routes
- [Communication Routes](./routes/communication.js) - Complete API endpoints

---

## 🆘 Support & Troubleshooting

### Common Issues

1. **Connection Refused**
   - Check if server is running on correct port
   - Verify MongoDB connection
   - Check firewall settings

2. **Socket.io Connection Failed**
   - Verify JWT token validity
   - Check CORS configuration
   - Ensure proper client initialization

3. **File Upload Errors**
   - Check file type restrictions
   - Verify file size limits
   - Ensure upload directory permissions

4. **Message Not Delivered**
   - Verify user is participant in conversation
   - Check real-time connection status
   - Validate message format

### Debug Mode
```javascript
// Enable debug logging
process.env.DEBUG = 'socket.io:*';

// Verbose MongoDB logging
mongoose.set('debug', true);
```

---

## 🎉 Conclusion

The GyanGuru Communication System provides a comprehensive, real-time communication platform specifically designed for educational environments. With features like academic Q&A, file sharing, announcements, and advanced analytics, it creates an engaging and productive learning environment.

**Key Achievements:**
✅ **Complete API Implementation** - All endpoints functional
✅ **Real-time Features** - Socket.io integration complete  
✅ **File Management** - Secure upload and download system
✅ **Role-based Security** - Teacher/Student/Admin access control
✅ **Academic Focus** - Q&A system with subject categorization
✅ **Analytics Ready** - Comprehensive communication insights
✅ **Production Ready** - Error handling, validation, and security

The system is now ready for frontend integration and deployment! 🚀📚💬
