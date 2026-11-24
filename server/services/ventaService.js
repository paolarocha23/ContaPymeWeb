import * as repo from '../repositories/ventaRepository.js';
import * as inventarioRepo from '../repositories/inventarioRepository.js';
import * as ingresoService from './ingresoService.js';
import { AppError } from '../utils/http.js';
import {
  ESTATUS,
  parseId,
  redondear,
  calcularEstatus,
  validarFiltros,
  validarVenta,
  validarDevolucion
} from '../validators/ventaValidator.js';

export const listar = async (query, empresaId = null) => repo.list(validarFiltros(query), empresaId);

export const estadisticas = async (empresaId = null) => repo.stats(empresaId);

export const obtener = async (idParam, empresaId = null) => {
  const id = parseId(idParam);
  const venta = await repo.findById(id, empresaId);
  if (!venta) throw new AppError('La venta solicitada no existe.', 404);

  const [items, devoluciones] = await Promise.all([
    repo.findItemsByVentaId(id),
    repo.listarDevoluciones(id)
  ]);
  return { ...venta, items, devoluciones };
};

export const siguienteFolio = async (empresaId = null) =>
  repo.conTransaccion(async (client) => ({ folio: await repo.generarSiguienteFolio(client, empresaId || 1) }));

/**
 * Registra una venta (RDF0901/0904/0905/0906):
 * valida productos con precio de catálogo, descuenta inventario, guarda venta y detalle,
 * genera CxC si queda saldo e ingreso/caja por lo cobrado.
 * El ticket NO se guarda en BD: el front lo arma con la respuesta y lo guarda en caché.
 */
export async function crear(body, idUsuario, empresaId = null) {
  const datos = validarVenta(body);
  const empresa = empresaId || 1;

  const resultado = await repo.conTransaccion(async (client) => {
    const itemsProcesados = [];
    let subtotal = 0;

    for (const item of datos.items) {
      const producto = await inventarioRepo.bloquearProducto(client, item.id_producto);
      if (!producto) throw new AppError(`El producto con ID ${item.id_producto} no existe.`, 404);
      if (Number(producto.estatus) !== 1) {
        throw new AppError(`El producto "${producto.nombre}" está inactivo y no se puede vender.`, 409);
      }

      // El precio se lee directo del catálogo (no depende de lo que devuelva bloquearProducto)
      const precioCatalogo = await repo.obtenerPrecioVenta(client, item.id_producto);
      if (precioCatalogo === null || precioCatalogo <= 0) {
        throw new AppError(`El producto "${producto.nombre}" no tiene un precio de venta válido en el catálogo.`, 409);
      }
      const precio = redondear(precioCatalogo);
      const subtotalItem = redondear(item.cantidad * precio);
      subtotal += subtotalItem;

      const esFisico = String(producto.tipo).toLowerCase() === 'producto';
      const procesado = {
        id_producto: item.id_producto,
        cantidad: item.cantidad,
        precio_unitario: precio,
        subtotal: subtotalItem,
        esFisico
      };

      if (esFisico) {
        const stockActual = Number(producto.stock ?? 0);
        if (item.cantidad > stockActual) {
          throw new AppError(
            `Existencias insuficientes para "${producto.nombre}". Disponible: ${stockActual} ${String(producto.unidad_medida || 'unidades').toLowerCase()}, solicitado: ${item.cantidad}`,
            409,
            { code: 'STOCK_INSUFICIENTE', id_producto: producto.id_producto, disponible: stockActual }
          );
        }
        procesado.stockAnterior = stockActual;
        procesado.stockNuevo = redondear(stockActual - item.cantidad);
        await inventarioRepo.actualizarStock(client, producto.id_producto, procesado.stockNuevo);
      }
      itemsProcesados.push(procesado);
    }

    const total = redondear(subtotal);
    if (total <= 0 || total > datos.MAX_MONTO) {
      throw new AppError('El total de la venta debe ser mayor a cero y no exceder el límite permitido.', 400);
    }

    const montoPagado = datos.condiciones_pago === 'contado' ? total : Math.min(total, datos.monto_pagado);
    const saldo = redondear(total - montoPagado);

    if (saldo > 0 && !datos.id_cliente) {
      throw new AppError('Las ventas con saldo pendiente requieren un cliente registrado.', 400);
    }

    const estatus = calcularEstatus(total, montoPagado);
    const codigo = await repo.generarSiguienteFolio(client, empresa);

    const venta = await repo.insertVenta(client, {
      codigo,
      id_cliente: datos.id_cliente,
      id_usuario: idUsuario,
      forma_pago: datos.forma_pago,
      condiciones_pago: datos.condiciones_pago,
      fecha_vencimiento: datos.fecha_vencimiento,
      subtotal: total,
      total,
      monto_pagado: montoPagado,
      estatus,
      observaciones: datos.observaciones,
      empresa_id: empresa
    });

    for (const item of itemsProcesados) {
      await repo.insertDetalle(client, {
        id_venta: venta.id_venta,
        id_producto: item.id_producto,
        cantidad: item.cantidad,
        precio_unitario: item.precio_unitario,
        subtotal: item.subtotal,
        empresa_id: empresa
      });

      if (item.esFisico) {
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
          empresa_id: empresa
        });
      }
    }

    // RDF0906
    if (saldo > 0) {
      await repo.crearCuentaPorCobrar(client, {
        id_cliente: datos.id_cliente,
        id_venta: venta.id_venta,
        fecha_vencimiento: datos.fecha_vencimiento,
        monto_original: total,
        saldo_pendiente: saldo,
        estatus: montoPagado > 0 ? 'parcial' : 'pendiente',
        empresa_id: empresa
      });
    }

    // RDF0905
    if (montoPagado > 0) {
      const idCategoria = await repo.obtenerCategoriaVentas(client, empresa);
      await ingresoService.registrarAutomatico(client, {
        concepto: `Venta folio ${codigo}`,
        id_categoria: idCategoria,
        monto: montoPagado,
        forma_pago: datos.forma_pago,
        origen: 'venta',
        id_venta: venta.id_venta,
        id_usuario: idUsuario,
        empresa_id: empresa
      });
    }

    return venta.id_venta;
  });

  return obtener(resultado, empresaId);
}

