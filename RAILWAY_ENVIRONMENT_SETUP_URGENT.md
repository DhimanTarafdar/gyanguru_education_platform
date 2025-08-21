# 🔐 CRITICAL: Railway Environment Variables Setup

## 🚨 URGENT: Add These to Railway Dashboard

### Why This is Critical:
- ❌ Currently using default/fallback values
- ❌ JWT tokens not secure (using default secret)
- ❌ Database not connected (using fallback URI)
- ❌ Email notifications not working
- ❌ Security features limited

---

## 🔐 STEP 1: Basic Security (MUST HAVE)

### Add These in Railway Variables Tab:

**1. NODE_ENV**
```
NODE_ENV=production
```

**2. PORT** 
```
PORT=5007
```

**3. JWT_SECRET (Critical for Security)**
```
JWT_SECRET=GyanGuru-Super-Secure-JWT-Secret-Production-2024-Bangladesh-Education-Platform-v1.0
```

**4. JWT_EXPIRE**
```
JWT_EXPIRE=7d
```

---

## 🗄️ STEP 2: Database Connection (RECOMMENDED)

### Option A: MongoDB Atlas (Recommended)
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/gyanguru?retryWrites=true&w=majority
```

### Option B: Local/Default (Current - Limited)
```
MONGODB_URI=mongodb://localhost:27017/gyanguru
```

---

## 📧 STEP 3: Email Service (For Notifications)

### Gmail Setup:
```
EMAIL_SERVICE=gmail
EMAIL_USER=your-gmail@gmail.com
EMAIL_PASS=your-16-digit-app-password
```

### How to Get Gmail App Password:
1. Google Account → Security → 2-Step Verification (enable)
2. App passwords → Generate → "Mail" → Copy 16-digit password

---

## 🔒 STEP 4: Additional Security

```bash
# CORS (Update when frontend is ready)
CORS_ORIGIN=*

# Rate Limiting
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100

# Session Security
SESSION_SECRET=GyanGuru-Session-Secret-2024-Bangladesh-Education
COOKIE_SECRET=GyanGuru-Cookie-Secret-2024-Bangladesh-Education

# Feature Flags
DEPLOYMENT_PHASE=demo
USER_TIER=free
STORAGE_TYPE=local
ENABLE_REAL_TIME_NOTIFICATIONS=true
```

---

## 📊 Current Status vs Production Ready

### ✅ Currently Working (Basic):
- API endpoints responding
- Basic authentication flow
- Server running and stable
- Health checks passing

### ⚠️ Missing for Production:
- **Secure JWT secrets** → Using default/weak secrets
- **Database persistence** → Data may be lost without proper DB
- **Email notifications** → Registration/password reset emails
- **Proper error logging** → Production debugging
- **Security headers** → Enhanced protection

---

## 🎯 Priority Levels:

### 🔥 CRITICAL (Add Now):
1. **JWT_SECRET** → Security vulnerability without this
2. **NODE_ENV=production** → Enables production optimizations
3. **PORT=5007** → Ensures correct port usage

### 🎯 HIGH (Add Before Frontend):
4. **MONGODB_URI** → Database persistence
5. **CORS_ORIGIN** → Frontend connection security
6. **EMAIL_SERVICE** → User notifications

### 📈 MEDIUM (Add When Scaling):
7. **Rate limiting configs** → Prevent abuse
8. **Session secrets** → Enhanced security
9. **Feature flags** → Controlled rollouts

---

## ⚡ Quick Setup Commands:

### Railway Dashboard → Variables Tab:

**Essential (Copy-Paste Ready):**
```
NODE_ENV=production
PORT=5007
JWT_SECRET=GyanGuru-Super-Secure-JWT-Secret-Production-2024-Bangladesh-Education-Platform-v1.0
JWT_EXPIRE=7d
CORS_ORIGIN=*
DEPLOYMENT_PHASE=demo
USER_TIER=free
ENABLE_REAL_TIME_NOTIFICATIONS=true
```

**Database (When Ready):**
```
MONGODB_URI=your-mongodb-atlas-connection-string
```

**Email (When Ready):**
```
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-gmail-app-password
```

---

## 🔄 After Adding Variables:

1. **Railway auto-restarts** your app (2-3 minutes)
2. **Security improves** dramatically
3. **Features unlock** (email, database, etc.)
4. **Production ready** for real users

---

## 🎉 When All Variables Added:

### Your Backend Will Have:
✅ **Secure JWT authentication**
✅ **Database persistence** (if MongoDB added)
✅ **Email notifications** (if email added)
✅ **Production optimizations**
✅ **Enhanced security**
✅ **Real-time features**
✅ **Professional logging**

### Ready For:
✅ **Frontend integration**
✅ **Real user registration**
✅ **Production traffic**
✅ **Professional showcase**
