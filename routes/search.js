const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { query } = require('../config/database');

// All routes require authentication
router.use(authenticateToken);

// GET /api/search?q=...&type=...
router.get('/', async (req, res, next) => {
  try {
    const { q, type } = req.query;

    if (!q || q.length < 2) {
      return res.status(400).json({ error: 'Search query must be at least 2 characters' });
    }

    const searchTerm = `%${q}%`;
    const results = {};

    // Search users
    if (!type || type === 'users') {
      const users = await query(`
        SELECT id, user_id, name, email, role, college_id, department, status
        FROM users
        WHERE (name ILIKE $1 OR email ILIKE $1)
        AND status = 'approved'
        ${req.user.role !== 'super_admin' ? 'AND college_id = $2' : ''}
        LIMIT 10
      `, req.user.role !== 'super_admin' ? [searchTerm, req.user.collegeId] : [searchTerm]);
      results.users = users.rows;
    }

    // Search projects
    if (!type || type === 'projects') {
      const projects = await query(`
        SELECT p.id, p.name, p.description, p.type, p.status, p.department, p.created_at
        FROM projects p
        WHERE (p.name ILIKE $1 OR p.description ILIKE $1)
        ${req.user.role !== 'super_admin' ? 'AND p.created_by IN (SELECT id FROM users WHERE college_id = $2)' : ''}
        LIMIT 10
      `, req.user.role !== 'super_admin' ? [searchTerm, req.user.collegeId] : [searchTerm]);
      results.projects = projects.rows;
    }

    // Search colleges (super admin only)
    if ((!type || type === 'colleges') && req.user.role === 'super_admin') {
      const colleges = await query(`
        SELECT id, name, college_code, address, status
        FROM colleges
        WHERE (name ILIKE $1 OR college_code ILIKE $1)
        AND status = 'approved'
        LIMIT 10
      `, [searchTerm]);
      results.colleges = colleges.rows;
    }

    // Search discussions
    if (!type || type === 'discussions') {
      const discussions = await query(`
        SELECT d.id, d.title, d.content, d.category, d.created_at, d.project_id
        FROM discussions d
        WHERE (d.title ILIKE $1 OR d.content ILIKE $1)
        ${req.user.role !== 'super_admin' ? 'AND d.created_by IN (SELECT id FROM users WHERE college_id = $2)' : ''}
        LIMIT 10
      `, req.user.role !== 'super_admin' ? [searchTerm, req.user.collegeId] : [searchTerm]);
      results.discussions = discussions.rows;
    }

    // Search data submissions
    if (!type || type === 'submissions') {
      const submissions = await query(`
        SELECT ds.id, ds.project_id, ds.status, ds.quality_score, ds.submitted_at
        FROM data_submissions ds
        WHERE ds.data_content::text ILIKE $1
        ${req.user.role !== 'super_admin' ? 'AND ds.student_id IN (SELECT id FROM users WHERE college_id = $2)' : ''}
        LIMIT 10
      `, req.user.role !== 'super_admin' ? [searchTerm, req.user.collegeId] : [searchTerm]);
      results.submissions = submissions.rows;
    }

    res.json(results);
  } catch (error) {
    next(error);
  }
});

module.exports = router;