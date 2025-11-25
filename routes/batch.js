const express = require('express');
const router = express.Router();
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const { query, transaction } = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Add authentication middleware to all routes
router.use(authenticateToken);

// Configure multer for file uploads
const upload = multer({ dest: 'uploads/temp/' });

// Batch import data from CSV
router.post('/import/data', requireRole(['super_admin', 'college_admin', 'professor']), upload.single('file'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { projectId } = req.body;
    if (!projectId) {
      return res.status(400).json({ error: 'Project ID required' });
    }

    const results = [];
    const errors = [];

    // Read CSV file
    fs.createReadStream(req.file.path)
      .pipe(csv())
      .on('data', (data) => results.push(data))
      .on('end', async () => {
        try {
          // Process in transaction
          await transaction(async (client) => {
            for (let i = 0; i < results.length; i++) {
              const row = results[i];

              try {
                await client.query(
                  `INSERT INTO data_submissions (project_id, data, status, submitted_by, created_at)
                   VALUES ($1, $2, 'approved', $3, NOW())`,
                  [projectId, JSON.stringify(row), req.user?.id || 1]
                );
              } catch (err) {
                errors.push({ row: i + 1, error: err.message });
              }
            }
          });

          // Clean up temp file
          fs.unlinkSync(req.file.path);

          res.json({
            success: true,
            imported: results.length - errors.length,
            failed: errors.length,
            errors: errors.length > 0 ? errors : undefined
          });
        } catch (error) {
          fs.unlinkSync(req.file.path);
          throw error;
        }
      });
  } catch (error) {
    next(error);
  }
});

// Batch export data to CSV
router.get('/export/data/:projectId', requireRole(['super_admin', 'college_admin', 'professor', 'data_scientist']), async (req, res, next) => {
  try {
    const { projectId } = req.params;

    const result = await query(
      'SELECT * FROM data_submissions WHERE project_id = $1',
      [projectId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No data found' });
    }

    // Convert to CSV
    const headers = Object.keys(result.rows[0]).join(',');
    const rows = result.rows.map(row =>
      Object.values(row).map(val =>
        typeof val === 'object' ? JSON.stringify(val) : val
      ).join(',')
    );

    const csv = [headers, ...rows].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="data-export-${projectId}.csv"`);
    res.send(csv);
  } catch (error) {
    next(error);
  }
});

module.exports = router;