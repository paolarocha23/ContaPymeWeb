import pool from '../server/config/db.js';

async function testTz() {
  const client = await pool.connect();
  try {
    await client.query("SET timezone = 'America/Mexico_City'");
    const res = await client.query("SELECT CURRENT_TIMESTAMP as ct, LOCALTIMESTAMP as lt, NOW() as now");
    console.log('With Mexico_City TZ:');
    console.log('CURRENT_TIMESTAMP:', res.rows[0].ct);
    console.log('LOCALTIMESTAMP:', res.rows[0].lt);
    console.log('NOW:', res.rows[0].now);
  } finally {
    client.release();
    await pool.end();
  }
}

testTz();
