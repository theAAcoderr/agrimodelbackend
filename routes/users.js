const express = require('express');
const { query } = require('../config/database');
const { authenticateToken, authorize, requireApproved } = require('../middleware/auth');
const router = express.Router();

// All routes require authentication
router.use(authenticateToken);

// Get all users (Super Admin only)
router.get('/', authorize('super_admin'), async (req, res, next) => {
  try {
    const { status, role, collegeId } = req.query;
    
    let sql = 'SELECT id, user_id, name, email, role, college_id, department, status, is_active, profile_image_url, phone_number, bio, created_at, updated_at FROM users WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (status) {
      sql += ` AND status = $${paramIndex++}`;
      params.push(status);
    }

    if (role) {
      sql += ` AND role = $${paramIndex++}`;
      params.push(role);
    }

    if (collegeId) {
      sql += ` AND college_id = $${paramIndex++}`;
      params.push(collegeId);
    }

    sql += ' ORDER BY created_at DESC';

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// Get pending users for approval
router.get('/pending', authenticateToken, async (req, res, next) => {
  try {
    const { adminRole, collegeId } = req.query;

    let sql = `SELECT id, user_id, name, email, role, college_id, department, status, created_at
               FROM users
               WHERE status = 'pending'`;
    const params = [];
    let paramIndex = 1;

    if (adminRole === 'college_admin' && collegeId) {
      // College Admin sees pending users from their college (excluding college_admin role)
      sql += ` AND college_id = $${paramIndex++} AND role != 'college_admin'`;
      params.push(collegeId);
    } else if (adminRole === 'super_admin') {
      // Super Admin sees only pending college admins
      sql += ` AND role = 'college_admin'`;
    }

    sql += ' ORDER BY created_at DESC';

    console.log('Pending users query:', sql, params);
    const result = await query(sql, params);
    console.log('Pending users found:', result.rows.length);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// Get all users for a specific college (College Admin only)
router.get('/college/:collegeId', authenticateToken, async (req, res, next) => {
  try {
    const { collegeId } = req.params;
    const user = req.user; // From authenticateToken middleware
    
    // Check if user is college admin of this college
    if (user.role !== 'college_admin' || user.college_id !== collegeId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const result = await query(
      `SELECT id, user_id, name, email, role, college_id, department, status, is_active, profile_image_url, phone_number, bio, created_at, updated_at 
       FROM users 
       WHERE college_id = $1 
       ORDER BY created_at DESC`,
      [collegeId]
    );
    
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// Get users by department
router.get('/by-department/:department', authenticateToken, async (req, res, next) => {
  try {
    const { department } = req.params;
    
    const result = await query(
      `SELECT id, user_id, name, email, role, college_id, department, status, profile_image_url, created_at 
       FROM users 
       WHERE department = $1 AND status = 'approved' AND is_active = true
       ORDER BY name ASC`,
      [department]
    );

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// Get users by college
router.get('/by-college/:collegeId', authenticateToken, async (req, res, next) => {
  try {
    const { collegeId } = req.params;
    
    const result = await query(
      `SELECT id, user_id, name, email, role, college_id, department, status, profile_image_url, created_at 
       FROM users 
       WHERE college_id = $1 AND status = 'approved' AND is_active = true
       ORDER BY name ASC`,
      [collegeId]
    );

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// Get specific user
router.get('/:userId', authenticateToken, async (req, res, next) => {
  try {
    const { userId } = req.params;
    
    const result = await query(
      'SELECT id, user_id, name, email, role, college_id, department, status, is_active, profile_image_url, phone_number, bio, created_at, updated_at FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Update user
router.patch('/:userId', authenticateToken, async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { name, phone_number, bio, profile_image_url, department } = req.body;

    // Check if user can update (self or admin)
    if (req.user.id !== userId && !['super_admin', 'college_admin'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Not authorized to update this user' });
    }

    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramIndex++}`);
      params.push(name);
    }
    if (phone_number !== undefined) {
      updates.push(`phone_number = $${paramIndex++}`);
      params.push(phone_number);
    }
    if (bio !== undefined) {
      updates.push(`bio = $${paramIndex++}`);
      params.push(bio);
    }
    if (profile_image_url !== undefined) {
      updates.push(`profile_image_url = $${paramIndex++}`);
      params.push(profile_image_url);
    }
    if (department !== undefined) {
      updates.push(`department = $${paramIndex++}`);
      params.push(department);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(userId);
    const sql = `UPDATE users SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${paramIndex} RETURNING id, user_id, name, email, role, college_id, department, status, profile_image_url, phone_number, bio, updated_at`;

    const result = await query(sql, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Approve user (Admin only)
router.post('/:userId/approve', authenticateToken, authorize('super_admin', 'college_admin'), async (req, res, next) => {
  try {
    const { userId } = req.params;

    const result = await query(
      `UPDATE users 
       SET status = 'approved', updated_at = NOW() 
       WHERE id = $1 
       RETURNING id, user_id, name, email, role, status`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ 
      user: result.rows[0],
      message: 'User approved successfully' 
    });
  } catch (error) {
    next(error);
  }
});

// Reject user (Admin only)
router.post('/:userId/reject', authenticateToken, authorize('super_admin', 'college_admin'), async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;

    const result = await query(
      `UPDATE users 
       SET status = 'rejected', updated_at = NOW() 
       WHERE id = $1 
       RETURNING id, user_id, name, email, role, status`,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ 
      user: result.rows[0],
      message: 'User rejected' 
    });
  } catch (error) {
    next(error);
  }
});

// Delete user (Admin only)
router.delete('/:userId', authenticateToken, authorize('super_admin', 'college_admin'), async (req, res, next) => {
  try {
    const { userId } = req.params;

    const result = await query(
      'DELETE FROM users WHERE id = $1 RETURNING id',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

