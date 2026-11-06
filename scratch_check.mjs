import pool from './server/config/db.js';

try {
  // Test 1: Check asociados query
  const { rows } = await pool.query(`
    SELECT c.id_categoria, c.nombre,
      COALESCE((SELECT COUNT(*)::int FROM productos pr WHERE pr.id_categoria = c.id_categoria), 0) AS asociados
    FROM categorias c ORDER BY c.id_categoria ASC
  `);
  console.log('=== CATEGORIAS CON ASOCIADOS ===');
  rows.forEach(r => console.log(`  ${r.id_categoria}: ${r.nombre} => asociados: ${r.asociados}`));

  // Test 2: Check productos
  const { rows: prods } = await pool.query('SELECT id_producto, nombre, tipo, id_categoria FROM productos ORDER BY id_producto');
  console.log('\n=== PRODUCTOS ===');
  prods.forEach(p => console.log(`  ${p.id_producto}: ${p.nombre} (tipo: ${p.tipo}, cat: ${p.id_categoria})`));

  // Test 3: Check distinct types
  const { rows: tipos } = await pool.query('SELECT DISTINCT tipo FROM productos');
  console.log('\n=== TIPOS DISTINTOS ===');
  tipos.forEach(t => console.log(`  '${t.tipo}'`));

  // Test 4: Try inserting a service to see what fails
  console.log('\n=== TEST INSERT SERVICE ===');
  try {
    const result = await pool.query(`
      INSERT INTO productos (codigo, nombre, descripcion, tipo, id_categoria, unidad_medida, precio_compra, precio_venta, stock, stock_minimo, estatus)
      VALUES ('TEST-SRV-999', 'Test Servicio', 'desc', 'servicio', 1, 'Servicio', 100, 200, NULL, NULL, 1)
      RETURNING id_producto
    `);
    console.log('  Insert OK, id =', result.rows[0].id_producto);
    // Clean up
    await pool.query('DELETE FROM productos WHERE id_producto = $1', [result.rows[0].id_producto]);
    console.log('  Cleanup done');
  } catch (e) {
    console.error('  INSERT ERROR:', e.message);
  }

  await pool.end();
} catch (e) {
  console.error('ERROR:', e.message);
  console.error(e.stack);
  await pool.end();
}

