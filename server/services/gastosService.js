import {
  obtenerGastos,
  obtenerGastoPorId,
  obtenerCategoriasGastos,
  registrarGasto,
  actualizarGasto,
  cancelarGasto,
  obtenerResumenGastos
} from '../repositories/gastosRepository.js';
import pool from '../config/db.js';

import {
  registrarMovimientoCaja
} from '../repositories/gastosRepository.js';
function validarGasto(datos) {
  const {
    concepto,
    id_categoria,
    monto,
    forma_pago,
    fecha
  } = datos;

  if (!concepto || !concepto.trim()) {
    throw new Error('El concepto del gasto es obligatorio');
  }

  if (concepto.trim().length > 255) {
    throw new Error('El concepto no puede superar los 255 caracteres');
  }

  if (!id_categoria || !Number.isInteger(Number(id_categoria))) {
    throw new Error('Selecciona una categoría válida');
  }

  if (monto === undefined || monto === null || monto === '' ||
      !Number.isFinite(Number(monto)) || Number(monto) <= 0) {
    throw new Error('El monto debe ser mayor que cero');
  }

  const formasPermitidas = ['efectivo', 'tarjeta', 'transfer'];

  if (!formasPermitidas.includes(forma_pago)) {
    throw new Error('La forma de pago no es válida');
  }

  if (fecha && Number.isNaN(Date.parse(fecha))) {
    throw new Error('La fecha del gasto no es válida');
  }
}

export async function listarGastos(filtros) {
  return await obtenerGastos(filtros);
}

export async function consultarGasto(id) {
  const gasto = await obtenerGastoPorId(id);

  if (!gasto) {
    throw new Error('El gasto solicitado no existe');
  }

  return gasto;
}

export async function listarCategoriasGastos() {
  return await obtenerCategoriasGastos();
}

export async function crearGasto(datos, id_usuario) {
  validarGasto(datos);

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const gasto = await registrarGasto({
      ...datos,
      concepto: datos.concepto.trim(),
      id_usuario
    }, client);

    // Solo los gastos en efectivo afectan Caja
    if (datos.forma_pago === 'efectivo') {
      await registrarMovimientoCaja({
        fecha: gasto.fecha,
        tipo: 'salida',
        concepto: gasto.concepto,
        monto: gasto.monto,
        origen: 'gasto',
        id_referencia: gasto.id_gasto,
        id_usuario
      }, client);
    }

    await client.query('COMMIT');

    return gasto;

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;

  } finally {
    client.release();
  }
}

export async function modificarGasto(id, datos) {
  validarGasto(datos);

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const gastoAnterior = await obtenerGastoPorId(id, client, true);

    if (!gastoAnterior || gastoAnterior.estatus !== 'activo') {
      throw new Error('No se encontró el gasto o ya está cancelado');
    }

    const gastoActualizado = await actualizarGasto(id, {
      ...datos,
      concepto: datos.concepto.trim()
    }, client);

    if (!gastoActualizado) {
      throw new Error('No se pudo actualizar el gasto');
    }

    // Revertir el movimiento anterior si fue pagado en efectivo
    if (gastoAnterior.forma_pago === 'efectivo') {
      await registrarMovimientoCaja({
        fecha: new Date(),
        tipo: 'entrada',
        concepto: `Reversión de gasto: ${gastoAnterior.concepto}`,
        monto: gastoAnterior.monto,
        origen: 'gasto',
        id_referencia: gastoAnterior.id_gasto,
        id_usuario: gastoAnterior.id_usuario
      }, client);
    }

    // Registrar la nueva salida si el gasto actualizado es en efectivo
    if (gastoActualizado.forma_pago === 'efectivo') {
      await registrarMovimientoCaja({
        fecha: new Date(),
        tipo: 'salida',
        concepto: gastoActualizado.concepto,
        monto: gastoActualizado.monto,
        origen: 'gasto',
        id_referencia: gastoActualizado.id_gasto,
        id_usuario: gastoActualizado.id_usuario
      }, client);
    }

    await client.query('COMMIT');

    return gastoActualizado;

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;

  } finally {
    client.release();
  }
}

export async function darDeBajaGasto(id) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const gastoAnterior = await obtenerGastoPorId(id, client, true);

    if (!gastoAnterior || gastoAnterior.estatus !== 'activo') {
      throw new Error('No se encontró el gasto o ya está cancelado');
    }

    const gastoCancelado = await cancelarGasto(id, client);

    if (!gastoCancelado) {
      throw new Error('No se pudo cancelar el gasto');
    }

    // Devolver el dinero a Caja si el gasto fue en efectivo
    if (gastoAnterior.forma_pago === 'efectivo') {
      await registrarMovimientoCaja({
        fecha: new Date(),
        tipo: 'entrada',
        concepto: `Reversión por cancelación de gasto: ${gastoAnterior.concepto}`,
        monto: gastoAnterior.monto,
        origen: 'gasto',
        id_referencia: gastoAnterior.id_gasto,
        id_usuario: gastoAnterior.id_usuario
      }, client);
    }

    await client.query('COMMIT');

    return gastoCancelado;

  } catch (error) {
    await client.query('ROLLBACK');
    throw error;

  } finally {
    client.release();
  }
}

export async function consultarResumenGastos() {
  return await obtenerResumenGastos();
}