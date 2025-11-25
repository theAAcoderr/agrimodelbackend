const express = require('express');
const { query } = require('../config/database');
const { authenticateToken, requireApproved, authorize } = require('../middleware/auth');
const router = express.Router();

// All routes require authentication and approval
router.use(authenticateToken);
router.use(requireApproved);

// Save draft data (real-time saving)
router.post('/draft', async (req, res, next) => {
  try {
    const { student_id, project_id, data_content, status, submission_type } = req.body;
    
    if (!student_id || !data_content) {
      return res.status(400).json({ error: 'Student ID and data content are required' });
    }
    
    // Check if draft already exists for this student and project
    const existingDraft = await query(
      'SELECT id FROM data_submissions WHERE student_id = $1 AND project_id = $2 AND status = $3',
      [student_id, project_id || null, 'draft']
    );
    
    if (existingDraft.rows.length > 0) {
      // Update existing draft
      const result = await query(
        `UPDATE data_submissions 
         SET data_content = $1, updated_at = NOW() 
         WHERE student_id = $2 AND project_id = $3 AND status = $4 
         RETURNING *`,
        [JSON.stringify(data_content), student_id, project_id || null, 'draft']
      );
      
      res.json({
        message: 'Draft updated successfully',
        submission: result.rows[0]
      });
    } else {
      // Create new draft
      const result = await query(
        `INSERT INTO data_submissions (
          student_id, project_id, data_content, status, submission_type, 
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW()) 
        RETURNING *`,
        [student_id, project_id || null, JSON.stringify(data_content), 'draft', submission_type || 'comprehensive_research']
      );
      
      res.status(201).json({
        message: 'Draft saved successfully',
        submission: result.rows[0]
      });
    }
  } catch (error) {
    next(error);
  }
});

