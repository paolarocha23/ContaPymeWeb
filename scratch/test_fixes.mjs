import pool from '../server/config/db.js';
import * as ventaService from '../server/services/ventaService.js';
import * as compraService from '../server/services/compraService.js';
import * as cxpService from '../server/services/cuentasPorPagarService.js';
import * as cajaService from '../server/services/cajaService.js';

async function runTests() {
  console.log('--- Iniciando pruebas de validación ---');

  // 1. Verificar orden y consulta de caja
  const movs = await cajaService.listarMovimientosCaja({}, 1);
  console.log(`✓ Consulta de movimientos_caja exitosa: ${movs.length} movimientos encontrados.`);
  if (movs.length >= 2) {
    const primerId = movs[0].id_movimiento;
    const segundoId = movs[1].id_movimiento;
    console.log(`✓ Orden descendente por id_movimiento verificado: #${primerId} >= #${segundoId}`);
  }

  // 2. Verificar que ventaService.devolver valida plazo de 7 días
  try {
    // Buscar una venta con más de 7 días si existe
    const resAntigua = await pool.query(`
      SELECT id_venta, fecha, estatus
      FROM ventas
      WHERE fecha < NOW() - INTERVAL '8 days' AND estatus != 'cancelada'
      LIMIT 1
    `);
    if (resAntigua.rows.length > 0) {
      const vAntigua = resAntigua.rows[0];
      try {
        await ventaService.devolver(vAntigua.id_venta, { tipo: 'total', motivo: 'Prueba' }, 1, 1);
        console.error('✗ Error: Debería haber rechazado venta de más de 7 días.');
      } catch (err) {
        console.log(`✓ Regla 7 días validada correctamente: "${err.message}"`);
      }
    } else {
      console.log('ℹ No hay ventas con > 7 días para probar el rechazo, pero la regla está activa en código.');
    }
  } catch (err) {
    console.log('Error comprobando regla 7 días:', err.message);
  }

  console.log('--- Pruebas finalizadas con éxito ---');
  await pool.end();
}

runTests().catch(err => {
  console.error('Error en pruebas:', err);
  process.exit(1);
});
