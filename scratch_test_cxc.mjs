import { registrarCobro } from './server/services/cuentasPorCobrarService.js';

async function testCobro() {
  try {
    const res = await registrarCobro(2, { monto: 10, forma_pago: 'efectivo', observaciones: 'Prueba' }, 1, 1);
    console.log('SUCCESS:', res);
  } catch (err) {
    console.error('ERROR EN REGISTRAR COBRO:', err);
  }
  process.exit(0);
}

testCobro();
