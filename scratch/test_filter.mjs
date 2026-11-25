import pool from '../server/config/db.js';

async function testFilter() {
  const q = `
    SELECT id_venta, codigo, fecha,
           v.fecha::date as raw_date,
           (v.fecha AT TIME ZONE 'UTC' AT TIME ZONE 'America/Mexico_City')::date as tz_date
    FROM ventas v
    ORDER BY id_venta DESC
    LIMIT 5
  `;
  const { rows } = await pool.query(q);
  console.log(rows);
}

testFilter().then(() => pool.end());
