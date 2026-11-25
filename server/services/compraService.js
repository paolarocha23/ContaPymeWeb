import * as repo from '../repositories/compraRepository.js';
import * as inventarioRepo from '../repositories/inventarioRepository.js';
import * as gastosRepo from '../repositories/gastosRepository.js';
import { AppError } from '../utils/http.js';
import { parseId, validarFiltros, validarCompra, validarDevolucionCompra } from '../validators/compraValidator.js';

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

  const [items, devoluciones] = await Promise.all([
    repo.findItemsByCompraId(id, empresaId),
    repo.listarDevoluciones(id)
  ]);

  return {
    ...compra,
    items,
    devoluciones
  };
}

export async function listarDevoluciones(idParam, empresaId = null) {
  const id = parseId(idParam);
  await obtener(id, empresaId);
  return await repo.listarDevoluciones(id);
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
      const esEfectivo = String(datos.forma_pago || 'efectivo').trim().toLowerCase() === 'efectivo';
      if (esEfectivo) {
        await gastosRepo.registrarMovimientoCaja({
          fecha: null,
          tipo: 'salida',
          concepto: `Compra de mercancía folio ${codigo}`,
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

    // 2. Verificar si tiene pagos en CxP o devoluciones registradas
    const devolucionesCount = await repo.contarDevoluciones(client, idCompra);
    if (devolucionesCount > 0) {
      throw new AppError(
        `No es posible cancelar la compra folio ${compra.codigo} porque ya cuenta con ${devolucionesCount} devolución(es) registrada(s).`,
        409
      );
    }

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

/**
 * Registra la devolución total o parcial de una compra (RDF1006):
 * - Descuenta las existencias en inventario.
 * - Ajusta la cuenta por pagar vinculada o registra el ingreso por reembolso.
 * - Registra la devolución y sus partidas.
 */
export async function devolver(idParam, body = {}, idUsuario, empresaId = null) {
  const idCompra = parseId(idParam);
  const datos = validarDevolucionCompra(body);

  const resultado = await repo.conTransaccion(async (client) => {
    // 1. Bloquear compra y verificar existencia
    const compra = await repo.bloquearCompra(client, idCompra, empresaId);

    if (!compra) {
      throw new AppError('La compra solicitada no existe.', 404);
    }

    if (String(compra.estatus).toLowerCase() === 'cancelada') {
      throw new AppError('No se puede registrar devolución en una compra cancelada.', 409);
    }

    // 2. Obtener productos y cantidades disponibles para devolución
    const disponibles = await repo.itemsDevolubles(client, idCompra);
    const lineas = datos.items.map((it) => {
      const base = disponibles.find((d) => d.id_producto === it.id_producto);
      if (!base) {
        throw new AppError(`El producto ${it.id_producto} no pertenece a esta compra.`, 400);
      }
      if (it.cantidad > base.disponible) {
        throw new AppError(
          `Solo se pueden devolver ${base.disponible} piezas de "${base.nombre}" (ya devueltas: ${base.devuelta}).`,
          409
        );
      }
      return { ...base, cantidad: it.cantidad };
    });

    if (lineas.length === 0) {
      throw new AppError('No hay artículos válidos para devolver en esta compra.', 400);
    }

    // 3. Validar que las existencias de inventario no queden negativas
    for (const l of lineas) {
      if (String(l.tipo).toLowerCase() === 'producto') {
        const prod = await inventarioRepo.bloquearProducto(client, l.id_producto, compra.empresa_id);
        if (prod) {
          const stockActual = Number(prod.stock ?? 0);
          if (stockActual < l.cantidad) {
            throw new AppError(
              `No es posible devolver ${l.cantidad} pieza(s) de "${prod.nombre}" porque el inventario actual es de ${stockActual}.`,
              409
            );
          }
        }
      }
    }

    const devueltoAhora = new Map(lineas.map((l) => [l.id_producto, l.cantidad]));
    const todoDevuelto = disponibles.every(
      (d) => Number((d.disponible - (devueltoAhora.get(d.id_producto) || 0)).toFixed(4)) <= 0
    );

    // 4. Insertar cabecera de devolución
    const devolucion = await repo.insertDevolucion(client, {
      id_compra: idCompra,
      tipo: todoDevuelto ? 'total' : 'parcial',
      id_usuario: idUsuario,
      observaciones: datos.observaciones,
      empresa_id: compra.empresa_id || empresaId || 1
    });

    // 5. Insertar detalle de devolución y descontar existencias de inventario (RDF1004 / RDF1006)
    let montoDevuelto = 0;
    for (const l of lineas) {
      const subtotalLinea = Number((l.cantidad * l.costo_unitario).toFixed(2));
      montoDevuelto = Number((montoDevuelto + subtotalLinea).toFixed(2));

      await repo.insertDetalleDevolucion(client, {
        id_devolucion: devolucion.id_devolucion,
        id_producto: l.id_producto,
        cantidad: l.cantidad,
        costo_unitario: l.costo_unitario,
        empresa_id: compra.empresa_id || empresaId || 1
      });

      if (String(l.tipo).toLowerCase() === 'producto') {
        const prod = await inventarioRepo.bloquearProducto(client, l.id_producto, compra.empresa_id);
        if (prod) {
          const stockActual = Number(prod.stock ?? 0);
          const nuevoStock = Number((stockActual - l.cantidad).toFixed(4));

          await inventarioRepo.actualizarStock(client, l.id_producto, nuevoStock);

          await inventarioRepo.insertarMovimiento(client, {
            id_producto: l.id_producto,
            tipo_movimiento: 'salida',
            cantidad: l.cantidad,
            existencia_antes: stockActual,
            existencia_despues: nuevoStock,
            motivo: `Devolución compra folio ${compra.codigo}${datos.observaciones ? ': ' + datos.observaciones : ''}`,
            origen: 'compra',
            id_referencia: idCompra,
            id_usuario: idUsuario,
            empresa_id: compra.empresa_id || empresaId || 1
          });
        }
      }
    }

    // 6. Resolución financiera (RDF1006):
    // Ajustar cuenta por pagar o registrar ingreso por reembolso
    const cxpRes = await client.query(`
      SELECT id_cxp, saldo_pendiente, estatus, monto_original
      FROM cuentas_por_pagar
      WHERE id_compra = $1
      ORDER BY id_cxp DESC
      LIMIT 1
    `, [idCompra]);
    const cxp = cxpRes.rows[0];

    let cxpAjustada = null;
    let ingresoReembolso = null;

    if (datos.resolucion === 'ingreso') {
      // El usuario solicitó ingreso (reembolso) directamente
      const idCatIngreso = await repo.obtenerCategoriaReembolso(client, compra.empresa_id || empresaId);

      const ingresoRes = await client.query(`
        INSERT INTO ingresos (
          concepto,
          id_categoria,
          monto,
          forma_pago,
          origen,
          fecha,
          id_usuario,
          estatus,
          empresa_id
        ) VALUES ($1, $2, $3, 'efectivo', 'otro', CURRENT_TIMESTAMP, $4, 'activo', $5)
        RETURNING *
      `, [
        `Reembolso por devolución de compra folio ${compra.codigo}`,
        idCatIngreso,
        montoDevuelto,
        idUsuario,
        compra.empresa_id || empresaId || 1
      ]);
      ingresoReembolso = ingresoRes.rows[0];

      // Entrada en caja en efectivo
      await gastosRepo.registrarMovimientoCaja({
        fecha: new Date(),
        tipo: 'entrada',
        concepto: `Reembolso por devolución de compra folio ${compra.codigo}`,
        monto: montoDevuelto,
        origen: 'ingreso',
        id_referencia: ingresoReembolso.id_ingreso,
        id_usuario: idUsuario,
        empresa_id: compra.empresa_id || empresaId || 1
      }, client);

    } else {
      // Ajustar cuenta por pagar (resolución por defecto)
      if (cxp && Number(cxp.saldo_pendiente) > 0) {
        const saldoAnterior = Number(cxp.saldo_pendiente);

        if (montoDevuelto <= saldoAnterior) {
          const nuevoSaldo = Number((saldoAnterior - montoDevuelto).toFixed(2));
          const nuevoEstatus = nuevoSaldo === 0 ? 'saldada' : cxp.estatus;

          await client.query(`
            UPDATE cuentas_por_pagar
            SET saldo_pendiente = $1, estatus = $2
            WHERE id_cxp = $3
          `, [nuevoSaldo, nuevoEstatus, cxp.id_cxp]);

          cxpAjustada = { id_cxp: cxp.id_cxp, saldo_pendiente: nuevoSaldo, estatus: nuevoEstatus };
        } else {
          // El monto devuelto supera el saldo pendiente de CxP:
          // Se salda la CxP a 0 y el excedente se reembolsa a la empresa como ingreso
          const excedente = Number((montoDevuelto - saldoAnterior).toFixed(2));

          await client.query(`
            UPDATE cuentas_por_pagar
            SET saldo_pendiente = 0, estatus = 'saldada'
            WHERE id_cxp = $1
          `, [cxp.id_cxp]);

          cxpAjustada = { id_cxp: cxp.id_cxp, saldo_pendiente: 0, estatus: 'saldada' };

          if (excedente > 0) {
            const idCatIngreso = await repo.obtenerCategoriaReembolso(client, compra.empresa_id || empresaId);

            const ingresoRes = await client.query(`
              INSERT INTO ingresos (
                concepto,
                id_categoria,
                monto,
                forma_pago,
                origen,
                fecha,
                id_usuario,
                estatus,
                empresa_id
              ) VALUES ($1, $2, $3, 'efectivo', 'otro', CURRENT_TIMESTAMP, $4, 'activo', $5)
              RETURNING *
            `, [
              `Reembolso excedente por devolución compra folio ${compra.codigo}`,
              idCatIngreso,
              excedente,
              idUsuario,
              compra.empresa_id || empresaId || 1
            ]);
            ingresoReembolso = ingresoRes.rows[0];

            await gastosRepo.registrarMovimientoCaja({
              fecha: new Date(),
              tipo: 'entrada',
              concepto: `Reembolso excedente por devolución compra folio ${compra.codigo}`,
              monto: excedente,
              origen: 'ingreso',
              id_referencia: ingresoReembolso.id_ingreso,
              id_usuario: idUsuario,
              empresa_id: compra.empresa_id || empresaId || 1
            }, client);
          }
        }
      } else {
        // La compra ya estaba pagada o de contado: se genera ingreso por reembolso (RDF1006)
        const idCatIngreso = await repo.obtenerCategoriaReembolso(client, compra.empresa_id || empresaId);

        const ingresoRes = await client.query(`
          INSERT INTO ingresos (
            concepto,
            id_categoria,
            monto,
            forma_pago,
            origen,
            fecha,
            id_usuario,
            estatus,
            empresa_id
          ) VALUES ($1, $2, $3, 'efectivo', 'otro', CURRENT_TIMESTAMP, $4, 'activo', $5)
          RETURNING *
        `, [
          `Reembolso por devolución de compra folio ${compra.codigo}`,
          idCatIngreso,
          montoDevuelto,
          idUsuario,
          compra.empresa_id || empresaId || 1
        ]);
        ingresoReembolso = ingresoRes.rows[0];

        await gastosRepo.registrarMovimientoCaja({
          fecha: new Date(),
          tipo: 'entrada',
          concepto: `Reembolso por devolución de compra folio ${compra.codigo}`,
          monto: montoDevuelto,
          origen: 'ingreso',
          id_referencia: ingresoReembolso.id_ingreso,
          id_usuario: idUsuario,
          empresa_id: compra.empresa_id || empresaId || 1
        }, client);
      }
    }

    // 7. Actualizar estatus y total de la compra
    const nuevoTotal = Math.max(0, Number((Number(compra.total) - montoDevuelto).toFixed(2)));
    let nuevoEstatus = compra.estatus;

    if (todoDevuelto) {
      nuevoEstatus = 'cancelada';
    } else if (cxpAjustada && cxpAjustada.saldo_pendiente === 0) {
      nuevoEstatus = 'pagada';
    }

    await client.query(`
      UPDATE compras
      SET total = $1, estatus = $2
      WHERE id_compra = $3
    `, [nuevoTotal, nuevoEstatus, idCompra]);

    return {
      id_devolucion: devolucion.id_devolucion,
      id_compra: idCompra,
      codigo: compra.codigo,
      tipo: todoDevuelto ? 'total' : 'parcial',
      monto_devuelto: montoDevuelto,
      nuevo_total: nuevoTotal,
      estatus: nuevoEstatus,
      cxp_ajustada: cxpAjustada,
      ingreso_reembolso: ingresoReembolso
    };
  });

  return resultado;
}
