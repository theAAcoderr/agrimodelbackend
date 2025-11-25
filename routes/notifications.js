const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { query } = require('../config/database');

// All routes require authentication
router.use(authenticateToken);

// GET /api/notifications - Get user notifications
router.get('/', async (req, res, next) => {
  try {
    const { limit = 50, unreadOnly = false } = req.query;

    let queryText = `
      SELECT * FROM notifications
      WHERE user_id = $1
      ${unreadOnly === 'true' ? 'AND is_read = false' : ''}
      ORDER BY created_at DESC
      LIMIT $2
    `;

    const result = await query(queryText, [req.user.userId, parseInt(limit)]);

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// GET /api/notifications/unread-count - Get unread notification count
router.get('/unread-count', async (req, res, next) => {
  try {
    const result = await query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = false',
      [req.user.userId]
    );

    res.json({ count: parseInt(result.rows[0].count) });
  } catch (error) {
    next(error);
  }
});

// GET /api/notifications/:id - Get specific notification
router.get('/:id', async (req, res, next) => {
  try {
    const result = await query(
      'SELECT * FROM notifications WHERE id = $1 AND user_id = $2',
      [req.params.id, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// PATCH /api/notifications/:id/read - Mark notification as read
router.patch('/:id/read', async (req, res, next) => {
  try {
    const result = await query(
      `UPDATE notifications
       SET is_read = true, read_at = NOW()
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [req.params.id, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ message: 'Notification marked as read', notification: result.rows[0] });
  } catch (error) {
    next(error);
  }
});

// POST /api/notifications/mark-all-read - Mark all as read
router.post('/mark-all-read', async (req, res, next) => {
  try {
    const result = await query(
      `UPDATE notifications
       SET is_read = true, read_at = NOW()
       WHERE user_id = $1 AND is_read = false
       RETURNING COUNT(*) as count`,
      [req.user.userId]
    );

    res.json({
      message: 'All notifications marked as read',
      count: result.rowCount
    });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/notifications/:id - Delete notification
router.delete('/:id', async (req, res, next) => {
  try {
    const result = await query(
      'DELETE FROM notifications WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ message: 'Notification deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// DELETE /api/notifications - Delete all read notifications
router.delete('/', async (req, res, next) => {
  try {
    const result = await query(
      'DELETE FROM notifications WHERE user_id = $1 AND is_read = true RETURNING id',
      [req.user.userId]
    );

    res.json({
      message: 'Read notifications deleted',
      count: result.rowCount
    });
  } catch (error) {
    next(error);
  }
});

// POST /api/notifications - Create notification (for internal use/testing)
router.post('/', async (req, res, next) => {
  try {
    const { user_id, title, message, type, related_type, related_id, action_url } = req.body;

    if (!user_id || !title || !message) {
      return res.status(400).json({ error: 'user_id, title, and message are required' });
    }

    const result = await query(
      `INSERT INTO notifications (user_id, title, message, type, related_type, related_id, action_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [user_id, title, message, type || 'info', related_type, related_id, action_url]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

module.exports = router;