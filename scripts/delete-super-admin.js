const { query } = require('../config/database');

async function deleteSuperAdmin() {
  try {
    console.log('🗑️  Deleting existing super admin...');
    
    // Check if super admin exists
    const existingSuperAdmin = await query(
      "SELECT id, name, email FROM users WHERE role = 'super_admin'",
      []
    );

    if (existingSuperAdmin.rows.length === 0) {
      console.log('✅ No super admin found to delete');
      return;
    }

    const superAdmin = existingSuperAdmin.rows[0];
    console.log(`📋 Found super admin: ${superAdmin.name} (${superAdmin.email})`);

    // Delete the super admin
    await query(
      "DELETE FROM users WHERE role = 'super_admin'",
      []
    );

    console.log('✅ Super admin deleted successfully!');
    console.log('🎉 You can now register a new super admin from Flutter app');
    
  } catch (error) {
    console.error('❌ Error deleting super admin:', error);
  } finally {
    process.exit(0);
  }
}

deleteSuperAdmin();