// Get all submissions
router.get('/', async (req, res, next) => {
  try {
    const { status, studentId, projectId } = req.query;
    
    let sql = 'SELECT * FROM data_submissions WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (status) {
      sql += ` AND status = $${paramIndex++}`;
      params.push(status);
    }

    if (studentId) {
      sql += ` AND student_id = $${paramIndex++}`;
      params.push(studentId);
    }

    if (projectId) {
      sql += ` AND project_id = $${paramIndex++}`;
      params.push(projectId);
    }

    // If user is student, only show their own submissions
    if (req.user.role === 'student') {
      sql += ` AND student_id = $${paramIndex++}`;
      params.push(req.user.id);
    }

    sql += ' ORDER BY submitted_at DESC';

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// Get student submissions
router.get('/student/:studentId', async (req, res, next) => {
  try {
    const { studentId } = req.params;

    // Students can only see their own submissions
    if (req.user.role === 'student' && req.user.id !== studentId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const result = await query(
      'SELECT * FROM data_submissions WHERE student_id = $1 ORDER BY submitted_at DESC',
      [studentId]
    );

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// Get project submissions
router.get('/project/:projectId', async (req, res, next) => {
  try {
    const { projectId } = req.params;

    const result = await query(
      'SELECT * FROM data_submissions WHERE project_id = $1 ORDER BY submitted_at DESC',
      [projectId]
    );

    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// Get specific submission
router.get('/:submissionId', async (req, res, next) => {
  try {
    const { submissionId } = req.params;
    
    const result = await query(
      'SELECT * FROM data_submissions WHERE id = $1',
      [submissionId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Create submission
router.post('/', async (req, res, next) => {
  try {
    const {
      student_id,
      project_id,
      data_content,
      image_urls,
      video_urls,
      file_urls,
      audio_urls
    } = req.body;

    if (!student_id || !data_content) {
      return res.status(400).json({ error: 'Student ID and data content required' });
    }

    const result = await query(
      `INSERT INTO data_submissions (
        student_id, project_id, data_content, 
        image_urls, video_urls, file_urls, audio_urls, 
        status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending')
      RETURNING *`,
      [
        student_id,
        project_id || null,
        JSON.stringify(data_content),
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

// Update submission
router.patch('/:submissionId', async (req, res, next) => {
  try {
    const { submissionId } = req.params;
    const {
      data_content,
      image_urls,
      video_urls,
      file_urls,
      audio_urls,
      status,
      quality_score,
      rejection_reason
    } = req.body;

    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (data_content !== undefined) {
      updates.push(`data_content = $${paramIndex++}`);
      params.push(JSON.stringify(data_content));
    }
    if (image_urls !== undefined) {
      updates.push(`image_urls = $${paramIndex++}`);
      params.push(image_urls);
    }
    if (video_urls !== undefined) {
      updates.push(`video_urls = $${paramIndex++}`);
      params.push(video_urls);
    }
    if (file_urls !== undefined) {
      updates.push(`file_urls = $${paramIndex++}`);
      params.push(file_urls);
    }
    if (audio_urls !== undefined) {
      updates.push(`audio_urls = $${paramIndex++}`);
      params.push(audio_urls);
    }
    if (status !== undefined) {
      updates.push(`status = $${paramIndex++}`);
      params.push(status);
      if (status === 'approved' || status === 'rejected') {
        updates.push(`reviewed_by = $${paramIndex++}`);
        params.push(req.user.id);
        updates.push(`reviewed_at = NOW()`);
      }
    }
    if (quality_score !== undefined) {
      updates.push(`quality_score = $${paramIndex++}`);
      params.push(quality_score);
    }
    if (rejection_reason !== undefined) {
      updates.push(`rejection_reason = $${paramIndex++}`);
      params.push(rejection_reason);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(submissionId);
    const sql = `UPDATE data_submissions SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${paramIndex} RETURNING *`;

    const result = await query(sql, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Delete submission
router.delete('/:submissionId', async (req, res, next) => {
  try {
    const { submissionId } = req.params;

    // Check if user owns the submission or is admin
    const submissionResult = await query(
      'SELECT * FROM data_submissions WHERE id = $1',
      [submissionId]
    );

    if (submissionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    const submission = submissionResult.rows[0];

    if (submission.student_id !== req.user.id && !['super_admin', 'college_admin', 'professor'].includes(req.user.role)) {
      return res.status(403).json({ error: 'Not authorized to delete this submission' });
    }

    await query('DELETE FROM data_submissions WHERE id = $1', [submissionId]);

    res.json({ message: 'Submission deleted successfully' });
  } catch (error) {
    next(error);
  }
});

// Approve submission
router.patch('/:submissionId/approve', async (req, res, next) => {
  try {
    const { submissionId } = req.params;
    const { reviewedBy } = req.body;

    // Check if submission exists
    const submissionResult = await query(
      'SELECT * FROM data_submissions WHERE id = $1',
      [submissionId]
    );

    if (submissionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    const submission = submissionResult.rows[0];

    // Check if already reviewed
    if (submission.status !== 'pending') {
      return res.status(400).json({ error: 'Submission has already been reviewed' });
    }

    // Update submission status to approved
    const result = await query(
      `UPDATE data_submissions 
       SET status = 'approved', 
           reviewed_by = $1, 
           reviewed_at = NOW(),
           updated_at = NOW()
       WHERE id = $2 
       RETURNING *`,
      [reviewedBy || req.user.id, submissionId]
    );

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Reject submission
router.patch('/:submissionId/reject', async (req, res, next) => {
  try {
    const { submissionId } = req.params;
    const { reviewedBy, rejectionReason } = req.body;

    if (!rejectionReason || rejectionReason.trim().length === 0) {
      return res.status(400).json({ error: 'Rejection reason is required' });
    }

    // Check if submission exists
    const submissionResult = await query(
      'SELECT * FROM data_submissions WHERE id = $1',
      [submissionId]
    );

    if (submissionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    const submission = submissionResult.rows[0];

    // Check if already reviewed
    if (submission.status !== 'pending') {
      return res.status(400).json({ error: 'Submission has already been reviewed' });
    }

    // Update submission status to rejected
    const result = await query(
      `UPDATE data_submissions 
       SET status = 'rejected', 
           reviewed_by = $1, 
           reviewed_at = NOW(),
           rejection_reason = $2,
           updated_at = NOW()
       WHERE id = $3 
       RETURNING *`,
      [reviewedBy || req.user.id, rejectionReason.trim(), submissionId]
    );

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Get submission statistics
router.get('/stats/summary', async (req, res, next) => {
  try {
    const { studentId, projectId } = req.query;
    
    let sql = `
      SELECT 
        status,
        COUNT(*) as count
      FROM data_submissions
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (studentId) {
      sql += ` AND student_id = $${paramIndex++}`;
      params.push(studentId);
    }

    if (projectId) {
      sql += ` AND project_id = $${paramIndex++}`;
      params.push(projectId);
    }

    sql += ' GROUP BY status';

    const result = await query(sql, params);

    const stats = {
      pending: 0,
      approved: 0,
      rejected: 0,
      total: 0
    };

    result.rows.forEach(row => {
      stats[row.status] = parseInt(row.count);
      stats.total += parseInt(row.count);
    });

    res.json(stats);
  } catch (error) {
    next(error);
  }
});

module.exports = router;

