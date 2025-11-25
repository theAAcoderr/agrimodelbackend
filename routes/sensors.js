const express = require('express');
const { query } = require('../config/database');
const { authenticateToken, requireApproved } = require('../middleware/auth');
const router = express.Router();

router.use(authenticateToken);
router.use(requireApproved);

// Get all sensors
router.get('/', async (req, res, next) => {
  try {
    const { projectId, status } = req.query;
    
    let sql = 'SELECT * FROM sensors WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (projectId) {
      sql += ` AND project_id = $${paramIndex++}`;
      params.push(projectId);
    }

    if (status) {
      sql += ` AND status = $${paramIndex++}`;
      params.push(status);
    }

    sql += ' ORDER BY created_at DESC';

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// Create sensor
router.post('/', async (req, res, next) => {
  try {
    const { name, type, project_id, location, configuration } = req.body;

    if (!name || !type || !project_id) {
      return res.status(400).json({ error: 'Name, type, and project ID required' });
    }

    const result = await query(
      `INSERT INTO sensors (name, type, project_id, location, configuration, status)
       VALUES ($1, $2, $3, $4, $5, 'active')
       RETURNING *`,
      [name, type, project_id, location || null, JSON.stringify(configuration || {})]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Get sensor readings
router.get('/:sensorId/readings', async (req, res, next) => {
  try {
    const { sensorId } = req.params;
    const { limit, startDate, endDate } = req.query;
    
    let sql = 'SELECT * FROM sensor_readings WHERE sensor_id = $1';
    const params = [sensorId];
    let paramIndex = 2;

    if (startDate) {
      sql += ` AND timestamp >= $${paramIndex++}`;
      params.push(startDate);
    }

    if (endDate) {
      sql += ` AND timestamp <= $${paramIndex++}`;
      params.push(endDate);
    }

    sql += ' ORDER BY timestamp DESC';

    if (limit) {
      sql += ` LIMIT $${paramIndex}`;
      params.push(parseInt(limit));
    }

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// Add sensor reading
router.post('/:sensorId/readings', async (req, res, next) => {
  try {
    const { sensorId } = req.params;
    const { temperature, humidity, soil_moisture, ph_level, light_intensity, metadata } = req.body;

    const result = await query(
      `INSERT INTO sensor_readings (
        sensor_id, temperature, humidity, soil_moisture,
        ph_level, light_intensity, metadata
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [
        sensorId,
        temperature || null,
        humidity || null,
        soil_moisture || null,
        ph_level || null,
        light_intensity || null,
        JSON.stringify(metadata || {})
      ]
    );

    // Update sensor last_reading
    await query(
      'UPDATE sensors SET last_reading = NOW() WHERE id = $1',
      [sensorId]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

module.exports = router;

