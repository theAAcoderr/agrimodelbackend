const express = require('express');
const { query } = require('../config/database');
const { authenticateToken, requireApproved } = require('../middleware/auth');
const router = express.Router();

router.use(authenticateToken);
router.use(requireApproved);

// Get research data
router.get('/', async (req, res, next) => {
  try {
    const { projectId, userId, dataType } = req.query;
    
    let sql = 'SELECT * FROM research_data WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (projectId) {
      sql += ` AND project_id = $${paramIndex++}`;
      params.push(projectId);
    }

    if (userId) {
      sql += ` AND user_id = $${paramIndex++}`;
      params.push(userId);
    }

    if (dataType) {
      sql += ` AND data_type = $${paramIndex++}`;
      params.push(dataType);
    }

    sql += ' ORDER BY created_at DESC';

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// Create research data
router.post('/', async (req, res, next) => {
  try {
    const {
      project_id, user_id, data_type, metadata,
      image_urls, video_urls, file_urls, audio_urls
    } = req.body;

    if (!project_id || !data_type) {
      return res.status(400).json({ error: 'Project ID and data type required' });
    }

    const result = await query(
      `INSERT INTO research_data (
        project_id, user_id, data_type, metadata,
        image_urls, video_urls, file_urls, audio_urls
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [
        project_id,
        user_id || req.user.id,
        data_type,
        JSON.stringify(metadata || {}),
        image_urls || [],
        video_urls || [],
        file_urls || [],
        audio_urls || []
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Delete research data
router.delete('/:entryId', async (req, res, next) => {
  try {
    const result = await query(
      'DELETE FROM research_data WHERE id = $1 RETURNING id',
      [req.params.entryId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Research data not found' });
    }

    res.json({ message: 'Research data deleted successfully' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

