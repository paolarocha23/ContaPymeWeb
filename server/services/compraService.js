import * as repo from '../repositories/compraRepository.js';
import * as inventarioRepo from '../repositories/inventarioRepository.js';
import * as gastosRepo from '../repositories/gastosRepository.js';
import { AppError } from '../utils/http.js';
import { parseId, validarFiltros, validarCompra } from '../validators/compraValidator.js';

export async function listar(query = {}, empresaId = null) {
  const filtros = validarFiltros(query);
  return await repo.list(filtros, empresaId);
}

export async function estadisticas(empresaId = null) {
  return await repo.stats(empresaId);
}

export async function obtener(idParam, empresaId = null) {
  const id = parseId(idParam);
  const compra = await repo.findById(id, empresaId);

  if (!compra) {
    throw new AppError('La compra solicitada no existe.', 404);
  }

  const items = await repo.findItemsByCompraId(id, empresaId);

  return {
    ...compra,
    items
  };
}

export async function siguienteFolio(empresaId = null) {
  const folio = await repo.generarSiguienteFolio(undefined, empresaId || 1);
  return { siguiente_folio: folio };
}

/**
 * Registra una compra con transacción atómica:
 * 1. Incrementa existencias de inventario y genera movimientos de entrada.
 * 2. Guarda cabecera y detalles de compra.
 * 3. Si es a crédito o tiene saldo pendiente, genera registro en cuentas_por_pagar.
 * 4. Si hay pago inicial o de contado, registra el gasto y la salida de caja (si fue efectivo).
 */
