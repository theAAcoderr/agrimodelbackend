const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
require('dotenv').config();

const { testConnection } = require('./config/database');
const { errorHandler, notFoundHandler } = require('./middleware/errorHandler');

// Import routes
const healthRoutes = require('./routes/health');
const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const collegesRoutes = require('./routes/colleges');
const projectsRoutes = require('./routes/projects');
const dataSubmissionsRoutes = require('./routes/data-submissions');
const mlModelsRoutes = require('./routes/ml-models');
const sensorsRoutes = require('./routes/sensors');
const sensorReadingsRoutes = require('./routes/sensor-readings');
const communicationRoutes = require('./routes/communication');
const researchDataRoutes = require('./routes/research-data');
const uploadsRoutes = require('./routes/uploads');
const reportsRoutes = require('./routes/reports');
const adminPanelRoutes = require('./routes/admin-panel');
const notificationsRoutes = require('./routes/notifications');
const analyticsRoutes = require('./routes/analytics');
const batchRoutes = require('./routes/batch');
const searchRoutes = require('./routes/search');

const app = express();
const PORT = process.env.PORT || 3000;

// ==========================================
// MIDDLEWARE
// ==========================================

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression
app.use(compression());

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// ==========================================
// ROUTES
// ==========================================

// Health check routes
app.use('/health', healthRoutes);

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/colleges', collegesRoutes);
app.use('/api/projects', projectsRoutes);
app.use('/api/data-submissions', dataSubmissionsRoutes);
app.use('/api/ml-models', mlModelsRoutes);
app.use('/api/sensors', sensorsRoutes);
app.use('/api/sensor-readings', sensorReadingsRoutes);
app.use('/api/communication', communicationRoutes);
app.use('/api/research-data', researchDataRoutes);
app.use('/api/uploads', uploadsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/batch', batchRoutes);
app.use('/api/search', searchRoutes);

// Admin Panel (Database Viewer)
app.use('/admin-panel', adminPanelRoutes);

// Static file serving for uploads
app.use('/uploads', express.static('uploads'));

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'AgriModel Backend API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      users: '/api/users',
      colleges: '/api/colleges',
      projects: '/api/projects'
    }
  });
});

// ==========================================
// ERROR HANDLING
// ==========================================

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

// ==========================================
// SERVER STARTUP
// ==========================================

async function startServer() {
  try {
    // Test database connection
    console.log('🔌 Testing database connection...');
    const dbConnected = await testConnection();

    if (!dbConnected) {
      console.error('❌ Failed to connect to database. Please check your DATABASE_URL in .env');
      process.exit(1);
    }

    // Start server on all network interfaces (0.0.0.0)
    app.listen(PORT, '0.0.0.0', () => {
      console.log('\n🎉 ========================================');
      console.log('🚀 AgriModel Backend Server Started!');
      console.log('========================================');
      console.log(`📍 Local URL:   http://localhost:${PORT}`);
      console.log(`📍 Network URL: http://192.168.1.25:${PORT}`);
      console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🗄️  Database: Neon PostgreSQL (Connected)`);
      console.log('========================================\n');
      console.log('📋 Available endpoints:');
      console.log('   🎨 Database Viewer: http://192.168.1.25:' + PORT + '/admin-panel');
      console.log('   🏥 Health Check:    http://192.168.1.25:' + PORT + '/health');
      console.log('   🔐 Login:           POST /api/auth/login');
      console.log('   👥 Users API:       GET  /api/users');
      console.log('   🏛️  Colleges API:    GET  /api/colleges');
      console.log('   📊 Projects API:    GET  /api/projects');
      console.log('   📝 Submissions API: GET  /api/data-submissions');
      console.log('\n✨ Ready to accept requests!\n');
      console.log('💡 Tip: Open http://192.168.1.25:' + PORT + '/admin-panel in browser to view database!\n');
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught Exception:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('👋 SIGTERM received, shutting down gracefully');
  process.exit(0);
});

// Start the server (only when not in Vercel serverless environment)
if (process.env.VERCEL !== '1') {
  startServer();
}

// Export for Vercel serverless
module.exports = app;

