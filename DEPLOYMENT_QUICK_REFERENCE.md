# 🚀 GyanGuru Deployment - Quick Commands Reference

## GitHub Push Commands (Replace YOUR_USERNAME):
```bash
git remote add origin https://github.com/YOUR_USERNAME/gyanguru-education-platform.git
git branch -M main  
git push -u origin main
```

## Railway Environment Variables (Copy-Paste Ready):
```bash
# Database
MONGODB_URI=mongodb+srv://gyanguru-admin:YOUR_PASSWORD@gyanguru-cluster.xxxxx.mongodb.net/gyanguru?retryWrites=true&w=majority

# Server  
NODE_ENV=production
PORT=5007

# JWT
JWT_SECRET=gyanguru-super-secure-jwt-secret-production-2024-bangladesh
JWT_EXPIRE=7d

# Email (Gmail)
EMAIL_SERVICE=gmail
EMAIL_USER=your-gmail@gmail.com
EMAIL_PASS=your-16-digit-app-password

# Security
SESSION_SECRET=gyanguru-session-secret-production-2024
COOKIE_SECRET=gyanguru-cookie-secret-production-2024
CORS_ORIGIN=*

# Rate Limiting
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100

# Free Tier Settings
DEPLOYMENT_PHASE=demo
USER_TIER=free
STORAGE_TYPE=local
ENABLE_REAL_TIME_NOTIFICATIONS=true
```

## Test URLs (After Deployment):
```
Health Check: https://your-app-name.up.railway.app/api/health
Root: https://your-app-name.up.railway.app/
Notifications: https://your-app-name.up.railway.app/api/notifications/test
Security: https://your-app-name.up.railway.app/api/security/test
Gamification: https://your-app-name.up.railway.app/api/gamification/test
```

## Future Updates:
```bash
git add .
git commit -m "Your update message"
git push origin main
# Railway auto-deploys!
```

## Gmail App Password Setup:
1. Google Account → Security → 2-Step Verification
2. App passwords → Generate → "Mail"
3. Use 16-digit password in EMAIL_PASS

## MongoDB Atlas Quick Setup:
1. https://mongodb.com/cloud/atlas → Try Free
2. M0 FREE → AWS → Singapore
3. Database Access → Add User → Atlas admin
4. Network Access → 0.0.0.0/0
5. Connect → Drivers → Copy connection string

## Railway Quick Setup:
1. https://railway.app → Sign up with GitHub
2. Add payment method (gets $5 free)
3. New Project → Deploy from GitHub repo
4. Add environment variables
5. Test endpoints
