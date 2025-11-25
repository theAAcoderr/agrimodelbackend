const express = require('express');
const { query } = require('../config/database');
const { authenticateToken, requireApproved } = require('../middleware/auth');
const router = express.Router();

// All routes require authentication and approval
router.use(authenticateToken);
router.use(requireApproved);

// Get all projects
router.get('/', async (req, res, next) => {
  try {
    const { status, type, department, userId } = req.query;
    
    let sql = 'SELECT * FROM projects WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (status) {
      sql += ` AND status = $${paramIndex++}`;
      params.push(status);
    }

    if (type) {
      sql += ` AND type = $${paramIndex++}`;
      params.push(type);
    }

    if (department) {
      sql += ` AND department = $${paramIndex++}`;
      params.push(department);
    }

    if (userId) {
      sql += ` AND (created_by = $${paramIndex} OR $${paramIndex} = ANY(team_members))`;
      params.push(userId);
      paramIndex++;
    }

    sql += ' ORDER BY created_at DESC';

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// Get specific project
router.get('/:projectId', async (req, res, next) => {
  try {
    const { projectId } = req.params;
    
    const result = await query(
      'SELECT * FROM projects WHERE id = $1',
      [projectId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Create project
router.post('/', async (req, res, next) => {
  try {
    const {
      name,
      description,
      type,
      status,
      department,
      start_date,
      end_date,
      created_by,
      team_members,
      configuration
    } = req.body;

    if (!name || !description || !type || !start_date || !end_date) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const result = await query(
      `INSERT INTO projects (
        name, description, type, status, department, 
        start_date, end_date, created_by, team_members, configuration
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        name,
        description,
        type,
        status || 'PLANNING',
        department,
        start_date,
        end_date,
        created_by || req.user.id,
        team_members || [],
        JSON.stringify(configuration || {})
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Update project
router.patch('/:projectId', async (req, res, next) => {
  try {
    const { projectId } = req.params;
    const {
      name,
      description,
      type,
      status,
      department,
      start_date,
      end_date,
      team_members,
      configuration
    } = req.body;

    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      params.push(name);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramIndex++}`);
      params.push(description);
    }
    if (type !== undefined) {
      updates.push(`type = $${paramIndex++}`);
      params.push(type);
    }
    if (status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      params.push(status);
    }
    if (department !== undefined) {
      updates.push(`department = $${paramIndex++}`);
      params.push(department);
    }
    if (start_date !== undefined) {
      updates.push(`start_date = $${paramIndex++}`);
      params.push(start_date);
    }
    if (end_date !== undefined) {
      updates.push(`end_date = $${paramIndex++}`);
      params.push(end_date);
    }
    if (team_members !== undefined) {
      updates.push(`team_members = $${paramIndex++}`);
      params.push(team_members);
    }
    if (configuration !== undefined) {
      updates.push(`configuration = $${paramIndex++}`);
      params.push(JSON.stringify(configuration));
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(projectId);
    const sql = `UPDATE projects SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${paramIndex} RETURNING *`;

    const result = await query(sql, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Delete project
router.delete('/:projectId', async (req, res, next) => {
  try {
    const { projectId } = req.params;

    // Check if user has permission (project creator or admin)
    const projectResult = await query(
      'SELECT * FROM projects WHERE id = $1',
      [projectId]
    );

    if (projectResult.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const project = projectResult.rows[0];

    if (project.created_by !== req.user.id && !['super_admin', 'college_admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Not authorized to delete this project' });
    }

    await query('DELETE FROM projects WHERE id = $1', [projectId]);

    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