export async function crear(body, idUsuario, empresaId = null) {
  const datos = validarCompra(body);

  const resultado = await repo.conTransaccion(async (client) => {
    const empresa = empresaId || 1;

    // 0. Validar que el proveedor exista, esté activo y pertenezca a la empresa
    const proveedor = await repo.findProveedorParaCompra(client, datos.id_proveedor, empresa);

    if (!proveedor) {
      throw new AppError('El proveedor seleccionado no existe o no pertenece a la empresa actual.', 404);
    }

    if (Number(proveedor.estatus) !== 1) {
      throw new AppError(`El proveedor "${proveedor.nombre_empresa}" está inactivo y no puede usarse en una compra.`, 409);
    }

    // 1. Validar e incrementar existencias de cada producto
    const itemsProcesados = [];

    for (const item of datos.items) {
      const producto = await inventarioRepo.bloquearProducto(client, item.id_producto, empresa);

      if (!producto) {
        throw new AppError(`El producto con ID ${item.id_producto} no existe o no pertenece a la empresa actual.`, 404);
      }

      if (Number(producto.estatus) !== 1) {
        throw new AppError(`El producto "${producto.nombre}" está inactivo y no se puede procesar en compra.`, 409);
      }

      const esProductoFisico = String(producto.tipo).toLowerCase() === 'producto';

      if (esProductoFisico) {
        const stockActual = Number(producto.stock ?? 0);
        const nuevoStock = stockActual + item.cantidad;

        // Actualizar stock
        await inventarioRepo.actualizarStock(client, producto.id_producto, nuevoStock);

        // Actualizar precio de compra registrado en el catálogo
        await repo.actualizarCostoProducto(client, producto.id_producto, item.costo_unitario, empresa);

        itemsProcesados.push({
          ...item,
          nombre_producto: producto.nombre,
          esProductoFisico,
          stockAnterior: stockActual,
          stockNuevo: nuevoStock
        });
      } else {
        itemsProcesados.push({
          ...item,
          nombre_producto: producto.nombre,
          esProductoFisico: false
        });
      }
    }

    // 2. Generar folio seguro
    const codigo = await repo.generarSiguienteFolio(client, empresa);

    // 3. Insertar compra
    const compra = await repo.insertCompra(client, {
      codigo,
      id_proveedor: datos.id_proveedor,
      id_usuario: idUsuario,
      condiciones_pago: datos.condiciones_pago,
      fecha_vencimiento: datos.fecha_vencimiento,
      subtotal: datos.subtotal,
      total: datos.total,
      estatus: datos.estatus,
      empresa_id: empresa
    });

    // 4. Insertar detalle de compra y registrar movimientos de entrada de inventario
    for (const item of itemsProcesados) {
      await repo.insertDetalle(client, {
        id_compra: compra.id_compra,
        id_producto: item.id_producto,
        cantidad: item.cantidad,
        costo_unitario: item.costo_unitario,
        subtotal: item.subtotal,
        empresa_id: empresa
      });

      if (item.esProductoFisico) {
        await inventarioRepo.insertarMovimiento(client, {
          id_producto: item.id_producto,
          tipo_movimiento: 'entrada',
          cantidad: item.cantidad,
          existencia_antes: item.stockAnterior,
          existencia_despues: item.stockNuevo,
          motivo: `Compra folio ${codigo}`,
          origen: 'compra',
          id_referencia: compra.id_compra,
          id_usuario: idUsuario,
          empresa_id: empresa
        });
      }
    }

    // 5. Cuentas por Pagar (sólo si queda saldo pendiente real)
    let cxp = null;
    const saldoPendiente = Math.round((datos.total - datos.monto_pagado) * 100) / 100;

    if (saldoPendiente > 0) {
      const cxpEstatus = datos.monto_pagado > 0 ? 'parcial' : 'pendiente';
      cxp = await repo.crearCuentaPorPagar(client, {
        id_proveedor: datos.id_proveedor,
        id_compra: compra.id_compra,
        fecha_vencimiento: datos.fecha_vencimiento || new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
        monto_original: datos.total,
        saldo_pendiente: saldoPendiente,
        estatus: cxpEstatus,
        empresa_id: empresa
      });
    }

    // 6. Registro automático de Gasto y afectación en Caja (si hubo pago inmediato o anticipo)
    let idGasto = null;
    if (datos.monto_pagado > 0) {
      const idCategoria = await repo.obtenerCategoriaCompras(client, empresa);

      if (!idCategoria) {
        throw new AppError('No hay una categoría activa configurada para registrar el gasto de la compra.', 409);
      }

      const gastoSql = `
        INSERT INTO gastos (
          concepto,
          id_categoria,
          monto,
          forma_pago,
          fecha,
          id_usuario,
          observaciones,
          estatus,
          empresa_id
        ) VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP, $5, $6, 'activo', $7)
        RETURNING id_gasto
      `;

      const gastoRes = await client.query(gastoSql, [
        `Compra folio ${codigo}`,
        idCategoria,
        datos.monto_pagado,
        datos.forma_pago,
        idUsuario,
        datos.observaciones || `Pago registrado en compra folio ${codigo}`,
        empresa
      ]);

      idGasto = gastoRes.rows[0]?.id_gasto;

      // Si fue en efectivo, asentar salida en movimientos_caja
      if (datos.forma_pago === 'efectivo') {
        await gastosRepo.registrarMovimientoCaja({
          fecha: new Date(),
          tipo: 'salida',
          concepto: `Compra folio ${codigo}`,
          monto: datos.monto_pagado,
          origen: 'compra',
          id_referencia: compra.id_compra,
          id_usuario: idUsuario,
          empresa_id: empresa
        }, client);
      }
    }

    return {
      id_compra: compra.id_compra,
      codigo,
      cxp_creada: Boolean(cxp),
      id_cxp: cxp?.id_cxp ?? null,
      saldo_pendiente: saldoPendiente,
      id_gasto: idGasto
    };
  });

  return resultado;
}

/**
 * Cancela una compra:
 * - Valida que no tenga pagos registrados en CxP.
 * - Revierte existencias en inventario (genera movimiento de salida).
 * - Cancela la cuenta por pagar vinculada.
 * - Revierte gastos y movimientos de caja generados.
 * - Marca la compra como cancelada.
 */
