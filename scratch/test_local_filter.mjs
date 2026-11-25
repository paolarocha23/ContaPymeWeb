import pool from '../server/config/db.js';

async function testLocalFilter() {
  const q = `
    SELECT id_venta, codigo,
           TO_CHAR(fecha - INTERVAL '6 hours', 'YYYY-MM-DD HH24:MI:SS') as fecha_local
    FROM ventas v
    WHERE (v.fecha - INTERVAL '6 hours')::date >= '2026-11-25'::date
      AND (v.fecha - INTERVAL '6 hours')::date <= '2026-11-25'::date
    ORDER BY id_venta DESC
  `;
  const { rows } = await pool.query(q);
  console.log('Today sales in local time:', rows);
  await pool.end();
}

testLocalFilter();
