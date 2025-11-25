const express = require('express');
const { query } = require('../config/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const router = express.Router();

// Add authentication middleware to all routes
router.use(authenticateToken);
router.use(requireRole(['super_admin']));

// Simple HTML page to view database
router.get('/', async (req, res) => {
  try {
    // Get all tables
    const tables = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    let html = `
<!DOCTYPE html>
<html>
<head>
  <title>AgriModel Database Viewer</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: 'Segoe UI', Arial, sans-serif; 
      background: #f5f7fa;
      padding: 20px;
    }
    .container { max-width: 1400px; margin: 0 auto; }
    h1 { 
      color: #2c3e50; 
      margin-bottom: 30px;
      padding: 20px;
      background: white;
      border-radius: 10px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }
    .tables-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
    .table-card {
      background: white;
      padding: 20px;
      border-radius: 10px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      cursor: pointer;
      transition: transform 0.2s;
    }
    .table-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 5px 20px rgba(0,0,0,0.15);
    }
    .table-name {
      font-size: 18px;
      font-weight: bold;
      color: #3498db;
      margin-bottom: 10px;
    }
    .row-count {
      color: #7f8c8d;
      font-size: 14px;
    }
    .data-section {
      background: white;
      padding: 20px;
      border-radius: 10px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      margin-top: 20px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 15px;
    }
    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #ecf0f1;
    }
    th {
      background: #3498db;
      color: white;
      font-weight: bold;
    }
    tr:hover { background: #f8f9fa; }
    .badge {
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: bold;
    }
    .badge-approved { background: #2ecc71; color: white; }
    .badge-pending { background: #f39c12; color: white; }
    .badge-rejected { background: #e74c3c; color: white; }
    .refresh-btn {
      background: #3498db;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 5px;
      cursor: pointer;
      font-size: 14px;
      margin-left: 20px;
    }
    .refresh-btn:hover { background: #2980b9; }
  </style>
</head>
<body>
  <div class="container">
    <h1>🗄️ AgriModel Database Viewer 
      <button class="refresh-btn" onclick="location.reload()">🔄 Refresh</button>
    </h1>
    
    <div class="tables-grid">
`;

    // Add table cards
    for (const table of tables.rows) {
      const tableName = table.table_name;
      const countResult = await query(`SELECT COUNT(*) FROM ${tableName}`);
      const count = countResult.rows[0].count;
      
      html += `
      <div class="table-card" onclick="location.href='/admin-panel/table/${tableName}'">
        <div class="table-name">📋 ${tableName}</div>
        <div class="row-count">${count} rows</div>
      </div>
      `;
    }

    html += `
    </div>
    
    <div class="data-section">
      <h2>👤 Recent Users</h2>
      <table>
        <tr>
          <th>Name</th>
          <th>Email</th>
          <th>Role</th>
          <th>Status</th>
          <th>Created</th>
        </tr>
    `;

    // Show users
    const users = await query('SELECT * FROM users ORDER BY created_at DESC LIMIT 10');
    for (const user of users.rows) {
      const statusClass = user.status === 'approved' ? 'badge-approved' : 
                         user.status === 'pending' ? 'badge-pending' : 'badge-rejected';
      html += `
        <tr>
          <td>${user.name}</td>
          <td>${user.email}</td>
          <td>${user.role}</td>
          <td><span class="badge ${statusClass}">${user.status}</span></td>
          <td>${new Date(user.created_at).toLocaleString()}</td>
        </tr>
      `;
    }

    html += `
      </table>
    </div>
  </div>
</body>
</html>
    `;

    res.send(html);
  } catch (error) {
    res.status(500).send(`Error: ${error.message}`);
  }
});

// View specific table
router.get('/table/:tableName', async (req, res) => {
  try {
    const { tableName } = req.params;
    
    const data = await query(`SELECT * FROM ${tableName} ORDER BY created_at DESC LIMIT 100`);
    
    let html = `
<!DOCTYPE html>
<html>
<head>
  <title>${tableName} - AgriModel Database</title>
  <style>
    body { font-family: Arial; padding: 20px; background: #f5f7fa; }
    .container { max-width: 1400px; margin: 0 auto; background: white; padding: 20px; border-radius: 10px; }
    h1 { color: #2c3e50; margin-bottom: 20px; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
    th, td { padding: 12px; text-align: left; border: 1px solid #ddd; }
    th { background: #3498db; color: white; }
    tr:hover { background: #f8f9fa; }
    .back-btn { 
      background: #95a5a6; 
      color: white; 
      padding: 10px 20px; 
      text-decoration: none; 
      border-radius: 5px;
      display: inline-block;
      margin-bottom: 20px;
    }
    pre { background: #ecf0f1; padding: 10px; border-radius: 5px; overflow-x: auto; }
  </style>
</head>
<body>
  <div class="container">
    <a href="/admin-panel" class="back-btn">← Back</a>
    <h1>📋 ${tableName.toUpperCase()} (${data.rows.length} rows)</h1>
    `;

    if (data.rows.length === 0) {
      html += '<p>No data in this table</p>';
    } else {
      html += '<table><tr>';
      
      // Headers
      Object.keys(data.rows[0]).forEach(key => {
        html += `<th>${key}</th>`;
      });
      html += '</tr>';
      
      // Rows
      data.rows.forEach(row => {
        html += '<tr>';
        Object.values(row).forEach(value => {
          let displayValue = value;
          if (typeof value === 'object' && value !== null) {
            displayValue = JSON.stringify(value, null, 2);
          } else if (value === null) {
            displayValue = '<i>NULL</i>';
          } else if (typeof value === 'string' && value.length > 50) {
            displayValue = value.substring(0, 50) + '...';
          }
          html += `<td>${displayValue}</td>`;
        });
        html += '</tr>';
      });
      
      html += '</table>';
    }

    html += `
  </div>
</body>
</html>
    `;

    res.send(html);
  } catch (error) {
    res.status(500).send(`Error: ${error.message}`);
  }
});

module.exports = router;

