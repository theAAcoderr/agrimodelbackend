const express = require('express');
const { query } = require('../config/database');
const { authenticateToken, requireApproved } = require('../middleware/auth');
const router = express.Router();

router.use(authenticateToken);
router.use(requireApproved);

// Get all sensor readings with filters
router.get('/', async (req, res, next) => {
  try {
    const { sensorId, projectId, startDate, endDate, limit, offset } = req.query;

    let sql = `
      SELECT sr.*, s.name as sensor_name, s.type as sensor_type
      FROM sensor_readings sr
      LEFT JOIN sensors s ON sr.sensor_id = s.id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (sensorId) {
      sql += ` AND sr.sensor_id = $${paramIndex++}`;
      params.push(sensorId);
    }

    if (projectId) {
      sql += ` AND s.project_id = $${paramIndex++}`;
      params.push(projectId);
    }

    if (startDate) {
      sql += ` AND sr.timestamp >= $${paramIndex++}`;
      params.push(startDate);
    }

    if (endDate) {
      sql += ` AND sr.timestamp <= $${paramIndex++}`;
      params.push(endDate);
    }

    sql += ' ORDER BY sr.timestamp DESC';

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

// Get recent sensor readings
router.get('/recent', async (req, res, next) => {
  try {
    const { limit = 50, sensorId, projectId } = req.query;

    let sql = `
      SELECT sr.*, s.name as sensor_name, s.type as sensor_type
      FROM sensor_readings sr
      LEFT JOIN sensors s ON sr.sensor_id = s.id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (sensorId) {
      sql += ` AND sr.sensor_id = $${paramIndex++}`;
      params.push(sensorId);
    }

    if (projectId) {
      sql += ` AND s.project_id = $${paramIndex++}`;
      params.push(projectId);
    }

    sql += ` ORDER BY sr.timestamp DESC LIMIT $${paramIndex}`;
    params.push(parseInt(limit));

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// Get sensor reading by ID
router.get('/:readingId', async (req, res, next) => {
  try {
    const { readingId } = req.params;

    const result = await query(
      `SELECT sr.*, s.name as sensor_name, s.type as sensor_type
       FROM sensor_readings sr
       LEFT JOIN sensors s ON sr.sensor_id = s.id
       WHERE sr.id = $1`,
      [readingId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Sensor reading not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Create sensor reading
router.post('/', async (req, res, next) => {
  try {
    const {
      sensorId,
      value,
      unit,
      timestamp,
      temperature,
      humidity,
      soil_moisture,
      ph_level,
      light_intensity,
      metadata,
      isValid = true,
      errorMessage
    } = req.body;

    if (!sensorId) {
      return res.status(400).json({ error: 'Sensor ID is required' });
    }

    // Verify sensor exists
    const sensorCheck = await query('SELECT id FROM sensors WHERE id = $1', [sensorId]);
    if (sensorCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Sensor not found' });
    }

    const result = await query(
      `INSERT INTO sensor_readings (
        sensor_id, value, unit, timestamp, temperature, humidity,
        soil_moisture, ph_level, light_intensity, metadata, is_valid, error_message
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *`,
      [
        sensorId,
        value || null,
        unit || null,
        timestamp || new Date().toISOString(),
        temperature || null,
        humidity || null,
        soil_moisture || null,
        ph_level || null,
        light_intensity || null,
        JSON.stringify(metadata || {}),
        isValid,
        errorMessage || null
      ]
    );

    // Update sensor's last_reading timestamp
    await query(
      'UPDATE sensors SET last_reading = NOW() WHERE id = $1',
      [sensorId]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Update sensor reading
router.patch('/:readingId', async (req, res, next) => {
  try {
    const { readingId } = req.params;
    const updates = req.body;

    // Check if reading exists
    const existingReading = await query(
      'SELECT * FROM sensor_readings WHERE id = $1',
      [readingId]
    );

    if (existingReading.rows.length === 0) {
      return res.status(404).json({ error: 'Sensor reading not found' });
    }

    // Build dynamic update query
    const allowedFields = [
      'value', 'unit', 'temperature', 'humidity', 'soil_moisture',
      'ph_level', 'light_intensity', 'metadata', 'is_valid', 'error_message'
    ];

    const updateFields = [];
    const params = [];
    let paramIndex = 1;

    for (const field of allowedFields) {
      if (updates[field] !== undefined) {
        if (field === 'metadata') {
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

    params.push(readingId);

    const result = await query(
      `UPDATE sensor_readings SET ${updateFields.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      params
    );

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Delete sensor reading
router.delete('/:readingId', async (req, res, next) => {
  try {
    const { readingId } = req.params;

    const result = await query(
      'DELETE FROM sensor_readings WHERE id = $1 RETURNING *',
      [readingId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Sensor reading not found' });
    }

    res.json({ message: 'Sensor reading deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// Get statistics for sensor readings
router.get('/stats/:sensorId', async (req, res, next) => {
  try {
    const { sensorId } = req.params;
    const { startDate, endDate } = req.query;

    let sql = `
      SELECT
        COUNT(*) as total_readings,
        AVG(value) as avg_value,
        MIN(value) as min_value,
        MAX(value) as max_value,
        AVG(temperature) as avg_temperature,
        AVG(humidity) as avg_humidity,
        AVG(soil_moisture) as avg_soil_moisture,
        AVG(ph_level) as avg_ph_level,
        MIN(timestamp) as first_reading,
        MAX(timestamp) as last_reading
      FROM sensor_readings
      WHERE sensor_id = $1
    `;
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

    const result = await query(sql, params);
    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
