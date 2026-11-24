import * as repo from '../repositories/ventaRepository.js';
import * as inventarioRepo from '../repositories/inventarioRepository.js';
import * as ingresoService from './ingresoService.js';
import { AppError } from '../utils/http.js';
import {
  parseId,
  validarFiltros,
  validarVenta
} from '../validators/ventaValidator.js';

export const listar = async (query, empresaId = null) => {
  const filtros = validarFiltros(query);
  return repo.list(filtros, empresaId);
};

export const estadisticas = async (empresaId = null) => {
  return repo.stats(empresaId);
};

export const obtener = async (idParam) => {
  const id = parseId(idParam);
  const venta = await repo.findById(id);

  if (!venta) {
    throw new AppError('La venta solicitada no existe.', 404);
  }

  const items = await repo.findItemsByVentaId(id);

  return {
    ...venta,
    items
  };
};

export const siguienteFolio = async (empresaId = null) => {
  return repo.conTransaccion(async (client) => {
    const folio = await repo.generarSiguienteFolio(client, empresaId || 1);
    return { folio };
  });
};

/**
 * Registra una venta completa con todos sus impactos transaccionales:
 * 1. Control de inventario (descuenta stock y genera movimiento).
 * 2. Guarda venta y detalles.
 * 3. Si es a crédito o tiene saldo pendiente, genera Cuenta por Cobrar.
 * 4. Si hay monto pagado, genera Ingreso y afecta Caja si fue en efectivo.
 */
export async function crear(body, idUsuario, empresaId = null) {
  const datos = validarVenta(body);

  const resultado = await repo.conTransaccion(async (client) => {
    // 1. Validar productos, aplicar precio oficial registrado y descontar stock
    const itemsProcesados = [];
    let subtotalOficial = 0;

    for (const item of datos.items) {
      const producto = await inventarioRepo.bloquearProducto(client, item.id_producto);

      if (!producto) {
        throw new AppError(`El producto con ID ${item.id_producto} no existe.`, 404);
      }

      if (Number(producto.estatus) !== 1) {
        throw new AppError(`El producto "${producto.nombre}" está inactivo y no se puede vender.`, 409);
      }

      // El precio SIEMPRE debe ser el registrado oficialmente en el catálogo del producto
      const precioOficial = Math.round(Number(producto.precio_venta || 0) * 100) / 100;
      const subtotalItem = Math.round(item.cantidad * precioOficial * 100) / 100;
      subtotalOficial += subtotalItem;

      const itemConPrecioOficial = {
        ...item,
        precio_unitario: precioOficial,
        subtotal: subtotalItem
      };

      const esProductoFisico = String(producto.tipo).toLowerCase() === 'producto';

      if (esProductoFisico) {
        const stockActual = Number(producto.stock ?? 0);
        if (item.cantidad > stockActual) {
          throw new AppError(
            `Existencias insuficientes para "${producto.nombre}". Disponible: ${stockActual} ${String(producto.unidad_medida || 'unidades').toLowerCase()}, solicitado: ${item.cantidad}`,
            409,
            { code: 'STOCK_INSUFICIENTE', id_producto: producto.id_producto, disponible: stockActual }
          );
        }

        const nuevoStock = stockActual - item.cantidad;
        await inventarioRepo.actualizarStock(client, producto.id_producto, nuevoStock);

        itemsProcesados.push({
          ...itemConPrecioOficial,
          nombre_producto: producto.nombre,
          esProductoFisico,
          stockAnterior: stockActual,
          stockNuevo: nuevoStock
        });
      } else {
        itemsProcesados.push({
          ...itemConPrecioOficial,
          nombre_producto: producto.nombre,
          esProductoFisico: false
        });
      }
    }

    const totalOficial = Math.round(subtotalOficial * 100) / 100;
    const montoPagadoFinal = datos.condiciones_pago === 'contado'
      ? totalOficial
      : Math.min(totalOficial, Math.max(0, Number(datos.monto_pagado || 0)));

    let estatusFinal = 'pendiente';
    if (montoPagadoFinal >= totalOficial) {
      estatusFinal = 'pagada';
    } else if (montoPagadoFinal > 0) {
      estatusFinal = 'parcial';
    }

    // 2. Generar folio seguro
    const codigo = await repo.generarSiguienteFolio(client, empresaId || 1);

    // 3. Insertar venta
    const venta = await repo.insertVenta(client, {
      codigo,
      id_cliente: datos.id_cliente,
      id_usuario: idUsuario,
      forma_pago: datos.forma_pago,
      condiciones_pago: datos.condiciones_pago,
      fecha_vencimiento: datos.fecha_vencimiento,
      subtotal: totalOficial,
      total: totalOficial,
      monto_pagado: montoPagadoFinal,
      estatus: estatusFinal,
      observaciones: datos.observaciones,
      empresa_id: empresaId || 1
    });

    // 4. Insertar detalle de venta y registrar movimientos de inventario
    for (const item of itemsProcesados) {
      await repo.insertDetalle(client, {
        id_venta: venta.id_venta,
        id_producto: item.id_producto,
        cantidad: item.cantidad,
        precio_unitario: item.precio_unitario,
        subtotal: item.subtotal,
        empresa_id: empresaId || 1
      });

      if (item.esProductoFisico) {
        await inventarioRepo.insertarMovimiento(client, {
          id_producto: item.id_producto,
          tipo_movimiento: 'salida',
          cantidad: item.cantidad,
          existencia_antes: item.stockAnterior,
          existencia_despues: item.stockNuevo,
          motivo: `Venta folio ${codigo}`,
          origen: 'venta',
          id_referencia: venta.id_venta,
          id_usuario: idUsuario,
          empresa_id: empresaId || 1
        });
      }
    }

    // 5. Cuentas por Cobrar (si es crédito o si queda saldo pendiente)
    let cxc = null;
    const saldoPendiente = Math.round((totalOficial - montoPagadoFinal) * 100) / 100;

    if (datos.condiciones_pago === 'credito' || saldoPendiente > 0) {
      const cxcEstatus = montoPagadoFinal > 0 ? 'parcial' : 'pendiente';
      cxc = await repo.crearCuentaPorCobrar(client, {
        id_cliente: datos.id_cliente,
        id_venta: venta.id_venta,
        fecha_vencimiento: datos.fecha_vencimiento,
        monto_original: totalOficial,
        saldo_pendiente: saldoPendiente,
        estatus: cxcEstatus,
        empresa_id: empresaId || 1
      });
    }

    // 6. Registro automático de Ingreso y afectación en Caja (si hubo pago inmediato)
    let idIngreso = null;
    if (montoPagadoFinal > 0) {
      const idCategoria = await repo.obtenerCategoriaVentas(client, empresaId);

      idIngreso = await ingresoService.registrarAutomatico(client, {
        concepto: `Venta folio ${codigo}`,
        id_categoria: idCategoria,
        monto: montoPagadoFinal,
        forma_pago: datos.forma_pago,
        origen: 'venta',
        id_venta: venta.id_venta,
        id_usuario: idUsuario,
        empresa_id: empresaId || 1
      });
    }

    return {
      id_venta: venta.id_venta,
      codigo,
      cxc_creada: Boolean(cxc),
      id_cxc: cxc?.id_cxc ?? null,
      saldo_pendiente: saldoPendiente,
      id_ingreso: idIngreso
    };
  });

  return obtener(resultado.id_venta);
}

