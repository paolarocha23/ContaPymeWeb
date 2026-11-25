import pool from '../server/config/db.js';

async function fixIngresoCat() {
  const res = await pool.query(`
    UPDATE ingresos
    SET id_categoria = 8
    WHERE id_ingreso = 12 AND id_venta = 8
    RETURNING id_ingreso, id_categoria, concepto
  `);
  console.log('Updated ingreso category:', res.rows);
  await pool.end();
}

fixIngresoCat();
