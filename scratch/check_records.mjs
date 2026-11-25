import pool from '../server/config/db.js';

async function checkRecentRecords() {
  const v = await pool.query('SELECT id_venta, fecha, total FROM ventas ORDER BY id_venta DESC LIMIT 3');
  console.log('Ventas:', v.rows);

  const c = await pool.query('SELECT id_compra, fecha, total FROM compras ORDER BY id_compra DESC LIMIT 3');
  console.log('Compras:', c.rows);

  const m = await pool.query('SELECT id_movimiento, fecha, concepto FROM movimientos_caja ORDER BY id_movimiento DESC LIMIT 3');
  console.log('Caja:', m.rows);

  await pool.end();
}

checkRecentRecords();