/**
 * Cancelación de venta:
 * Reversa inventario, cancela CxC (si no tiene cobros), cancela ingresos y revierte caja.
 */
export async function cancelar(idParam, body = {}, idUsuario, empresaId = null) {
  const id = parseId(idParam);
  const motivo = String(body.motivo || '').trim() || 'Cancelación de venta';

  await repo.conTransaccion(async (client) => {
    const venta = await repo.bloquearVenta(client, id);

    if (!venta) {
      throw new AppError('La venta solicitada no existe.', 404);
    }

    if (String(venta.estatus).toLowerCase() === 'cancelada') {
      throw new AppError('La venta ya se encuentra cancelada.', 409);
    }

    // Comprobar si tiene cobros posteriores en Cuentas por Cobrar
    const cobros = await repo.obtenerCobrosDeVenta(client, id);
    if (cobros && cobros.length > 0) {
      throw new AppError(
        'No es posible cancelar la venta porque tiene cobros registrados en Cuentas por Cobrar. Para continuar, cancela primero los cobros relacionados.',
        409,
        { code: 'VENTA_CON_COBROS', total_cobros: cobros.length }
      );
    }

    // 1. Revertir existencias de inventario
    const items = await repo.findItemsByVentaId(id, client);

    for (const item of items) {
      if (String(item.tipo_producto).toLowerCase() === 'producto') {
        const prodActual = await inventarioRepo.bloquearProducto(client, item.id_producto);
        if (prodActual) {
          const antes = Number(prodActual.stock ?? 0);
          const despues = antes + Number(item.cantidad);

          await inventarioRepo.actualizarStock(client, item.id_producto, despues);

          await inventarioRepo.insertarMovimiento(client, {
            id_producto: item.id_producto,
            tipo_movimiento: 'entrada',
            cantidad: Number(item.cantidad),
            existencia_antes: antes,
            existencia_despues: despues,
            motivo: `Cancelación de venta folio ${venta.codigo}: ${motivo}`,
            origen: 'venta',
            id_referencia: venta.id_venta,
            id_usuario: idUsuario,
            empresa_id: empresaId || venta.empresa_id || 1
          });
        }
      }
    }

    // 2. Cancelar Cuenta por Cobrar si existía
    await repo.cancelarCuentaPorCobrar(client, id);

    // 3. Cancelar ingresos vinculados y revertir caja
    await ingresoService.cancelarPorOrigen(client, {
      id_venta: id,
      id_usuario: idUsuario
    });

    // 4. Marcar estatus de la venta como cancelada
    await repo.cancelarVenta(client, id);
  });

  return obtener(id);
}
