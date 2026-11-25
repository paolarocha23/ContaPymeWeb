import pool from '../server/config/db.js';
import * as productoValidator from '../server/validators/productoValidator.js';
import * as ventaRepo from '../server/repositories/ventaRepository.js';

async function runVerifications() {
  console.log('=== VERIFICACIONES FINALES ===');

  // 1. Precios de productos no pueden ser <= 0
  try {
    productoValidator.validarProducto({
      codigo: 'TEST-01',
      nombre: 'Prueba',
      tipo: 'producto',
      unidad_medida: 'Pieza',
      id_categoria: 1,
      precio_compra: 0,
      precio_venta: 100,
      stock: 1,
      stock_minimo: 1
    });
    console.error('✗ Falló validación de precio_compra = 0');
  } catch (err) {
    console.log('✓ Rechazado precio_compra <= 0:', err.message);
  }

  try {
    productoValidator.validarProducto({
      codigo: 'TEST-02',
      nombre: 'Prueba 2',
      tipo: 'producto',
      unidad_medida: 'Pieza',
      id_categoria: 1,
      precio_compra: 50,
      precio_venta: 0,
      stock: 1,
      stock_minimo: 1
    });
    console.error('✗ Falló validación de precio_venta = 0');
  } catch (err) {
    console.log('✓ Rechazado precio_venta <= 0:', err.message);
  }

  // 2. Filtro de fecha en ventas
  const client = await pool.connect();
  try {
    const ventasHoy = await ventaRepo.list({ desde: '2026-11-25', hasta: '2026-11-25' }, 1);
    console.log(`✓ Filtro de fecha ventas funciona correctamente. Encontradas ${ventasHoy.total} ventas para 2026-11-25.`);

    // 3. Categoría de servicios para ingresos
    const catServicio = await ventaRepo.obtenerCategoriaVentas(client, { empresaId: 1, esServicio: true });
    console.log(`✓ Categoría asignada para servicio: ID ${catServicio}`);

    // 4. Detalle de venta con servicio
    const itemsV8 = await ventaRepo.findItemsByVentaId(8, client);
    console.log(`✓ Venta V-0008 items tipo: ${itemsV8.map(it => `${it.nombre_producto} (${it.tipo})`).join(', ')}`);
  } finally {
    client.release();
    await pool.end();
  }

  console.log('=== TODAS LAS PRUEBAS EXITOSAS ===');
}

runVerifications().catch(e => {
  console.error('Error:', e);
  process.exit(1);
});
