const express = require('express');
const { query } = require('../config/database');
const { authenticateToken, requireApproved } = require('../middleware/auth');
const router = express.Router();

router.use(authenticateToken);
router.use(requireApproved);

// Get all reports with filters
router.get('/', async (req, res, next) => {
  try {
    const { projectId, userId, type, status, limit, offset } = req.query;

    let sql = `
      SELECT r.*, u.name as created_by_name, p.name as project_name
      FROM reports r
      LEFT JOIN users u ON r.created_by = u.id
      LEFT JOIN projects p ON r.project_id = p.id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (projectId) {
      sql += ` AND r.project_id = $${paramIndex++}`;
      params.push(projectId);
    }

    if (userId) {
      sql += ` AND r.created_by = $${paramIndex++}`;
      params.push(userId);
    }

    if (type) {
      sql += ` AND r.type = $${paramIndex++}`;
      params.push(type);
    }

    if (status) {
      sql += ` AND r.status = $${paramIndex++}`;
      params.push(status);
    }

    sql += ' ORDER BY r.created_at DESC';

    if (limit) {
      sql += ` LIMIT $${paramIndex++}`;
      params.push(parseInt(limit));
    }

    if (offset) {
      sql += ` OFFSET $${paramIndex++}`;
      params.push(parseInt(offset));
    }

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// Get report by ID
router.get('/:reportId', async (req, res, next) => {
  try {
    const { reportId } = req.params;

    const result = await query(
      `SELECT r.*, u.name as created_by_name, p.name as project_name
       FROM reports r
       LEFT JOIN users u ON r.created_by = u.id
       LEFT JOIN projects p ON r.project_id = p.id
       WHERE r.id = $1`,
      [reportId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Create report
router.post('/', async (req, res, next) => {
  try {
    const {
      title,
      description,
      type,
      project_id,
      content,
      data,
      file_url,
      status = 'draft'
    } = req.body;

    if (!title || !type) {
      return res.status(400).json({ error: 'Title and type are required' });
    }

    const result = await query(
      `INSERT INTO reports (
        title, description, type, project_id, content, data,
        file_url, status, created_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        title,
        description || null,
        type,
        project_id || null,
        content || null,
        JSON.stringify(data || {}),
        file_url || null,
        status,
        req.user.id
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Update report
router.patch('/:reportId', async (req, res, next) => {
  try {
    const { reportId } = req.params;
    const updates = req.body;

    // Check if report exists
    const existingReport = await query(
      'SELECT * FROM reports WHERE id = $1',
      [reportId]
    );

    if (existingReport.rows.length === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }

    // Check ownership or admin rights
    const report = existingReport.rows[0];
    if (report.created_by !== req.user.id && !['super_admin', 'college_admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Not authorized to update this report' });
    }

    // Build dynamic update query
    const allowedFields = [
      'title', 'description', 'type', 'content', 'data',
      'file_url', 'status'
    ];

    const updateFields = [];
    const params = [];
    let paramIndex = 1;

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        if (field === 'data') {
          updateFields.push(`${field} = $${paramIndex++}`);
          params.push(JSON.stringify(updates[field]));
        } else {
          updateFields.push(`${field} = $${paramIndex++}`);
          params.push(updates[field]);
        }
      }
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    updateFields.push(`updated_at = NOW()`);
    params.push(reportId);

    const result = await query(
      `UPDATE reports SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      params
    );

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Delete report
router.delete('/:reportId', async (req, res, next) => {
  try {
    const { reportId } = req.params;

    // Check if report exists and user has permission
    const existingReport = await query(
      'SELECT * FROM reports WHERE id = $1',
      [reportId]
    );

    if (existingReport.rows.length === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }

    const report = existingReport.rows[0];
    if (report.created_by !== req.user.id && !['super_admin', 'college_admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Not authorized to delete this report' });
    }

    await query('DELETE FROM reports WHERE id = $1', [reportId]);

    res.json({ message: 'Report deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// Publish report
router.post('/:reportId/publish', async (req, res, next) => {
  try {
    const { reportId } = req.params;

    const existingReport = await query(
      'SELECT * FROM reports WHERE id = $1',
      [reportId]
    );

    if (existingReport.rows.length === 0) {
      return res.status(404).json({ error: 'Report not found' });
    }

    const report = existingReport.rows[0];
    if (report.created_by !== req.user.id && !['super_admin', 'college_admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Not authorized to publish this report' });
    }

    const result = await query(
      `UPDATE reports SET status = 'published', published_at = NOW(), updated_at = NOW()
       WHERE id = $1 RETURNING *`,
      [reportId]
    );

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Get report statistics
router.get('/stats/summary', async (req, res, next) => {
  try {
    const { projectId } = req.query;

    let sql = `
      SELECT
        COUNT(*) as total_reports,
        COUNT(CASE WHEN status = 'draft' THEN 1 END) as draft_count,
        COUNT(CASE WHEN status = 'published' THEN 1 END) as published_count,
        COUNT(CASE WHEN status = 'archived' THEN 1 END) as archived_count,
        COUNT(DISTINCT project_id) as projects_with_reports,
        COUNT(DISTINCT created_by) as unique_authors
      FROM reports
      WHERE 1=1
    `;
    const params = [];

    if (projectId) {
      sql += ` AND project_id = $1`;
      params.push(projectId);
    }

    const result = await query(sql, params);
    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
