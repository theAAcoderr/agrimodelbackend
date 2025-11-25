const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
require('dotenv').config();

const { errorHandler, notFoundHandler } = require('../middleware/errorHandler');

// Import routes
const healthRoutes = require('../routes/health');
const authRoutes = require('../routes/auth');
const usersRoutes = require('../routes/users');
const collegesRoutes = require('../routes/colleges');
const projectsRoutes = require('../routes/projects');
const dataSubmissionsRoutes = require('../routes/data-submissions');
const mlModelsRoutes = require('../routes/ml-models');
const sensorsRoutes = require('../routes/sensors');
const sensorReadingsRoutes = require('../routes/sensor-readings');
const communicationRoutes = require('../routes/communication');
const researchDataRoutes = require('../routes/research-data');
const uploadsRoutes = require('../routes/uploads');
const reportsRoutes = require('../routes/reports');
const adminPanelRoutes = require('../routes/admin-panel');
const notificationsRoutes = require('../routes/notifications');
const analyticsRoutes = require('../routes/analytics');
const batchRoutes = require('../routes/batch');
const searchRoutes = require('../routes/search');

const app = express();

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
      projects: '/api/projects',
      submissions: '/api/data-submissions'
    }
  });
});

// 404 handler
app.use(notFoundHandler);

// Global error handler
app.use(errorHandler);

module.exports = app;
