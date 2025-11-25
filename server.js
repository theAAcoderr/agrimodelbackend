const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
require('dotenv').config();

let testConnection, errorHandler, notFoundHandler;
let healthRoutes, authRoutes, usersRoutes, collegesRoutes, projectsRoutes;
let dataSubmissionsRoutes, mlModelsRoutes, sensorsRoutes, sensorReadingsRoutes;
let communicationRoutes, researchDataRoutes, uploadsRoutes, reportsRoutes;
let adminPanelRoutes, notificationsRoutes, analyticsRoutes, batchRoutes, searchRoutes;

try {
  ({ testConnection } = require('./config/database'));
  ({ errorHandler, notFoundHandler } = require('./middleware/errorHandler'));

  // Import routes
  healthRoutes = require('./routes/health');
  authRoutes = require('./routes/auth');
  usersRoutes = require('./routes/users');
  collegesRoutes = require('./routes/colleges');
  projectsRoutes = require('./routes/projects');
  dataSubmissionsRoutes = require('./routes/data-submissions');
  mlModelsRoutes = require('./routes/ml-models');
  sensorsRoutes = require('./routes/sensors');
  sensorReadingsRoutes = require('./routes/sensor-readings');
  communicationRoutes = require('./routes/communication');
  researchDataRoutes = require('./routes/research-data');
  uploadsRoutes = require('./routes/uploads');
  reportsRoutes = require('./routes/reports');
  adminPanelRoutes = require('./routes/admin-panel');
  notificationsRoutes = require('./routes/notifications');
  analyticsRoutes = require('./routes/analytics');
  batchRoutes = require('./routes/batch');
  searchRoutes = require('./routes/search');
} catch (error) {
  console.error('Error loading modules:', error);
}

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
if (healthRoutes) app.use('/health', healthRoutes);

// API routes
if (authRoutes) app.use('/api/auth', authRoutes);
if (usersRoutes) app.use('/api/users', usersRoutes);
if (collegesRoutes) app.use('/api/colleges', collegesRoutes);
if (projectsRoutes) app.use('/api/projects', projectsRoutes);
if (dataSubmissionsRoutes) app.use('/api/data-submissions', dataSubmissionsRoutes);
if (mlModelsRoutes) app.use('/api/ml-models', mlModelsRoutes);
if (sensorsRoutes) app.use('/api/sensors', sensorsRoutes);
if (sensorReadingsRoutes) app.use('/api/sensor-readings', sensorReadingsRoutes);
if (communicationRoutes) app.use('/api/communication', communicationRoutes);
if (researchDataRoutes) app.use('/api/research-data', researchDataRoutes);
if (uploadsRoutes) app.use('/api/uploads', uploadsRoutes);
if (reportsRoutes) app.use('/api/reports', reportsRoutes);
if (notificationsRoutes) app.use('/api/notifications', notificationsRoutes);
if (analyticsRoutes) app.use('/api/analytics', analyticsRoutes);
if (batchRoutes) app.use('/api/batch', batchRoutes);
if (searchRoutes) app.use('/api/search', searchRoutes);

// Admin Panel (Database Viewer)
if (adminPanelRoutes) app.use('/admin-panel', adminPanelRoutes);

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
if (notFoundHandler) {
  app.use(notFoundHandler);
} else {
  app.use((req, res) => {
    res.status(404).json({ error: 'Route not found', path: req.originalUrl });
  });
}

// Global error handler
if (errorHandler) {
  app.use(errorHandler);
} else {
  app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  });
}

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

// Only add process handlers when not in serverless
if (!process.env.VERCEL) {
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
}

// Start the server (only when not in Vercel serverless environment)
if (!process.env.VERCEL) {
  startServer();
}

// Export for Vercel serverless
module.exports = app;

