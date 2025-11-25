const bcrypt = require('bcryptjs');
const { query } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

async function createSuperAdmin() {
  try {
    console.log('🔐 Creating Super Admin user...\n');

    const email = 'admin@agrimodel.com';
    const password = 'Admin@123'; // Change this!
    const name = 'Super Admin';

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);
    const userId = `super_admin_${Date.now()}`;

    // Check if super admin already exists
    const existing = await query(
      "SELECT id FROM users WHERE email = $1 OR role = 'super_admin'",
      [email]
    );

    if (existing.rows.length > 0) {
      console.log('⚠️  Super Admin already exists!');
      console.log('   Email:', email);
      console.log('   Use forgot password to reset if needed.\n');
      return;
    }

    // Create super admin
    const result = await query(
      `INSERT INTO users (
        id, user_id, name, email, password_hash, role, status, is_active
      )
      VALUES ($1, $2, $3, $4, $5, 'super_admin', 'approved', true)
      RETURNING id, user_id, name, email, role, status`,
      [uuidv4(), userId, name, email, passwordHash]
    );

    const user = result.rows[0];

    console.log('✅ Super Admin created successfully!\n');
    console.log('📧 Email:', email);
    console.log('🔑 Password:', password);
    console.log('👤 User ID:', user.id);
    console.log('🎭 Role:', user.role);
    console.log('📊 Status:', user.status);
    console.log('\n⚠️  IMPORTANT: Change the password after first login!\n');

  } catch (error) {
    console.error('❌ Error creating super admin:', error.message);
    console.error(error);
  } finally {
    process.exit(0);
  }
}

createSuperAdmin();

