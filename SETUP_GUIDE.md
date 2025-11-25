# 🚀 AgriModel Backend - Complete Setup Guide

## ✅ Prerequisites

Before starting, ensure you have:
- ✅ Node.js 18+ installed ([Download](https://nodejs.org/))
- ✅ npm 9+ installed (comes with Node.js)
- ✅ Neon PostgreSQL account (Free tier available at [neon.tech](https://neon.tech))
- ✅ Your database connection string ready

## 📋 Step-by-Step Setup

### **Step 1: Navigate to Backend Folder**

```bash
cd backend
```

### **Step 2: Install Dependencies**

```bash
npm install
```

This will install:
- `express` - Web framework
- `pg` - PostgreSQL client
- `bcryptjs` - Password hashing
- `jsonwebtoken` - JWT authentication
- `dotenv` - Environment variables
- `cors` - Cross-origin resource sharing
- `multer` - File uploads
- And more...

**Expected output:**
```
added 150+ packages in 30s
```

### **Step 3: Create Environment File**

Copy the example file:

```bash
# Windows
copy .env.example .env

# Linux/Mac
cp .env.example .env
```

Your `.env` is already configured with Neon DB connection!

**Verify `.env` contains:**
```env
DATABASE_URL=postgresql://neondb_owner:npg_QOZfpzY6h8PX@ep-proud-sunset-aeaiv4oe-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
PORT=3000
```

⚠️ **IMPORTANT:** Change `JWT_SECRET` before production!

### **Step 4: Test Database Connection**

```bash
npm run test-db
```

**Expected output:**
```
🧪 Testing Database Connection and Schema...

✅ Connected to Neon PostgreSQL database
📅 Server time: 2025-10-11 10:30:45
🗄️  PostgreSQL version: PostgreSQL 15.x
```

If this fails, check:
- ✅ Your internet connection
- ✅ Neon database is active
- ✅ DATABASE_URL is correct in .env

### **Step 5: Run Database Migration**

This creates all tables in your Neon database:

```bash
npm run migrate
```

**Expected output:**
```
🚀 Starting database migration...

✅ Connected to Neon PostgreSQL database
📋 Executing schema...
✅ Schema created successfully!

📊 Created tables:
   1. announcements
   2. colleges
   3. conversations
   4. data_submissions
   5. discussion_replies
   6. discussions
   7. messages
   8. ml_models
   9. projects
   10. reports
   11. research_data
   12. sensor_readings
   13. sensors
   14. users

✅ Migration completed successfully!
🎉 Your Neon database is ready to use!
```

### **Step 6: Create Super Admin User**

```bash
npm run create-admin
```

**Expected output:**
```
🔐 Creating Super Admin user...

✅ Super Admin created successfully!

📧 Email: admin@agrimodel.com
🔑 Password: Admin@123
👤 User ID: <uuid>
🎭 Role: super_admin
📊 Status: approved

⚠️  IMPORTANT: Change the password after first login!
```

**Save these credentials!** You'll need them to login.

### **Step 7: Start the Server**

**Development mode (recommended for testing):**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

**Expected output:**
```
🎉 ========================================
🚀 AgriModel Backend Server Started!
========================================
📍 Server running on: http://localhost:3000
🌐 Environment: development
🗄️  Database: Neon PostgreSQL (Connected)
========================================

📋 Available API endpoints:
   - GET  /health
   - POST /api/auth/login
   - POST /api/auth/register
   - GET  /api/users
   - GET  /api/colleges
   - GET  /api/projects
   - GET  /api/data-submissions
   ...

✨ Ready to accept requests!
```

### **Step 8: Test the API**

Open a new terminal and test:

```bash
# Test health endpoint
curl http://localhost:3000/health

# Test login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"admin@agrimodel.com\",\"password\":\"Admin@123\"}"
```

**Expected response:**
```json
{
  "user": {
    "id": "uuid-here",
    "name": "Super Admin",
    "email": "admin@agrimodel.com",
    "role": "super_admin",
    "status": "approved"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "message": "Login successful"
}
```

✅ **If you get this response, your backend is working perfectly!**

## 🔗 Connect Flutter App

### Update Flutter App Configuration

Edit `lib/config/api_config.dart`:

```dart
class ApiConfig {
  static String get baseUrl {
    if (kIsWeb) {
      return 'http://localhost:3000/api';
    } else {
      // For Android emulator
      return 'http://10.0.2.2:3000/api';
      // For real device, use your computer's IP:
      // return 'http://192.168.1.x:3000/api';
    }
  }
  // ... rest remains same
}
```

### Test from Flutter App

1. Run your Flutter app
2. Try to login with:
   - Email: `admin@agrimodel.com`
   - Password: `Admin@123`

3. If successful, you'll see the Super Admin dashboard!

## 🎯 What's Next?

### Register New Users

1. **Register College Admin:**
   ```bash
   curl -X POST http://localhost:3000/api/auth/register/college-admin \
     -H "Content-Type: application/json" \
     -d '{
       "email": "college@example.com",
       "password": "College@123",
       "name": "College Admin",
       "collegeName": "Sample College",
       "collegeAddress": "123 Street, City"
     }'
   ```

2. **Login as Super Admin and approve the college/admin**

3. **Register Students/Professors** through the approved college

### Create Projects

Use the Flutter app or API to create projects:

```bash
curl -X POST http://localhost:3000/api/projects \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -d '{
    "name": "Wheat Yield Research",
    "description": "Study on wheat yield optimization",
    "type": "YIELD_PREDICTION",
    "start_date": "2025-01-01",
    "end_date": "2025-12-31"
  }'
```

## 🔧 Useful Commands

| Command | Description |
|---------|-------------|
| `npm install` | Install all dependencies |
| `npm start` | Start server (production) |
| `npm run dev` | Start with auto-reload (development) |
| `npm run migrate` | Run database migrations |
| `npm run test-db` | Test database connection |
| `npm run create-admin` | Create super admin user |

## 🐛 Troubleshooting

### Server won't start

**Error:** `Cannot find module 'express'`  
**Solution:** Run `npm install`

**Error:** `EADDRINUSE: Port 3000 already in use`  
**Solution:** 
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Change port in .env
PORT=3001
```

### Database connection fails

**Error:** `Connection timeout`  
**Solution:** 
- Check internet connection
- Verify DATABASE_URL in .env
- Check Neon dashboard - database should be active

**Error:** `SSL connection required`  
**Solution:** Already configured in `database.js` with SSL enabled

### Migration fails

**Error:** `relation "users" already exists`  
**Solution:** Tables already created. Run `npm run test-db` to verify.

### Flutter app can't connect

**Error:** `Connection refused`  
**Solution:**
- Ensure backend server is running
- Check API URL in Flutter `api_config.dart`
- For Android emulator use: `http://10.0.2.2:3000/api`
- For real device use: `http://YOUR_IP:3000/api`

## 📊 Database Tables Overview

| Table | Description | Row Count |
|-------|-------------|-----------|
| `colleges` | College information | Check with `npm run test-db` |
| `users` | User accounts | Should have 1 (super admin) |
| `projects` | Research projects | 0 initially |
| `data_submissions` | Student submissions | 0 initially |
| `ml_models` | ML models | 0 initially |
| `sensors` | IoT sensors | 0 initially |
| `conversations` | Chat conversations | 0 initially |
| `announcements` | System announcements | 0 initially |

## 🎉 Success Checklist

- [ ] `npm install` completed without errors
- [ ] `npm run test-db` shows connected to database
- [ ] `npm run migrate` created all tables
- [ ] `npm run create-admin` created super admin
- [ ] `npm start` shows server running
- [ ] `curl http://localhost:3000/health` returns OK
- [ ] Login API works with super admin credentials
- [ ] Flutter app can connect and login

If all items are checked ✅, you're ready to go! 🚀

## 📞 Need Help?

1. Check server console for error messages
2. Check Neon dashboard for database status
3. Verify all steps were completed in order
4. Review the main README.md for API documentation

---

**Congratulations! Your backend is fully configured and ready to use!** 🎊

