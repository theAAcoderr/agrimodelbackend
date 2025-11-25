# 🌾 AgriModel Backend - Node.js + Neon PostgreSQL

Complete backend API server for AgriModel Flutter application with Neon PostgreSQL database.

## 🎯 Features

- ✅ **JWT Authentication** - Secure token-based auth
- ✅ **Role-Based Access Control** - Super Admin, College Admin, Professor, Student, Data Scientist
- ✅ **PostgreSQL Database** - Powered by Neon serverless Postgres
- ✅ **RESTful API** - Complete CRUD operations
- ✅ **File Upload** - Image, video, audio, document support
- ✅ **Real-time Ready** - WebSocket support ready to add
- ✅ **Error Handling** - Comprehensive error management
- ✅ **Security** - Helmet, CORS, input validation

## 📁 Project Structure

```
backend/
├── config/
│   ├── database.js          # Neon DB connection pool
│   └── jwt.js               # JWT token utilities
├── middleware/
│   ├── auth.js              # Authentication & authorization
│   └── errorHandler.js      # Global error handling
├── routes/
│   ├── auth.js              # Login, register, password reset
│   ├── users.js             # User management
│   ├── colleges.js          # College management
│   ├── projects.js          # Project CRUD
│   ├── data-submissions.js  # Data submission management
│   ├── ml-models.js         # ML model management
│   ├── sensors.js           # Sensor & readings
│   ├── communication.js     # Chat, announcements, discussions
│   ├── research-data.js     # Research data entries
│   └── uploads.js           # File upload handling
├── database/
│   ├── schema.sql           # Complete database schema
│   └── migrate.js           # Migration runner
├── .env.example             # Environment variables template
├── .gitignore               # Git ignore file
├── package.json             # Node dependencies
├── server.js                # Main server entry point
└── README.md                # This file
```

## 🚀 Quick Start

### Step 1: Install Dependencies

```bash
cd backend
npm install
```

### Step 2: Configure Environment

Create `.env` file from template:

```bash
cp .env.example .env
```

The `.env` file is already configured with your Neon DB connection:

```env
DATABASE_URL=postgresql://neondb_owner:npg_QOZfpzY6h8PX@ep-proud-sunset-aeaiv4oe-pooler.c-2.us-east-2.aws.neon.tech/neondb?sslmode=require
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
PORT=3000
NODE_ENV=development
```

⚠️ **Important:** Change `JWT_SECRET` to a strong random string in production!

### Step 3: Run Database Migration

```bash
npm run migrate
```

This will:
- Connect to your Neon database
- Create all required tables
- Set up triggers and functions
- Create indexes for performance
- Create a default super admin user

### Step 4: Start the Server

**Development mode (with auto-reload):**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

You should see:
```
🎉 ========================================
🚀 AgriModel Backend Server Started!
========================================
📍 Server running on: http://localhost:3000
🌐 Environment: development
🗄️  Database: Neon PostgreSQL (Connected)
========================================
```

### Step 5: Test the API

Test health endpoint:
```bash
curl http://localhost:3000/health
```

Response:
```json
{
  "status": "OK",
  "message": "AgriModel API is running",
  "timestamp": "2025-10-11T...",
  "environment": "development"
}
```

## 📡 API Endpoints

### Authentication (`/api/auth`)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/login` | User login | ❌ |
| POST | `/register` | Register user | ❌ |
| POST | `/register/college-admin` | Register college admin | ❌ |
| GET | `/me` | Get current user | ✅ |
| POST | `/forgot-password` | Request password reset | ❌ |
| POST | `/reset-password` | Reset password with token | ❌ |
| POST | `/change-password` | Change password | ✅ |

### Users (`/api/users`)

| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| GET | `/` | Get all users | Super Admin |
| GET | `/pending` | Get pending users | Admin |
| GET | `/:userId` | Get user by ID | All |
| PATCH | `/:userId` | Update user | Self/Admin |
| POST | `/:userId/approve` | Approve user | Admin |
| POST | `/:userId/reject` | Reject user | Admin |
| DELETE | `/:userId` | Delete user | Admin |

### Colleges (`/api/colleges`)

| Method | Endpoint | Description | Roles |
|--------|----------|-------------|-------|
| GET | `/` | Get all colleges | All |
| GET | `/approved` | Get approved colleges | All |
| GET | `/pending` | Get pending colleges | Super Admin |
| POST | `/` | Create college | Super Admin |
| PATCH | `/:collegeId` | Update college | Admin |
| POST | `/:collegeId/approve` | Approve college | Super Admin |
| DELETE | `/:collegeId` | Delete college | Super Admin |

### Projects (`/api/projects`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Get all projects |
| GET | `/:projectId` | Get project by ID |
| POST | `/` | Create project |
| PATCH | `/:projectId` | Update project |
| DELETE | `/:projectId` | Delete project |

### Data Submissions (`/api/data-submissions`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Get all submissions |
| GET | `/student/:studentId` | Get student submissions |
| GET | `/project/:projectId` | Get project submissions |
| GET | `/stats/summary` | Get submission statistics |
| POST | `/` | Create submission |
| PATCH | `/:submissionId` | Update/Review submission |
| DELETE | `/:submissionId` | Delete submission |

### ML Models (`/api/ml-models`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Get all models |
| GET | `/:modelId` | Get model by ID |
| POST | `/` | Create model |
| PATCH | `/:modelId` | Update model |
| DELETE | `/:modelId` | Delete model |

