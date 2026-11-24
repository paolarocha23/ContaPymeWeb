import pool from '../config/db.js';

const num = (v) => (v === null || v === undefined ? v : Number(v));

const normalizarVenta = (r) => r && ({
  ...r,
  subtotal: num(r.subtotal),
  total: num(r.total),
  monto_pagado: num(r.monto_pagado),
  saldo_pendiente: num(r.saldo_pendiente)
});

/**
 * Ejecuta una función dentro de una transacción.
 */
export async function conTransaccion(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const resultado = await fn(client);
    await client.query('COMMIT');
    return resultado;
  } catch (err) {
    try { await client.query('ROLLBACK'); } catch { /* sin acción */ }
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Listado de ventas con filtros y datos relacionados.
 */
export async function list(filtros = {}, empresaId = null) {
  const params = [];
  const add = (v) => {
    params.push(v);
    return `$${params.length}`;
  };

  let where = 'WHERE 1=1';

  if (empresaId) {
    where += ` AND v.empresa_id = ${add(empresaId)}`;
  }

  if (filtros.q) {
    const p = add(`%${filtros.q}%`);
    where += ` AND (
      v.codigo ILIKE ${p}
      OR CONCAT_WS(' ', cl.nombre_cliente, cl.apellido_paterno, cl.apellido_materno) ILIKE ${p}
      OR u.nombre_usuario ILIKE ${p}
      OR v.observaciones ILIKE ${p}
    )`;
  }

  if (filtros.estatus) {
    where += ` AND LOWER(v.estatus) = ${add(filtros.estatus.toLowerCase())}`;
  }

  if (filtros.condiciones_pago) {
    where += ` AND LOWER(v.condiciones_pago) = ${add(filtros.condiciones_pago.toLowerCase())}`;
  }

  if (filtros.forma_pago) {
    where += ` AND LOWER(v.forma_pago) = ${add(filtros.forma_pago.toLowerCase())}`;
  }

  if (filtros.desde) {
    where += ` AND v.fecha >= ${add(filtros.desde)}::date`;
  }

  if (filtros.hasta) {
    where += ` AND v.fecha < (${add(filtros.hasta)}::date + 1)`;
  }

  if (filtros.id_cliente) {
    where += ` AND v.id_cliente = ${add(filtros.id_cliente)}`;
  }

  const lim = add(filtros.limite || 50);
  const off = add(((filtros.pagina || 1) - 1) * (filtros.limite || 50));

  const query = `
    SELECT
      v.id_venta,
      v.codigo,
      v.fecha,
      v.id_cliente,
      v.id_usuario,
      v.forma_pago,
      v.condiciones_pago,
      v.fecha_vencimiento,
      v.subtotal,
      v.total,
      v.monto_pagado,
      GREATEST(0, v.total - v.monto_pagado) AS saldo_pendiente,
      v.estatus,
      v.observaciones,
      v.empresa_id,
      COALESCE(
        NULLIF(TRIM(CONCAT_WS(' ', cl.nombre_cliente, cl.apellido_paterno, cl.apellido_materno)), ''),
        'Público en general'
      ) AS nombre_cliente,
      cl.correo AS correo_cliente,
      cl.telefono AS telefono_cliente,
      u.nombre_usuario AS vendedor,
      cxc.id_cxc,
      cxc.estatus AS cxc_estatus,
      (
        SELECT COUNT(*)::int
        FROM detalle_ventas dv
        WHERE dv.id_venta = v.id_venta
      ) AS total_articulos,
      COUNT(*) OVER()::int AS total_filas
    FROM ventas v
    LEFT JOIN clientes cl ON cl.id_cliente = v.id_cliente
    INNER JOIN usuarios u ON u.id_usuario = v.id_usuario
    LEFT JOIN cuentas_por_cobrar cxc ON cxc.id_venta = v.id_venta
    ${where}
    ORDER BY v.fecha DESC, v.id_venta DESC
    LIMIT ${lim} OFFSET ${off}
  `;

  const { rows } = await pool.query(query, params);

  return {
    total: rows[0]?.total_filas ?? 0,
    items: rows.map(({ total_filas, ...fila }) => normalizarVenta(fila))
  };
}

/**
 * Estadísticas y métricas para las tarjetas superiores.
 */
export async function stats(empresaId = null) {
  const query = `
    SELECT
      COUNT(*)::int AS total_ventas,
      COALESCE(SUM(total) FILTER (WHERE LOWER(estatus) <> 'cancelada'), 0) AS total_vendido,
      COALESCE(SUM(monto_pagado) FILTER (WHERE LOWER(estatus) <> 'cancelada'), 0) AS total_cobrado,
      COALESCE(SUM(GREATEST(0, total - monto_pagado)) FILTER (WHERE LOWER(estatus) <> 'cancelada'), 0) AS total_por_cobrar,
      COUNT(*) FILTER (WHERE LOWER(estatus) = 'pagada')::int AS ventas_pagadas,
      COUNT(*) FILTER (WHERE LOWER(estatus) IN ('pendiente', 'parcial'))::int AS ventas_pendientes,
      COUNT(*) FILTER (WHERE LOWER(estatus) = 'cancelada')::int AS ventas_canceladas,
      COUNT(*) FILTER (WHERE LOWER(condiciones_pago) = 'credito' AND LOWER(estatus) <> 'cancelada')::int AS ventas_credito,
      COUNT(*) FILTER (WHERE LOWER(condiciones_pago) = 'contado' AND LOWER(estatus) <> 'cancelada')::int AS ventas_contado
    FROM ventas
    WHERE ($1::int IS NULL OR empresa_id = $1)
  `;

  const { rows } = await pool.query(query, [empresaId]);
  const r = rows[0] || {};

  const totalVendido = num(r.total_vendido);
  const totalCobrado = num(r.total_cobrado);
  const totalPorCobrar = num(r.total_por_cobrar);
  const totalVentas = r.total_ventas || 0;
  const ventasActivas = totalVentas - (r.ventas_canceladas || 0);
  const ticketPromedio = ventasActivas > 0 ? Math.round((totalVendido / ventasActivas) * 100) / 100 : 0;

  return {
    total_ventas: totalVentas,
    total_vendido: totalVendido,
    total_cobrado: totalCobrado,
    total_por_cobrar: totalPorCobrar,
    ventas_pagadas: r.ventas_pagadas || 0,
    ventas_pendientes: r.ventas_pendientes || 0,
    ventas_canceladas: r.ventas_canceladas || 0,
    ventas_credito: r.ventas_credito || 0,
    ventas_contado: r.ventas_contado || 0,
    ticket_promedio: ticketPromedio
  };
}

/**
 * Consulta de una venta por ID con información detallada.
 */
export async function findById(id, db = pool) {
  const query = `
    SELECT
      v.id_venta,
      v.codigo,
      v.fecha,
      v.id_cliente,
      v.id_usuario,
      v.forma_pago,
      v.condiciones_pago,
      v.fecha_vencimiento,
      v.subtotal,
      v.total,
      v.monto_pagado,
      GREATEST(0, v.total - v.monto_pagado) AS saldo_pendiente,
      v.estatus,
      v.observaciones,
      v.empresa_id,
      COALESCE(
        NULLIF(TRIM(CONCAT_WS(' ', cl.nombre_cliente, cl.apellido_paterno, cl.apellido_materno)), ''),
        'Público en general'
      ) AS nombre_cliente,
      cl.correo AS correo_cliente,
      cl.telefono AS telefono_cliente,
      cl.calle AS cliente_calle,
      cl.colonia AS cliente_colonia,
      cl.ciudad AS cliente_ciudad,
      u.nombre_usuario AS vendedor,
      TRIM(CONCAT_WS(' ', u.nombre, u.apellido_paterno)) AS nombre_vendedor,
      cxc.id_cxc,
      cxc.saldo_pendiente AS cxc_saldo_pendiente,
      cxc.estatus AS cxc_estatus
    FROM ventas v
    LEFT JOIN clientes cl ON cl.id_cliente = v.id_cliente
    INNER JOIN usuarios u ON u.id_usuario = v.id_usuario
    LEFT JOIN cuentas_por_cobrar cxc ON cxc.id_venta = v.id_venta
    WHERE v.id_venta = $1
    LIMIT 1
  `;

  const { rows } = await db.query(query, [id]);
  return normalizarVenta(rows[0]) || null;
}

/**
 * Consulta de los artículos / productos de una venta.
 */
export async function findItemsByVentaId(idVenta, db = pool) {
  const query = `
    SELECT
      dv.id_detalle_venta,
      dv.id_venta,
      dv.id_producto,
      p.codigo AS codigo_producto,
      p.nombre AS nombre_producto,
      p.tipo AS tipo_producto,
      p.unidad_medida,
      dv.cantidad,
      dv.precio_unitario,
      dv.subtotal
    FROM detalle_ventas dv
    INNER JOIN productos p ON p.id_producto = dv.id_producto
    WHERE dv.id_venta = $1
    ORDER BY dv.id_detalle_venta ASC
  `;

  const { rows } = await db.query(query, [idVenta]);
  return rows.map((r) => ({
    ...r,
    cantidad: num(r.cantidad),
    precio_unitario: num(r.precio_unitario),
    subtotal: num(r.subtotal)
  }));
}

/**
 * Genera el siguiente folio secuencial de venta de forma segura.
 */
export async function generarSiguienteFolio(client, empresaId = 1) {
  // Buscamos el último id o código para construir el folio
  const { rows } = await client.query(`
    SELECT codigo
    FROM ventas
    WHERE empresa_id = $1
    ORDER BY id_venta DESC
    LIMIT 1
  `, [empresaId]);

  let consecutivo = 1;

  if (rows.length > 0 && rows[0].codigo) {
    const match = String(rows[0].codigo).match(/\d+$/);
    if (match) {
      consecutivo = parseInt(match[0], 10) + 1;
    }
  }

  // Comprobar que no exista globalmente por el índice único ventas_codigo
  let folio = `V-${String(consecutivo).padStart(4, '0')}`;
  if (empresaId > 1) {
    folio = `V-E${empresaId}-${String(consecutivo).padStart(4, '0')}`;
  }

  // Asegurar unicidad absoluta
  let existe = true;
  let intentos = 0;
  while (existe && intentos < 50) {
    const check = await client.query('SELECT 1 FROM ventas WHERE codigo = $1 LIMIT 1', [folio]);
    if (check.rows.length === 0) {
      existe = false;
    } else {
      consecutivo++;
      folio = empresaId > 1
        ? `V-E${empresaId}-${String(consecutivo).padStart(4, '0')}`
        : `V-${String(consecutivo).padStart(4, '0')}`;
      intentos++;
    }
  }

  return folio;
}

/**
 * Inserta la cabecera de la venta.
 */
export async function insertVenta(client, d) {
  const { rows } = await client.query(`
    INSERT INTO ventas (
      codigo, fecha, id_cliente, id_usuario, forma_pago,
      condiciones_pago, fecha_vencimiento, subtotal, total,
      monto_pagado, estatus, observaciones, empresa_id
    )
    VALUES (
      $1, CURRENT_TIMESTAMP, $2, $3, $4,
      $5, $6, $7, $8,
      $9, $10, $11, $12
    )
    RETURNING id_venta, codigo, fecha, total, monto_pagado, estatus
  `, [
    d.codigo,
    d.id_cliente ?? null,
    d.id_usuario,
    d.forma_pago,
    d.condiciones_pago,
    d.fecha_vencimiento ?? null,
    d.subtotal,
    d.total,
    d.monto_pagado,
    d.estatus,
    d.observaciones ?? null,
    d.empresa_id
  ]);

  return rows[0];
}

/**
 * Inserta un renglón en detalle_ventas.
 */
export async function insertDetalle(client, d) {
  const { rows } = await client.query(`
    INSERT INTO detalle_ventas (
      id_venta, id_producto, cantidad, precio_unitario, subtotal, empresa_id
    )
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id_detalle_venta
  `, [
    d.id_venta,
    d.id_producto,
    d.cantidad,
    d.precio_unitario,
    d.subtotal,
    d.empresa_id
  ]);

  return rows[0];
}

/**
 * Bloquea la venta para operaciones concurrentes (cancelación).
 */
export async function bloquearVenta(client, idVenta) {
  const { rows } = await client.query(`
    SELECT *
    FROM ventas
    WHERE id_venta = $1
    FOR UPDATE
  `, [idVenta]);

  return rows[0] || null;
}

/**
 * Cancela la venta en la base de datos.
 */
export async function cancelarVenta(client, idVenta) {
  const { rows } = await client.query(`
    UPDATE ventas
    SET estatus = 'cancelada'
    WHERE id_venta = $1
    RETURNING *
  `, [idVenta]);

  return rows[0];
}

/**
 * Crea una cuenta por cobrar vinculada a la venta.
 */
export async function crearCuentaPorCobrar(client, d) {
  const { rows } = await client.query(`
    INSERT INTO cuentas_por_cobrar (
      id_cliente, id_venta, fecha_emision, fecha_vencimiento,
      monto_original, saldo_pendiente, estatus, empresa_id
    )
    VALUES (
      $1, $2, CURRENT_DATE, $3,
      $4, $5, $6, $7
    )
    RETURNING id_cxc, saldo_pendiente, estatus
  `, [
    d.id_cliente,
    d.id_venta,
    d.fecha_vencimiento,
    d.monto_original,
    d.saldo_pendiente,
    d.estatus,
    d.empresa_id
  ]);

  return rows[0];
}

/**
 * Cancela la cuenta por cobrar ligada a una venta.
 */
export async function cancelarCuentaPorCobrar(client, idVenta) {
  await client.query(`
    UPDATE cuentas_por_cobrar
    SET estatus = 'cancelada',
        saldo_pendiente = 0
    WHERE id_venta = $1
  `, [idVenta]);
}

/**
 * Verifica si se han realizado cobros en CxC para esta venta.
 */
export async function obtenerCobrosDeVenta(client, idVenta) {
  const { rows } = await client.query(`
    SELECT cb.id_cobro, cb.monto
    FROM cxc_cobros cb
    JOIN cuentas_por_cobrar cx ON cx.id_cxc = cb.id_cxc
    WHERE cx.id_venta = $1
  `, [idVenta]);

  return rows;
}

/**
 * Obtiene la categoría adecuada para ingresos por ventas.
 */
export async function obtenerCategoriaVentas(client, empresaId = null) {
  const { rows } = await client.query(`
    SELECT id_categoria
    FROM categorias
    WHERE estatus = 1
      AND ($1::int IS NULL OR empresa_id = $1)
    ORDER BY
      CASE
        WHEN LOWER(TRIM(nombre)) = 'ventas' THEN 0
        WHEN LOWER(TRIM(nombre)) = 'general' THEN 1
        ELSE 2
      END,
      id_categoria ASC
    LIMIT 1
  `, [empresaId]);

  return rows[0]?.id_categoria || 1;
}
