import pool from './server/config/db.js';

// Fix: Allow NULL for stock and stock_minimo (services don't use inventory)
await pool.query('ALTER TABLE productos ALTER COLUMN stock DROP NOT NULL');
await pool.query('ALTER TABLE productos ALTER COLUMN stock_minimo DROP NOT NULL');

console.log('OK: stock y stock_minimo ahora permiten NULL');

// Verify
const { rows } = await pool.query("SELECT column_name, is_nullable FROM information_schema.columns WHERE table_name = 'productos' AND column_name IN ('stock', 'stock_minimo')");
rows.forEach(r => console.log('  ' + r.column_name + ' nullable=' + r.is_nullable));

// Test inserting a service
const result = await pool.query(`
  INSERT INTO productos (codigo, nombre, descripcion, tipo, id_categoria, unidad_medida, precio_compra, precio_venta, stock, stock_minimo, estatus)
  VALUES ('TEST-SRV-999', 'Test Servicio', 'desc', 'servicio', 1, 'Servicio', 100, 200, NULL, NULL, 1)
  RETURNING id_producto
`);
console.log('Test insert servicio OK, id =', result.rows[0].id_producto);
await pool.query('DELETE FROM productos WHERE id_producto = $1', [result.rows[0].id_producto]);
console.log('Cleanup OK');

await pool.end();

