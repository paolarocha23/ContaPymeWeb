import * as reportesService from '../server/services/reportesService.js';
import pool from '../server/config/db.js';

async function testReports() {
  const f = { fecha_inicio: '2026-11-01', fecha_fin: '2026-11-30' };
  console.log('Testing reportes with real functions...');

  const resumen = await reportesService.obtenerResumenGeneralReportes(f, 1);
  console.log('✓ resumenGeneral ok, keys:', Object.keys(resumen));

  const ventas = await reportesService.obtenerReporteDetalleVentas(f, 1);
  console.log('✓ detalleVentas ok, count:', ventas.length);

  const compras = await reportesService.obtenerReporteDetalleCompras(f, 1);
  console.log('✓ detalleCompras ok, count:', compras.length);

  const inventario = await reportesService.obtenerReporteDetalleInventario(1);
  console.log('✓ detalleInventario ok, count:', inventario.length);

  const movInv = await reportesService.obtenerReporteDetalleMovimientosInventario(f, 1);
  console.log('✓ movimientosInventario ok, count:', movInv.length);

  const ingresos = await reportesService.obtenerReporteDetalleIngresos(f, 1);
  console.log('✓ detalleIngresos ok, count:', ingresos.length);

  const gastos = await reportesService.obtenerReporteDetalleGastos(f, 1);
  console.log('✓ detalleGastos ok, count:', gastos.length);

  const cxc = await reportesService.obtenerReporteDetalleCuentasPorCobrar(1);
  console.log('✓ detalleCuentasPorCobrar ok, count:', cxc.length);

  const cxp = await reportesService.obtenerReporteDetalleCuentasPorPagar(1);
  console.log('✓ detalleCuentasPorPagar ok, count:', cxp.length);

  await pool.end();
}

testReports().catch(err => {
  console.error('Error testing reports:', err);
  process.exit(1);
});
