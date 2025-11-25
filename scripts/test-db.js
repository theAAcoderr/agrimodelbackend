const { testConnection, query } = require('../config/database');

async function testDatabase() {
  console.log('🧪 Testing Database Connection and Schema...\n');

  // Test connection
  const connected = await testConnection();
  if (!connected) {
    console.error('❌ Database connection failed!');
    process.exit(1);
  }

  console.log('\n📊 Checking database tables...\n');

  try {
    // Get all tables
    const tables = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    if (tables.rows.length === 0) {
      console.log('⚠️  No tables found. Run: npm run migrate\n');
    } else {
      console.log(`✅ Found ${tables.rows.length} tables:`);
      tables.rows.forEach((row, i) => {
        console.log(`   ${i + 1}. ${row.table_name}`);
      });
      console.log('');
    }

    // Test each table with row count
    console.log('📈 Table Statistics:\n');
    for (const table of tables.rows) {
      const countResult = await query(`SELECT COUNT(*) FROM ${table.table_name}`);
      const count = countResult.rows[0].count;
      console.log(`   ${table.table_name}: ${count} rows`);
    }

    console.log('\n✅ Database is healthy and ready!\n');

  } catch (error) {
    console.error('❌ Error testing database:', error.message);
  } finally {
    process.exit(0);
  }
}

testDatabase();

