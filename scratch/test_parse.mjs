import pool from '../server/config/db.js';

async function testParse() {
  const { rows } = await pool.query("SELECT fecha FROM ventas WHERE id_venta = 9");
  console.log('Row raw fecha:', rows[0].fecha);
  console.log('Type of fecha:', typeof rows[0].fecha);
  console.log('ISO string:', rows[0].fecha instanceof Date ? rows[0].fecha.toISOString() : rows[0].fecha);
  console.log('Local string:', rows[0].fecha instanceof Date ? rows[0].fecha.toString() : rows[0].fecha);
  await pool.end();
}

testParse();
