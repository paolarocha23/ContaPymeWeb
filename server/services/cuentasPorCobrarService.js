import pool from '../config/db.js';
import * as repo from '../repositories/cuentasPorCobrarRepository.js';
import * as ingresoService from './ingresoService.js';
import { AppError } from '../utils/http.js';

const FORMAS_PAGO = ['efectivo', 'tarjeta', 'transfer'];

export async function listarCuentas(filtros, empresaId = null) {
  return repo.obtenerCuentas(filtros, empresaId);
}

export async function obtenerCuenta(id) {
  const cuenta = await repo.obtenerCuentaPorId(id);

  if (!cuenta) {
    throw new AppError('La cuenta por cobrar no existe.', 404);
  }

  return cuenta;
}

export async function listarPagos(id) {
  const cuenta = await repo.obtenerCuentaPorId(id);

  if (!cuenta) {
    throw new AppError('La cuenta por cobrar no existe.', 404);
  }

  return repo.obtenerPagos(id);
}

export async function obtenerIndicadores(empresaId = null) {
  return repo.obtenerResumen(empresaId);
}

export async function registrarCobro(id, datos, idUsuario, empresaId = null) {
  const monto = Number(datos.monto);
  const formaPago = String(datos.forma_pago || '').toLowerCase();

  if (!Number.isInteger(Number(id)) || Number(id) <= 0) {
    throw new AppError('El identificador de la cuenta no es válido.', 400);
  }

  if (
    !Number.isFinite(monto) ||
    monto <= 0 ||
    Math.abs(monto * 100 - Math.round(monto * 100)) > 1e-7
  ) {
    throw new AppError(
      'El monto debe ser mayor a cero y tener máximo dos decimales.',
      400
    );
  }

  if (!FORMAS_PAGO.includes(formaPago)) {
    throw new AppError('La forma de pago no es válida.', 400);
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Bloquear la cuenta para evitar cobros simultáneos.
    const cuenta = await repo.bloquearCuenta(client, id);

    if (!cuenta) {
      throw new AppError('La cuenta por cobrar no existe.', 404);
    }

    const estatusActual = String(cuenta.estatus || '')
      .trim()
      .toLowerCase();

    const saldoActual = Number(cuenta.saldo_pendiente);

    if (
      ['cancelada', 'saldada', 'pagada'].includes(estatusActual) ||
      saldoActual <= 0
    ) {
      throw new AppError(
        'Esta cuenta ya está saldada o cancelada.',
        409
      );
    }

    if (monto > saldoActual + 0.000001) {
      throw new AppError(
        'El monto del cobro no puede superar el saldo pendiente.',
        400
      );
    }

    const nuevoSaldo = Math.max(
      0,
      Number((saldoActual - monto).toFixed(2))
    );

    const nuevoEstatus = nuevoSaldo <= 0
      ? 'saldada'
      : 'parcial';

    // 1. Registrar el cobro.
    const cobro = await repo.insertarCobro(client, {
      id_cxc: id,
      monto,
      forma_pago: formaPago,
      id_usuario: idUsuario,
      observaciones: datos.observaciones,
      empresa_id: empresaId
    });

    // 2. Actualizar el saldo de la cuenta.
    await repo.actualizarSaldo(
      client,
      id,
      nuevoSaldo,
      nuevoEstatus
    );

    // 3. Actualizar el monto pagado de la venta.
    await repo.actualizarVenta(
      client,
      cuenta.id_venta,
      monto
    );

    // 4. Obtener la categoría de cobros.
    const idCategoria = await repo.obtenerCategoriaCobros(client, empresaId);

    if (!idCategoria) {
      throw new AppError(
        'No se encontró la categoría activa "Cobros de clientes".',
        400
      );
    }

    // 5. Registrar el ingreso mediante el servicio centralizado.
    // Este servicio también registra la entrada de Caja
    // cuando la forma de pago es efectivo.
    const concepto = `Cobro de cuenta #${id} - Venta ${cuenta.codigo_venta}`;

    const idIngreso = await ingresoService.registrarAutomatico(
      client,
      {
        concepto,
        id_categoria: idCategoria,
        monto,
        forma_pago: formaPago,
        origen: 'cobro',
        id_cobro: cobro.id_cobro,
        id_usuario: idUsuario,
        empresa_id: empresaId
      }
    );

    await client.query('COMMIT');

    return {
      cobro,
      id_ingreso: idIngreso,
      saldo_pendiente: nuevoSaldo,
      estatus: nuevoEstatus
    };

  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (rollbackError) {
      console.error('Error al revertir el cobro:', rollbackError);
    }

    throw error;

  } finally {
    client.release();
  }
}
