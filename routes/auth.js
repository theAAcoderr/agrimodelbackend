const express = require('express');
const bcrypt = require('bcryptjs');
const { generateToken } = require('../config/jwt');
const { query, transaction } = require('../config/database');
const { body, validationResult } = require('express-validator');
const router = express.Router();

// Validation rules
const registerValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
  body('name').trim().isLength({ min: 2 }),
  body('role').isIn(['super_admin', 'college_admin', 'professor', 'student', 'data_scientist']),
];

// College admin specific validation (no role field required)
const collegeAdminValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }),
  body('name').trim().isLength({ min: 2 }),
  body('collegeName').trim().isLength({ min: 2 }),
  body('collegeAddress').trim().isLength({ min: 2 }).withMessage('College address must be at least 2 characters'),
];

// Login
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Get user
    const result = await query(
      'SELECT * FROM users WHERE LOWER(email) = LOWER($1)',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Check if user is active
    if (!user.is_active) {
      return res.status(403).json({ error: 'Account is inactive' });
    }

    // Update last login
    await query(
      'UPDATE users SET last_login = NOW() WHERE id = $1',
      [user.id]
    );

    // Generate token
    const token = generateToken({ userId: user.id, role: user.role });

    // Remove password from response
    delete user.password_hash;

    res.json({
      user,
      token,
      message: 'Login successful'
    });
  } catch (error) {
    next(error);
  }
});

// Register Super Admin (First time setup only)
router.post('/register/super-admin', registerValidation, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, name } = req.body;

    // Check if any super admin already exists
    const existingSuperAdmin = await query(
      "SELECT id FROM users WHERE role = 'super_admin'",
      []
    );

    // Allow multiple super admins for development
    // if (existingSuperAdmin.rows.length > 0) {
    //   return res.status(403).json({ 
    //     error: 'Super admin already exists',
    //     message: 'Only one super admin can be registered. Contact existing super admin.'
    //   });
    // }

    // Check if email exists
    const existingUser = await query(
      'SELECT id FROM users WHERE LOWER(email) = LOWER($1)',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create super admin
    const userResult = await query(
      `INSERT INTO users (user_id, name, email, password_hash, role, status, is_active)
       VALUES ($1, $2, $3, $4, 'super_admin', 'approved', true)
       RETURNING id, user_id, name, email, role, status, is_active, created_at`,
      [`super_admin_${Date.now()}`, name, email, passwordHash]
    );

    const user = userResult.rows[0];

    // Generate token for auto-login
    const token = generateToken({ userId: user.id, role: user.role });

    res.status(201).json({
      user,
      token,
      message: 'Super admin registration successful'
    });
  } catch (error) {
    next(error);
  }
});

// Register College Admin
router.post('/register/college-admin', async (req, res, next) => {
  try {
    console.log('Raw request body:', req.body);
    
    // Manual validation
    const { email, password, name, collegeName, collegeAddress, collegeLocation } = req.body;
    
    if (!email || !password || !name || !collegeName || !collegeAddress) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }
    
    console.log('College admin registration data:', {
      email,
      name,
      collegeName,
      collegeAddress,
      collegeLocation
    });

    await transaction(async (client) => {
      // Check if email exists
      const existingUser = await client.query(
        'SELECT id FROM users WHERE LOWER(email) = LOWER($1)',
        [email]
      );

      if (existingUser.rows.length > 0) {
        throw new Error('Email already registered');
      }

      // Hash password
      const passwordHash = await bcrypt.hash(password, 10);

      // Generate college code
      const collegeCode = `CLG${Date.now().toString().slice(-6)}`;
      
      // Create college
      const collegeResult = await client.query(
        `INSERT INTO colleges (name, college_code, address, location, status)
         VALUES ($1, $2, $3, $4, 'pending')
         RETURNING *`,
        [collegeName, collegeCode, collegeAddress, collegeLocation || null]
      );

      const college = collegeResult.rows[0];

      // Create user
      const userResult = await client.query(
        `INSERT INTO users (user_id, name, email, password_hash, role, college_id, status, is_active)
         VALUES ($1, $2, $3, $4, 'college_admin', $5, 'pending', true)
         RETURNING id, user_id, name, email, role, college_id, status, is_active, created_at`,
        [`college_admin_${Date.now()}`, name, email, passwordHash, college.id]
      );

      const user = userResult.rows[0];

      res.status(201).json({
        user,
        college,
        message: 'College admin registration successful. Awaiting super admin approval.'
      });
    });
  } catch (error) {
    console.error('College admin registration error:', error);
    next(error);
  }
});

// Register User (Professor/Student/Data Scientist)
router.post('/register', registerValidation, async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, name, role, collegeId, department } = req.body;

    // Validate role
    if (!['professor', 'student', 'data_scientist'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    // Check if college exists and is approved
    const collegeResult = await query(
      'SELECT * FROM colleges WHERE id = $1 AND status = $2',
      [collegeId, 'approved']
    );

    if (collegeResult.rows.length === 0) {
      return res.status(400).json({ error: 'College not found or not approved' });
    }

    // Check if email exists
    const existingUser = await query(
      'SELECT id FROM users WHERE LOWER(email) = LOWER($1)',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const userResult = await query(
      `INSERT INTO users (user_id, name, email, password_hash, role, college_id, department, status, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', true)
       RETURNING id, user_id, name, email, role, college_id, department, status, is_active, created_at`,
      [`${role}_${Date.now()}`, name, email, passwordHash, role, collegeId, department || null]
    );

    const user = userResult.rows[0];

    res.status(201).json({
      user,
      message: 'Registration successful. Awaiting admin approval.'
    });
  } catch (error) {
    next(error);
  }
});

// Get current user
router.get('/me', async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const { verifyToken } = require('../config/jwt');
    const decoded = verifyToken(token);

    const result = await query(
      'SELECT id, user_id, name, email, role, college_id, department, status, is_active, profile_image_url, phone_number, bio, created_at, updated_at FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Forgot password
router.post('/forgot-password', async (req, res, next) => {
  try {
    const { email } = req.body;

    const result = await query(
      'SELECT id, email FROM users WHERE LOWER(email) = LOWER($1)',
      [email]
    );

    if (result.rows.length === 0) {
      // Don't reveal if email exists
      return res.json({ message: 'If the email exists, a password reset link has been sent' });
    }

    const user = result.rows[0];
    const resetToken = generateToken({ userId: user.id, type: 'password_reset' });

    // TODO: Send email with reset link
    // For now, just return the token (in production, send via email)
    console.log(`Password reset token for ${email}: ${resetToken}`);

    res.json({ 
      message: 'If the email exists, a password reset link has been sent',
      // Remove this in production:
      resetToken: process.env.NODE_ENV === 'development' ? resetToken : undefined
    });
  } catch (error) {
    next(error);
  }
});

// Reset password
router.post('/reset-password', async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const decoded = verifyToken(token);
    
    if (decoded.type !== 'password_reset') {
      return res.status(400).json({ error: 'Invalid reset token' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [passwordHash, decoded.userId]
    );

    res.json({ message: 'Password reset successful' });
  } catch (error) {
    next(error);
  }
});

// Change password (for logged in users)
router.post('/change-password', async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const { verifyToken } = require('../config/jwt');
    const decoded = verifyToken(token);

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password required' });
    }

    // Get user
    const result = await query(
      'SELECT * FROM users WHERE id = $1',
      [decoded.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    // Verify current password
    const isValid = await bcrypt.compare(currentPassword, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 10);

    await query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [newPasswordHash, user.id]
    );

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