export async function cancelar(idParam, motivo = '', idUsuario, empresaId = null) {
  const idCompra = parseId(idParam);

  const resultado = await repo.conTransaccion(async (client) => {
    // 1. Bloquear compra y verificar existencia (siempre dentro de la empresa actual)
    const compra = await repo.bloquearCompra(client, idCompra, empresaId);

    if (!compra) {
      throw new AppError('La compra que intenta cancelar no existe.', 404);
    }

    if (String(compra.estatus).toLowerCase() === 'cancelada') {
      throw new AppError('Esta compra ya se encuentra cancelada.', 400);
    }

    // 2. Verificar si tiene pagos en CxP
    const pagosCxp = await repo.obtenerPagosDeCxp(client, idCompra);
    if (pagosCxp && pagosCxp.length > 0) {
      throw new AppError(
        `No es posible cancelar la compra folio ${compra.codigo} porque ya cuenta con ${pagosCxp.length} abono(s) registrados en Cuentas por Pagar. Debe revertir los pagos primero.`,
        409
      );
    }

    // 3. Revertir existencias de inventario
    const items = await repo.findItemsByCompraId(idCompra, compra.empresa_id || empresaId);

    for (const item of items) {
      if (String(item.tipo_producto).toLowerCase() === 'producto') {
        const producto = await inventarioRepo.bloquearProducto(client, item.id_producto, compra.empresa_id);

        if (producto) {
          const stockActual = Number(producto.stock ?? 0);
          const cantidad = Number(item.cantidad);

          if (stockActual < cantidad) {
            throw new AppError(
              `No es posible cancelar la compra porque el producto "${producto.nombre}" ya no tiene existencias suficientes para revertir la entrada (stock actual: ${stockActual}, requerido: ${cantidad}).`,
              409
            );
          }

          const nuevoStock = stockActual - cantidad;

          await inventarioRepo.actualizarStock(client, producto.id_producto, nuevoStock);

          await inventarioRepo.insertarMovimiento(client, {
            id_producto: producto.id_producto,
            tipo_movimiento: 'salida',
            cantidad,
            existencia_antes: stockActual,
            existencia_despues: nuevoStock,
            motivo: `Cancelación compra folio ${compra.codigo}${motivo ? ': ' + motivo : ''}`,
            origen: 'compra',
            id_referencia: compra.id_compra,
            id_usuario: idUsuario,
            empresa_id: compra.empresa_id || empresaId || 1
          });
        }
      }
    }

    // 4. Cancelar Cuenta por Pagar asociada
    await repo.cancelarCuentaPorPagar(client, idCompra);

    // 5. Revertir movimientos de gastos y caja si existieron
    // Reversión de caja
    const movCajaRes = await client.query(`
      SELECT *
      FROM movimientos_caja
      WHERE origen = 'compra'
        AND id_referencia = $1
        AND ($2::int IS NULL OR empresa_id = $2::int)
    `, [idCompra, compra.empresa_id || empresaId]);

    for (const mc of movCajaRes.rows) {
      if (mc.tipo === 'salida') {
        await gastosRepo.registrarMovimientoCaja({
          fecha: new Date(),
          tipo: 'entrada',
          concepto: `Reversión por cancelación: ${mc.concepto}`,
          monto: mc.monto,
          origen: 'compra',
          id_referencia: idCompra,
          id_usuario: idUsuario,
          empresa_id: compra.empresa_id || empresaId || 1
        }, client);
      }
    }

    // Anular gasto vinculado
    await client.query(`
      UPDATE gastos
      SET estatus = 'cancelado',
          observaciones = CONCAT(COALESCE(observaciones, ''), ' [Cancelado por anulación de compra]')
      WHERE concepto = $1 AND ($2::int IS NULL OR empresa_id = $2)
    `, [`Compra folio ${compra.codigo}`, compra.empresa_id || empresaId]);

    // 6. Marcar la compra como cancelada
    const compraCancelada = await repo.cancelarCompra(client, idCompra);

    return {
      id_compra: compraCancelada.id_compra,
      codigo: compraCancelada.codigo,
      estatus: compraCancelada.estatus,
      mensaje: 'Compra cancelada exitosamente. Se ha revertido el inventario, la cuenta por pagar y los movimientos financieros.'
    };
  });

  return resultado;
}