### Sensors (`/api/sensors`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Get all sensors |
| POST | `/` | Create sensor |
| GET | `/:sensorId/readings` | Get sensor readings |
| POST | `/:sensorId/readings` | Add sensor reading |

### Communication (`/api/communication`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/conversations` | Get user conversations |
| POST | `/conversations` | Create conversation |
| GET | `/conversations/:id/messages` | Get messages |
| POST | `/conversations/:id/messages` | Send message |
| GET | `/announcements` | Get announcements |
| POST | `/announcements` | Create announcement |
| GET | `/discussions` | Get discussions |
| POST | `/discussions` | Create discussion |
| GET | `/discussions/:id/replies` | Get replies |
| POST | `/discussions/:id/replies` | Add reply |

### Research Data (`/api/research-data`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Get research data |
| POST | `/` | Create research data |
| DELETE | `/:entryId` | Delete research data |

### File Uploads (`/api/uploads`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/single` | Upload single file |
| POST | `/multiple` | Upload multiple files |
| GET | `/files/*` | Serve uploaded files |
| DELETE | `/:type/:filename` | Delete file |

## 🔐 Authentication

All protected endpoints require a Bearer token in the Authorization header:

```http
Authorization: Bearer <your-jwt-token>
```

### Login Example

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@agrimodel.com",
    "password": "Admin@123"
  }'
```

Response:
```json
{
  "user": {
    "id": "uuid",
    "name": "Super Admin",
    "email": "admin@agrimodel.com",
    "role": "super_admin"
  },
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "message": "Login successful"
}
```

## 🗄️ Database Schema

The database includes these tables:
- `colleges` - College/University information
- `users` - User accounts with roles
- `projects` - Research projects
- `data_submissions` - Student data submissions
- `sensors` - IoT sensor devices
- `sensor_readings` - Time-series sensor data
- `ml_models` - Machine learning models
- `reports` - Generated reports
- `conversations` - Chat conversations
- `messages` - Chat messages
- `announcements` - System announcements
- `discussions` - Forum discussions
- `discussion_replies` - Discussion replies
- `research_data` - Research data entries

## 🛠️ Development

### Run with Auto-Reload

```bash
npm run dev
```

### Run Migration

```bash
npm run migrate
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | Neon PostgreSQL connection string | Required |
| `JWT_SECRET` | Secret key for JWT tokens | Change in production |
| `PORT` | Server port | 3000 |
| `NODE_ENV` | Environment (development/production) | development |
| `CORS_ORIGIN` | Allowed CORS origins | * |
| `MAX_FILE_SIZE` | Max upload size in bytes | 10485760 (10MB) |

## 🔒 Security Best Practices

1. **Change JWT_SECRET** in production to a strong random string
2. **Configure CORS** with specific allowed origins in production
3. **Use HTTPS** in production
4. **Set NODE_ENV=production** in production
5. **Enable rate limiting** (add express-rate-limit package)
6. **Regular backups** of Neon database

## 📊 Database Connection

Your Neon PostgreSQL is configured with:
- **Connection Pooling** (max 20 connections)
- **SSL Required** for secure connections
- **Auto-reconnect** on connection loss
- **Query logging** in development mode

## 🧪 Testing the Setup

1. **Test database connection:**
   ```bash
   npm run migrate
   ```

2. **Start server:**
   ```bash
   npm start
   ```

3. **Test health endpoint:**
   ```bash
   curl http://localhost:3000/health
   ```

4. **Test registration:**
   ```bash
   curl -X POST http://localhost:3000/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{
       "email": "test@example.com",
       "password": "Test@123456",
       "name": "Test User",
       "role": "student",
       "collegeId": "college-uuid-here"
     }'
   ```

## 🚀 Deployment

### Deploy to Production

1. Set environment variables in your hosting platform
2. Ensure `NODE_ENV=production`
3. Update `DATABASE_URL` if using different database
4. Change `JWT_SECRET` to a strong secret
5. Configure `CORS_ORIGIN` with your app URL
6. Run migration: `npm run migrate`
7. Start server: `npm start`

### Recommended Hosting Platforms

- **Render.com** - Free tier available, easy Node.js deployment
- **Railway.app** - Simple deployment, good for startups
- **Heroku** - Classic PaaS platform
- **DigitalOcean App Platform** - Scalable infrastructure
- **AWS Elastic Beanstalk** - Enterprise-grade hosting

## 🆘 Troubleshooting

### Database Connection Issues

```
Error: Connection timeout
```
**Solution:** Check if your IP is whitelisted in Neon dashboard. Neon allows connections from anywhere by default.

### Migration Fails

```
Error: relation already exists
```
**Solution:** Drop existing tables or use a fresh database. Contact Neon support if needed.

### Port Already in Use

```
Error: EADDRINUSE
```
**Solution:** Change PORT in .env or kill the process using port 3000:
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:3000 | xargs kill
```

## 📞 Support

- Check server logs for detailed error messages
- Enable development mode for verbose logging
- Test each endpoint individually using Postman or curl
- Verify database connection in Neon dashboard

## 🎉 You're All Set!

Your Node.js backend is now configured and ready to work with your Flutter app!

**Next Steps:**
1. Run `npm install`
2. Create `.env` from `.env.example`
3. Run `npm run migrate`
4. Run `npm start`
5. Update Flutter app's `api_config.dart` with your server URL
6. Test the connection!

Happy coding! 🚀

