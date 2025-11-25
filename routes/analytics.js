const express = require('express');
const router = express.Router();
const { query } = require('../config/database');
const cacheService = require('../services/cacheService');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Add authentication middleware to all routes
router.use(authenticateToken);

// Dashboard statistics
router.get('/dashboard', requireRole(['super_admin', 'college_admin']), async (req, res, next) => {
  try {
    const cacheKey = 'dashboard_stats';

    // Try cache first
    const cached = cacheService.get(cacheKey);
    if (cached) {
      return res.json({ ...cached, cached: true });
    }

    // Fetch statistics
    const [users, colleges, projects, submissions, sensors] = await Promise.all([
      query('SELECT COUNT(*) as count FROM users'),
      query('SELECT COUNT(*) as count FROM colleges'),
      query('SELECT COUNT(*) as count FROM projects'),
      query('SELECT COUNT(*) as count FROM data_submissions'),
      query('SELECT COUNT(*) as count FROM sensors')
    ]);

    const stats = {
      totalUsers: parseInt(users.rows[0].count),
      totalColleges: parseInt(colleges.rows[0].count),
      totalProjects: parseInt(projects.rows[0].count),
      totalSubmissions: parseInt(submissions.rows[0].count),
      totalSensors: parseInt(sensors.rows[0].count),
      timestamp: new Date().toISOString()
    };

    // Cache for 5 minutes
    cacheService.set(cacheKey, stats, 300);

    res.json(stats);
  } catch (error) {
    next(error);
  }
});

// User statistics by role
router.get('/users/by-role', async (req, res, next) => {
  try {
    const result = await query(`
      SELECT role, COUNT(*) as count
      FROM users
      GROUP BY role
      ORDER BY count DESC
    `);

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// Project statistics by status
router.get('/projects/by-status', async (req, res, next) => {
  try {
    const result = await query(`
      SELECT status, COUNT(*) as count
      FROM projects
      GROUP BY status
      ORDER BY count DESC
    `);

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// Recent activity
router.get('/activity/recent', async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 10;

    const activities = await query(`
      SELECT
        'project' as type,
        name as title,
        created_at,
        created_by as user_id
      FROM projects
      UNION ALL
      SELECT
        'submission' as type,
        'Data Submission' as title,
        created_at,
        submitted_by as user_id
      FROM data_submissions
      ORDER BY created_at DESC
      LIMIT $1
    `, [limit]);

    res.json(activities.rows);
  } catch (error) {
    next(error);
  }
});

// Data growth over time
router.get('/growth/monthly', async (req, res, next) => {
  try {
    const result = await query(`
      SELECT
        DATE_TRUNC('month', created_at) as month,
        COUNT(*) as count
      FROM data_submissions
      WHERE created_at >= NOW() - INTERVAL '6 months'
      GROUP BY month
      ORDER BY month ASC
    `);

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

module.exports = router;