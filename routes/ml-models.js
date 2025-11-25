const express = require('express');
const { query } = require('../config/database');
const { authenticateToken, requireApproved } = require('../middleware/auth');
const router = express.Router();

router.use(authenticateToken);
router.use(requireApproved);

// Get all ML models
router.get('/', async (req, res, next) => {
  try {
    const { status, type, projectId } = req.query;
    
    let sql = 'SELECT * FROM ml_models WHERE 1=1';
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

    if (projectId) {
      sql += ` AND project_id = $${paramIndex++}`;
      params.push(projectId);
    }

    sql += ' ORDER BY created_at DESC';

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// Get specific model
router.get('/:modelId', async (req, res, next) => {
  try {
    const result = await query(
      'SELECT * FROM ml_models WHERE id = $1',
      [req.params.modelId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Model not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Create ML model
router.post('/', async (req, res, next) => {
  try {
    const {
      name, description, type, framework, project_id,
      hyperparameters, training_config, version
    } = req.body;

    if (!name || !type || !framework) {
      return res.status(400).json({ error: 'Name, type, and framework required' });
    }

    const result = await query(
      `INSERT INTO ml_models (
        name, description, type, framework, status, version,
        project_id, created_by, hyperparameters, training_config
      )
      VALUES ($1, $2, $3, $4, 'DRAFT', $5, $6, $7, $8, $9)
      RETURNING *`,
      [
        name,
        description || null,
        type,
        framework,
        version || '1.0.0',
        project_id || null,
        req.user.id,
        JSON.stringify(hyperparameters || {}),
        JSON.stringify(training_config || {})
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Update ML model
router.patch('/:modelId', async (req, res, next) => {
  try {
    const { modelId } = req.params;
    const {
      name, description, status, metrics,
      deployment_config, accuracy, model_path
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
    if (status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      params.push(status);
      if (status === 'TRAINED') {
        updates.push(`trained_at = NOW()`);
      }
      if (status === 'DEPLOYED') {
        updates.push(`deployed_at = NOW()`);
      }
    }
    if (metrics !== undefined) {
      updates.push(`metrics = $${paramIndex++}`);
      params.push(JSON.stringify(metrics));
    }
    if (deployment_config !== undefined) {
      updates.push(`deployment_config = $${paramIndex++}`);
      params.push(JSON.stringify(deployment_config));
    }
    if (accuracy !== undefined) {
      updates.push(`accuracy = $${paramIndex++}`);
      params.push(accuracy);
    }
    if (model_path !== undefined) {
      updates.push(`model_path = $${paramIndex++}`);
      params.push(model_path);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(modelId);
    const sql = `UPDATE ml_models SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${paramIndex} RETURNING *`;

    const result = await query(sql, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Model not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Delete ML model
router.delete('/:modelId', async (req, res, next) => {
  try {
    const result = await query(
      'DELETE FROM ml_models WHERE id = $1 RETURNING id',
      [req.params.modelId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Model not found' });
    }

    res.json({ message: 'Model deleted successfully' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

