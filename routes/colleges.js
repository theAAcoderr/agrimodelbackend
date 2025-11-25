const express = require('express');
const { query } = require('../config/database');
const { authenticateToken, authorize } = require('../middleware/auth');
const router = express.Router();

// Public route - Get approved colleges for registration (no auth required)
router.get('/public/approved', async (req, res, next) => {
  try {
    const result = await query(
      "SELECT id, name, college_code, address, location FROM colleges WHERE status = 'approved' ORDER BY name ASC"
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// All routes below require authentication
router.use(authenticateToken);

// Get all colleges
router.get('/', async (req, res, next) => {
  try {
    const { status } = req.query;
    
    let sql = 'SELECT * FROM colleges WHERE 1=1';
    const params = [];

    if (status) {
      sql += ' AND status = $1';
      params.push(status);
    }

    sql += ' ORDER BY created_at DESC';

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// Get approved colleges
router.get('/approved', async (req, res, next) => {
  try {
    const result = await query(
      "SELECT * FROM colleges WHERE status = 'approved' ORDER BY name ASC"
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// Get pending colleges (Super Admin only)
router.get('/pending', authorize('super_admin'), async (req, res, next) => {
  try {
    const result = await query(
      "SELECT * FROM colleges WHERE status = 'pending' ORDER BY created_at DESC"
    );
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// Get specific college
router.get('/:collegeId', async (req, res, next) => {
  try {
    const { collegeId } = req.params;
    
    const result = await query(
      'SELECT * FROM colleges WHERE id = $1',
      [collegeId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'College not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Create college (Super Admin only)
router.post('/', authorize('super_admin'), async (req, res, next) => {
  try {
    const { name, address, location } = req.body;

    if (!name || !address) {
      return res.status(400).json({ error: 'Name and address required' });
    }

    const result = await query(
      `INSERT INTO colleges (name, address, location, status)
       VALUES ($1, $2, $3, 'approved')
       RETURNING *`,
      [name, address, location || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Update college
router.patch('/:collegeId', authorize('super_admin', 'college_admin'), async (req, res, next) => {
  try {
    const { collegeId } = req.params;
    const { name, address, location, status } = req.body;

    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      params.push(name);
    }
    if (address !== undefined) {
      updates.push(`address = $${paramIndex++}`);
      params.push(address);
    }
    if (location !== undefined) {
      updates.push(`location = $${paramIndex++}`);
      params.push(location);
    }
    if (status !== undefined && req.user.role === 'super_admin') {
      updates.push(`status = $${paramIndex++}`);
      params.push(status);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(collegeId);
    const sql = `UPDATE colleges SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${paramIndex} RETURNING *`;

    const result = await query(sql, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'College not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Approve college (Super Admin only)
router.post('/:collegeId/approve', authorize('super_admin'), async (req, res, next) => {
  try {
    const { collegeId } = req.params;

    const result = await query(
      `UPDATE colleges 
       SET status = 'approved', updated_at = NOW() 
       WHERE id = $1 
       RETURNING *`,
      [collegeId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'College not found' });
    }

    res.json({ 
      college: result.rows[0],
      message: 'College approved successfully' 
    });
  } catch (error) {
    next(error);
  }
});

// Reject college (Super Admin only)
router.post('/:collegeId/reject', authorize('super_admin'), async (req, res, next) => {
  try {
    const { collegeId } = req.params;

    const result = await query(
      `UPDATE colleges 
       SET status = 'rejected', updated_at = NOW() 
       WHERE id = $1 
       RETURNING *`,
      [collegeId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'College not found' });
    }

    res.json({ 
      college: result.rows[0],
      message: 'College rejected' 
    });
  } catch (error) {
    next(error);
  }
});

// Delete college (Super Admin only)
router.delete('/:collegeId', authorize('super_admin'), async (req, res, next) => {
  try {
    const { collegeId } = req.params;

    const result = await query(
      'DELETE FROM colleges WHERE id = $1 RETURNING id',
      [collegeId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'College not found' });
    }

    res.json({ message: 'College deleted successfully' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

