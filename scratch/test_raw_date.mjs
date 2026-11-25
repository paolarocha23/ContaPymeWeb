import pool from '../server/config/db.js';

async function testRawDate() {
  const { rows } = await pool.query(`
    SELECT id_venta, codigo, fecha, fecha::date as f_date
    FROM ventas
    WHERE fecha::date = '2026-11-25'::date
    ORDER BY id_venta DESC
  `);
  console.log('Matches with fecha::date = 2026-11-25:', rows.length, rows.map(r => r.codigo));
  await pool.end();
}

testRawDate();