/** Cancelación: revierte inventario, CxC, ingresos y caja. */
export async function cancelar(idParam, body = {}, idUsuario, empresaId = null) {
  const id = parseId(idParam);
  const motivo = String(body.motivo || '').trim() || 'Cancelación de venta';

  await repo.conTransaccion(async (client) => {
    const venta = await repo.bloquearVenta(client, id, empresaId);
    if (!venta) throw new AppError('La venta solicitada no existe.', 404);

    if (String(venta.estatus).toLowerCase() === ESTATUS.CANCELADA) {
      throw new AppError('La venta ya se encuentra cancelada.', 409);
    }

    if ((await repo.contarDevoluciones(client, id)) > 0) {
      throw new AppError('La venta ya tiene devoluciones registradas y no puede cancelarse.', 409, { code: 'VENTA_CON_DEVOLUCIONES' });
    }

    const cobros = await repo.obtenerCobrosDeVenta(client, id);
    if (cobros.length > 0) {
      throw new AppError(
        'No es posible cancelar la venta porque tiene cobros registrados en Cuentas por Cobrar. Para continuar, cancela primero los cobros relacionados.',
        409,
        { code: 'VENTA_CON_COBROS', total_cobros: cobros.length }
      );
    }

    const items = await repo.findItemsByVentaId(id, client);
    for (const item of items) {
      if (String(item.tipo_producto).toLowerCase() !== 'producto') continue;
      const prod = await inventarioRepo.bloquearProducto(client, item.id_producto);
      if (!prod) continue;

      const antes = Number(prod.stock ?? 0);
      const despues = redondear(antes + Number(item.cantidad));
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

    await repo.cancelarCuentaPorCobrar(client, id);
    await ingresoService.cancelarPorOrigen(client, { id_venta: id, id_usuario: idUsuario });
    await repo.cancelarVenta(client, id);
  });

  return obtener(id, empresaId);
}

/**
 * RDF0907 – Devolución total o parcial:
 * reingresa existencias, ajusta la CxC y, si el cliente ya había pagado de más,
 * registra la salida de dinero.
 */
export async function devolver(idParam, body = {}, idUsuario, empresaId = null) {
  const id = parseId(idParam);
  const datos = validarDevolucion(body);

  await repo.conTransaccion(async (client) => {
    const venta = await repo.bloquearVenta(client, id, empresaId);
    if (!venta) throw new AppError('La venta solicitada no existe.', 404);
    if (String(venta.estatus).toLowerCase() === ESTATUS.CANCELADA) {
      throw new AppError('No se puede devolver una venta cancelada.', 409);
    }

    const disponibles = await repo.itemsDevolubles(client, id);
    let lineas;

    if (datos.tipo === 'total') {
      lineas = disponibles.filter((d) => d.disponible > 0).map((d) => ({ ...d, cantidad: d.disponible }));
    } else {
      lineas = datos.items.map((it) => {
        const base = disponibles.find((d) => d.id_producto === it.id_producto);
        if (!base) throw new AppError(`El producto ${it.id_producto} no pertenece a esta venta.`, 400);
        if (it.cantidad > base.disponible) {
          throw new AppError(
            `Solo se pueden devolver ${base.disponible} de "${base.nombre}" (ya devueltas: ${base.devuelta}).`,
            409
          );
        }
        return { ...base, cantidad: it.cantidad };
      });
    }

    if (lineas.length === 0) throw new AppError('No hay artículos pendientes por devolver en esta venta.', 409);

    const devueltoAhora = new Map(lineas.map((l) => [l.id_producto, l.cantidad]));
    const todoDevuelto = disponibles.every(
      (d) => redondear(d.disponible - (devueltoAhora.get(d.id_producto) || 0)) <= 0
    );

    const { id_devolucion } = await repo.insertDevolucion(client, {
      id_venta: id,
      tipo: todoDevuelto ? 'total' : 'parcial',
      id_usuario: idUsuario,
      observaciones: datos.observaciones
    });

    for (const l of lineas) {
      await repo.insertDetalleDevolucion(client, {
        id_devolucion,
        id_producto: l.id_producto,
        cantidad: l.cantidad,
        precio_unitario: l.precio_unitario
      });

      if (String(l.tipo).toLowerCase() === 'producto') {
        const prod = await inventarioRepo.bloquearProducto(client, l.id_producto);
        if (prod) {
          const antes = Number(prod.stock ?? 0);
          const despues = redondear(antes + l.cantidad);
          await inventarioRepo.actualizarStock(client, l.id_producto, despues);
          await inventarioRepo.insertarMovimiento(client, {
            id_producto: l.id_producto,
            tipo_movimiento: 'entrada',
            cantidad: l.cantidad,
            existencia_antes: antes,
            existencia_despues: despues,
            motivo: `Devolución de venta folio ${venta.codigo}`,
            origen: 'venta',
            id_referencia: venta.id_venta,
            id_usuario: idUsuario,
            empresa_id: empresaId || venta.empresa_id || 1
          });
        }
      }
    }

    // Ajuste financiero
    const devueltoTotal = await repo.totalDevuelto(client, id);
    const neto = redondear(Number(venta.total) - devueltoTotal);
    const pagado = Number(venta.monto_pagado);
    const reembolso = redondear(Math.max(0, pagado - neto));
    const nuevoPagado = redondear(pagado - reembolso);
    const saldo = redondear(Math.max(0, neto - nuevoPagado));

    if (reembolso > 0) {
      // Salida de dinero (egreso de caja). Requiere implementarse en ingresoService.
      if (typeof ingresoService.registrarReembolsoVenta !== 'function') {
        throw new AppError(
          'Falta implementar ingresoService.registrarReembolsoVenta para registrar la salida de dinero de la devolución.',
          501
        );
      }
      await ingresoService.registrarReembolsoVenta(client, {
        concepto: `Devolución de venta folio ${venta.codigo}`,
        monto: reembolso,
        forma_pago: venta.forma_pago,
        id_venta: id,
        id_devolucion,
        id_usuario: idUsuario,
        empresa_id: empresaId || venta.empresa_id || 1
      });
    }

    const estatusVenta = todoDevuelto ? ESTATUS.CANCELADA : calcularEstatus(neto, nuevoPagado);
    await repo.actualizarPagoVenta(client, id, { monto_pagado: nuevoPagado, estatus: estatusVenta });

    const cxcEstatus = todoDevuelto ? 'cancelada' : saldo <= 0 ? 'pagada' : nuevoPagado > 0 ? 'parcial' : 'pendiente';
    await repo.ajustarCuentaPorCobrar(client, id, {
      monto_original: neto,
      saldo_pendiente: todoDevuelto ? 0 : saldo,
      estatus: cxcEstatus
    });
  });

  return obtener(id, empresaId);
}