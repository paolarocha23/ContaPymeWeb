import pool from '../server/config/db.js';

async function checkColumns() {
  const { rows } = await pool.query(
    "SELECT table_name, column_name, data_type FROM information_schema.columns WHERE column_name IN ('fecha', 'fecha_emision', 'created_at') AND table_schema = 'public' ORDER BY table_name"
  );
  console.log(JSON.stringify(rows, null, 2));

  // Check current db timezone and current_timestamp
  const timeRes = await pool.query("SELECT CURRENT_TIMESTAMP, NOW(), timezone('America/Mexico_City', NOW()) as mexico_time");
  console.log('Time test:', timeRes.rows[0]);
  await pool.end();
}

checkColumns();
