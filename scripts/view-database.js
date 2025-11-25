const { query } = require('../config/database');

async function viewDatabase() {
  console.log('🗄️  AgriModel Database Viewer\n');
  console.log('════════════════════════════════════════════════════════\n');

  try {
    // Get all tables
    const tables = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    console.log(`📊 Database has ${tables.rows.length} tables\n`);

    // Show data from each table
    for (const table of tables.rows) {
      const tableName = table.table_name;
      
      // Get row count
      const countResult = await query(`SELECT COUNT(*) FROM ${tableName}`);
      const count = countResult.rows[0].count;
      
      console.log(`\n📋 Table: ${tableName.toUpperCase()}`);
      console.log(`   Rows: ${count}`);
      
      if (parseInt(count) > 0) {
        // Get first 5 rows
        const data = await query(`SELECT * FROM ${tableName} LIMIT 5`);
        
        if (data.rows.length > 0) {
          console.log('   Sample data:');
          data.rows.forEach((row, i) => {
            console.log(`   ${i + 1}.`, JSON.stringify(row, null, 2).substring(0, 200) + '...');
          });
        }
      } else {
        console.log('   (Empty table)');
      }
      
      console.log('   ────────────────────────────────────────');
    }

    console.log('\n════════════════════════════════════════════════════════');
    console.log('✅ Database viewing complete!\n');

    // Show specific important data
    console.log('👥 USERS:');
    const users = await query('SELECT id, name, email, role, status FROM users');
    users.rows.forEach((user, i) => {
      console.log(`   ${i + 1}. ${user.name} (${user.email})`);
      console.log(`      Role: ${user.role}, Status: ${user.status}`);
    });

    console.log('\n🏛️  COLLEGES:');
    const colleges = await query('SELECT id, name, college_code, status FROM colleges');
    if (colleges.rows.length > 0) {
      colleges.rows.forEach((college, i) => {
        console.log(`   ${i + 1}. ${college.name} (${college.college_code})`);
        console.log(`      Status: ${college.status}`);
      });
    } else {
      console.log('   No colleges yet');
    }

    console.log('\n📊 PROJECTS:');
    const projects = await query('SELECT id, name, type, status FROM projects LIMIT 5');
    if (projects.rows.length > 0) {
      projects.rows.forEach((project, i) => {
        console.log(`   ${i + 1}. ${project.name}`);
        console.log(`      Type: ${project.type}, Status: ${project.status}`);
      });
    } else {
      console.log('   No projects yet');
    }

    console.log('\n════════════════════════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    process.exit(0);
  }
}

viewDatabase();

