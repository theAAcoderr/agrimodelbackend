const express = require('express');
const { query } = require('../config/database');
const { authenticateToken, requireApproved } = require('../middleware/auth');
const router = express.Router();

router.use(authenticateToken);
router.use(requireApproved);

// ==========================================
// CONVERSATIONS
// ==========================================

// Get user's conversations
router.get('/conversations', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT * FROM conversations 
       WHERE $1 = ANY(participant_ids)
       ORDER BY last_message_at DESC`,
      [req.user.id]
    );

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// Create conversation
router.post('/conversations', async (req, res, next) => {
  try {
    const { participant_ids, title, type, project_id } = req.body;

    if (!participant_ids || participant_ids.length < 2) {
      return res.status(400).json({ error: 'At least 2 participants required' });
    }

    const result = await query(
      `INSERT INTO conversations (participant_ids, title, type, project_id)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [participant_ids, title || null, type || 'direct', project_id || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Get conversation messages
router.get('/conversations/:conversationId/messages', async (req, res, next) => {
  try {
    const { conversationId } = req.params;

    const result = await query(
      `SELECT * FROM messages 
       WHERE conversation_id = $1 
       ORDER BY created_at ASC`,
      [conversationId]
    );

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// Send message
router.post('/conversations/:conversationId/messages', async (req, res, next) => {
  try {
    const { conversationId } = req.params;
    const { content, message_type, attachments } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Message content required' });
    }

    const result = await query(
      `INSERT INTO messages (conversation_id, sender_id, content, message_type, attachments)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [conversationId, req.user.id, content, message_type || 'text', attachments || []]
    );

    // Update conversation last_message_at
    await query(
      'UPDATE conversations SET last_message_at = NOW() WHERE id = $1',
      [conversationId]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// ==========================================
// ANNOUNCEMENTS
// ==========================================

// Get announcements
router.get('/announcements', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT * FROM announcements 
       WHERE is_active = true 
       AND (expires_at IS NULL OR expires_at > NOW())
       AND (target_roles = '{}' OR $1 = ANY(target_roles))
       ORDER BY created_at DESC`,
      [req.user.role]
    );

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// Create announcement
router.post('/announcements', async (req, res, next) => {
  try {
    const { title, content, type, priority, target_roles, target_colleges, expires_at } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content required' });
    }

    const result = await query(
      `INSERT INTO announcements (
        title, content, type, priority, created_by,
        target_roles, target_colleges, expires_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        title,
        content,
        type || 'general',
        priority || 'medium',
        req.user.id,
        target_roles || [],
        target_colleges || [],
        expires_at || null
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// ==========================================
// DISCUSSIONS
// ==========================================

// Get discussions
router.get('/discussions', async (req, res, next) => {
  try {
    const { projectId, category } = req.query;
    
    let sql = 'SELECT * FROM discussions WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (projectId) {
      sql += ` AND project_id = $${paramIndex++}`;
      params.push(projectId);
    }

    if (category) {
      sql += ` AND category = $${paramIndex++}`;
      params.push(category);
    }

    sql += ' ORDER BY is_pinned DESC, created_at DESC';

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// Create discussion
router.post('/discussions', async (req, res, next) => {
  try {
    const { title, content, category, tags, project_id } = req.body;

    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content required' });
    }

    const result = await query(
      `INSERT INTO discussions (title, content, category, tags, project_id, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [title, content, category || null, tags || [], project_id || null, req.user.id]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Get discussion replies
router.get('/discussions/:discussionId/replies', async (req, res, next) => {
  try {
    const { discussionId } = req.params;

    const result = await query(
      `SELECT * FROM discussion_replies 
       WHERE discussion_id = $1 
       ORDER BY created_at ASC`,
      [discussionId]
    );

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// Add discussion reply
router.post('/discussions/:discussionId/replies', async (req, res, next) => {
  try {
    const { discussionId } = req.params;
    const { content, parent_reply_id, attachments } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Reply content required' });
    }

    const result = await query(
      `INSERT INTO discussion_replies (discussion_id, parent_reply_id, content, created_by, attachments)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [discussionId, parent_reply_id || null, content, req.user.id, attachments || []]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

module.exports = router;

