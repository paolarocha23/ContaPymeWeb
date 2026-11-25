import pool from '../server/config/db.js';

async function testOffset() {
  const { rows } = await pool.query(`
    SELECT id_venta, codigo, fecha,
           (fecha - INTERVAL '6 hours')::date as local_date,
           TO_CHAR(fecha - INTERVAL '6 hours', 'YYYY-MM-DD HH24:MI:SS') as local_str
    FROM ventas
    ORDER BY id_venta DESC
    LIMIT 10
  `);
  console.log(rows);
  await pool.end();
}

testOffset();
