import pool from '../server/config/db.js';

async function testFormat() {
  const { rows } = await pool.query(`
    SELECT
      TO_CHAR(timezone('America/Mexico_City', now()), 'YYYY-MM-DD HH24:MI:SS') as mexico_str,
      timezone('America/Mexico_City', now()) as mexico_dt
  `);
  console.log(rows[0]);
  await pool.end();
}

testFormat();
